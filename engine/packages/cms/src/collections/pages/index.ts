/**
 * `pages` — information and editorial pages for both sites (CONTENT-MODEL.md §6).
 *
 * A **shop** page is built from blocks (`./blocks`): the home (address `home`), the partnership
 * page (`partnership`), the stores page (`stores`) and any other page at `/{address}`. Until a shop
 * page is published the site shows its built-in words, so unpublishing one never leaves a hole. A
 * **gallery** page keeps its intro, hero picture, plain-text body and curated works.
 *
 * Drafts enabled, so public reads see published only (`publishedOrStaff`). Owner and editor write;
 * the public reads published; store staff read none. Unique `(site, slug)`. A change to a
 * published page expires its site's `pages:<site>` cache tag (`../../hooks/pages-invalidate`).
 */
import type { CollectionConfig, Field } from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButCatalogueStaff } from '../../admin/hidden'
import { DRAFTED_ACCESS } from '../../access/published'
import { notForStoreStaff } from '../../access/store-staff'
import { invalidatePagesOnChange, invalidatePagesOnDelete } from '../../hooks/pages-invalidate'
import { hasRole } from '../users/roles'
import { SHOP_BLOCKS } from './blocks'
import { PAGE_KIND_LABELS, PAGE_KINDS } from './kinds'
import { pagePublishGuard } from './publish-guard'

const isShop = (data: unknown) => (data as { site?: unknown } | undefined)?.site === 'shop'
const isGallery = (data: unknown) => !isShop(data)

const pagesPublishers = ({ req }: Parameters<import('payload').Access>[0]) =>
  hasRole(req.user, 'owner', 'editor')

export const PAGES_ACCESS = {
  // Store staff read no pages (CONTENT-MODEL.md §7: "—"; TASKS.md 3.5.b): signed in, they would
  // otherwise get the public's published read through the API.
  read: notForStoreStaff(DRAFTED_ACCESS.read),
  readVersions: notForStoreStaff(DRAFTED_ACCESS.readVersions),
  create: pagesPublishers,
  update: pagesPublishers,
  delete: pagesPublishers,
} as const

export const PAGES_VERSIONS = {
  drafts: { validate: true },
} as const

/** The shop page's sections, in order. */
const layout: Field = {
  name: 'layout',
  type: 'blocks',
  label: { en: 'Sections', id: 'Bagian halaman' },
  labels: {
    singular: { en: 'Section', id: 'Bagian' },
    plural: { en: 'Sections', id: 'Bagian' },
  },
  blocks: SHOP_BLOCKS,
  maxRows: 30,
  admin: {
    condition: isShop,
    initCollapsed: true,
    description: {
      en: 'The page from top to bottom. Add, drag to reorder, or remove sections; each section’s words are entered per language.',
      id: 'Halaman dari atas ke bawah. Tambah, seret untuk mengubah urutan, atau hapus bagian; teks setiap bagian diisi per bahasa.',
    },
  },
}

/** The gallery page's own fields: intro, hero, body and curated works. */
const galleryFields: Field[] = [
  {
    name: 'intro',
    type: 'textarea',
    localized: true,
    maxLength: 800,
    label: { en: 'Intro', id: 'Pengantar' },
    admin: { condition: isGallery },
  },
  {
    name: 'hero',
    type: 'upload',
    relationTo: 'media',
    label: { en: 'Hero image', id: 'Gambar utama' },
    admin: { condition: isGallery },
  },
  {
    name: 'body',
    type: 'textarea',
    localized: true,
    maxLength: 12_000,
    label: { en: 'Body', id: 'Isi' },
    admin: {
      condition: isGallery,
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
      condition: isGallery,
      description: { en: 'For a curated collection page.', id: 'Untuk halaman koleksi pilihan.' },
    },
  },
]

const seo: Field = {
  name: 'seo',
  type: 'group',
  label: { en: 'SEO', id: 'SEO' },
  admin: {
    description: {
      en: 'Optional. Left empty, the page’s title and first words are used.',
      id: 'Opsional. Bila kosong, judul dan kalimat pertama halaman yang dipakai.',
    },
  },
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
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Social sharing picture', id: 'Gambar media sosial' },
      admin: {
        description: {
          en: 'Shown when the page is shared on WhatsApp, Facebook or X; best 1200 × 630. Left empty, the site’s own card is used.',
          id: 'Tampil saat halaman dibagikan di WhatsApp, Facebook atau X; ideal 1200 × 630. Bila kosong, kartu situs yang dipakai.',
        },
      },
    },
  ],
}

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: {
    singular: { en: 'Page', id: 'Halaman' },
    plural: { en: 'Pages', id: 'Halaman' },
  },
  admin: {
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'title',
    defaultColumns: ['title', 'site', 'slug', '_status', 'updatedAt'],
    description: {
      en: 'Pages of either site. A shop page is built from sections: its home is the page with the address “home”, the partnership page “partnership”, the stores page “stores”.',
      id: 'Halaman kedua situs. Halaman toko disusun dari bagian-bagian: berandanya adalah halaman dengan alamat “home”, halaman kemitraan “partnership”, halaman toko “stores”.',
    },
  },
  access: PAGES_ACCESS,
  versions: PAGES_VERSIONS,
  hooks: {
    beforeChange: [pagePublishGuard],
    afterChange: [invalidatePagesOnChange],
    afterDelete: [invalidatePagesOnDelete],
  },
  indexes: [{ fields: ['site', 'slug'], unique: true }],
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Content', id: 'Konten' },
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              localized: true,
              maxLength: 200,
              label: { en: 'Title', id: 'Judul' },
            },
            layout,
            ...galleryFields,
          ],
        },
        {
          label: { en: 'Search engines', id: 'Mesin pencari' },
          fields: [seo],
        },
      ],
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
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'page',
      options: PAGE_KINDS.map((value) => ({ value, label: PAGE_KIND_LABELS[value] })),
      admin: { position: 'sidebar', condition: isGallery },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      maxLength: 96,
      admin: {
        position: 'sidebar',
        description: {
          en: 'The page address, such as "about-us" or "delivery". A shop’s home is "home".',
          id: 'Alamat halaman, mis. "about-us" atau "delivery". Beranda toko adalah "home".',
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
  ],
}
