/**
 * The `redirects` collection factory — a site's URL redirects (CONTENT-MODEL.md §6). Managed by
 * owner and editor; public reads none. A plain Payload collection, no redirects plugin. The `from`
 * path is unique — per site, while the one CMS keeps both sites' redirects (`site`).
 */
import type { Access, CollectionConfig, Field } from 'payload'

import { hiddenFromAllButCatalogueStaff } from '../../access/hidden'
import { hasRole } from '../../access/user-roles'
import { insertedAt, siteKeyed, withSiteColumn, type SharedCollectionOptions } from '../options'

const redirectManagers: Access = ({ req }) => hasRole(req.user, 'owner', 'editor')

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
  410: { en: 'Gone (410)', id: 'Hilang (410)' },
} as const

const REDIRECT_CODES = Object.keys(REDIRECT_CODE_LABELS).map(Number) as Array<
  keyof typeof REDIRECT_CODE_LABELS
>

/** `to` is required unless the row answers 410 (gone), and empty when it does. */
export const validateTo = (value: unknown, { siblingData }: { siblingData?: unknown }) => {
  const gone = (siblingData as { code?: unknown } | undefined)?.code === '410'
  const to = typeof value === 'string' ? value.trim() : ''
  if (gone) return to === '' ? true : 'A 410 (gone) redirect has no destination: leave this empty.'
  return to === '' ? 'A destination is required unless the code is 410 (gone).' : true
}

/** A path on the site: starts with `/`, at most 2048 characters. */
export const validateFrom = (value: unknown) => {
  if (!value) return true
  const path = String(value)
  if (!path.startsWith('/')) return 'The path must start with /.'
  if (path.length > 2048) return 'Keep the path to 2048 characters.'
  return true
}

export function redirectsCollection(
  options: SharedCollectionOptions,
): CollectionConfig & { slug: 'redirects' } {
  const { site } = options
  return {
    slug: 'redirects',
    labels: {
      singular: { en: 'Redirect', id: 'Pengalihan' },
      plural: { en: 'Redirects', id: 'Pengalihan' },
    },
    admin: {
      group: options.group,
      hidden: hiddenFromAllButCatalogueStaff,
      useAsTitle: 'from',
      defaultColumns: withSiteColumn(
        ['from', 'to', 'code', 'source', 'hits', 'updatedAt'],
        0,
        site,
      ),
      description: {
        en: 'Per-site URL redirects. The from path must start with /.',
        id: 'Pengalihan URL per situs. Jalur asal harus diawali /.',
      },
    },
    access: REDIRECTS_ACCESS,
    indexes: [{ fields: siteKeyed(site, ['from']), unique: true }],
    fields: insertedAt<Field>(
      [
        {
          name: 'from',
          type: 'text',
          required: true,
          maxLength: 2048,
          label: { en: 'From', id: 'Dari' },
          validate: validateFrom,
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
          maxLength: 2048,
          label: { en: 'To', id: 'Ke' },
          validate: validateTo,
          admin: {
            description: {
              en: 'Where it redirects to: a path on the same site or an absolute URL. Leave empty for 410 (gone).',
              id: 'Tujuan pengalihan: jalur di situs yang sama atau URL absolut. Kosongkan untuk 410 (hilang).',
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
          options: REDIRECT_SOURCES.map((value) => ({
            value,
            label: REDIRECT_SOURCE_LABELS[value],
          })),
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
      0,
      site,
    ),
  }
}
