/**
 * The site a record belongs to: `gallery` or `shop` (CONTENT-MODEL.md §1).
 * Required everywhere the hostname chooses the site, and indexed because every
 * public read filters by it.
 */
import type { SelectField } from 'payload'

export const SITE_OPTIONS = [
  { value: 'gallery', label: { en: 'Gallery', id: 'Galeri' } },
  { value: 'shop', label: { en: 'Shop', id: 'Toko' } },
]

export const SITE_VALUES = ['gallery', 'shop'] as const
export type Site = (typeof SITE_VALUES)[number]

/**
 * The `site` field the shared collections (pages, redirects, leads, events, chat sessions) are
 * given while this one CMS keeps both sites' records in one table (`@engine/cms-core` factories'
 * `site` option, dropped in phase 26): required, in the sidebar, with no note — and indexed only
 * where the collection asks (events).
 */
export const recordSiteField = (options?: { index?: boolean }): SelectField => ({
  name: 'site',
  type: 'select',
  required: true,
  ...(options?.index ? { index: true } : {}),
  options: SITE_OPTIONS,
  admin: { position: 'sidebar' },
})

export const siteField = (options?: { index?: boolean }): SelectField => ({
  name: 'site',
  type: 'select',
  required: true,
  index: options?.index ?? true,
  options: SITE_OPTIONS,
  admin: {
    position: 'sidebar',
    description: {
      en: 'Which site this record belongs to: the gallery or the shop.',
      id: 'Catatan ini milik situs mana: galeri atau toko.',
    },
  },
})
