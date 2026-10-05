/**
 * The quote move — `awaiting_quote → pending_payment` (TASKS.md 6.6; COMMERCE.md §4, §7): staff
 * price the order's delivery after the store is known. ONE transaction, READ COMMITTED
 * (`../payments/transaction`), the order row locked (`FOR UPDATE`):
 *
 * 1. **Who**: the owner, an editor, or a store user of the order's own store (`../fulfilment/actor`,
 *    the same rules 7.1 uses) — `forbidden` otherwise.
 * 2. **The fee**: a safe integer, 0–10,000,000 rupiah — `invalid_fee` otherwise. Checked before the
 *    lock, so a malformed request never waits on it.
 * 3. **The order**, once locked, must be `awaiting_quote` and its quote window still open —
 *    `not_awaiting_quote` / `expired` otherwise: refused twice is refused the same way both times.
 * 4. **The total is priced from the locked row** — `subtotal − discount + feeIdr` — never from
 *    anything the request carried beside the fee itself.
 * 5. The move: `totals.deliveryFee`, `totals.total`, `status = pending_payment`, a fresh
 *    `expiresAt = now + orderExpiryMinutes` (the buyer's own payment window starts here), and a
 *    history row naming the fee and who set it.
 *
 * The caller sends the buyer their "your price is ready" email after this returns (`../notify`),
 * same as every other moving transaction (TASKS.md 6.6, orchestrator decision B).
 */
import type { Payload } from 'payload'

import { reaches, staffOf, type Staff } from '../fulfilment/actor'
import { addUserHistory } from '../fulfilment/order-sql'
import { notifyOrderEvent } from '../notify'
import { loadOrderSettings } from './inputs'
import { dateOf, inTransaction, sql, wholeOf, type Tx } from '../payments/transaction'
import type { FulfilmentActor } from '../fulfilment/types'

export const MAX_DELIVERY_FEE_IDR = 10_000_000

export type QuoteFeeInput = {
  readonly orderId: number
  /** Whole rupiah, 0–10,000,000. */
  readonly feeIdr: number
  readonly actor: FulfilmentActor
  readonly now?: Date
}

export type QuoteFeeRefusal = 'not_staff' | 'invalid_fee' | 'not_found' | 'forbidden' | 'not_awaiting_quote' | 'expired'

export type QuoteFeeResult =
  | {
      readonly ok: true
      readonly orderId: number
      readonly totalIdr: number
      /** The end of the buyer's own payment window, just opened. */
      readonly expiresAt: Date
    }
  | { readonly ok: false; readonly refusal: QuoteFeeRefusal; readonly message: string }

function isValidFee(feeIdr: unknown): feeIdr is number {
  return (
    typeof feeIdr === 'number' &&
    Number.isSafeInteger(feeIdr) &&
    feeIdr >= 0 &&
    feeIdr <= MAX_DELIVERY_FEE_IDR
  )
}

type LockedForQuote = {
  readonly id: number
  readonly status: string
  readonly store: number
  readonly subtotalIdr: number
  readonly discountIdr: number
  readonly expiresAt: Date
}

async function lockForQuote(tx: Tx, orderId: number): Promise<LockedForQuote | null> {
  const [row] = await tx.rows(sql`
    SELECT id, status::text AS status, store_id, totals_subtotal, totals_discount, expires_at
      FROM orders WHERE id = ${orderId}
       FOR UPDATE`)
  if (!row) return null
  return {
    id: wholeOf(row.id, 'orders.id'),
    status: String(row.status),
    store: wholeOf(row.store_id, 'orders.store_id'),
    subtotalIdr: wholeOf(row.totals_subtotal, 'orders.totals_subtotal'),
    discountIdr: wholeOf(row.totals_discount, 'orders.totals_discount'),
    expiresAt: dateOf(row.expires_at, 'orders.expires_at'),
  }
}

const refuse = (refusal: QuoteFeeRefusal, message: string): QuoteFeeResult => ({
  ok: false,
  refusal,
  message,
})

/** Sets `orderId`'s delivery fee and opens its payment window, or says why not. See the header. */
export async function quoteDeliveryFee(
  payload: Payload,
  input: QuoteFeeInput,
): Promise<QuoteFeeResult> {
  const staff: Staff | null = staffOf(input.actor)
  if (staff === null) return refuse('not_staff', 'Only staff set a delivery price.')
  if (!isValidFee(input.feeIdr)) {
    return refuse(
      'invalid_fee',
      'The delivery fee must be a whole number of rupiah, from 0 to 10,000,000.',
    )
  }
  const at = input.now ?? new Date()
  const settings = await loadOrderSettings(payload)

  const result = await inTransaction(payload, async (tx): Promise<QuoteFeeResult> => {
    const order = await lockForQuote(tx, input.orderId)
    if (order === null) return refuse('not_found', 'There is no such order.')
    if (!reaches(staff, order.store)) {
      return refuse('forbidden', 'That order belongs to another store.')
    }
    if (order.status !== 'awaiting_quote') {
      return refuse('not_awaiting_quote', 'This order is not awaiting a delivery price.')
    }
    if (order.expiresAt.getTime() <= at.getTime()) {
      return refuse('expired', 'The window to quote this order has closed.')
    }

    const totalIdr = order.subtotalIdr - order.discountIdr + input.feeIdr
    const expiresAt = new Date(at.getTime() + settings.orderExpiryMinutes * 60_000)
    const updated = await tx.rows(sql`
      UPDATE orders
         SET status = 'pending_payment', totals_delivery_fee = ${input.feeIdr},
             totals_total = ${totalIdr}, expires_at = ${expiresAt}, updated_at = ${at}
       WHERE id = ${order.id} AND status = 'awaiting_quote'
      RETURNING id`)
    if (updated.length !== 1) {
      throw new Error(`orders: order ${order.id} left awaiting_quote under its lock`)
    }
    await addUserHistory(tx, order.id, {
      from: 'awaiting_quote',
      to: 'pending_payment',
      at,
      by: staff.id,
      note: `Delivery fee set to Rp ${input.feeIdr.toLocaleString('id-ID')}.`,
    })
    return { ok: true, orderId: order.id, totalIdr, expiresAt }
  })
  if (result.ok) {
    // "Your price is ready" (TASKS.md 6.6, orchestrator decision B): best-effort, after commit.
    await notifyOrderEvent(payload, {
      orderId: result.orderId,
      from: 'awaiting_quote',
      to: 'pending_payment',
    }).catch(() => {})
  }
  return result
}
