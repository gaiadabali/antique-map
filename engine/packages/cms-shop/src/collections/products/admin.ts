/**
 * The product's admin, as one screen (TASKS.md 27.2; the plan's §3.2): what the editor and the list
 * add to Payload's own, wired by component path (`@engine/cms-shop/admin/views#…`, the import map's;
 * code in `admin/products/`). Admin configuration only: the `ui` fields hold no data, so the
 * schema, the database and `payload-types.ts` are as they were.
 *
 * - **The editor** — the category under the name (`categoryPicker`), the Draft / Published
 *   control (`publishing`), the photo wall and the variant builder (the `images` and `variants`
 *   fields' own components, in `./fields`), stock per store (`stock`), Duplicate and View on the
 *   site beside Save and Publish.
 * - **The list** — a thumbnail and the total stock as columns, the quick filters and the bulk move
 *   above the table.
 */
import type { CollectionConfig, UIField } from 'payload'

/** A component of the admin barrel, by the path the import map resolves. */
export const adminComponent = (name: string) => `@engine/cms-shop/admin/views#${name}`

/** The category's input in the main column; the `category` field itself renders nothing. */
export const categoryPicker: UIField = {
  name: 'categoryPicker',
  type: 'ui',
  label: { en: 'Category', id: 'Kategori' },
  admin: {
    disableListColumn: true,
    components: { Field: adminComponent('ProductCategoryField') },
  },
}

/** Draft or Published, with the button that moves it. */
export const publishing: UIField = {
  name: 'publishing',
  type: 'ui',
  label: { en: 'Status', id: 'Status' },
  admin: {
    disableListColumn: true,
    components: { Field: adminComponent('ProductStatusField') },
  },
}

/** Stock per store on the product; in the list, the total across the stores. */
export const stock: UIField = {
  name: 'stock',
  type: 'ui',
  label: { en: 'Stock', id: 'Stok' },
  admin: {
    components: {
      Field: adminComponent('ProductStockField'),
      Cell: adminComponent('ProductStockCell'),
    },
  },
}

export const PRODUCT_LIST_COLUMNS = [
  'images',
  'name',
  'sku',
  'category',
  'price',
  'stock',
  '_status',
  'updatedAt',
]

export const PRODUCT_ADMIN_COMPONENTS: NonNullable<CollectionConfig['admin']>['components'] = {
  beforeListTable: [adminComponent('ProductListBar')],
  edit: { beforeDocumentControls: [adminComponent('ProductDocActions')] },
}
