/**
 * `partners` — resellers and partners the owner works with (CONTENT-MODEL.md §6).
 *
 * Records only, no login. Owner-only access. Products carried are a text array for now; task 3.3
 * will relate them to the products collection.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButOwner } from '../../admin/hidden'
import { isOwner } from '../users/roles'

export const PARTNERS_ACCESS = {
  read: isOwner,
  create: isOwner,
  update: isOwner,
  delete: isOwner,
} as const

export const PARTNER_KIND_LABELS = {
  hotel: { en: 'Hotel', id: 'Hotel' },
  shop: { en: 'Shop', id: 'Toko' },
  restaurant: { en: 'Restaurant', id: 'Restoran' },
  other: { en: 'Other', id: 'Lainnya' },
} as const

export const PARTNER_STATUS_LABELS = {
  prospect: { en: 'Prospect', id: 'Calon' },
  active: { en: 'Active', id: 'Aktif' },
  paused: { en: 'Paused', id: 'Ditangguhkan' },
  ended: { en: 'Ended', id: 'Berakhir' },
} as const

const PARTNER_KINDS = Object.keys(PARTNER_KIND_LABELS) as Array<keyof typeof PARTNER_KIND_LABELS>
const PARTNER_STATUSES = Object.keys(PARTNER_STATUS_LABELS) as Array<
  keyof typeof PARTNER_STATUS_LABELS
>

export const Partners: CollectionConfig = {
  slug: 'partners',
  labels: {
    singular: { en: 'Partner', id: 'Mitra' },
    plural: { en: 'Partners', id: 'Mitra' },
  },
  admin: {
    group: ADMIN_GROUPS.leadsAndPartners,
    hidden: hiddenFromAllButOwner,
    useAsTitle: 'name',
    defaultColumns: ['name', 'kind', 'status', 'site', 'updatedAt'],
    description: {
      en: 'Resellers and partners the owner works with. No login here.',
      id: 'Reseller dan mitra yang bekerja sama dengan pemilik. Tidak ada login di sini.',
    },
  },
  access: PARTNERS_ACCESS,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      maxLength: 200,
      label: { en: 'Name', id: 'Nama' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: PARTNER_KINDS.map((value) => ({ value, label: PARTNER_KIND_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'site',
      type: 'select',
      required: true,
      options: [
        { value: 'gallery', label: { en: 'Gallery', id: 'Galeri' } },
        { value: 'shop', label: { en: 'Shop', id: 'Toko' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'contact',
      type: 'group',
      label: { en: 'Contact', id: 'Kontak' },
      fields: [
        {
          name: 'person',
          type: 'text',
          maxLength: 160,
          label: { en: 'Person', id: 'Orang' },
        },
        {
          name: 'whatsapp',
          type: 'text',
          maxLength: 16,
          label: { en: 'WhatsApp', id: 'WhatsApp' },
          validate: (value: unknown) => {
            if (!value) return true
            return /^\+[1-9]\d{6,14}$/.test(String(value))
              ? true
              : 'Give a WhatsApp number in international format, such as +62 812 3456 7890.'
          },
        },
        {
          name: 'email',
          type: 'email',
          label: { en: 'Email', id: 'Email' },
        },
        {
          name: 'phone',
          type: 'text',
          maxLength: 24,
          label: { en: 'Phone', id: 'Telepon' },
        },
      ],
    },
    {
      name: 'address',
      type: 'textarea',
      maxLength: 1000,
      label: { en: 'Address', id: 'Alamat' },
    },
    {
      name: 'terms',
      type: 'textarea',
      maxLength: 4000,
      label: { en: 'Terms', id: 'Ketentuan' },
      admin: {
        description: { en: 'Negotiated case by case.', id: 'Dinegosiasikan dari kasus ke kasus.' },
      },
    },
    {
      name: 'productsCarried',
      type: 'text',
      hasMany: true,
      maxLength: 120,
      label: { en: 'Products carried', id: 'Produk yang dibawa' },
      admin: {
        description: {
          en: 'Product SKUs or names for now. Task 3.3 relates this to products.',
          // 3.3 adds products
          id: 'SKU atau nama produk untuk saat ini. Tugas 3.3 menghubungkannya dengan produk.',
        },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'prospect',
      options: PARTNER_STATUSES.map((value) => ({ value, label: PARTNER_STATUS_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'notes',
      type: 'textarea',
      maxLength: 4000,
      label: { en: 'Notes', id: 'Catatan' },
      admin: { position: 'sidebar' },
    },
  ],
}
