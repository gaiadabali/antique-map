/**
 * The database's guards for orders (COMMERCE.md §2, §8; TASKS.md 3.3.e: "an order cannot exist
 * without a store or a priced total"), through the constraint seam:
 *
 * - **`store_id` NOT NULL** — from the field's `required` (a database test proves it): every order
 *   names the store its stock was taken from, and that store cannot be deleted under it.
 * - **`orders_totals_priced`** — the subtotal, discount and total are present and non-negative, the
 *   discount no more than the subtotal, and `total = subtotal − discount + deliveryFee` exactly,
 *   the fee taken as zero while it is unset (COMMERCE.md §2; TASKS.md 6.6: `awaiting_quote` holds
 *   no fee yet): an order never carries a total that is not the sum of its parts. A replacement
 *   order (§12) totals Rp 0 — subtotal, discount, fee and total all 0 — and satisfies it; its
 *   lines keep their original unit price for the record (`lineTotal = unitPrice × qty` still holds).
 * - **`orders_totals_whole`** — whole rupiah, every one set; the delivery fee too, once quoted.
 * - **`orders_lines_priced`** — a line has a whole quantity of at least one, a whole unit price of
 *   zero or more, and `lineTotal = unitPrice × qty`.
 * - **`orders_tracking_token_hash_shape`** — a SHA-256 in hex, so a raw token can never be stored
 *   by mistake (COMMERCE.md §10).
 * - **`orders_distance_non_negative`** — a distance, if known, is not below zero.
 */
import type { ConstraintSet } from '../../db/constraints'

const REQUIRED_AMOUNTS = ['totals_subtotal', 'totals_discount', 'totals_total']

export const ORDER_CONSTRAINTS: readonly ConstraintSet[] = [
  {
    table: 'orders',
    checks: {
      orders_totals_priced: [
        ...REQUIRED_AMOUNTS.map((column) => `${column} IS NOT NULL AND ${column} >= 0`),
        '(totals_delivery_fee IS NULL OR totals_delivery_fee >= 0)',
        'totals_discount <= totals_subtotal',
        'totals_total = totals_subtotal - totals_discount + COALESCE(totals_delivery_fee, 0)',
      ].join(' AND '),
      orders_totals_whole: [
        ...REQUIRED_AMOUNTS.map((column) => `${column} = trunc(${column})`),
        '(totals_delivery_fee IS NULL OR totals_delivery_fee = trunc(totals_delivery_fee))',
      ].join(' AND '),
      orders_tracking_token_hash_shape: `tracking_token_hash ~ '^[0-9a-f]{64}$'`,
      orders_distance_non_negative: 'distance_km IS NULL OR distance_km >= 0',
    },
  },
  {
    table: 'orders_lines',
    checks: {
      orders_lines_priced: [
        'qty IS NOT NULL AND qty >= 1 AND qty = trunc(qty)',
        'unit_price IS NOT NULL AND unit_price >= 0 AND unit_price = trunc(unit_price)',
        'line_total IS NOT NULL AND line_total = unit_price * qty',
      ].join(' AND '),
    },
  },
]
