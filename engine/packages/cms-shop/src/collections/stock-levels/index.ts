/**
 * `stock-levels` — how many of a product (or a variant) a store can still sell (CONTENT-MODEL.md
 * §4; COMMERCE.md §4; TASKS.md 3.3.b). One row per store, product and variant SKU.
 *
 * - **`quantity`** is the physical count less the units the store's open orders hold, so a
 *   recount never re-sells a held unit. People enter `physicalCount`; the server stores the
 *   difference under the row's lock (`./count`). The order code's atomic decrement and release
 *   change `quantity` in SQL (phases 6–7).
 * - **The database** keeps one row per key and never a negative or fractional quantity
 *   (`./constraints`).
 * - **Found** by the product's name or SKU, or the variant's SKU: `productName` and `productSku` are
 *   virtual fields linked to the product (no column), so a renamed product is found by its new name.
 * - **Who** (`./access`): the owner everything; an editor reads every row and enters counts;
 *   store staff read and count their own store's rows only.
 */
import { hiddenFromAllButAllStaff } from '@engine/cms-core/access'
import { dbConstraints } from '@engine/cms-core/db'
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { KEY_ACCESS, QUANTITY_ACCESS, STOCK_LEVELS_ACCESS } from './access'
import { STOCK_LEVEL_CONSTRAINTS } from './constraints'
import { blankVariantIsNone, countToQuantity } from './count'
import { stockImportEndpoint } from './import-endpoint'

export const StockLevels: CollectionConfig = {
  slug: 'stock-levels',
  labels: {
    singular: { en: 'Stock level', id: 'Stok' },
    plural: { en: 'Stock', id: 'Stok' },
  },
  admin: {
    group: ADMIN_GROUPS.stores,
    hidden: hiddenFromAllButAllStaff,
    // A row reads as its product's name, and is found by that name or a SKU (TASKS.md 27.1.c):
    // `productName` and `productSku` are the product's own, joined at read time, never stored.
    useAsTitle: 'productName',
    listSearchableFields: ['productName', 'productSku', 'variantSku'],
    defaultColumns: ['productName', 'store', 'variantSku', 'quantity', 'updatedAt'],
    description: {
      en: 'What each store can still sell. Enter what is on the shelf; units waiting for a driver are taken off for you.',
      id: 'Jumlah yang masih bisa dijual setiap toko. Masukkan yang ada di rak; unit yang menunggu pengemudi dikurangi otomatis.',
    },
  },
  access: STOCK_LEVELS_ACCESS,
  endpoints: [stockImportEndpoint],
  custom: dbConstraints(...STOCK_LEVEL_CONSTRAINTS),
  hooks: { beforeChange: [countToQuantity] },
  fields: [
    {
      name: 'store',
      type: 'relationship',
      relationTo: 'stores',
      label: { en: 'Store', id: 'Toko' },
      required: true,
      index: true,
      access: KEY_ACCESS,
    },
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      label: { en: 'Product', id: 'Produk' },
      required: true,
      index: true,
      access: KEY_ACCESS,
    },
    {
      name: 'variantSku',
      type: 'text',
      label: { en: 'Variant SKU', id: 'SKU varian' },
      maxLength: 64,
      access: KEY_ACCESS,
      hooks: { beforeValidate: [blankVariantIsNone] },
      admin: {
        description: {
          en: 'For a product with variants, the variant this row counts. Empty for a product without.',
          id: 'Untuk produk bervarian, varian yang dihitung baris ini. Kosong untuk produk tanpa varian.',
        },
      },
    },
    {
      name: 'productName',
      type: 'text',
      virtual: 'product.name',
      label: { en: 'Product name', id: 'Nama produk' },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'productSku',
      type: 'text',
      virtual: 'product.sku',
      label: { en: 'Product SKU', id: 'SKU produk' },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'quantity',
      type: 'number',
      label: {
        en: 'Can still be sold (worked out for you)',
        id: 'Masih bisa dijual (dihitung otomatis)',
      },
      required: true,
      defaultValue: 0,
      min: 0,
      access: QUANTITY_ACCESS,
      admin: {
        // In the sidebar so the count staff type comes first in the form (field order is the
        // generated types' order, so the fields themselves are not moved).
        position: 'sidebar',
        readOnly: true,
        description: {
          en: 'The shelf count less the units held by orders not yet collected by a driver.',
          id: 'Jumlah di rak dikurangi unit pesanan yang belum diambil pengemudi.',
        },
      },
    },
    {
      name: 'physicalCount',
      type: 'number',
      virtual: true,
      label: {
        en: 'Count on the shelf — type the number here',
        id: 'Jumlah di rak — isi angkanya di sini',
      },
      min: 0,
      admin: {
        readOnly: false,
        description: {
          en: 'Enter what you count on the shelf today, including units packed for an order but not yet collected.',
          id: 'Masukkan jumlah yang Anda hitung di rak hari ini, termasuk unit yang sudah dikemas untuk pesanan tetapi belum diambil.',
        },
      },
    },
  ],
}
