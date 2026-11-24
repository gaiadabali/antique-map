/**
 * The `chat-sessions` collection factory — visitor AI chat transcripts (CONTENT-MODEL.md §6; AI.md
 * §3.4).
 *
 * Written by the chat only; deleted 30 days after the last message (`./chat-expiry`). Owner-only
 * access. A session may end in a lead (`leads`).
 */
import type { CollectionBeforeChangeHook, CollectionConfig, CollectionSlug, Field } from 'payload'

import { hiddenFromAllButOwner } from '../../access/hidden'
import { isOwner } from '../../access/user-roles'
import { insertedAt, withSiteColumn, type SharedCollectionOptions } from '../options'
import { chatExpiry } from './chat-expiry'

export { CHAT_RETENTION_DAYS, chatExpiry } from './chat-expiry'

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

export const setChatExpiry: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  const last = data.lastMessageAt ?? (operation === 'update' ? originalDoc?.lastMessageAt : null)
  if (!last) return data
  return { ...data, expiresAt: chatExpiry(new Date(last)).toISOString() }
}

export type ChatSessionsOptions = SharedCollectionOptions & {
  /** What the visitor asked about: the gallery's `works` by default, the shop's `products`. */
  readonly items?: CollectionSlug
}

export function chatSessionsCollection(
  options: ChatSessionsOptions,
): CollectionConfig & { slug: 'chat-sessions' } {
  const { site } = options
  return {
    slug: 'chat-sessions',
    labels: {
      singular: { en: 'Chat session', id: 'Sesi chat' },
      plural: { en: 'Chat sessions', id: 'Sesi chat' },
    },
    admin: {
      group: options.group,
      hidden: hiddenFromAllButOwner,
      useAsTitle: 'id',
      defaultColumns: withSiteColumn(
        ['outcome', 'startedAt', 'lastMessageAt', 'updatedAt'],
        0,
        site,
      ),
      description: {
        en: 'Visitor AI chat transcripts. Deleted 30 days after the last message.',
        id: 'Transkrip chat pengunjung. Dihapus 30 hari setelah pesan terakhir.',
      },
    },
    access: CHAT_SESSIONS_ACCESS,
    hooks: {
      beforeChange: [setChatExpiry],
    },
    fields: insertedAt<Field>(chatSessionFields(options.items ?? 'works'), 0, site),
  }
}

const chatSessionFields = (items: CollectionSlug): Field[] => [
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
    relationTo: items,
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
]
