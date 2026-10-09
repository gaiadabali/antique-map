/**
 * The statements a replacement order is made with (COMMERCE.md §12; TASKS.md 10.7.a), each inside
 * `./replace`'s transaction, with the original locked (`./order-sql` `lockOrder`). Values go as
 * parameters; enum columns take their type from the column (`INSERT … VALUES`, never a SELECT
 * list, where a parameter would be text).
 */
import { rowId } from '../payments/order-sql'
import { sql, wholeOf, type Row, type Tx } from '../payments/transaction'

/** One line of the original, as it was sold. */
export type SoldLine = {
  readonly id: string
  readonly productId: number
  readonly variantSku: string | null
  readonly sku: string
  readonly name: string
  readonly variantLabel: string | null
  readonly unitPrice: number
  readonly qty: number
  readonly imageId: number | null
}

export async function soldLines(tx: Tx, orderId: number): Promise<SoldLine[]> {
  const rows = await tx.rows(sql`
    SELECT id, product_id, variant_sku, sku, name, variant_label, unit_price, qty, image_id
      FROM orders_lines WHERE _parent_id = ${orderId} ORDER BY _order`)
  return rows.map((row) => ({
    id: String(row.id),
    productId: wholeOf(row.product_id, 'orders_lines.product_id'),
    variantSku: typeof row.variant_sku === 'string' ? row.variant_sku : null,
    sku: String(row.sku),
    name: String(row.name),
    variantLabel: typeof row.variant_label === 'string' ? row.variant_label : null,
    unitPrice: wholeOf(row.unit_price, 'orders_lines.unit_price'),
    qty: wholeOf(row.qty, 'orders_lines.qty'),
    imageId: row.image_id === null ? null : wholeOf(row.image_id, 'orders_lines.image_id'),
  }))
}

const key = (productId: number, variantSku: string | null) => `${productId}|${variantSku ?? ''}`

/**
 * The units already replaced of each product and variant of `orderId`, by its replacements that
 * still stand (not cancelled or expired) — so no number of replacements ever exceeds what was sold.
 */
export async function alreadyReplaced(tx: Tx, orderId: number): Promise<Map<string, number>> {
  const rows = await tx.rows(sql`
    SELECT l.product_id, l.variant_sku, SUM(l.qty) AS qty
      FROM orders o JOIN orders_lines l ON l._parent_id = o.id
     WHERE o.replacement_of_id = ${orderId} AND o.channel = 'replacement'
       AND o.status::text NOT IN ('cancelled', 'expired')
     GROUP BY l.product_id, l.variant_sku`)
  const replaced = new Map<string, number>()
  for (const row of rows) {
    const variant = typeof row.variant_sku === 'string' ? row.variant_sku : null
    replaced.set(key(wholeOf(row.product_id, 'product'), variant), wholeOf(row.qty, 'qty'))
  }
  return replaced
}

export const unitKey = key

/** The original's row as the replacement copies it: who, where, and from which store. */
export async function originalRow(tx: Tx, orderId: number): Promise<Row> {
  const [row] = await tx.rows(sql`
    SELECT number, site, contact_name, contact_whatsapp, contact_email, contact_locale,
           delivery_address, delivery_notes, delivery_lat, delivery_lng, gift_note, store_id,
           store_snapshot_code, store_snapshot_name, store_snapshot_area, distance_km
      FROM orders WHERE id = ${orderId}`)
  if (!row) throw new Error(`fulfilment: order ${orderId} vanished under its lock`)
  return row
}

export type ReplacementRecord = {
  readonly number: number
  readonly original: { readonly id: number; readonly row: Row }
  readonly lines: ReadonlyArray<SoldLine & { readonly replaceQty: number }>
  readonly trackingTokenHash: string
  readonly trackingTokenEnc: string
  readonly by: number
  readonly note: string
  readonly at: Date
}

/**
 * Writes the replacement `processing` (COMMERCE.md §12): the original's contact, delivery and
 * store; each line at its original unit price, for the record; and every total Rp 0 — no
 * subtotal, no discount, no fee, no payment, no payment window. Its first history row names the
 * member of staff and the note. Returns its id.
 */
export async function insertReplacement(tx: Tx, record: ReplacementRecord): Promise<number> {
  const { row: o, id: originalId } = record.original
  const { at } = record
  const [inserted] = await tx.rows(sql`
    INSERT INTO orders (number, site, channel, replacement_of_id, contact_name, contact_whatsapp,
                        contact_email, contact_locale, delivery_address, delivery_notes,
                        delivery_lat, delivery_lng, gift_note, store_id, store_snapshot_code,
                        store_snapshot_name, store_snapshot_area, distance_km, totals_subtotal,
                        totals_discount, totals_delivery_fee, totals_total, status,
                        tracking_token_hash, tracking_token_enc, needs_attention_flag,
                        updated_at, created_at)
    VALUES (${record.number}, ${o.site}, 'replacement', ${originalId}, ${o.contact_name},
            ${o.contact_whatsapp}, ${o.contact_email}, ${o.contact_locale}, ${o.delivery_address},
            ${o.delivery_notes}, ${o.delivery_lat}, ${o.delivery_lng}, ${o.gift_note},
            ${o.store_id}, ${o.store_snapshot_code}, ${o.store_snapshot_name},
            ${o.store_snapshot_area}, ${o.distance_km}, 0, 0, 0, 0, 'processing',
            ${record.trackingTokenHash}, ${record.trackingTokenEnc}, false, ${at}, ${at})
    RETURNING id`)
  const orderId = wholeOf(inserted?.id, 'orders.id')

  const lines = sql.join(
    record.lines.map(
      (line, index) => sql`(${index + 1}, ${orderId}, ${rowId()}, ${line.productId},
        ${line.variantSku}, ${line.sku}, ${line.name}, ${line.variantLabel}, ${line.unitPrice},
        ${line.replaceQty}, ${line.unitPrice * line.replaceQty}, ${line.imageId})`,
    ),
    sql`, `,
  )
  await tx.rows(sql`
    INSERT INTO orders_lines (_order, _parent_id, id, product_id, variant_sku, sku, name,
                              variant_label, unit_price, qty, line_total, image_id)
    VALUES ${lines}`)
  await tx.rows(sql`
    INSERT INTO orders_history (_order, _parent_id, id, "from", "to", at, actor, by_id, note)
    VALUES (1, ${orderId}, ${rowId()}, NULL, 'processing', ${at}, 'user', ${record.by},
            ${`Replacement for order #${String(o.number)}, Rp 0: ${record.note}`.slice(0, 500)})`)
  return orderId
}
