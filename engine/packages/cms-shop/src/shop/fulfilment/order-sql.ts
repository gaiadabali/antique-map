/**
 * The statements fulfilment runs, each inside the caller's transaction (the payments core's seam,
 * `../payments/transaction`: READ COMMITTED, `lock_timeout`, raw SQL on the adapter's session).
 * Values go as parameters; enum columns take their type from the column.
 *
 * **Lock order** (ARCHITECTURE.md §7): the order row first (`lockOrder`), then stock rows in
 * (product id, variant SKU) order as Postgres sorts them — the order code's and the expiry's order
 * — and, where one line touches two stores (a reassign), the lower store id first. Two
 * transactions therefore always meet a shared row in the same order and never deadlock.
 */
import type { OrderStatus } from '../../collections/orders/statuses'
import { rowId } from '../payments/order-sql'
import { sql, wholeOf, type Tx } from '../payments/transaction'

export type LockedOrder = {
  readonly id: number
  readonly status: OrderStatus
  readonly store: number
  readonly driverImageKey: string | null
  readonly pin: { readonly lat: number; readonly lng: number }
  readonly discountCode: string | null
}

/** Locks the order (`FOR UPDATE`) and reads what fulfilment decides on; null when there is none. */
export async function lockOrder(tx: Tx, orderId: number): Promise<LockedOrder | null> {
  const [row] = await tx.rows(sql`
    SELECT id, status::text AS status, store_id, driver_image_key, delivery_lat, delivery_lng,
           discount_code
      FROM orders WHERE id = ${orderId}
       FOR UPDATE`)
  if (!row) return null
  return {
    id: wholeOf(row.id, 'orders.id'),
    status: String(row.status) as OrderStatus,
    store: wholeOf(row.store_id, 'orders.store_id'),
    driverImageKey:
      typeof row.driver_image_key === 'string' && row.driver_image_key !== ''
        ? row.driver_image_key
        : null,
    pin: { lat: Number(row.delivery_lat), lng: Number(row.delivery_lng) },
    discountCode:
      typeof row.discount_code === 'string' && row.discount_code !== '' ? row.discount_code : null,
  }
}

/** `from` → `to`, a compare-and-set under the caller's lock: one row, or a thrown defect. */
export async function setStatus(
  tx: Tx,
  orderId: number,
  from: OrderStatus,
  to: OrderStatus,
  at: Date,
) {
  const updated = await tx.rows(sql`
    UPDATE orders SET status = ${to}, updated_at = ${at}
     WHERE id = ${orderId} AND status = ${from}
    RETURNING id`)
  if (updated.length !== 1) {
    throw new Error(`fulfilment: order ${orderId} left ${from} under its lock`)
  }
}

export type HistoryEntry = {
  readonly from: OrderStatus
  readonly to: OrderStatus
  readonly at: Date
  /** The member of staff who acted. */
  readonly by: number
  readonly note: string | null
}

/** Appends one entry, by a person, to the order's history. */
export async function addUserHistory(tx: Tx, orderId: number, entry: HistoryEntry) {
  const note = entry.note === null ? null : entry.note.slice(0, 500)
  await tx.rows(sql`
    INSERT INTO orders_history (_order, _parent_id, id, "from", "to", at, actor, by_id, note)
    VALUES ((SELECT COALESCE(MAX(_order), 0) + 1 FROM orders_history WHERE _parent_id = ${orderId}),
            ${orderId}, ${rowId()}, ${entry.from}, ${entry.to}, ${entry.at}, 'user', ${entry.by},
            ${note})`)
}

export type Unit = { readonly productId: number; readonly variantSku: string | null; qty: number }

/** The order's units per product and variant, in the lock order. */
export async function orderUnits(tx: Tx, orderId: number): Promise<Unit[]> {
  const rows = await tx.rows(sql`
    SELECT product_id, variant_sku, SUM(qty) AS qty
      FROM orders_lines WHERE _parent_id = ${orderId}
     GROUP BY product_id, variant_sku
     ORDER BY product_id, variant_sku`)
  return rows.map((row) => ({
    productId: wholeOf(row.product_id, 'orders_lines.product_id'),
    variantSku: typeof row.variant_sku === 'string' ? row.variant_sku : null,
    qty: wholeOf(row.qty, 'orders_lines.qty'),
  }))
}

/**
 * Puts `unit.qty` back on `store`'s shelf: one increment, or — when staff deleted the row since —
 * the row written back holding the returned units (as the expiry's release does).
 */
export async function putBack(tx: Tx, store: number, unit: Unit, at: Date) {
  const returned = await tx.rows(sql`
    UPDATE stock_levels SET quantity = quantity + ${unit.qty}, updated_at = ${at}
     WHERE store_id = ${store} AND product_id = ${unit.productId}
       AND variant_sku IS NOT DISTINCT FROM ${unit.variantSku}
    RETURNING id`)
  if (returned.length === 0) {
    await tx.rows(sql`
      INSERT INTO stock_levels (store_id, product_id, variant_sku, quantity, updated_at, created_at)
      VALUES (${store}, ${unit.productId}, ${unit.variantSku}, ${unit.qty}, ${at}, ${at})`)
  }
}

/** Gives back the use an unpaid order made of its discount code (COMMERCE.md §5), as expiry does. */
export async function giveBackDiscount(tx: Tx, code: string, at: Date) {
  await tx.rows(sql`
    UPDATE discounts SET used_count = used_count - 1, updated_at = ${at}
     WHERE code = upper(btrim(${code}::text)) AND used_count > 0`)
}

export type StoreRow = {
  readonly id: number
  readonly code: string
  readonly name: string
  readonly area: string | null
  readonly lat: number
  readonly lng: number
}

/** An active store with a pin, or null. Read without a lock: nothing here changes a store. */
export async function activeStore(tx: Tx, storeId: number): Promise<StoreRow | null> {
  const [row] = await tx.rows(sql`
    SELECT id, code, name, area, lat, lng FROM stores
     WHERE id = ${storeId} AND active IS TRUE AND lat IS NOT NULL AND lng IS NOT NULL`)
  if (!row) return null
  return {
    id: wholeOf(row.id, 'stores.id'),
    code: String(row.code),
    name: String(row.name),
    area: typeof row.area === 'string' ? row.area : null,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }
}

/** A store's name for a history note, active or not. */
export async function storeName(tx: Tx, storeId: number): Promise<string> {
  const [row] = await tx.rows(sql`SELECT code, name FROM stores WHERE id = ${storeId}`)
  return row ? `${String(row.name)} (${String(row.code)})` : `store ${storeId}`
}
