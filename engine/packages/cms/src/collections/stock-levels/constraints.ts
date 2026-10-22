/**
 * The database's guards for stock (CONTENT-MODEL.md §4; COMMERCE.md §4; TASKS.md 3.3.b), through
 * the constraint seam, so the atomic decrement, the release, the import and raw SQL are all held
 * to them:
 *
 * - **`stock_levels_store_product_variant_unique`** — one row per store, product and variant,
 *   `NULLS NOT DISTINCT` so a product without variants (`variant_sku` NULL) has one row per store,
 *   not one per insert. The decrement's `variant_sku IS NOT DISTINCT FROM $variant` then matches
 *   exactly one row. A unique constraint, not a composite primary key (CONVENTIONS.md §13).
 * - **`stock_levels_quantity_non_negative`** — a whole number, never below zero: the decrement's
 *   `quantity >= $qty` guard is the first line, this is the one no code path can skip.
 * - **`stock_levels_variant_sku_not_blank`** — an empty string would be a second "no variant".
 *
 * `store_id` and `product_id` are NOT NULL from the fields' `required`, which a database test
 * proves, so deleting a store or product a row counts fails rather than orphan the row.
 */
import type { ConstraintSet } from '../../db/constraints'
import { wholeCheck } from '../products/money'

export const STOCK_LEVEL_CONSTRAINTS: readonly ConstraintSet[] = [
  {
    table: 'stock_levels',
    checks: {
      stock_levels_quantity_non_negative: wholeCheck('quantity', 0, { nullable: false }),
      stock_levels_variant_sku_not_blank: `variant_sku IS NULL OR btrim(variant_sku) <> ''`,
    },
    unique: {
      stock_levels_store_product_variant_unique: {
        columns: ['store_id', 'product_id', 'variant_sku'],
        nullsNotDistinct: true,
      },
    },
  },
]
