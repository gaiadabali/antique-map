/**
 * `leads` — people the client should talk to (CONTENT-MODEL.md §6; AI.md §4; SECURITY.md §2.2).
 *
 * Created only by the server's lead service through the Local API; public REST create is refused.
 * Owner-only read/update/delete. Editors and store staff see nothing. Status changes append a
 * history row automatically.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { isOwner } from '../users/roles'
import { appendStatusHistory } from './status-history'
import {
  LEAD_KIND_LABELS,
  LEAD_KINDS,
  LEAD_STATUS_LABELS,
  LEAD_STATUSES,
  SOURCE_LABELS,
  SOURCES,
} from './kinds'

export const LEADS_ACCESS = {
  read: isOwner,
  create: isOwner,
  update: isOwner,
  delete: isOwner,
} as const

export const Leads: CollectionConfig = {
  slug: 'leads',
  labels: {
    singular: { en: 'Lead', id: 'Calon pembeli' },
    plural: { en: 'Leads', id: 'Calon pembeli' },
  },
  admin: {
    group: ADMIN_GROUPS.leadsAndPartners,
    useAsTitle: 'id',
    defaultColumns: ['kind', 'site', 'status', 'source', 'createdAt'],
    description: {
      en: 'People the client should reply to: enquiries, sellers, partners and chat hand-offs.',
      id: 'Orang yang harus dijawab klien: pertanyaan, penjual, mitra, dan percakapan yang diteruskan.',
    },
  },
  access: LEADS_ACCESS,
  hooks: {
    beforeChange: [appendStatusHistory],
  },
  fields: [
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: LEAD_KINDS.map((value) => ({ value, label: LEAD_KIND_LABELS[value] })),
      admin: {
        position: 'sidebar',
        description: { en: 'What the person wants.', id: 'Apa yang diinginkan orang ini.' },
      },
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
      name: 'source',
      type: 'select',
      required: true,
      options: SOURCES.map((value) => ({ value, label: SOURCE_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'payload',
      type: 'group',
      label: { en: 'Contact details', id: 'Detail kontak' },
      fields: [
        {
          name: 'name',
          type: 'text',
          maxLength: 160,
          label: { en: 'Name', id: 'Nama' },
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
          name: 'preferredChannel',
          type: 'select',
          label: { en: 'Preferred channel', id: 'Saluran pilihan' },
          options: [
            { value: 'whatsapp', label: { en: 'WhatsApp', id: 'WhatsApp' } },
            { value: 'email', label: { en: 'Email', id: 'Email' } },
          ],
        },
        {
          name: 'message',
          type: 'textarea',
          maxLength: 2000,
          label: { en: 'Message', id: 'Pesan' },
        },
        {
          name: 'locale',
          type: 'select',
          label: { en: 'Locale', id: 'Bahasa' },
          options: [
            { value: 'en', label: { en: 'English', id: 'Inggris' } },
            { value: 'id', label: { en: 'Indonesian', id: 'Indonesia' } },
          ],
        },
        {
          name: 'consentVersion',
          type: 'text',
          maxLength: 40,
          label: { en: 'Consent version', id: 'Versi persetujuan' },
        },
        {
          name: 'consentAt',
          type: 'date',
          label: { en: 'Consented at', id: 'Waktu persetujuan' },
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
      ],
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'works',
      hasMany: true,
      label: { en: 'Items', id: 'Barang' },
      admin: {
        description: {
          en: 'Works or products the person asked about.',
          // 3.3 adds products
          id: 'Barang yang ditanyakan orang ini.',
        },
      },
    },
    {
      name: 'chatSession',
      type: 'relationship',
      relationTo: 'chat-sessions',
      label: { en: 'Chat session', id: 'Sesi chat' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: LEAD_STATUSES.map((value) => ({ value, label: LEAD_STATUS_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'statusHistory',
      type: 'array',
      label: { en: 'Status history', id: 'Riwayat status' },
      admin: {
        description: {
          en: 'Appended automatically when status changes.',
          id: 'Ditambahkan otomatis saat status berubah.',
        },
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'status',
              type: 'select',
              required: true,
              options: LEAD_STATUSES.map((value) => ({ value, label: LEAD_STATUS_LABELS[value] })),
              label: { en: 'Status', id: 'Status' },
            },
            {
              name: 'by',
              type: 'relationship',
              relationTo: 'users',
              label: { en: 'By', id: 'Oleh' },
            },
            {
              name: 'at',
              type: 'date',
              required: true,
              label: { en: 'At', id: 'Waktu' },
              admin: { date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
      ],
    },
    {
      name: 'firstReplyAt',
      type: 'date',
      label: { en: 'First reply at', id: 'Balasan pertama' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
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
