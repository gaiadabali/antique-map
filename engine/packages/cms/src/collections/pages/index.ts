/**
 * `pages` — information and editorial pages for both sites (CONTENT-MODEL.md §6).
 *
 * Drafts enabled, so public reads see published only (`publishedOrStaff`). Owner and editor write;
 * the public reads published. Unique `(site, slug)`.
 */
import type { CollectionConfig } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { DRAFTED_ACCESS } from '../../access/published'
import { hasRole } from '../users/roles'
import { PAGE_KIND_LABELS, PAGE_KINDS } from './kinds'
import { pagePublishGuard } from './publish-guard'

const pagesPublishers = ({ req }: Parameters<import('payload').Access>[0]) =>
  hasRole(req.user, 'owner', 'editor')

export const PAGES_ACCESS = {
  read: DRAFTED_ACCESS.read,
  readVersions: DRAFTED_ACCESS.readVersions,
  create: pagesPublishers,
  update: pagesPublishers,
  delete: pagesPublishers,
} as const

export const PAGES_VERSIONS = {
  drafts: { validate: true },
} as const

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: { en: 'Page', id: 'Halaman' },
    plural: { en: 'Pages', id: 'Halaman' },
  },
  admin: {
    group: ADMIN_GROUPS.content,
    useAsTitle: 'title',
    defaultColumns: ['site', 'kind', 'slug', '_status', 'updatedAt'],
    description: {
      en: 'Information and editorial pages for either site.',
      id: 'Halaman informasi dan editorial untuk salah satu situs.',
    },
  },
  access: PAGES_ACCESS,
  versions: PAGES_VERSIONS,
  hooks: {
    beforeChange: [pagePublishGuard],
  },
  indexes: [{ fields: ['site', 'slug'], unique: true }],
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
      name: 'kind',
      type: 'select',
      required: true,
      options: PAGE_KINDS.map((value) => ({ value, label: PAGE_KIND_LABELS[value] })),
      admin: { position: 'sidebar' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      maxLength: 200,
      label: { en: 'Title', id: 'Judul' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      maxLength: 96,
      admin: {
        position: 'sidebar',
        description: {
          en: 'The page address, such as "about-us" or "delivery".',
          id: 'Alamat halaman, mis. "about-us" atau "delivery".',
        },
      },
      validate: (value: unknown) => {
        if (!value) return true
        const slug = String(value)
        if (slug.length > 96) return 'Keep the address to 96 characters.'
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
          return 'Use lower-case letters, digits and single hyphens only.'
        return true
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      localized: true,
      maxLength: 800,
      label: { en: 'Intro', id: 'Pengantar' },
    },
    {
      name: 'hero',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Hero image', id: 'Gambar utama' },
    },
    {
      name: 'body',
      type: 'textarea',
      localized: true,
      maxLength: 12_000,
      label: { en: 'Body', id: 'Isi' },
      admin: {
        description: {
          en: 'Plain text for now. Rich-text blocks come with task 9.3.',
          id: 'Teks polos untuk saat ini. Blok teks kaya datang bersama tugas 9.3.',
        },
      },
    },
    {
      name: 'works',
      type: 'relationship',
      relationTo: 'works',
      hasMany: true,
      label: { en: 'Works', id: 'Karya' },
      admin: {
        description: { en: 'For a curated collection page.', id: 'Untuk halaman koleksi pilihan.' },
      },
    },
    {
      name: 'seo',
      type: 'group',
      label: { en: 'SEO', id: 'SEO' },
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
          maxLength: 70,
          label: { en: 'Title', id: 'Judul' },
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
          maxLength: 200,
          label: { en: 'Description', id: 'Deskripsi' },
        },
      ],
    },
  ],
}
