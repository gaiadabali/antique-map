/**
 * Availability, computed live (6.1.a; COMMERCE.md §4). One aggregate read of `stock-levels`
 * joined to active stores answers, per product and per variant, whether any active store can
 * still sell a unit. It decides a purchase, so it is never cached (AGENTS.md, ARCHITECTURE.md
 * §6) — the pages merge it into the cached catalogue reads in their own body.
 *
 * The aggregate exposes nothing: no store id, code, area or quantity crosses this module —
 * the answer is a boolean per product and per variant SKU, and nothing else.
 */
import type { Payload } from 'payload'

import { cmsPool } from '@engine/cms/instance'

/** One product's answer: the product itself, and each of its variant SKUs, can be sold or not. */
export type ProductAvailability = {
  readonly product: boolean
  readonly variants: ReadonlyMap<string, boolean>
}

/**
 * `stock_levels` holds one row per store, product and variant SKU; `stores.active` is the shop's
 * notion of "can take orders" (CONTENT-MODEL.md §4). `MAX(quantity) > 0` over active stores is
 * "some store has it" — never summed, since two stores' units never join one order.
 */
const AVAILABILITY_SQL = `
  SELECT sl.product_id, sl.variant_sku, MAX(sl.quantity) AS sellable
  FROM stock_levels AS sl
  JOIN stores AS st ON st.id = sl.store_id
  WHERE st.active AND sl.product_id = ANY($1)
  GROUP BY sl.product_id, sl.variant_sku
  HAVING MAX(sl.quantity) > 0
`

/**
 * The live availability of many products in one read. A variant SKU answers `true` only through
 * its own row; a product with variants is available when any of them is, and a product without
 * variants through its unvarianted row.
 */
export async function availabilityFor(
  payload: Payload,
  productIds: readonly number[],
): Promise<ReadonlyMap<number, ProductAvailability>> {
  type MutableAnswer = { product: boolean; variants: Map<string, boolean> }
  const answers = new Map<number, MutableAnswer>()
  const ids = productIds.filter((id) => Number.isSafeInteger(id) && id > 0)
  if (ids.length === 0) return answers
  const pool = cmsPool(payload)
  const client = await pool.connect()
  let rows: Record<string, unknown>[]
  try {
    const result = await client.query(AVAILABILITY_SQL, [ids])
    rows = result.rows
  } finally {
    client.release()
  }
  for (const id of ids) answers.set(id, { product: false, variants: new Map() })
  for (const row of rows) {
    const id = Number(row.product_id)
    const answer = answers.get(id)
    if (!answer) continue
    const sku = row.variant_sku
    if (sku === null || sku === undefined) {
      // An unvarianted row: the product's own answer. A varianted product may also carry one —
      // it counts for the product too, but never stands in for a variant.
      answers.set(id, { ...answer, product: true })
    } else if (typeof sku === 'string') {
      answer.variants.set(sku, true)
      if (!answer.product) answers.set(id, { ...answer, product: true })
    }
  }
  return answers
}

/** Merge a card's or a product's cached projection with its live answer. Pure. */
export function withAvailability<T extends { id: number; available: boolean }>(
  item: T,
  availability: ProductAvailability | undefined,
): T {
  return { ...item, available: availability?.product ?? false }
}
