/**
 * The order and ledger statements a payment applies, each inside the caller's transaction
 * (`./transaction`). Raw SQL against the tables Payload pushes for `orders` (with its `history`
 * and `payment.attempts` arrays) and `payment-events` — the columns a database test reads back.
 *
 * Values go as parameters; an enum column takes its value from the parameter's inferred type in an
 * `INSERT … VALUES` or `SET`, so no generated enum type name is spelled here. Every move is a
 * compare-and-set on the status it leaves (COMMERCE.md §7: "Every change is a compare-and-set").
 */
import { randomBytes } from 'node:crypto'

import type { OrderStatus } from '../../collections/orders/statuses'
import type { LockedOrder } from './decide'
import type { MidtransStatus } from './notification'
import { dateOf, sql, wholeOf, type Tx } from './transaction'

/** The payment window when an order carries no `expiresAt` (COMMERCE.md Open: default 60). */
export const DEFAULT_WINDOW_MINUTES = 60

/** Payload's array-row ids: 24 hex characters, as its own ObjectID-style ids are. */
export const rowId = () => randomBytes(12).toString('hex')

export type HistoryActor = 'midtrans' | 'system'

/** Locks the order a Midtrans `order_id` names (`FOR UPDATE`), or null when there is none. */
export async function lockOrderByNumber(tx: Tx, number: number): Promise<LockedOrder | null> {
  const [row] = await tx.rows(sql`
    SELECT id, number, status::text AS status, totals_total, payment_transaction_id,
           COALESCE(expires_at, created_at + make_interval(mins => ${DEFAULT_WINDOW_MINUTES})) AS window_end
      FROM orders WHERE number = ${number}
       FOR UPDATE`)
  if (!row) return null
  return {
    id: wholeOf(row.id, 'orders.id'),
    number: wholeOf(row.number, 'orders.number'),
    status: String(row.status) as OrderStatus,
    total: wholeOf(row.totals_total, 'orders.totals_total'),
    expiresAt: dateOf(row.window_end, 'the payment window'),
    paidTransactionId:
      typeof row.payment_transaction_id === 'string' ? row.payment_transaction_id : null,
  }
}

export type EventRecord = {
  readonly dedupeKey: string
  readonly orderId: number | null
  readonly status: MidtransStatus
  readonly source: 'webhook' | 'reconcile' | 'simulate'
  readonly outcome: string
  readonly payloadHash: string
  readonly at: Date
}

/**
 * Appends the event to the ledger, or does nothing when its dedupe key is already there: the
 * webhook's idempotency (SECURITY.md W3). True when this call wrote the row.
 */
export async function insertEvent(tx: Tx, event: EventRecord): Promise<boolean> {
  const { status } = event
  const inserted = await tx.rows(sql`
    INSERT INTO payment_events (provider, dedupe_key, order_id, midtrans_order_id, transaction_status,
                                fraud_status, status_code, gross_amount, source, outcome, payload_hash,
                                received_at, updated_at, created_at)
    VALUES ('midtrans', ${event.dedupeKey}, ${event.orderId}, ${status.midtransOrderId},
            ${status.transactionStatus}, ${status.fraudStatus}, ${status.statusCode},
            ${status.grossAmount}, ${event.source}, ${event.outcome}, ${event.payloadHash},
            ${event.at}, ${event.at}, ${event.at})
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING id`)
  return inserted.length === 1
}

/**
 * The ledger row a dedupe key already has, read without a lock (READ COMMITTED: what has
 * committed), or null — how a delivery that lost the order's lock tells "applied" from "not yet".
 */
export async function recordedEvent(
  tx: Tx,
  dedupeKey: string,
): Promise<{ orderId: number | null } | null> {
  const [row] = await tx.rows(sql`
    SELECT order_id FROM payment_events WHERE dedupe_key = ${dedupeKey} LIMIT 1`)
  if (!row) return null
  return {
    orderId: row.order_id === null ? null : wholeOf(row.order_id, 'payment_events.order_id'),
  }
}

/** Records the attempt's latest Midtrans state on the order (`payment.attempts[].state`). */
export async function setAttemptState(tx: Tx, orderId: number, status: MidtransStatus) {
  await tx.rows(sql`
    UPDATE orders_payment_attempts SET state = ${status.transactionStatus}
     WHERE _parent_id = ${orderId} AND midtrans_order_id = ${status.midtransOrderId}`)
}

/** Appends one entry to the order's history. */
export async function addHistory(
  tx: Tx,
  orderId: number,
  entry: { from: OrderStatus; to: OrderStatus; actor: HistoryActor; at: Date; note: string | null },
) {
  await tx.rows(sql`
    INSERT INTO orders_history (_order, _parent_id, id, "from", "to", at, actor, note)
    VALUES ((SELECT COALESCE(MAX(_order), 0) + 1 FROM orders_history WHERE _parent_id = ${orderId}),
            ${orderId}, ${rowId()}, ${entry.from}, ${entry.to}, ${entry.at}, ${entry.actor},
            ${entry.note === null ? null : entry.note.slice(0, 500)})`)
}

/** Raises `needsAttention` with `reason`, kept beside any reason already raised. */
export async function flagOrder(tx: Tx, orderId: number, reason: string, at: Date) {
  await tx.rows(sql`
    UPDATE orders
       SET needs_attention_flag = true,
           needs_attention_reason = left(
             CASE WHEN needs_attention_flag AND COALESCE(needs_attention_reason, '') <> ''
                  THEN needs_attention_reason || ' · ' || ${reason}::text
                  ELSE ${reason}::text END, 500),
           updated_at = ${at}
     WHERE id = ${orderId}`)
}

/**
 * `pending_payment` → `paid`, with how and when it was paid: a compare-and-set, one row or a
 * thrown defect (the caller holds the row's lock, so anything else is a bug, rolled back).
 */
export async function markPaid(tx: Tx, order: LockedOrder, status: MidtransStatus, at: Date) {
  const updated = await tx.rows(sql`
    UPDATE orders
       SET status = 'paid', payment_method = ${status.paymentType},
           payment_transaction_id = ${status.transactionId}, payment_paid_at = ${at}, updated_at = ${at}
     WHERE id = ${order.id} AND status = 'pending_payment'
    RETURNING id`)
  if (updated.length !== 1)
    throw new Error(`payments: order ${order.id} left pending_payment under its lock`)
  await addHistory(tx, order.id, {
    from: 'pending_payment',
    to: 'paid',
    actor: 'midtrans',
    at,
    note: `Paid by ${status.paymentType ?? 'Midtrans'}, attempt ${status.midtransOrderId}.`,
  })
}
