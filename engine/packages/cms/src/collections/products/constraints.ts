/**
 * The database's guards for products (CONVENTIONS.md §5, §13), through the constraint seam: a
 * price is whole rupiah above zero — on the product (`products.price`, NULL while a draft has
 * none) and on a variant (`products_variants.price`, NULL when it takes the product's). The SKUs'
 * uniqueness is the fields' own `unique` indexes (`products_sku_idx`,
 * `products_variants_sku_idx`).
 */
import type { ConstraintSet } from '../../db/constraints'
import { wholeCheck } from './money'

export const PRODUCT_CONSTRAINTS: readonly ConstraintSet[] = [
  { table: 'products', checks: { products_price_whole_rupiah: wholeCheck('price', 1) } },
  {
    table: 'products_variants',
    checks: { products_variants_price_whole_rupiah: wholeCheck('price', 1) },
  },
]
