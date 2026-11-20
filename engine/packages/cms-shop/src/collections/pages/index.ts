/**
 * The shop's `pages` (CONTENT-MODEL.md §6; TASKS.md 27.1.c, 27.5), from the shared factory
 * (`@engine/cms-core/collections/pages`): each page built from sections (`./blocks`), the home,
 * the partnership page and any other page offered their own blocks; a page previewed beside its
 * editor at 390 and 1280 (`../../admin/preview`). Store staff read none. No `site`: every page here
 * is the shop's, and a change expires the shop's pages tag.
 *
 * Today's one CMS builds its `pages` from the same layout and access, with the gallery's fields
 * beside them and each page naming its site (`@engine/cms/collections/pages`).
 */
import { DRAFTED_ACCESS } from '@engine/cms-core/access'
import { notForStoreStaff } from '@engine/cms-core/access/store-staff'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { pagesCollection, pagesPublishers } from '@engine/cms-core/collections/pages'
import { pagesInvalidation } from '@engine/cms-core/hooks'
import type { Condition, Field } from 'payload'

import { withShopPagePreview } from '../../admin/preview'
import { blocksForPage, SHOP_BLOCKS } from './blocks'

export const PAGES_ACCESS = {
  // Store staff read no pages (CONTENT-MODEL.md §7: "—"; TASKS.md 3.5.b): signed in, they would
  // otherwise get the public's published read through the API.
  read: notForStoreStaff(DRAFTED_ACCESS.read),
  readVersions: notForStoreStaff(DRAFTED_ACCESS.readVersions),
  create: pagesPublishers,
  update: pagesPublishers,
  delete: pagesPublishers,
} as const

/** A shop page's sections; `condition` shows them only on a shop page where pages name a site. */
export function shopPageLayout(condition?: Condition): Field {
  return {
    name: 'layout',
    type: 'blocks',
    label: { en: 'Sections', id: 'Bagian halaman' },
    labels: {
      singular: { en: 'Section', id: 'Bagian' },
      plural: { en: 'Sections', id: 'Bagian' },
    },
    blocks: SHOP_BLOCKS,
    // The home, the partnership page and any other page each offer their own blocks (`./blocks`).
    filterOptions: blocksForPage,
    maxRows: 30,
    admin: {
      ...(condition ? { condition } : {}),
      initCollapsed: true,
      description: {
        en: 'The page from top to bottom. Add, drag to reorder, or remove sections; each section’s words are entered per language. The home and the partnership page offer their own sections as well as the general ones.',
        id: 'Halaman dari atas ke bawah. Tambah, seret untuk mengubah urutan, atau hapus bagian; teks setiap bagian diisi per bahasa. Beranda dan halaman kemitraan punya bagian sendiri selain bagian umum.',
      },
    },
  }
}

const invalidation = pagesInvalidation('shop')

export const Pages = withShopPagePreview(
  pagesCollection({
    group: ADMIN_GROUPS.content,
    description: {
      en: 'The shop’s pages, built from sections: its home is the page with the address “home”, the partnership page “partnership”, the stores page “stores”.',
      id: 'Halaman toko, disusun dari bagian-bagian: berandanya adalah halaman dengan alamat “home”, halaman kemitraan “partnership”, halaman toko “stores”.',
    },
    slugDescription: {
      en: 'The page address, such as "about-us" or "delivery". The home is "home".',
      id: 'Alamat halaman, mis. "about-us" atau "delivery". Beranda adalah "home".',
    },
    access: PAGES_ACCESS,
    hooks: { afterChange: [invalidation.afterChange], afterDelete: [invalidation.afterDelete] },
    contentFields: [shopPageLayout()],
  }),
) satisfies { slug: 'pages' }
