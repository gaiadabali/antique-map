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
 * - **`description`** is plain localised text for now: no rich-text editor is configured in the
 *   CMS yet, and CONTENT-MODEL.md §1's restricted Lexical arrives with it (a Found item of 3.3).
 * - **`site`** is always `shop` (DR-1): the hostname picks the site, and every public read
 *   filters by it.
 */
import type { ArrayField, Field, Validate } from 'payload'

import { slugField } from '../../fields/slug'
import { translationStatusField } from '../../fields/translation-status'
import {
  IN_DEFAULT_LOCALE_NOTE,
  isPublishing,
  requiredInDefaultLocale,
  requiredToPublish,
} from '../../fields/validate'
import { TERM_KINDS } from '../terms/kinds'
import { wholeNumber } from './money'
import { SKU_MAX_LENGTH, trimSku, validateProductSku, validateVariantSku } from './skus'

/**
 * Only category terms. The `category` kind arrives with TASKS.md 3.2.a; until it does, the filter
 * is off rather than a query for an enum value Postgres would refuse.
 */
const categoriesOnly = (TERM_KINDS as readonly string[]).includes('category')
  ? { kind: { equals: 'category' } }
  : undefined

const priceToPublish = requiredToPublish('Set the price before publishing.')
const wholePrice = wholeNumber({ min: 1, what: 'The price' })

/** Needed to publish; when set, whole rupiah above zero (drafts included). */
const validatePrice: Validate<number | null | undefined> = (value, args) => {
  const required = priceToPublish(value, args as never)
  return required === true ? wholePrice(value, args) : required
}

const images: ArrayField = {
  name: 'images',
  type: 'array',
  label: { en: 'Images', id: 'Gambar' },
  maxRows: 24,
  validate: (value, { data }) =>
    isPublishing(data) && (!Array.isArray(value) || value.length === 0)
      ? 'Add at least one image before publishing: the shop shows every product with its picture.'
      : true,
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Image', id: 'Gambar' },
      required: true,
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
      hooks: { beforeValidate: [trimSku] },
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
      validate: wholeNumber({ min: 1, what: 'A variant’s price' }),
    },
    {
      name: 'active',
      type: 'checkbox',
      label: { en: 'On sale', id: 'Dijual' },
      defaultValue: true,
    },
  ],
}

export const PRODUCT_FIELDS: Field[] = [
  {
    name: 'sku',
    type: 'text',
    label: { en: 'SKU', id: 'SKU' },
    required: true,
    unique: true,
    maxLength: SKU_MAX_LENGTH,
    hooks: { beforeValidate: [trimSku] },
    validate: validateProductSku,
    admin: {
      description: {
        en: 'The code the product and stock spreadsheets match on. Also the SKU of a product without variants.',
        id: 'Kode yang dicocokkan oleh lembar produk dan stok. Juga SKU produk tanpa varian.',
      },
    },
  },
  {
    name: 'name',
    type: 'text',
    label: { en: 'Name', id: 'Nama' },
    localized: true,
    maxLength: 160,
    validate: requiredInDefaultLocale('Give the product its name in English.'),
    admin: { description: IN_DEFAULT_LOCALE_NOTE },
  },
  slugField({ from: 'name' }),
  {
    name: 'description',
    type: 'textarea',
    label: { en: 'Description', id: 'Deskripsi' },
    localized: true,
    maxLength: 5000,
  },
  {
    name: 'category',
    type: 'relationship',
    relationTo: 'terms',
    label: { en: 'Category', id: 'Kategori' },
    ...(categoriesOnly ? { filterOptions: categoriesOnly } : {}),
    validate: requiredToPublish('Choose the category before publishing.'),
  },
  images,
  {
    name: 'price',
    type: 'number',
    label: { en: 'Price (Rp)', id: 'Harga (Rp)' },
    validate: validatePrice,
    admin: {
      description: {
        en: 'Whole rupiah: 95000 for Rp 95.000. The checkout always prices from here, never from the page.',
        id: 'Rupiah bulat: 95000 untuk Rp 95.000. Checkout selalu menghitung harga dari sini, bukan dari halaman.',
      },
    },
  },
  variants,
  {
    name: 'relatedWork',
    type: 'relationship',
    relationTo: 'works',
    label: { en: 'See the original', id: 'Lihat aslinya' },
    admin: {
      description: {
        en: 'The antique this is made from, if any — linked only while that antique is published.',
        id: 'Barang antik asal produk ini, bila ada — ditautkan hanya selama barang itu terbit.',
      },
    },
  },
  {
    name: 'site',
    type: 'select',
    label: { en: 'Site', id: 'Situs' },
    options: [{ value: 'shop', label: { en: 'Old East Indies', id: 'Old East Indies' } }],
    required: true,
    defaultValue: 'shop',
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'seo',
    type: 'group',
    label: { en: 'Search engines', id: 'Mesin pencari' },
    fields: [
      { name: 'title', type: 'text', label: { en: 'Title', id: 'Judul' }, localized: true, maxLength: 70 },
      {
        name: 'description',
        type: 'textarea',
        label: { en: 'Description', id: 'Deskripsi' },
        localized: true,
        maxLength: 160,
      },
    ],
  },
  translationStatusField,
]
