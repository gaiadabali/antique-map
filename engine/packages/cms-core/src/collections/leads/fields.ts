/**
 * The `leads` record's own fields (CONTENT-MODEL.md §6): how to reach the person (`payload`, the
 * contact details the lead service writes) and how the owner follows it up — the status, when it
 * closed (the retention clock, COMPLIANCE §1), its history, the first reply and a closing note.
 */
import type { Field } from 'payload'

import { LEAD_STATUS_LABELS, LEAD_STATUSES } from './kinds'

/** How to reach the person: what the form or the chat collected, and their consent. */
export const CONTACT_GROUP: Field = {
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
}

/** The owner's follow-up: status, when it closed, its history, the first reply, a note. */
export const FOLLOW_UP_FIELDS: Field[] = [
  {
    name: 'status',
    type: 'select',
    required: true,
    defaultValue: 'new',
    options: LEAD_STATUSES.map((value) => ({ value, label: LEAD_STATUS_LABELS[value] })),
    admin: { position: 'sidebar' },
  },
  {
    name: 'closedAt',
    type: 'date',
    label: { en: 'Closed at', id: 'Ditutup pada' },
    admin: {
      position: 'sidebar',
      readOnly: true,
      date: { pickerAppearance: 'dayAndTime' },
      description: {
        en: 'Set when the lead is closed, cleared if reopened. Retention counts from it.',
        id: 'Diisi saat calon ditutup, dihapus bila dibuka lagi. Masa simpan dihitung dari sini.',
      },
    },
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
    admin: {
      position: 'sidebar',
      description: {
        en: 'One-line outcome when you close: "Sold M.0500 by phone", "Not buying".',
        id: 'Hasil satu baris saat Anda menutup: "Terjual M.0500 lewat telepon", "Tidak membeli".',
      },
    },
  },
]
