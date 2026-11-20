/**
 * `pages` — information and editorial pages for both sites (CONTENT-MODEL.md §6).
 *
 * A **shop** page is built from blocks (`./blocks`): the home (address `home`), the partnership
 * page (`partnership`), the stores page (`stores`) and any other page at `/{address}`. The site
 * draws only what is published here (TASKS.md 27.5.b): an unpublished home is the bare shell, any
 * other unpublished page a 404. A shop page previews beside its editor (`../../admin/preview`). A
 * **gallery** page keeps its intro, hero picture, plain-text body and curated works.
 *
 * The rest — the title, SEO, the address, drafts and the publish rule — is the shared factory's
 * (`@engine/cms-core/collections/pages`). Drafts enabled, so public reads see published only
 * (`publishedOrStaff`). Owner and editor write; the public reads published; store staff read none.
 * Unique `(site, slug)`. A change to a published page expires its site's `pages:<site>` cache tag
 * (`../../hooks/pages-invalidate`).
 */
import { IMAGES_ONLY } from '@engine/cms-core/collections/media/kinds'
import { pagesCollection } from '@engine/cms-core/collections/pages'
import type { Field } from 'payload'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { withShopPagePreview } from '@engine/cms-shop/admin/preview'
import { recordSiteField } from '../../fields/site'
import { invalidatePagesOnChange, invalidatePagesOnDelete } from '../../hooks/pages-invalidate'
import { PAGES_ACCESS, shopPageLayout } from '@engine/cms-shop/collections/pages'
import { PAGE_KIND_LABELS, PAGE_KINDS } from './kinds'

export { PAGES_VERSIONS } from '@engine/cms-core/collections/pages'
export { PAGES_ACCESS }

const isShop = (data: unknown) => (data as { site?: unknown } | undefined)?.site === 'shop'
const isGallery = (data: unknown) => !isShop(data)

const layout = shopPageLayout(isShop)

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
    filterOptions: IMAGES_ONLY,
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

// A shop page previews beside its editor at 390 and 1280 (`../../admin/preview`; TASKS.md 27.5.a).
export const Pages = withShopPagePreview(
  pagesCollection({
    group: ADMIN_GROUPS.content,
    site: recordSiteField(),
    description: {
      en: 'Pages of either site. A shop page is built from sections: its home is the page with the address “home”, the partnership page “partnership”, the stores page “stores”.',
      id: 'Halaman kedua situs. Halaman toko disusun dari bagian-bagian: berandanya adalah halaman dengan alamat “home”, halaman kemitraan “partnership”, halaman toko “stores”.',
    },
    slugDescription: {
      en: 'The page address, such as "about-us" or "delivery". A shop’s home is "home".',
      id: 'Alamat halaman, mis. "about-us" atau "delivery". Beranda toko adalah "home".',
    },
    access: PAGES_ACCESS,
    hooks: {
      afterChange: [invalidatePagesOnChange],
      afterDelete: [invalidatePagesOnDelete],
    },
    contentFields: [layout, ...galleryFields],
    sidebarFields: [
      {
        name: 'kind',
        type: 'select',
        required: true,
        defaultValue: 'page',
        options: PAGE_KINDS.map((value) => ({ value, label: PAGE_KIND_LABELS[value] })),
        admin: { position: 'sidebar', condition: isGallery },
      },
    ],
  }),
) satisfies { slug: 'pages' }
