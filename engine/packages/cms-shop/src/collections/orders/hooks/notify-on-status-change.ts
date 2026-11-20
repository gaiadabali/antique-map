/**
 * `afterChange` on `orders` (TASKS.md 7.3.b): calls `notifyOrderEvent` whenever a write actually
 * moves `status`. Skips the write `notifyOrderEvent` itself makes to rotate the tracking token
 * (`context.skipNotify`) — without that guard, the rotation's own `payload.update()` would
 * re-trigger this hook forever. Only covers writes that go through Payload's Local API (the
 * admin's status button, `./status-moves`'s guard); the webhook's `pending_payment → paid` move
 * is raw SQL and is a known, reported gap (`../../../shop/notify/index.ts`'s header).
 */
import type { CollectionAfterChangeHook } from 'payload'

import { notifyOrderEvent } from '../../../shop/notify'
import { ORDER_STATUSES, type OrderStatus } from '../statuses'

type OrderData = { id: number | string; status?: unknown }

const isStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && (ORDER_STATUSES as readonly string[]).includes(value)

export const notifyOnStatusChange: CollectionAfterChangeHook<OrderData> = async ({
  doc,
  previousDoc,
  operation,
  context,
  req,
}) => {
  if (context?.skipNotify === true || operation !== 'update') return doc
  const from = previousDoc?.status
  const to = doc.status
  if (!isStatus(to) || (from !== undefined && from !== null && !isStatus(from))) return doc
  const orderId = typeof doc.id === 'string' ? Number(doc.id) : doc.id
  if (!Number.isFinite(orderId)) return doc
  await notifyOrderEvent(req.payload, {
    orderId,
    from: isStatus(from) ? from : null,
    to,
    req,
  }).catch(() => {
    // Best-effort: `notifyOrderEvent` already swallows its own failures; this is a last resort.
  })
  return doc
}
