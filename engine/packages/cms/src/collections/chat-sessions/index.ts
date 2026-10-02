/**
 * `chat-sessions` — visitor AI chat transcripts (CONTENT-MODEL.md §6; AI.md §3.4).
 *
 * Written by the chat only; deleted 30 days after the last message. Owner-only access.
 */
import type { CollectionConfig } from 'payload'

import { isOwner } from '../users/roles'
import { chatExpiry } from './chat-expiry'

export const CHAT_SESSIONS_ACCESS = {
  read: isOwner,
  create: isOwner,
  update: isOwner,
  delete: isOwner,
} as const

const OUTCOME_LABELS = {
  refused: { en: 'Refused', id: 'Ditolak' },
  blocked: { en: 'Blocked', id: 'Diblokir' },
  handoff: { en: 'Handed off', id: 'Diteruskan' },
  lead: { en: 'Lead created', id: 'Calon pembeli dibuat' },
} as const

const OUTCOMES = Object.keys(OUTCOME_LABELS) as Array<keyof typeof OUTCOME_LABELS>

const setChatExpiry: import('payload').CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  const last = data.lastMessageAt ?? (operation === 'update' ? originalDoc?.lastMessageAt : null)
  if (!last) return data
  return { ...data, expiresAt: chatExpiry(new Date(last)).toISOString() }
}

export const ChatSessions: CollectionConfig = {
  slug: 'chat-sessions',
  labels: {
    singular: { en: 'Chat session', id: 'Sesi chat' },
    plural: { en: 'Chat sessions', id: 'Sesi chat' },
  },
  admin: {
    useAsTitle: 'id',
    defaultColumns: ['site', 'outcome', 'startedAt', 'lastMessageAt', 'updatedAt'],
    description: {
      en: 'Visitor AI chat transcripts. Deleted 30 days after the last message.',
      id: 'Transkrip chat pengunjung. Dihapus 30 hari setelah pesan terakhir.',
    },
  },
  access: CHAT_SESSIONS_ACCESS,
  hooks: {
    beforeChange: [setChatExpiry],
  },
  fields: [
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
      name: 'locale',
      type: 'select',
      required: true,
      options: [
        { value: 'en', label: { en: 'English', id: 'Inggris' } },
        { value: 'id', label: { en: 'Indonesian', id: 'Indonesia' } },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'startedAt',
      type: 'date',
      required: true,
      label: { en: 'Started at', id: 'Dimulai' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      required: true,
      label: { en: 'Last message at', id: 'Pesan terakhir' },
      admin: { position: 'sidebar', date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'items',
      type: 'relationship',
      relationTo: 'works',
      hasMany: true,
      label: { en: 'Items', id: 'Barang' },
      admin: {
        description: {
          en: 'Works or products the visitor asked about.',
          // 3.3 adds products
          id: 'Barang yang ditanyakan pengunjung.',
        },
      },
    },
    {
      name: 'transcript',
      type: 'array',
      label: { en: 'Transcript', id: 'Transkrip' },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'role',
              type: 'select',
              required: true,
              label: { en: 'Role', id: 'Peran' },
              options: [
                { value: 'user', label: { en: 'Visitor', id: 'Pengunjung' } },
                { value: 'assistant', label: { en: 'Assistant', id: 'Asisten' } },
              ],
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
        {
          name: 'text',
          type: 'textarea',
          maxLength: 8000,
          required: true,
          label: { en: 'Text', id: 'Teks' },
        },
      ],
    },
    {
      name: 'ipHash',
      type: 'text',
      maxLength: 128,
      label: { en: 'IP hash', id: 'Hash IP' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'labels',
      type: 'text',
      hasMany: true,
      maxLength: 60,
      label: { en: 'Labels', id: 'Label' },
    },
    {
      name: 'usage',
      type: 'group',
      label: { en: 'Usage', id: 'Penggunaan' },
      fields: [
        {
          name: 'inputTokens',
          type: 'number',
          label: { en: 'Input tokens', id: 'Token masukan' },
          admin: { step: 1 },
        },
        {
          name: 'outputTokens',
          type: 'number',
          label: { en: 'Output tokens', id: 'Token keluaran' },
          admin: { step: 1 },
        },
        {
          name: 'costUsd',
          type: 'number',
          label: { en: 'Cost (USD)', id: 'Biaya (USD)' },
        },
      ],
    },
    {
      name: 'outcome',
      type: 'select',
      options: OUTCOMES.map((value) => ({ value, label: OUTCOME_LABELS[value] })),
      label: { en: 'Outcome', id: 'Hasil' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      label: { en: 'Lead', id: 'Calon pembeli' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'expiresAt',
      type: 'date',
      label: { en: 'Expires at', id: 'Kadaluarsa' },
      admin: { position: 'sidebar', readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
