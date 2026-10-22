/**
 * A payment that settles after its order expired (COMMERCE.md §13; TASKS.md 10.7.b; finding R-1 of
 * `docs/gates/rehearsal.md`) — carried out inside `./apply`'s transaction, after its ledger row is
 * written, with the order already locked:
 *
 * 1. **Re-take the units** at the order's own store, in the lock order, by the order code's own
 *    single-statement decrement (`takeLines`: `UPDATE … WHERE quantity >= n`, under a short lock).
 *    Every line or none: a line the store no longer holds rolls the others back to the savepoint.
 * 2. **`expired` → `paid`**, a compare-and-set, with how and when it was paid — whether or not the
 *    units came back, because the money is in. The history row says which; when they did not, its
 *    note starts with `UNITS_GONE_NOTE`, so a later cancel or reassign gives back nothing the
 *    order never held (`../fulfilment/held-units`).
 * 3. **The discount's use** is counted again (the expiry gave it back): the buyer paid the
 *    discounted price, so the code was used. The counter comes last in the lock order.
 * 4. **The flag** for staff: "stock re-taken, send it", or "stock gone — reassign, or cancel and
 *    return the money" (`./decide`).
 *
 * **Contention** (TASKS.md 10.5): a stock row locked past the short timeout, while it still holds
 * the units, is neither "re-taken" nor "gone" — it is thrown as lock contention, so `./apply`
 * rolls everything back (the ledger row with it) and answers `busy`: Midtrans retries, and the
 * retry decides on what the row then holds. Never a 500, never a flag decided on a busy row.
 *
 * A replay of the same notification never reaches here: its ledger insert finds the dedupe key and
 * stops first, and a delivery racing it waits on the order's lock, then reads it `paid`.
 */
import { UNITS_GONE_NOTE } from '../fulfilment/held-units'
import { orderUnits, storeName } from '../fulfilment/order-sql'
import { takeLines } from '../orders/order-sql'
import type { Decision, LockedOrder } from './decide'
import type { MidtransStatus } from './notification'
import { addHistory, flagOrder } from './order-sql'
import { sql, wholeOf, type Tx } from './transaction'

/** Lock contention on a stock row, thrown to roll the whole apply back (`isLockContention`). */
class StockRowBusy extends Error {
  readonly code = '55P03'
  constructor() {
    super('payments: a stock row stayed locked while re-taking a late payment’s units')
  }
}

export type LatePayment = { readonly retaken: boolean }

export async function applyLatePayment(
  tx: Tx,
  order: LockedOrder,
  status: MidtransStatus,
  decision: Decision,
  at: Date,
): Promise<LatePayment> {
  const [row] = await tx.rows(sql`
    SELECT store_id, discount_code FROM orders WHERE id = ${order.id}`)
  const store = wholeOf(row?.store_id, 'orders.store_id')
  // The expiry gave every unit back (`./release`), so every unit is re-taken: in the lock order,
  // as `orderUnits` sorts them (the release's and the order code's own order). Every line or
  // none: `takeLines` stops at the first line the store cannot fill, leaving the lines before it
  // taken, so a short store rolls back to this savepoint — the rest of the apply still commits.
  await tx.rows(sql.raw('SAVEPOINT late_retake'))
  const taken = await takeLines(tx, store, await orderUnits(tx, order.id), at)
  if (!taken.taken && taken.busy) throw new StockRowBusy()
  await tx.rows(
    sql.raw(taken.taken ? 'RELEASE SAVEPOINT late_retake' : 'ROLLBACK TO SAVEPOINT late_retake'),
  )
  const retaken = taken.taken

  const updated = await tx.rows(sql`
    UPDATE orders
       SET status = 'paid', payment_method = ${status.paymentType},
           payment_transaction_id = ${status.transactionId}, payment_paid_at = ${at}, updated_at = ${at}
     WHERE id = ${order.id} AND status = 'expired'
    RETURNING id`)
  if (updated.length !== 1)
    throw new Error(`payments: order ${order.id} left expired under its lock`)

  const paidBy = `Paid by ${status.paymentType ?? 'Midtrans'}, attempt ${status.midtransOrderId}, after the order expired.`
  const where = await storeName(tx, store)
  await addHistory(tx, order.id, {
    from: 'expired',
    to: 'paid',
    actor: 'midtrans',
    at,
    note: retaken
      ? `${paidBy} Its units were re-taken at ${where}.`
      : `${UNITS_GONE_NOTE} ${paidBy} ${where} no longer held every unit.`,
  })

  if (typeof row?.discount_code === 'string' && row.discount_code !== '') {
    await tx.rows(sql`
      UPDATE discounts SET used_count = used_count + 1, updated_at = ${at}
       WHERE code = upper(btrim(${row.discount_code}::text))`)
  }

  const flag = retaken ? decision.flag : decision.goneFlag
  if (flag) await flagOrder(tx, order.id, flag, at)
  return { retaken }
}
