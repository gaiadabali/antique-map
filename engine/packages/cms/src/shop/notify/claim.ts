/**
 * The once-per-(order, status) email claim (TASKS.md 6.6; orchestrator decision B), split out of
 * `./index` (300-line rule). See `claimNotification`.
 */
import type { Payload, PayloadRequest } from 'payload'

import type { OrderStatus } from '../../collections/orders/statuses'
import { sql, type Row } from '../payments/transaction'

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
export async function claimNotification(
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
