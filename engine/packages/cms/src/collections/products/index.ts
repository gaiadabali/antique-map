/**
 * `products` — what the shop sells (CONTENT-MODEL.md §3; TASKS.md 3.3.a): a SKU, a localised name
 * and description, a category, images, one list price in whole rupiah, optional variants, an
 * optional link to the antique it is made from, and `site: shop`. Fields are `./fields`; who
 * reaches it, `./access`; the SKU rules, `./skus`.
 *
 * - **Drafts** are Payload's `_status` (CONTENT-MODEL.md §1). Every save is validated, drafts
 *   included, so a draft never holds a fractional or negative price; what only publishing demands
 *   is checked against `_status` in the validators.
 * - **The database** refuses a price that is not whole rupiah above zero, on the product and on
 *   each variant (`./constraints`), for any write path — the import, a seed, raw SQL.
 * - **Stock** is not here: it is `stock-levels`, per store (COMMERCE.md §4). A product a stock row
 *   or an order line points at is not deleted (`./still-used`): it is unpublished.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButCatalogueStaff } from '../../admin/hidden'
import { dbConstraints } from '../../db/constraints'
import {
  invalidateProductOnChange,
  invalidateProductOnDelete,
} from '../../hooks/product-invalidate'
import { PRODUCTS_ACCESS } from './access'
import { PRODUCT_CONSTRAINTS } from './constraints'
import { PRODUCT_FIELDS } from './fields'
import { refuseDeleteWhileSold } from './still-used'

export const Products: CollectionConfig = {
  slug: 'products',
  labels: {
    singular: { en: 'Product', id: 'Produk' },
    plural: { en: 'Products', id: 'Produk' },
  },
  admin: {
    group: ADMIN_GROUPS.shop,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'name',
    defaultColumns: ['name', 'sku', 'price', '_status', 'updatedAt'],
    listSearchableFields: ['name', 'sku', 'variants.sku'],
    description: {
      en: 'What the shop sells. Stock is entered per store under Stock.',
      id: 'Barang yang dijual toko. Stok dicatat per toko di menu Stok.',
    },
  },
  access: PRODUCTS_ACCESS,
  versions: { drafts: { validate: true } },
  custom: dbConstraints(...PRODUCT_CONSTRAINTS),
  hooks: {
    beforeDelete: [refuseDeleteWhileSold],
    afterChange: [invalidateProductOnChange],
    afterDelete: [invalidateProductOnDelete],
  },
  fields: PRODUCT_FIELDS,
}
