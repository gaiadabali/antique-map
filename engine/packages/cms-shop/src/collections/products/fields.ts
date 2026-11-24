/**
 * A product's fields (CONTENT-MODEL.md §3 `products`, §9 "Products"). Saving stays cheap — a draft
 * may lack its category, price and images — and publishing demands them (§8), through
 * `requiredToPublish` and the image rule below; the SKU, the import's key, and the English name
 * are needed on every save.
 *
 * - **`price`** is the one list price, whole rupiah above zero, priced on the server only
 *   (COMMERCE.md §2); a variant without its own price takes the product's.
 * - **`variants`** are rows of the product ("A3", "Indigo"), each with its own SKU (`./skus`).
 *   Availability is never typed here: it is read from `stock-levels` (COMMERCE.md §4).
 * - **`category`** points at the shop's own `categories` (once `terms` of the subject kind).
 * - **`description`** is plain localised text for now: no rich-text editor is configured in the
 *   CMS yet, and CONTENT-MODEL.md §1's restricted Lexical arrives with it (a Found item of 3.3).
 * - **`originalStockNumber`** names the antique it is made from by the gallery's stock number
 *   (PLAN-V2 §4.3); today's one CMS passes its `relatedWork` relationship and `site` instead.
 * - **The admin** is one screen (TASKS.md 27.2, `./admin`): the photos and the variants have
 *   components of their own, and `ui` fields add the category's input, the status control and
 *   stock per store, so no field moves in the data.
 */
import { IMAGES_ONLY } from '@engine/cms-core/collections/media/kinds'
import {
  foldSections,
  IN_DEFAULT_LOCALE_NOTE,
  isPublishing,
  requiredInDefaultLocale,
  requiredToPublish,
  slugField,
  translationStatusField,
} from '@engine/cms-core/fields'
import type { ArrayField, Field, Validate } from 'payload'

import { adminComponent, categoryPicker, publishing, stock } from './admin'
import { bestSeller, themes } from './merchandising'
import { skuOfCopy, slugOfCopy } from './duplicate'
import { wholeNumber } from './money'
import { SKU_MAX_LENGTH, trimSku, validateProductSku, validateVariantSku } from './skus'

const priceToPublish = requiredToPublish('Set the price before publishing.')
const wholePrice = wholeNumber({ min: 1, what: { en: 'The price', id: 'Harga' } })

/** Needed to publish; when set, whole rupiah above zero (drafts included). */
const validatePrice: Validate<number | null | undefined> = (value, args) => {
  const required = priceToPublish(value, args as never)
  return required === true ? wholePrice(value, args) : required
}

const images: ArrayField = {
  name: 'images',
  type: 'array',
  label: { en: 'Photos', id: 'Foto' },
  maxRows: 24,
  // The photo wall (TASKS.md 27.2.b): several dropped at once, ordered by drag; in the list, the cover.
  admin: {
    components: {
      Field: adminComponent('ProductPhotosField'),
      Cell: adminComponent('ProductPhotoCell'),
    },
  },
  validate: (value, { data }) =>
    isPublishing(data) && (!Array.isArray(value) || value.length === 0)
      ? 'Add at least one image before publishing: the shop shows every product with its picture.'
      : true,
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      filterOptions: IMAGES_ONLY,
      label: { en: 'Image', id: 'Gambar' },
      required: true,
      admin: {
        description: {
          en: 'Pick a picture, or Create New to upload one. A new picture asks for four things: alt text (what it shows), Subject = Product, Role = Flat (a product), and Provenance = Photograph of the real thing.',
          id: 'Pilih gambar, atau Create New untuk mengunggah. Gambar baru meminta empat hal: teks alternatif (apa yang ditunjukkan), Subject = Product, Role = Datar (produk), dan Provenance = Foto dari benda aslinya.',
        },
      },
    },
    {
      name: 'caption',
      type: 'text',
      label: { en: 'Caption', id: 'Keterangan' },
      localized: true,
      maxLength: 200,
    },
  ],
}

const variants: ArrayField = {
  name: 'variants',
  type: 'array',
  label: { en: 'Variants', id: 'Varian' },
  maxRows: 100,
  admin: {
    // The variant builder (TASKS.md 27.2.c): options to combinations, as a table.
    components: { Field: adminComponent('ProductVariantsField') },
    description: {
      en: 'Optional: sizes or colours sold under this product, each with its own SKU. A variant without a price takes the product’s.',
      id: 'Opsional: ukuran atau warna yang dijual di bawah produk ini, masing-masing dengan SKU sendiri. Varian tanpa harga memakai harga produk.',
    },
  },
  fields: [
    {
      name: 'sku',
      type: 'text',
      label: { en: 'Variant SKU', id: 'SKU varian' },
      required: true,
      unique: true,
      maxLength: SKU_MAX_LENGTH,
      hooks: { beforeValidate: [trimSku], beforeDuplicate: [skuOfCopy] },
      validate: validateVariantSku,
    },
    {
      name: 'label',
      type: 'text',
      label: { en: 'Label', id: 'Label' },
      localized: true,
      maxLength: 80,
      validate: requiredInDefaultLocale('Name the variant as buyers choose it, e.g. A3 or Indigo.'),
    },
    {
      name: 'price',
      type: 'number',
      label: { en: 'Price (Rp)', id: 'Harga (Rp)' },
      validate: wholeNumber({ min: 1, what: { en: 'A variant’s price', id: 'Harga varian' } }),
    },
    {
      name: 'active',
      type: 'checkbox',
      label: { en: 'On sale', id: 'Dijual' },
      defaultValue: true,
    },
  ],
}

const sku: Field = {
  name: 'sku',
  type: 'text',
  label: { en: 'SKU', id: 'SKU' },
  required: true,
  unique: true,
  maxLength: SKU_MAX_LENGTH,
  hooks: { beforeValidate: [trimSku], beforeDuplicate: [skuOfCopy] },
  validate: validateProductSku,
  admin: {
    width: '40%',
    description: {
      en: 'The code the product and stock spreadsheets match on. Also the SKU of a product without variants.',
      id: 'Kode yang dicocokkan oleh lembar produk dan stok. Juga SKU produk tanpa varian.',
    },
  },
}

const name: Field = {
  name: 'name',
  type: 'text',
  label: { en: 'Name', id: 'Nama' },
  localized: true,
  maxLength: 160,
  validate: requiredInDefaultLocale('Give the product its name in English.'),
  admin: { width: '60%', description: IN_DEFAULT_LOCALE_NOTE },
}

const description: Field = {
  name: 'description',
  type: 'textarea',
  label: { en: 'Description', id: 'Deskripsi' },
  localized: true,
  maxLength: 5000,
  admin: { rows: 8 },
}

const category: Field = {
  name: 'category',
  type: 'relationship',
  relationTo: 'categories',
  label: { en: 'Category', id: 'Kategori' },
  admin: {
    position: 'sidebar',
    // Shown in the main column, under the name, by `categoryPicker` (`./admin`): here, nothing.
    components: { Field: adminComponent('ProductCategoryInPlace') },
    description: {
      en: 'The shop category this product belongs to.',
      id: 'Kategori toko untuk produk ini.',
    },
  },
  validate: requiredToPublish('Choose the category before publishing.'),
}

const price: Field = {
  name: 'price',
  type: 'number',
  label: { en: 'Price (Rp)', id: 'Harga (Rp)' },
  validate: validatePrice,
  admin: {
    description: {
      en: 'Whole rupiah: 95000 for Rp 95.000. The checkout always prices from here, never from the page.',
      id: 'Rupiah bulat: 95000 untuk Rp 95.000. Checkout selalu menghitung harga dari sini, bukan dari halaman.',
    },
    // The list column reads "Rp 95.000", not a bare 95000 (TASKS.md 16).
    components: { Cell: '@engine/cms-shop/admin/views#RupiahCell' },
  },
}

/**
 * "See the original" (PLAN-V2 §4.3): the antique this is made from, by the gallery's stock number —
 * text, not a relationship, so the shop needs no gallery record. The shop resolves it through the
 * gallery's public read API (cached, published only) or shows no link.
 */
export const originalStockNumber: Field = {
  name: 'originalStockNumber',
  type: 'text',
  label: { en: 'See the original', id: 'Lihat aslinya' },
  maxLength: 40,
  hooks: {
    beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() || null : value)],
  },
  admin: {
    position: 'sidebar',
    description: {
      en: 'The stock number of the antique this is made from, if any, as Indies Gallery lists it (e.g. M.0123). Linked only while that antique is published.',
      id: 'Nomor stok barang antik asal produk ini, bila ada, seperti tercantum di Indies Gallery (mis. M.0123). Ditautkan hanya selama barang itu terbit.',
    },
  },
}

const seo: Field = {
  name: 'seo',
  type: 'group',
  label: { en: 'Search engines', id: 'Mesin pencari' },
  admin: {
    description: {
      en: 'Optional. Left empty, the product’s name and description are used.',
      id: 'Opsional. Bila kosong, nama dan deskripsi produk yang dipakai.',
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { en: 'Title', id: 'Judul' },
      localized: true,
      maxLength: 70,
    },
    {
      name: 'description',
      type: 'textarea',
      label: { en: 'Description', id: 'Deskripsi' },
      localized: true,
      maxLength: 160,
    },
  ],
}

const slug = slugField({ from: 'name' })
/** The address, which a duplicate takes the next free one of (`./duplicate`). */
const slugOfProduct: Field = {
  ...slug,
  hooks: { ...slug.hooks, beforeDuplicate: [slugOfCopy] },
}

/**
 * The edit screen as one column, in the order the plan gives (§3.2): name (with the SKU), category,
 * status, description, photos, price and variants, stock per store, and search engines folded
 * closed. The address, the antique it is made from, the site and the translation sit in the
 * sidebar. The data fields keep their order — the generated types follow it — and the `ui`
 * fields, which hold nothing, are placed between them.
 */
export type ProductFieldOptions = {
  /** The link to the original antique: `originalStockNumber` here, today's `relatedWork` there. */
  readonly original: Field
  /** Today's one CMS only: the record's `site` (always `shop`). */
  readonly site?: Field
}

export function productFields(options: ProductFieldOptions): Field[] {
  return [
    { type: 'row', fields: [sku, name] },
    categoryPicker,
    publishing,
    description,
    options.original,
    images,
    price,
    variants,
    stock,
    ...foldSections([seo], new Set(['seo'])),
    slugOfProduct,
    category,
    themes,
    bestSeller,
    ...(options.site ? [options.site] : []),
    translationStatusField,
  ]
}
