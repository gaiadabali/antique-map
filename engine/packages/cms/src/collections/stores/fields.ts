/**
 * A store's fields (CONTENT-MODEL.md §4, §9 "Stores"): the code the store import keys on, its
 * name and area, its address and pin, its WhatsApp, hours and showroom photographs, whether it
 * takes orders (`active`) and whether the shop's `/stores` page lists it (`listed`), and staff
 * notes.
 *
 * Only `code` and `name` are required on every save, so the owner can add a store before its
 * details are known: it stays inactive — never assigned an order — until its address and pin are
 * set (`./pin`). Hence `active` defaults to off.
 *
 * What the public may read of a listed, active store is its name, area, address, pin, hours and
 * photographs (EXPERIENCE-SHOP.md: "the stores, by area, with hours and a map link"); the code,
 * the store's own WhatsApp and the notes are staff-only (contact goes through the shop's online
 * number, EXPERIENCE-SHOP.md Open).
 */
import type { Field, FieldAccess } from 'payload'

import { hasRole } from '../users/roles'
import { validateAddress, validateCoordinate, validateWhatsApp } from './pin'

/** Any signed-in staff member — owner, editor or store staff (their own store only, by `read`). */
const staffOnly: FieldAccess = ({ req }) => hasRole(req.user, 'owner', 'editor', 'store')

export const STAFF_ONLY = { read: staffOnly } as const

export const STORE_FIELDS: Field[] = [
  {
    name: 'code',
    type: 'text',
    label: { en: 'Store code', id: 'Kode toko' },
    required: true,
    unique: true,
    maxLength: 32,
    access: STAFF_ONLY,
    admin: {
      description: {
        en: 'The code the store list and the stock spreadsheets match on, e.g. UBD-01.',
        id: 'Kode yang dicocokkan oleh daftar toko dan lembar stok, mis. UBD-01.',
      },
    },
  },
  {
    name: 'name',
    type: 'text',
    label: { en: 'Name', id: 'Nama' },
    required: true,
    maxLength: 120,
  },
  {
    name: 'area',
    type: 'text',
    label: { en: 'Area', id: 'Area' },
    maxLength: 80,
    admin: {
      description: {
        en: 'Where buyers know it by, e.g. Ubud or Sanur. Shown on the store list and the tracking page.',
        id: 'Nama daerah yang dikenal pembeli, mis. Ubud atau Sanur. Ditampilkan di daftar toko dan halaman pelacakan.',
      },
    },
  },
  {
    name: 'address',
    type: 'textarea',
    label: { en: 'Address', id: 'Alamat' },
    maxLength: 500,
    validate: validateAddress,
  },
  {
    type: 'row',
    fields: [
      {
        name: 'lat',
        type: 'number',
        label: { en: 'Latitude', id: 'Lintang' },
        validate: validateCoordinate('lat'),
        admin: {
          step: 0.000001,
          description: {
            en: 'Decimal degrees, e.g. -8.5069. Orders are sent from the nearest active store.',
            id: 'Derajat desimal, mis. -8.5069. Pesanan dikirim dari toko aktif terdekat.',
          },
        },
      },
      {
        name: 'lng',
        type: 'number',
        label: { en: 'Longitude', id: 'Bujur' },
        validate: validateCoordinate('lng'),
        admin: {
          step: 0.000001,
          description: {
            en: 'Decimal degrees, e.g. 115.2625.',
            id: 'Derajat desimal, mis. 115.2625.',
          },
        },
      },
    ],
  },
  {
    name: 'whatsapp',
    type: 'text',
    label: { en: 'WhatsApp', id: 'WhatsApp' },
    maxLength: 16,
    validate: validateWhatsApp,
    access: STAFF_ONLY,
    admin: {
      description: {
        en: 'The store’s own number, +62… — for staff. Buyers contact the shop’s online number.',
        id: 'Nomor toko sendiri, +62… — untuk staf. Pembeli menghubungi nomor online toko.',
      },
    },
  },
  {
    name: 'hours',
    type: 'textarea',
    label: { en: 'Opening hours', id: 'Jam buka' },
    localized: true,
    maxLength: 300,
  },
  {
    name: 'images',
    type: 'array',
    label: { en: 'Showroom photographs', id: 'Foto ruang pamer' },
    maxRows: 12,
    fields: [
      {
        name: 'image',
        type: 'upload',
        relationTo: 'media',
        required: true,
        label: { en: 'Photograph', id: 'Foto' },
      },
    ],
  },
  {
    name: 'active',
    type: 'checkbox',
    label: { en: 'Takes orders', id: 'Menerima pesanan' },
    defaultValue: false,
    admin: {
      position: 'sidebar',
      description: {
        en: 'Only an active store is sent orders. Needs the address and pin. Switch it off to retire a store — never delete one with stock or orders.',
        id: 'Hanya toko aktif yang dikirimi pesanan. Perlu alamat dan titik peta. Matikan untuk menonaktifkan toko — jangan hapus toko yang punya stok atau pesanan.',
      },
    },
  },
  {
    name: 'listed',
    type: 'checkbox',
    label: { en: 'Listed on the shop', id: 'Tampil di toko online' },
    defaultValue: true,
    admin: {
      position: 'sidebar',
      description: {
        en: 'Shown on the shop’s Stores page while it is active.',
        id: 'Ditampilkan di halaman Toko selama toko aktif.',
      },
    },
  },
  {
    name: 'notes',
    type: 'textarea',
    label: { en: 'Staff notes', id: 'Catatan staf' },
    maxLength: 2000,
    access: STAFF_ONLY,
  },
]
