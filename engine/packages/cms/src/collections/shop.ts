/**
 * The shop's collections as today's one CMS holds them (until phase 26): built from
 * `@engine/cms-shop`'s factories with what only this database has — each order, partner and
 * product naming its `site`, and a product's "See the original" a relationship into the gallery's
 * `works` here (the shop's own CMS keeps the antique's stock number, PLAN-V2 §4.3). The schema is
 * exactly what it was before the split.
 */
import {
  ORDER_SERVER_ONLY,
  ordersCollection,
  partnersCollection,
  productsCollection,
} from '@engine/cms-shop/collections'
import type { Field } from 'payload'

/** A shop record's `site`: always `shop`, read-only in the sidebar. */
const shopSite = (extra: Partial<Field> = {}): Field =>
  ({
    name: 'site',
    type: 'select',
    label: { en: 'Site', id: 'Situs' },
    options: [{ value: 'shop', label: { en: 'Old East Indies', id: 'Old East Indies' } }],
    required: true,
    defaultValue: 'shop',
    ...extra,
    admin: { position: 'sidebar', readOnly: true },
  }) as Field

const relatedWork: Field = {
  name: 'relatedWork',
  type: 'relationship',
  relationTo: 'works',
  label: { en: 'See the original', id: 'Lihat aslinya' },
  admin: {
    position: 'sidebar',
    // The antique is picked, never made from a product; Payload's "Add new" button would also read
    // "Add new [object Object]" (the works' bilingual label raw, docs/gates/3.6.md D7).
    allowCreate: false,
    description: {
      en: 'The antique this is made from, if any — linked only while that antique is published.',
      id: 'Barang antik asal produk ini, bila ada — ditautkan hanya selama barang itu terbit.',
    },
  },
}

export const Products = productsCollection({ original: relatedWork, site: shopSite() })

export const Orders = ordersCollection({
  // Written by the server's order code only.
  site: shopSite({ access: ORDER_SERVER_ONLY }),
})

export const Partners = partnersCollection({
  site: {
    name: 'site',
    type: 'select',
    required: true,
    options: [
      { value: 'gallery', label: { en: 'Gallery', id: 'Galeri' } },
      { value: 'shop', label: { en: 'Shop', id: 'Toko' } },
    ],
    admin: { position: 'sidebar' },
  },
})
