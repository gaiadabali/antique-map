/**
 * `redirects` — per-site URL redirects (CONTENT-MODEL.md §6). Managed by owner and editor;
 * public reads none. Unique `(site, from)`. A plain Payload collection, no redirects plugin.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButCatalogueStaff } from '../../admin/hidden'
import { hasRole } from '../users/roles'

const redirectManagers = ({ req }: Parameters<import('payload').Access>[0]) =>
  hasRole(req.user, 'owner', 'editor')

export const REDIRECTS_ACCESS = {
  read: redirectManagers,
  create: redirectManagers,
  update: redirectManagers,
  delete: redirectManagers,
} as const

export const REDIRECT_SOURCE_LABELS = {
  legacy: { en: 'Legacy', id: 'Warisan' },
  editor: { en: 'Editor', id: 'Editor' },
  'slug-change': { en: 'Slug change', id: 'Perubahan alamat' },
} as const

const REDIRECT_SOURCES = Object.keys(REDIRECT_SOURCE_LABELS) as Array<
  keyof typeof REDIRECT_SOURCE_LABELS
>

export const REDIRECT_CODE_LABELS = {
  301: { en: 'Permanent (301)', id: 'Permanen (301)' },
  302: { en: 'Temporary (302)', id: 'Sementara (302)' },
} as const

const REDIRECT_CODES = Object.keys(REDIRECT_CODE_LABELS).map(Number) as Array<
  keyof typeof REDIRECT_CODE_LABELS
>

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: {
    singular: { en: 'Redirect', id: 'Pengalihan' },
    plural: { en: 'Redirects', id: 'Pengalihan' },
  },
  admin: {
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'from',
    defaultColumns: ['site', 'from', 'to', 'code', 'source', 'hits', 'updatedAt'],
    description: {
      en: 'Per-site URL redirects. The from path must start with /.',
      id: 'Pengalihan URL per situs. Jalur asal harus diawali /.',
    },
  },
  access: REDIRECTS_ACCESS,
  indexes: [{ fields: ['site', 'from'], unique: true }],
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
      name: 'from',
      type: 'text',
      required: true,
      maxLength: 2048,
      label: { en: 'From', id: 'Dari' },
      validate: (value: unknown) => {
        if (!value) return true
        const path = String(value)
        if (!path.startsWith('/')) return 'The path must start with /.'
        if (path.length > 2048) return 'Keep the path to 2048 characters.'
        return true
      },
      admin: {
        description: {
          en: 'The path to redirect from, such as /old-page.',
          id: 'Jalur yang dialihkan, mis. /old-page.',
        },
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      maxLength: 2048,
      label: { en: 'To', id: 'Ke' },
      admin: {
        description: {
          en: 'Where it redirects to: a path on the same site or an absolute URL.',
          id: 'Tujuan pengalihan: jalur di situs yang sama atau URL absolut.',
        },
      },
    },
    {
      name: 'code',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: REDIRECT_CODES.map((value) => ({
        value: String(value),
        label: REDIRECT_CODE_LABELS[value],
      })),
      label: { en: 'Code', id: 'Kode' },
      admin: { position: 'sidebar' },
    },
    {
      name: 'source',
      type: 'select',
      required: true,
      options: REDIRECT_SOURCES.map((value) => ({ value, label: REDIRECT_SOURCE_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'hits',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: { position: 'sidebar', step: 1 },
    },
  ],
}
