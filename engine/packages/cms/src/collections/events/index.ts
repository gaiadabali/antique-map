/**
 * `events` — first-party analytics (ANALYTICS.md §4, §7). Append-only on the server; the API never
 * updates or deletes a row. The dashboard reads them. Owner-only create; public read none.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { isOwner } from '../users/roles'

export const EVENTS_ACCESS = {
  read: isOwner,
  create: isOwner,
  update: () => false,
  delete: () => false,
} as const

export const EVENT_NAMES = [
  'page.viewed',
  'search.submitted',
  'listing.viewed',
  'item.viewed',
  'item.zoomed',
  'product.viewed',
  'ask.clicked',
  'sell.clicked',
  'partnership.clicked',
  'lead.created',
  'chat.started',
  'chat.handedOff',
  'chat.leadCreated',
  'cart.added',
  'cart.removed',
  'checkout.started',
  'checkout.stepCompleted',
  'checkout.blocked',
  'payment.opened',
  'order.created',
  'order.paid',
  'order.statusChanged',
  'tracking.viewed',
  'vitals.reported',
] as const

export type EventName = (typeof EVENT_NAMES)[number]

export const EVENT_NAME_LABELS: Record<EventName, { en: string; id: string }> = {
  'page.viewed': { en: 'Page viewed', id: 'Halaman dilihat' },
  'search.submitted': { en: 'Search submitted', id: 'Pencarian dikirim' },
  'listing.viewed': { en: 'Listing viewed', id: 'Daftar dilihat' },
  'item.viewed': { en: 'Item viewed', id: 'Barang dilihat' },
  'item.zoomed': { en: 'Item zoomed', id: 'Barang diperbesar' },
  'product.viewed': { en: 'Product viewed', id: 'Produk dilihat' },
  'ask.clicked': { en: 'Ask clicked', id: 'Tanya diklik' },
  'sell.clicked': { en: 'Sell clicked', id: 'Jual diklik' },
  'partnership.clicked': { en: 'Partnership clicked', id: 'Kemitraan diklik' },
  'lead.created': { en: 'Lead created', id: 'Calon pembeli dibuat' },
  'chat.started': { en: 'Chat started', id: 'Chat dimulai' },
  'chat.handedOff': { en: 'Chat handed off', id: 'Chat diteruskan' },
  'chat.leadCreated': { en: 'Chat lead created', id: 'Chat membuat calon pembeli' },
  'cart.added': { en: 'Cart added', id: 'Keranjangan ditambah' },
  'cart.removed': { en: 'Cart removed', id: 'Keranjangan dihapus' },
  'checkout.started': { en: 'Checkout started', id: 'Checkout dimulai' },
  'checkout.stepCompleted': { en: 'Checkout step completed', id: 'Tahap checkout selesai' },
  'checkout.blocked': { en: 'Checkout blocked', id: 'Checkout diblokir' },
  'payment.opened': { en: 'Payment opened', id: 'Pembayaran dibuka' },
  'order.created': { en: 'Order created', id: 'Pesanan dibuat' },
  'order.paid': { en: 'Order paid', id: 'Pesanan dibayar' },
  'order.statusChanged': { en: 'Order status changed', id: 'Status pesanan berubah' },
  'tracking.viewed': { en: 'Tracking viewed', id: 'Pelacakan dilihat' },
  'vitals.reported': { en: 'Vitals reported', id: 'Vital dilaporkan' },
}

export const SOURCE_LABELS = {
  beacon: { en: 'Beacon', id: 'Sinyal' },
  server: { en: 'Server', id: 'Server' },
} as const

const SOURCES = Object.keys(SOURCE_LABELS) as Array<keyof typeof SOURCE_LABELS>

export const Events: CollectionConfig = {
  slug: 'events',
  labels: {
    singular: { en: 'Event', id: 'Peristiwa' },
    plural: { en: 'Events', id: 'Peristiwa' },
  },
  admin: {
    group: ADMIN_GROUPS.content,
    useAsTitle: 'name',
    defaultColumns: ['name', 'site', 'source', 'at', 'day'],
    description: {
      en: 'First-party analytics events. Append-only; nobody edits or deletes them through the API.',
      id: 'Peristiwa analitik pihak pertama. Hanya ditambah; tidak ada yang mengedit atau menghapus lewat API.',
    },
  },
  access: EVENTS_ACCESS,
  indexes: [
    { fields: ['site', 'name', 'at'] },
    { fields: ['sessionId'] },
    { fields: ['site', 'day', 'name'] },
  ],
  fields: [
    {
      name: 'site',
      type: 'select',
      required: true,
      index: true,
      options: [
        { value: 'gallery', label: { en: 'Gallery', id: 'Galeri' } },
        { value: 'shop', label: { en: 'Shop', id: 'Toko' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'name',
      type: 'select',
      required: true,
      index: true,
      options: EVENT_NAMES.map((value) => ({ value, label: EVENT_NAME_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'at',
      type: 'date',
      required: true,
      index: true,
      label: { en: 'At', id: 'Waktu' },
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'path',
      type: 'text',
      maxLength: 2048,
      label: { en: 'Path', id: 'Jalur' },
    },
    {
      name: 'ref',
      type: 'text',
      maxLength: 240,
      label: { en: 'Ref', id: 'Referensi' },
    },
    {
      name: 'props',
      type: 'json',
      label: { en: 'Props', id: 'Properti' },
    },
    {
      name: 'day',
      type: 'text',
      required: true,
      index: true,
      maxLength: 12,
      label: { en: 'Day', id: 'Hari' },
      admin: {
        description: {
          en: 'YYYY-MM-DD in UTC+8 (WITA / Singapore time).',
          id: 'YYYY-MM-DD di UTC+8 (WITA / waktu Singapura).',
        },
      },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: SOURCES.map((value) => ({ value, label: SOURCE_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'sessionId',
      type: 'text',
      maxLength: 128,
      index: true,
      label: { en: 'Session id', id: 'Id sesi' },
    },
    {
      name: 'deviceClass',
      type: 'select',
      options: [
        { value: 'mobile', label: { en: 'Mobile', id: 'Ponsel' } },
        { value: 'tablet', label: { en: 'Tablet', id: 'Tablet' } },
        { value: 'desktop', label: { en: 'Desktop', id: 'Desktop' } },
      ],
      label: { en: 'Device class', id: 'Kelas perangkat' },
    },
    {
      name: 'locale',
      type: 'select',
      options: [
        { value: 'en', label: { en: 'English', id: 'Inggris' } },
        { value: 'id', label: { en: 'Indonesian', id: 'Indonesia' } },
      ],
      label: { en: 'Locale', id: 'Bahasa' },
    },
    {
      name: 'referrerHost',
      type: 'text',
      maxLength: 240,
      label: { en: 'Referrer host', id: 'Host perujuk' },
    },
    {
      name: 'utm',
      type: 'group',
      label: { en: 'UTM', id: 'UTM' },
      fields: [
        { name: 'source', type: 'text', maxLength: 120, label: { en: 'Source', id: 'Sumber' } },
        { name: 'medium', type: 'text', maxLength: 120, label: { en: 'Medium', id: 'Media' } },
        {
          name: 'campaign',
          type: 'text',
          maxLength: 120,
          label: { en: 'Campaign', id: 'Kampanye' },
        },
      ],
    },
  ],
}
