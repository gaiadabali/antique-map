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
 * Mail failures never throw: a notification is best-effort and must never undo a paid order or a
 * staff member's status move.
 */
import type { Payload, PayloadRequest } from 'payload'

import { createHref, SITES, siteOrigin, adminOrigin } from '@engine/config/sites'

import type { OrderStatus } from '../../collections/orders/statuses'
import { driverImageUrl, DRIVER_IMAGE_URL_MAX_TTL } from '../fulfilment/driver-image'
import { openToken, orderLinkKeyFromEnv } from '../orders/link-key'
import { sql, type Row } from '../payments/transaction'
import {
  buyerStatusEmail,
  quoteReadyEmail,
  storeNewOrderEmail,
  storeReassignedEmail,
} from './templates'
import { mailTransport, type MailMessage } from './transport'

export { requestTrackingLink, type RequestTrackingLinkInput } from './resend'

export type NotifyOrderEventInput = {
  readonly orderId: number
  /** The status before this write; `undefined`/`null` and anything equal to `to` sends nothing. */
  readonly from: OrderStatus | null | undefined
  readonly to: OrderStatus
  /** The write's own request, when the caller has one (the `afterChange` hook always does). */
  readonly req?: PayloadRequest
}

type OrderForNotify = {
  readonly id: number
  readonly number: number
  readonly contact?: { name?: string | null; email?: string | null; locale?: string | null } | null
  readonly store?: { id: number; name?: string | null } | number | null
  readonly lines?: readonly { name?: string | null; qty?: number | null }[] | null
  readonly totals?: { total?: number | null } | null
  readonly trackingTokenEnc?: string | null
  readonly expiresAt?: string | null
}

async function sendMail(to: string, build: () => MailMessage | null) {
  const message = build()
  if (message === null) return
  try {
    await mailTransport().send(message)
  } catch {
    // Best-effort: a transport hiccup never undoes the order's status move.
  }
}

/**
 * Claims `(orderId, to)` in `order-notifications`: true only for the caller that wins the race, so
 * exactly one of any number of concurrent calls for the same order and status sends mail.
 *
 * The `afterChange` hook calls this from inside the Local API write's own still-open transaction
 * (Payload commits after hooks run) — a fresh connection here would block on a lock that write
 * already holds (`orders`), timing out and losing the claim. When `req` names a live transaction,
 * the claim runs on that same session instead; every other caller (`createOrder`, `quoteDeliveryFee`,
 * the webhook, the sweep — all after their own transaction has committed) runs it as a single
 * autocommit statement on the pool.
 *
 * One statement, against `order-notifications`, never `orders`: no row of `orders` is read or
 * locked, so this never races — or loses to — a concurrent save of the order itself.
 */
async function claimNotification(
  payload: Payload,
  orderId: number,
  to: OrderStatus,
  req?: PayloadRequest,
): Promise<boolean> {
  const now = new Date()
  const claimRow = sql`
    INSERT INTO order_notifications (order_id, status, sent_at, updated_at, created_at)
    VALUES (${orderId}, ${to}, ${now}, ${now}, ${now})
    ON CONFLICT (order_id, status) DO NOTHING
    RETURNING id`

  try {
    const transactionID = req?.transactionID ? await req.transactionID : undefined
    const session = transactionID === undefined ? undefined : payload.db.sessions?.[transactionID]
    const db = session
      ? (session.db as Parameters<Payload['db']['execute']>[0]['db'])
      : (payload.db as unknown as { drizzle: Parameters<Payload['db']['execute']>[0]['db'] })
          .drizzle
    const claimed = (await payload.db.execute({ db, sql: claimRow })) as {
      rows?: Row[]
    }
    return (claimed.rows?.length ?? 0) > 0
  } catch {
    return false
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
        totals: { total: true },
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

  const trackingUrl = `${siteOrigin('shop') ?? ''}${createHref(SITES.shop)('tracking', { token }, locale)}`
  const driverUrl =
    to === 'on_the_way'
      ? await driverImageUrl(payload, orderId, DRIVER_IMAGE_URL_MAX_TTL).catch(() => null)
      : null

  const buyerEmail = order.contact?.email
  if (buyerEmail) {
    await sendMail(buyerEmail, () =>
      to === 'pending_payment'
        ? quoteReadyEmail({
            to: buyerEmail,
            locale,
            orderNumber: order.number,
            totalIdr: order.totals?.total ?? 0,
            payBy: order.expiresAt ?? null,
            trackingUrl,
          })
        : buyerStatusEmail({
            to: buyerEmail,
            locale,
            orderNumber: order.number,
            status: to,
            trackingUrl,
            driverImageUrl: driverUrl,
          }),
    )
  }

  if (to === 'paid') await notifyStore(payload, order)
}

async function notifyStore(payload: Payload, order: OrderForNotify): Promise<void> {
  const storeId = typeof order.store === 'object' ? order.store?.id : order.store
  if (storeId === null || storeId === undefined) return
  const storeName =
    (typeof order.store === 'object' ? order.store?.name : null) ?? `store #${storeId}`
  const itemSummary = (order.lines ?? [])
    .map((line) => `${line.qty ?? 1}× ${line.name ?? 'item'}`)
    .join(', ')
  const totalIdr = order.totals?.total ?? 0
  const adminUrl = `${adminOrigin() ?? ''}/admin/collections/orders/${order.id}`

  let users: readonly { email?: string | null }[]
  try {
    const result = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { and: [{ role: { equals: 'store' } }, { store: { equals: storeId } }] },
      select: { email: true },
      limit: 100,
    })
    users = result.docs as readonly { email?: string | null }[]
  } catch {
    return
  }

  for (const user of users) {
    if (!user.email) continue
    try {
      await mailTransport().send(
        storeNewOrderEmail({
          to: user.email,
          orderNumber: order.number,
          storeName,
          itemSummary,
          totalIdr,
          adminUrl,
        }),
      )
    } catch {
      // Best-effort, per recipient: one store user's bounce never stops the others.
    }
  }
}

export type NotifyStoreReassignedInput = {
  readonly orderId: number
  readonly req?: PayloadRequest
}

/**
 * The new store's alert on a reassignment (TASKS.md 6.6, 7.1.c): reassigning changes no status
 * (`from === to` always), so it is not `notifyOrderEvent`'s to send — called by `reassignOrder`
 * directly, after its own transaction commits. Not claimed in `notifiedStatuses`: a store
 * legitimately hears again each time an order moves to it.
 */
export async function notifyStoreReassigned(
  payload: Payload,
  input: NotifyStoreReassignedInput,
): Promise<void> {
  let order: OrderForNotify
  try {
    order = (await payload.findByID({
      collection: 'orders',
      id: input.orderId,
      overrideAccess: true,
      depth: 1,
      ...(input.req ? { req: input.req } : {}),
      select: {
        number: true,
        store: { name: true },
        lines: { name: true, qty: true },
        totals: { total: true },
      },
    })) as OrderForNotify
  } catch {
    return
  }
  if (!order) return

  const storeId = typeof order.store === 'object' ? order.store?.id : order.store
  if (storeId === null || storeId === undefined) return
  const storeName =
    (typeof order.store === 'object' ? order.store?.name : null) ?? `store #${storeId}`
  const itemSummary = (order.lines ?? [])
    .map((line) => `${line.qty ?? 1}× ${line.name ?? 'item'}`)
    .join(', ')
  const adminUrl = `${adminOrigin() ?? ''}/admin/collections/orders/${order.id}`

  let users: readonly { email?: string | null }[]
  try {
    const result = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { and: [{ role: { equals: 'store' } }, { store: { equals: storeId } }] },
      select: { email: true },
      limit: 100,
    })
    users = result.docs as readonly { email?: string | null }[]
  } catch {
    return
  }

  for (const user of users) {
    if (!user.email) continue
    try {
      await mailTransport().send(
        storeReassignedEmail({
          to: user.email,
          orderNumber: order.number,
          storeName,
          itemSummary,
          totalIdr: order.totals?.total ?? 0,
          adminUrl,
        }),
      )
    } catch {
      // Best-effort, per recipient.
    }
  }
}
