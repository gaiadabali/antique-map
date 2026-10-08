/**
 * The statements an order is created with, each inside `createOrder`'s transaction (the payments
 * core's seam, `../payments/transaction`: READ COMMITTED, `lock_timeout`, raw SQL on the adapter's
 * own session). Values go as parameters; enum columns take their type from the column.
 *
 * **Lock order** (ARCHITECTURE.md §7) — the same as the expiry's release (`../payments/release`),
 * so the two never deadlock: the stock rows in (product id, variant SKU) order as **Postgres**
 * sorts them (the database's collation, NULLs last — the release's `ORDER BY product_id,
 * variant_sku`), then the discount row, then the new order's own rows.
 */
import { createHash, randomBytes } from 'node:crypto'

import { PAID_ORDER_STATUSES } from '../pricing/payload-adapter'
import { rowId } from '../payments/order-sql'
import { sql, underShortLock, wholeOf, type Tx } from '../payments/transaction'
import type { BagLine } from '../pricing/bag'

/** The tracking token (COMMERCE.md §10; SECURITY.md T1): 32 random bytes, base64url. */
export function newTrackingToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, hash: trackingTokenHash(token) }
}

/** What `orders.tracking_token_hash` holds for a token: its SHA-256, hex. */
export function trackingTokenHash(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

/** `lines` in the lock order, sorted by the database itself so the collation is the release's. */
export async function inLockOrder(tx: Tx, lines: readonly BagLine[]): Promise<BagLine[]> {
  const values = sql.join(
    lines.map(
      (line) => sql`(${line.productId}::int, ${line.variantSku}::varchar, ${line.qty}::int)`,
    ),
    sql`, `,
  )
  const sorted = await tx.rows(sql`
    SELECT v.p, v.s, v.q FROM (VALUES ${values}) AS v(p, s, q) ORDER BY v.p, v.s`)
  return sorted.map((row) => ({
    productId: wholeOf(row.p, 'line product'),
    variantSku: typeof row.s === 'string' ? row.s : null,
    qty: wholeOf(row.q, 'line qty'),
  }))
}

/**
 * THE atomic decrement (COMMERCE.md §4; SECURITY.md P5): one statement that takes `line.qty` from
 * `store`'s row only if the row holds that many. False when no row was updated — another buyer
 * took the units, or the store holds none — and the caller must roll the whole order back.
 */
export async function takeStock(tx: Tx, store: number, line: BagLine, at: Date): Promise<boolean> {
  const updated = await tx.rows(sql`
    UPDATE stock_levels SET quantity = quantity - ${line.qty}, updated_at = ${at}
     WHERE store_id = ${store} AND product_id = ${line.productId}
       AND variant_sku IS NOT DISTINCT FROM ${line.variantSku}
       AND quantity >= ${line.qty}
    RETURNING id`)
  return updated.length === 1
}

/**
 * How long an order waits for a stock row's lock (TASKS.md 10.5.b). A buyer's decrement holds it
 * for milliseconds; longer means a stuck or saturated holder, and a plain "busy, try again" beats
 * a pool connection held past its own 5 s wait (`db/adapter`'s `POOL_CONNECT_TIMEOUT_MS`).
 */
export const STOCK_LOCK_TIMEOUT = '2s'

export type TakeResult =
  | { readonly taken: true }
  /**
   * `line` could not be taken. `busy: false` — its row holds fewer units than asked (another buyer
   * took them; try once more on fresh counts, then `out_of_stock`). `busy: true` — its row was
   * locked past `STOCK_LOCK_TIMEOUT` and still holds the units: a plain "busy, try again".
   */
  | { readonly taken: false; readonly line: BagLine; readonly busy: boolean }

/**
 * Takes every line's units from `store`, in the order given (the lock order, `inLockOrder`), each
 * by `takeStock`, under one short lock (`underShortLock`). A lost lock is never thrown: the line
 * that lost it is read again, unlocked, to tell "sold out" from "busy". Whatever was taken is left
 * for the caller's transaction to commit or roll back.
 */
export async function takeLines(
  tx: Tx,
  store: number,
  lines: readonly BagLine[],
  at: Date,
): Promise<TakeResult> {
  const reached: { line?: BagLine } = {}
  const run = await underShortLock(tx, STOCK_LOCK_TIMEOUT, async () => {
    for (const line of lines) {
      reached.line = line
      if (!(await takeStock(tx, store, line, at))) return line
    }
    return null
  })
  if (run.locked) {
    return run.value === null ? { taken: true } : { taken: false, line: run.value, busy: false }
  }
  const line = reached.line!
  return { taken: false, line, busy: (await stockLeft(tx, store, line)) >= line.qty }
}

/** What `store`'s row for `line` holds as last committed (no lock taken), 0 when there is none. */
export async function stockLeft(tx: Tx, store: number, line: BagLine): Promise<number> {
  const [row] = await tx.rows(sql`
    SELECT quantity FROM stock_levels
     WHERE store_id = ${store} AND product_id = ${line.productId}
       AND variant_sku IS NOT DISTINCT FROM ${line.variantSku}`)
  return row ? wholeOf(row.quantity, 'stock_levels.quantity') : 0
}

export type DiscountClaim = 'claimed' | 'usage_limit' | 'already_used'

/**
 * Counts one use of `code` (COMMERCE.md §5): `used_count + 1` only while the code is active, inside
 * its window and under its limit — a lost race refuses the code. The increment takes the
 * discount's row lock, so the once-per-buyer check after it runs one buyer's orders at a time:
 * an open (`awaiting_quote` or `pending_payment`) order counts as a use as well as a paid one, so
 * two checkouts at once cannot both spend a once-per-buyer code.
 */
export async function claimDiscount(
  tx: Tx,
  code: string,
  contact: { whatsapp: string; email: string },
  at: Date,
): Promise<DiscountClaim> {
  const [claimed] = await tx.rows(sql`
    UPDATE discounts SET used_count = used_count + 1, updated_at = ${at}
     WHERE code = ${code} AND active IS TRUE
       AND (usage_limit IS NULL OR used_count < usage_limit)
       AND (starts_at IS NULL OR starts_at <= ${at}) AND (ends_at IS NULL OR ends_at > ${at})
    RETURNING once_per_buyer`)
  if (!claimed) return 'usage_limit'
  if (claimed.once_per_buyer !== true) return 'claimed'
  const statuses = sql.join(
    ['awaiting_quote', 'pending_payment', ...PAID_ORDER_STATUSES].map((status) => sql`${status}`),
    sql`, `,
  )
  const used = await tx.rows(sql`
    SELECT 1 FROM orders
     WHERE discount_code = ${code} AND status::text IN (${statuses})
       AND (contact_whatsapp = ${contact.whatsapp} OR lower(contact_email) = ${contact.email})
     LIMIT 1`)
  return used.length === 0 ? 'claimed' : 'already_used'
}

/**
 * The next order number: `orders_number_seq` once the migration creates it (`nextval` of a missing
 * sequence is NULL through `to_regclass`); until then the highest number plus one, under a
 * transaction-scoped advisory lock so two orders never draw the same one.
 */
export async function nextOrderNumber(tx: Tx): Promise<number> {
  const [seq] = await tx.rows(sql`SELECT nextval(to_regclass('orders_number_seq')) AS n`)
  if (seq && seq.n !== null && seq.n !== undefined) return wholeOf(seq.n, 'orders_number_seq')
  await tx.rows(sql`SELECT pg_advisory_xact_lock(hashtext('orders.number'))`)
  const [max] = await tx.rows(sql`SELECT COALESCE(MAX(number), 0) + 1 AS n FROM orders`)
  return wholeOf(max?.n, 'the next order number')
}

export type OrderLineRecord = BagLine & {
  readonly sku: string
  readonly name: string
  readonly variantLabel: string | null
  readonly unitIdr: number
  readonly lineIdr: number
  readonly imageId: number | null
}

export type OrderRecord = {
  readonly number: number
  readonly contact: { name: string; whatsapp: string; email: string; locale: 'en' | 'id' }
  readonly delivery: { address: string; notes: string | null; lat: number; lng: number }
  readonly giftNote: string | null
  readonly store: { id: number; code: string; name: string; area: string | null }
  readonly distanceKm: number
  readonly totals: {
    subtotalIdr: number
    discountIdr: number
    /** `null` until the quote move sets it (TASKS.md 6.6). */
    deliveryIdr: number | null
    totalIdr: number
  }
  readonly discount: { code: string; kind: 'percent' | 'fixed'; value: number } | null
  readonly lines: readonly OrderLineRecord[]
  readonly trackingTokenHash: string
  /** The same token, sealed at rest under `ORDER_LINK_KEY` (`./link-key`; TASKS.md 6.6). */
  readonly trackingTokenEnc: string
  readonly expiresAt: Date
  readonly at: Date
}

/**
 * Writes the order `awaiting_quote` (TASKS.md 6.6: no delivery fee yet), its lines and its first
 * history entry; returns its id.
 */
export async function insertOrder(tx: Tx, order: OrderRecord): Promise<number> {
  const { contact, delivery, store, totals, discount, at } = order
  const [row] = await tx.rows(sql`
    INSERT INTO orders (number, site, channel, contact_name, contact_whatsapp, contact_email,
                        contact_locale, delivery_address, delivery_notes, delivery_lat, delivery_lng,
                        gift_note, store_id, store_snapshot_code, store_snapshot_name,
                        store_snapshot_area, distance_km, totals_subtotal, totals_discount,
                        totals_delivery_fee, totals_total, discount_code, discount_kind,
                        discount_value, status, tracking_token_hash, tracking_token_enc, expires_at,
                        needs_attention_flag, updated_at, created_at)
    VALUES (${order.number}, 'shop', 'web', ${contact.name}, ${contact.whatsapp}, ${contact.email},
            ${contact.locale}, ${delivery.address}, ${delivery.notes}, ${delivery.lat},
            ${delivery.lng}, ${order.giftNote}, ${store.id}, ${store.code}, ${store.name},
            ${store.area}, ${order.distanceKm}, ${totals.subtotalIdr}, ${totals.discountIdr},
            ${totals.deliveryIdr}, ${totals.totalIdr}, ${discount?.code ?? null},
            ${discount?.kind ?? null}, ${discount?.value ?? null}, 'awaiting_quote',
            ${order.trackingTokenHash}, ${order.trackingTokenEnc}, ${order.expiresAt}, false, ${at}, ${at})
    RETURNING id`)
  const orderId = wholeOf(row?.id, 'orders.id')

  const lines = sql.join(
    order.lines.map(
      (line, index) => sql`(${index + 1}, ${orderId}, ${rowId()}, ${line.productId},
        ${line.variantSku}, ${line.sku}, ${line.name}, ${line.variantLabel}, ${line.unitIdr},
        ${line.qty}, ${line.lineIdr}, ${line.imageId})`,
    ),
    sql`, `,
  )
  await tx.rows(sql`
    INSERT INTO orders_lines (_order, _parent_id, id, product_id, variant_sku, sku, name,
                              variant_label, unit_price, qty, line_total, image_id)
    VALUES ${lines}`)
  await tx.rows(sql`
    INSERT INTO orders_history (_order, _parent_id, id, "from", "to", at, actor, note)
    VALUES (1, ${orderId}, ${rowId()}, NULL, 'awaiting_quote', ${at}, 'system',
            'Order placed on the shop; stock taken; awaiting a delivery price.')`)
  return orderId
}
