/**
 * Expiring an unpaid order and giving its stock back — **exactly once** (COMMERCE.md §4 "Release";
 * SECURITY.md P6; TASKS.md 6.4.c).
 *
 * Inside the caller's transaction:
 * 1. **The compare-and-set** — `UPDATE orders SET status = 'expired' … WHERE id = $1 AND status =
 *    'pending_payment' RETURNING store_id`. Exactly one caller can see a row come back: a second
 *    sweep, a concurrent sweep (it waits for the first's row lock, then re-reads the row and finds
 *    it `expired`), or a late Midtrans `expire` all get none and stop here. No row → nothing
 *    else runs.
 * 2. **The stock** — one `UPDATE stock_levels SET quantity = quantity + $qty` per product and
 *    variant the order holds, at the store it took them from, in (product, variant SKU) order:
 *    the order creation's decrement takes the same rows in the same order, so the two never
 *    deadlock (ARCHITECTURE.md §7). A row deleted since (staff removed it) is written back with
 *    the returned units.
 * 3. **The discount use** is given back (COMMERCE.md §5) — counters last in the lock order.
 * 4. A history entry.
 *
 * All of it commits with the status change or not at all.
 */
import { addHistory, type HistoryActor } from './order-sql'
import { sql, wholeOf, type Tx } from './transaction'

export type Release = {
  /** False when the order was not `pending_payment`: someone else moved it, nothing was done. */
  readonly released: boolean
  /** The units returned per stock key, for the caller's log and tests. */
  readonly units: ReadonlyArray<{ product: number; variantSku: string | null; qty: number }>
}

export async function expireAndRelease(
  tx: Tx,
  orderId: number,
  at: Date,
  actor: HistoryActor,
  note: string,
): Promise<Release> {
  const [expired] = await tx.rows(sql`
    UPDATE orders SET status = 'expired', updated_at = ${at}
     WHERE id = ${orderId} AND status = 'pending_payment'
    RETURNING store_id, discount_code`)
  if (!expired) return { released: false, units: [] }
  const store = wholeOf(expired.store_id, 'orders.store_id')

  const lines = await tx.rows(sql`
    SELECT product_id, variant_sku, SUM(qty) AS qty
      FROM orders_lines WHERE _parent_id = ${orderId}
     GROUP BY product_id, variant_sku
     ORDER BY product_id, variant_sku`)
  const units = lines.map((line) => ({
    product: wholeOf(line.product_id, 'orders_lines.product_id'),
    variantSku: typeof line.variant_sku === 'string' ? line.variant_sku : null,
    qty: wholeOf(line.qty, 'orders_lines.qty'),
  }))

  for (const unit of units) {
    const returned = await tx.rows(sql`
      UPDATE stock_levels SET quantity = quantity + ${unit.qty}, updated_at = ${at}
       WHERE store_id = ${store} AND product_id = ${unit.product}
         AND variant_sku IS NOT DISTINCT FROM ${unit.variantSku}
      RETURNING id`)
    if (returned.length === 0) {
      await tx.rows(sql`
        INSERT INTO stock_levels (store_id, product_id, variant_sku, quantity, updated_at, created_at)
        VALUES (${store}, ${unit.product}, ${unit.variantSku}, ${unit.qty}, ${at}, ${at})`)
    }
  }

  if (typeof expired.discount_code === 'string' && expired.discount_code !== '') {
    await tx.rows(sql`
      UPDATE discounts SET used_count = used_count - 1, updated_at = ${at}
       WHERE code = upper(btrim(${expired.discount_code}::text)) AND used_count > 0`)
  }

  await addHistory(tx, orderId, { from: 'pending_payment', to: 'expired', actor, at, note })
  return { released: true, units }
}
