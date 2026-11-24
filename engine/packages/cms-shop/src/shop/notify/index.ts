/**
 * `notifyOrderEvent` (COMMERCE.md §11; TASKS.md 6.6, 7.3.b): on one order status transition, an
 * email to the buyer in their own language, and — on a newly `paid` order — an email to the
 * sending store's users. Called from `../../collections/orders/hooks/notify-on-status-change`'s
 * `afterChange` (admin-UI writes, through Payload's Local API), and explicitly after every other
 * moving transaction commits (orchestrator decision B): `createOrder`, `quoteDeliveryFee`,
 * `applyPaymentStatus`/`markPaid`, `moveOrder`, the sweep's expiries. All of these write with raw
 * SQL inside their own transaction (the payments core's seam), never through the Local API, so none
 * of them reach the `afterChange` hook — this file is their only notifier.
 *
 * **The once-per-(order, status) claim** (orchestrator decision B; moved off `orders` in 6.6-core-r5):
 * `order-notifications` holds one row per `(order, status)` ever sent, with a unique compound index,
 * and the claim is one `INSERT … ON CONFLICT (order_id, status) DO NOTHING RETURNING id` against it.
 * A row back means this caller sends; none means someone already claimed it. This never touches the
 * `orders` row, which is the point: a field of `orders` cannot hold this claim, because Payload's
 * `update` writes back every field of the document it read, so a writer with a stale copy of
 * `orders` would overwrite another writer's claim with its own and both would send (the bug a
 * conditional `UPDATE … notified_statuses` could not fix). A lost claim (two writers for the same
 * transition, a retried hook, the `afterChange` hook racing an explicit call for the same move)
 * sends nothing. `from === to` is refused before the claim even runs.
 *
 * **The link never rotates** (orchestrator decision A): every email decrypts the one token sealed
 * at order creation (`trackingTokenEnc`, `../orders/link-key`) — `trackingTokenHash` stays the
 * lookup the tracking page already uses, untouched here. A buyer's first and last email open the
 * same link.
 *
 * **Which email** (TASKS.md 27.3): a new order priced at checkout (`from` null, `to`
 * `pending_payment`, the plan's K2) is "ready to pay" (`orderReceived`); a staff-quoted order
 * reaching `pending_payment` is "your price is ready" (`priceReady`); every other move is its
 * status email. Each takes its subject and opening from the owner's settings per locale
 * (`./wording`), falling back to the defaults. The stores' alerts are `./stores`.
 *
 * Mail failures never throw: a notification is best-effort and must never undo a paid order or a
 * staff member's status move.
 */
import type { Payload, PayloadRequest } from 'payload'

import { createHref, SITES, appOrigin } from '@engine/config/sites'

import type { OrderStatus } from '../../collections/orders/statuses'
import { driverImageUrl, DRIVER_IMAGE_URL_MAX_TTL } from '../fulfilment/driver-image'
import { openToken, orderLinkKeyFromEnv } from '../orders/link-key'
import { buyerStatusEmail, orderReceivedEmail, quoteReadyEmail } from './templates'
import { claimNotification } from './claim'
import { alertStore, type OrderForStore } from './stores'
import { mailTransport, type MailMessage } from './transport'
import { loadStoredWording, STATUS_EMAIL, wordingFor } from './wording'

export { requestTrackingLink, type RequestTrackingLinkInput } from './resend'
export { notifyStoreReassigned, type NotifyStoreReassignedInput } from './stores'

export type NotifyOrderEventInput = {
  readonly orderId: number
  /** The status before this write: `null` for a new order; equal to `to` sends nothing. */
  readonly from: OrderStatus | null | undefined
  readonly to: OrderStatus
  /** The write's own request, when the caller has one (the `afterChange` hook always does). */
  readonly req?: PayloadRequest
}

type OrderForNotify = OrderForStore & {
  readonly contact?: { name?: string | null; email?: string | null; locale?: string | null } | null
  readonly totals?: {
    total?: number | null
    subtotal?: number | null
    discount?: number | null
    deliveryFee?: number | null
  } | null
  readonly trackingTokenEnc?: string | null
  readonly expiresAt?: string | null
}

/** The statuses before payment: the buyer's page is the order page, where they pay. */
const BEFORE_PAYMENT: readonly OrderStatus[] = ['awaiting_quote', 'pending_payment']

async function sendMail(build: () => MailMessage | null) {
  const message = build()
  if (message === null) return
  try {
    await mailTransport().send(message)
  } catch {
    // Best-effort: a transport hiccup never undoes the order's status move.
  }
}

export async function notifyOrderEvent(
  payload: Payload,
  input: NotifyOrderEventInput,
): Promise<void> {
  const { orderId, from, to, req } = input
  if (from === to) return
  if (!(await claimNotification(payload, orderId, to, req))) return

  let order: OrderForNotify
  try {
    order = (await payload.findByID({
      collection: 'orders',
      id: orderId,
      overrideAccess: true,
      depth: 1,
      ...(req ? { req } : {}),
      select: {
        number: true,
        contact: { name: true, email: true, locale: true },
        store: { name: true },
        lines: { name: true, qty: true },
        totals: { total: true, subtotal: true, discount: true, deliveryFee: true },
        trackingTokenEnc: true,
        expiresAt: true,
      },
    })) as OrderForNotify
  } catch {
    return
  }
  if (!order) return

  const locale: 'en' | 'id' = order.contact?.locale === 'id' ? 'id' : 'en'
  const token =
    typeof order.trackingTokenEnc === 'string' && order.trackingTokenEnc !== ''
      ? openToken(order.trackingTokenEnc, orderLinkKeyFromEnv())
      : null
  // Nothing to link to (the field is empty, or the key cannot open it): send nothing rather than a
  // dead link — this never happens for a real order sealed by `createOrder`.
  if (token === null) return

  // Never a relative link in an email: no configured origin, no email (logged, never thrown).
  const origin = appOrigin('shop')
  if (origin === null) {
    console.error(
      `[notify] order ${orderId}: no shop origin configured; ${to} notification not sent`,
    )
    return
  }
  const href = createHref(SITES.shop)
  // Before payment the buyer's page is the order page — they watch the quote land and pay there;
  // from payment on, the tracking page. Both open on the one sealed token.
  const orderUrl = `${origin}${href('order', { token }, locale)}`
  const trackingUrl = BEFORE_PAYMENT.includes(to)
    ? orderUrl
    : `${origin}${href('tracking', { token }, locale)}`

  const buyerEmail = order.contact?.email
  if (buyerEmail) {
    const stored = await loadStoredWording(payload, locale, req)
    const vars = { number: order.number, store: storeNameOf(order) }
    if (to === 'pending_payment') {
      const received = from === null || from === undefined
      const priced = {
        to: buyerEmail,
        locale,
        orderNumber: order.number,
        itemsTotalIdr: (order.totals?.subtotal ?? 0) - (order.totals?.discount ?? 0),
        deliveryFeeIdr: order.totals?.deliveryFee ?? 0,
        totalIdr: order.totals?.total ?? 0,
        payBy: order.expiresAt ?? null,
        payUrl: orderUrl,
        wording: wordingFor(stored, received ? 'orderReceived' : 'priceReady', locale, vars),
      }
      await sendMail(() => (received ? orderReceivedEmail(priced) : quoteReadyEmail(priced)))
    } else {
      const key = STATUS_EMAIL[to]
      const driverUrl =
        to === 'on_the_way'
          ? await driverImageUrl(payload, orderId, DRIVER_IMAGE_URL_MAX_TTL).catch(() => null)
          : null
      await sendMail(() =>
        key === undefined
          ? null
          : buyerStatusEmail({
              to: buyerEmail,
              locale,
              orderNumber: order.number,
              status: to,
              trackingUrl,
              driverImageUrl: driverUrl,
              wording: wordingFor(stored, key, locale, vars),
            }),
      )
    }
  }

  if (to === 'paid') await alertStore(payload, order, 'storeNewOrder', req)
}

function storeNameOf(order: OrderForStore): string | null {
  return typeof order.store === 'object' ? (order.store?.name ?? null) : null
}
