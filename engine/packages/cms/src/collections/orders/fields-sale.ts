/**
 * What an order was sold with (COMMERCE.md §8): its number and channel, the line snapshots, the
 * buyer's contact and delivery pin, the assigned store, and the amounts it was priced with. All of
 * it is written by the server's order code and changed by nobody through the API (`SERVER_ONLY`):
 * an order line keeps the name, SKU and unit price it was sold at, so editing a product later
 * changes no order (COMMERCE.md §1.4). Money is whole rupiah (`../products/money`); the database
 * holds the totals to `total = subtotal − discount + deliveryFee` (`./constraints`).
 */
import type { Field } from 'payload'

import { wholeNumber } from '../products/money'
import { SERVER_ONLY } from './access'

const rupiah = (what: string, min = 0) => wholeNumber({ min, what })

export const SALE_FIELDS: Field[] = [
  {
    name: 'number',
    type: 'number',
    label: { en: 'Order number', id: 'Nomor pesanan' },
    required: true,
    unique: true,
    index: true,
    access: SERVER_ONLY,
    validate: wholeNumber({ min: 1, what: 'The order number', unit: 'units' }),
    admin: { readOnly: true },
  },
  {
    name: 'site',
    type: 'select',
    label: { en: 'Site', id: 'Situs' },
    options: [{ value: 'shop', label: { en: 'Old East Indies', id: 'Old East Indies' } }],
    required: true,
    defaultValue: 'shop',
    access: SERVER_ONLY,
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'channel',
    type: 'select',
    label: { en: 'Channel', id: 'Kanal' },
    options: [
      { value: 'web', label: { en: 'Web', id: 'Web' } },
      { value: 'replacement', label: { en: 'Replacement', id: 'Pengganti' } },
    ],
    required: true,
    defaultValue: 'web',
    access: SERVER_ONLY,
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'replacementOf',
    type: 'relationship',
    relationTo: 'orders',
    label: { en: 'Replaces order', id: 'Mengganti pesanan' },
    access: SERVER_ONLY,
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'lines',
    type: 'array',
    label: { en: 'Items', id: 'Barang' },
    required: true,
    minRows: 1,
    maxRows: 20,
    access: SERVER_ONLY,
    admin: { readOnly: true },
    fields: [
      {
        name: 'product',
        type: 'relationship',
        relationTo: 'products',
        label: { en: 'Product', id: 'Produk' },
        required: true,
      },
      { name: 'variantSku', type: 'text', label: { en: 'Variant SKU', id: 'SKU varian' }, maxLength: 64 },
      { name: 'sku', type: 'text', label: { en: 'SKU', id: 'SKU' }, required: true, maxLength: 64 },
      { name: 'name', type: 'text', label: { en: 'Name', id: 'Nama' }, required: true, maxLength: 160 },
      {
        name: 'variantLabel',
        type: 'text',
        label: { en: 'Variant', id: 'Varian' },
        maxLength: 80,
      },
      {
        name: 'unitPrice',
        type: 'number',
        label: { en: 'Unit price (Rp)', id: 'Harga satuan (Rp)' },
        required: true,
        validate: rupiah('A unit price'),
      },
      {
        name: 'qty',
        type: 'number',
        label: { en: 'Quantity', id: 'Jumlah' },
        required: true,
        validate: wholeNumber({ min: 1, what: 'A quantity', unit: 'units' }),
      },
      {
        name: 'lineTotal',
        type: 'number',
        label: { en: 'Line total (Rp)', id: 'Total baris (Rp)' },
        required: true,
        validate: rupiah('A line total'),
      },
      { name: 'image', type: 'upload', relationTo: 'media', label: { en: 'Image', id: 'Gambar' } },
    ],
  },
  {
    name: 'contact',
    type: 'group',
    label: { en: 'Buyer', id: 'Pembeli' },
    access: SERVER_ONLY,
    fields: [
      { name: 'name', type: 'text', label: { en: 'Name', id: 'Nama' }, required: true, maxLength: 120 },
      {
        name: 'whatsapp',
        type: 'text',
        label: { en: 'WhatsApp', id: 'WhatsApp' },
        required: true,
        maxLength: 16,
      },
      { name: 'email', type: 'email', label: { en: 'Email', id: 'Email' }, required: true },
      {
        name: 'locale',
        type: 'select',
        label: { en: 'Language', id: 'Bahasa' },
        options: ['en', 'id'],
        required: true,
        defaultValue: 'en',
      },
    ],
  },
  {
    name: 'delivery',
    type: 'group',
    label: { en: 'Delivery', id: 'Pengiriman' },
    access: SERVER_ONLY,
    fields: [
      {
        name: 'address',
        type: 'textarea',
        label: { en: 'Address', id: 'Alamat' },
        required: true,
        maxLength: 500,
      },
      { name: 'notes', type: 'textarea', label: { en: 'Notes', id: 'Catatan' }, maxLength: 500 },
      { name: 'lat', type: 'number', label: { en: 'Latitude', id: 'Lintang' }, required: true },
      { name: 'lng', type: 'number', label: { en: 'Longitude', id: 'Bujur' }, required: true },
    ],
  },
  {
    name: 'giftNote',
    type: 'textarea',
    label: { en: 'Gift note', id: 'Catatan hadiah' },
    maxLength: 500,
    access: SERVER_ONLY,
  },
  {
    name: 'store',
    type: 'relationship',
    relationTo: 'stores',
    label: { en: 'Sending store', id: 'Toko pengirim' },
    required: true,
    index: true,
    access: SERVER_ONLY,
    admin: { position: 'sidebar', readOnly: true },
  },
  {
    name: 'storeSnapshot',
    type: 'group',
    label: { en: 'Store, as sold', id: 'Toko, saat dijual' },
    access: SERVER_ONLY,
    admin: { readOnly: true },
    fields: [
      { name: 'code', type: 'text', label: { en: 'Code', id: 'Kode' }, maxLength: 32 },
      { name: 'name', type: 'text', label: { en: 'Name', id: 'Nama' }, maxLength: 120 },
      { name: 'area', type: 'text', label: { en: 'Area', id: 'Area' }, maxLength: 80 },
    ],
  },
  {
    name: 'distanceKm',
    type: 'number',
    label: { en: 'Distance (km)', id: 'Jarak (km)' },
    min: 0,
    access: SERVER_ONLY,
    admin: { readOnly: true },
  },
  {
    name: 'totals',
    type: 'group',
    label: { en: 'Amounts (Rp)', id: 'Jumlah (Rp)' },
    access: SERVER_ONLY,
    admin: { readOnly: true },
    fields: [
      {
        name: 'subtotal',
        type: 'number',
        label: { en: 'Subtotal (Rp)', id: 'Subtotal (Rp)' },
        required: true,
        validate: rupiah('The subtotal'),
      },
      {
        name: 'discount',
        type: 'number',
        label: { en: 'Discount (Rp)', id: 'Diskon (Rp)' },
        required: true,
        defaultValue: 0,
        validate: rupiah('The discount'),
      },
      {
        name: 'deliveryFee',
        type: 'number',
        label: { en: 'Delivery fee (Rp)', id: 'Ongkos kirim (Rp)' },
        required: true,
        defaultValue: 0,
        validate: rupiah('The delivery fee'),
      },
      {
        name: 'total',
        type: 'number',
        label: { en: 'Total (Rp)', id: 'Total (Rp)' },
        required: true,
        validate: rupiah('The total'),
      },
    ],
  },
  {
    name: 'discount',
    type: 'group',
    label: { en: 'Discount code used', id: 'Kode diskon yang dipakai' },
    access: SERVER_ONLY,
    admin: { readOnly: true },
    // The code as applied, a snapshot: `discounts` may change or end later.
    fields: [
      { name: 'code', type: 'text', label: { en: 'Code', id: 'Kode' }, maxLength: 40 },
      {
        name: 'kind',
        type: 'select',
        label: { en: 'Kind', id: 'Jenis' },
        options: ['percent', 'fixed'],
      },
      { name: 'value', type: 'number', label: { en: 'Value', id: 'Nilai' } },
    ],
  },
]
