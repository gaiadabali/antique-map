/**
 * `notifyOrderEvent` (COMMERCE.md §11; TASKS.md 7.3.b): on one order status transition, an email
 * to the buyer in their own language, and — on a newly `paid` order — an email to the sending
 * store's users. Called from `../../collections/orders/hooks/notify-on-status-change`'s
 * `afterChange`, and meant to be called the same way from anywhere else an order's `status`
 * changes (`notifyOrderEvent`'s only state is `from !== to`, so a second call for the same
 * transition — a retried hook, a replayed webhook — sends nothing).
 *
 * **Known gap, reported rather than fixed here** (outside this ticket's owned paths): the
 * webhook's `pending_payment → paid` move writes with raw SQL inside `markPaid`
 * (`../payments/apply.ts`), never through Payload's Local API, so it never reaches the
 * `afterChange` hook this file is called from. `applyPaymentStatus` needs one more call —
 * `await notifyOrderEvent(payload, { orderId: order.id, from: order.status, to: 'paid' }).catch(() => {})`
 * — after `markPaid(tx, order, status, now)`, for the buyer's "paid" email and the store's "new
 * order" email to fire from a webhook-driven payment. Staff-driven moves (the admin's status
 * button) already go through Payload's Local API and are covered.
 *
 * Every tracking link here is minted fresh: `orders.trackingTokenHash` only ever holds a hash
 * (SECURITY.md T1), so the plaintext token the buyer first saw at checkout is gone by the time a
 * later status is reached. Treating every notification as a resend (COMMERCE.md §10, "a resent
 * link is a new token") is the only honest option: the buyer's latest email always has a working
 * link, an earlier one no longer does — the same thing that happens if they ask for the link
 * again on `/track`.
 *
 * Mail failures never throw: a notification is best-effort and must never undo a paid order or a
 * staff member's status move.
 */
import type { Payload, PayloadRequest } from 'payload'

import { createHref, SITES, siteOrigin, adminOrigin } from '@engine/config/sites'

import type { OrderStatus } from '../../collections/orders/statuses'
import { driverImageUrl, DRIVER_IMAGE_URL_MAX_TTL } from '../fulfilment'
import { newTrackingToken } from '../orders'
import { buyerStatusEmail, storeNewOrderEmail } from './templates'
import { mailTransport } from './transport'

export type NotifyOrderEventInput = {
  readonly orderId: number
  /** The status before this write; `undefined`/`null` and anything equal to `to` sends nothing. */
  readonly from: OrderStatus | null | undefined
  readonly to: OrderStatus
  /**
   * The write's own request, when the caller has one (the `afterChange` hook always does): the
   * token rotation below reuses its transaction, so it never waits on a lock the outer write is
   * still holding on the very row it is itself inside. Omitted, it opens its own — fine once the
   * outer write has already committed (`applyPaymentStatus`'s known gap, this file's header).
   */
  readonly req?: PayloadRequest
}

type OrderForNotify = {
  readonly id: number
  readonly number: number
  readonly contact?: { name?: string | null; email?: string | null; locale?: string | null } | null
  readonly store?: { id: number; name?: string | null } | number | null
  readonly lines?: readonly { name?: string | null; qty?: number | null }[] | null
  readonly totals?: { total?: number | null } | null
}

async function sendMail(to: string, build: () => ReturnType<typeof buyerStatusEmail>) {
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
  if (from === to || to === 'pending_payment') return

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
      },
    })) as OrderForNotify
  } catch {
    return
  }
  if (!order) return

  const locale: 'en' | 'id' = order.contact?.locale === 'id' ? 'id' : 'en'
  const { token, hash } = newTrackingToken()
  try {
    await payload.update({
      collection: 'orders',
      id: orderId,
      data: { trackingTokenHash: hash },
      overrideAccess: true,
      ...(req ? { req } : {}),
      // Never re-enters this file: the hook that calls `notifyOrderEvent` checks this first.
      context: { skipNotify: true },
    })
  } catch {
    return // the link could not be rotated; sending one that would 404 helps no one
  }

  const trackingUrl = `${siteOrigin('shop') ?? ''}${createHref(SITES.shop)('tracking', { token }, locale)}`
  const driverUrl =
    to === 'on_the_way'
      ? await driverImageUrl(payload, orderId, DRIVER_IMAGE_URL_MAX_TTL).catch(() => null)
      : null

  const buyerEmail = order.contact?.email
  if (buyerEmail) {
    await sendMail(buyerEmail, () =>
      buyerStatusEmail({
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
