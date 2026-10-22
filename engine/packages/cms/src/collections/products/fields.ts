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
  hooks: { beforeValidate: [trimSku] },
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
    components: { Cell: '@engine/cms/admin/views#RupiahCell' },
  },
}

const relatedWork: Field = {
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
}

const site: Field = {
  name: 'site',
  type: 'select',
  label: { en: 'Site', id: 'Situs' },
  options: [{ value: 'shop', label: { en: 'Old East Indies', id: 'Old East Indies' } }],
  required: true,
  defaultValue: 'shop',
  admin: { position: 'sidebar', readOnly: true },
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

/**
 * The edit screen in four tabs — the product, its pictures, its price and variants, search
 * engines — with the address, category, site and translation in the sidebar. Tabs without a
 * `name` only arrange the form: every field keeps its place in the data and the database.
 */
export const PRODUCT_FIELDS: Field[] = [
  {
    type: 'tabs',
    tabs: [
      {
        label: { en: 'Product', id: 'Produk' },
        fields: [{ type: 'row', fields: [sku, name] }, description, relatedWork],
      },
      {
        label: { en: 'Images', id: 'Gambar' },
        fields: [images],
      },
      {
        label: { en: 'Price and variants', id: 'Harga dan varian' },
        fields: [price, variants],
      },
      {
        label: { en: 'Search engines', id: 'Mesin pencari' },
        fields: [seo],
      },
    ],
  },
  slugField({ from: 'name' }),
  category,
  site,
  translationStatusField,
]
