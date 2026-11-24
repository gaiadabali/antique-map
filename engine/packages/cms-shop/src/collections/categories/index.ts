/**
 * `categories` — the shop's collections (Old East Indies only): Maps, Travel posters, Animals… A
 * product points at one; the shop's `/collections` index and each `/collections/{slug}` page read
 * them. They were `terms` of the subject kind until 2026-10-21, mixed in with the antiques' tags;
 * a collection of their own gives each a cover picture, a short description, an order on the
 * index and its own search-engine text.
 *
 * - **Drafts** are Payload's `_status`: the public reads published categories only, through the
 *   shop's loaders (`overrideAccess: false`, `_status: 'published'`, `select`).
 * - **Who** — the owner and the editors write and publish; store staff read none.
 * - **Deleting** a category a product still points at is refused: move the products first.
 * - **Cache** — a change to a published category expires the shop's listings (`catalogue:shop`).
 * - **Order** — dragged in the list (Payload's `orderable`, the hidden `_order` key; TASKS.md
 *   27.1.c). `position`, the number typed before, is kept but no longer shown: the phase-27
 *   migration gave each category its `_order` in `position`'s order, and the site sorts by
 *   `_order` from TASKS.md 27.5 on.
 * - **Product type and Wall Decor** (TASKS.md 28.1) — a category is the product's type on the shop
 *   page's "Shop by product type" (Mounted art prints, Coasters, Notebooks…); `wallDecor` marks the
 *   types its "Wall Decor" row gathers, so Wall Decor is a switch on a category, not a new level.
 */
import { IMAGES_ONLY } from '@engine/cms-core/collections/media/kinds'
import { catalogueTag, invalidate } from '@engine/cache'
import { hiddenFromAllButCatalogueStaff } from '@engine/cms-core/access'
import {
  IN_DEFAULT_LOCALE_NOTE,
  requiredInDefaultLocale,
  slugField,
  translationStatusField,
} from '@engine/cms-core/fields'
import { changedPublishedState } from '@engine/cms-core/hooks'
import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type Validate,
} from 'payload'

import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { VOCABULARY_ACCESS, VOCABULARY_VERSIONS } from '@engine/cms-core/access/vocabulary'

const SHOP_CATALOGUE = catalogueTag('shop')

const invalidateOnChange: CollectionAfterChangeHook = async (args) => {
  if (await changedPublishedState(args)) invalidate([SHOP_CATALOGUE], args.context)
  return args.doc
}

const invalidateOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  if ((doc as { _status?: unknown } | null)?._status !== 'draft') {
    invalidate([SHOP_CATALOGUE], context)
  }
  return doc
}

const refuseDeleteWhileUsed: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: 'products',
    overrideAccess: true,
    req,
    where: { category: { equals: id } },
  })
  if (totalDocs === 0) return
  throw new APIError(
    `${totalDocs} product${totalDocs === 1 ? ' is' : 's are'} still in this category. Move ${totalDocs === 1 ? 'it' : 'them'} to another category first, or unpublish the category to hide it.`,
    409,
    null,
    true,
  )
}

const validatePosition: Validate = (value) =>
  value === null || value === undefined || (Number.isInteger(value) && Number(value) >= 0)
    ? true
    : 'The order is a whole number, 0 or more.'

export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: {
    singular: { en: 'Category', id: 'Kategori' },
    plural: { en: 'Categories', id: 'Kategori' },
  },
  admin: {
    group: ADMIN_GROUPS.catalogue,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'label',
    defaultColumns: ['label', 'slug', '_status', 'updatedAt'],
    listSearchableFields: ['label', 'slug'],
    description: {
      en: 'Shown on Old East Indies only. The shop’s collections — each product belongs to one. Unpublish a category to hide it from the shop.',
      id: 'Hanya tampil di Old East Indies. Koleksi toko — setiap produk masuk ke satu kategori. Batalkan terbit untuk menyembunyikannya dari toko.',
    },
  },
  // Drag to reorder in the list; the default sort becomes the dragged order (`_order`).
  orderable: true,
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: {
    beforeDelete: [refuseDeleteWhileUsed],
    afterChange: [invalidateOnChange],
    afterDelete: [invalidateOnDelete],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: { en: 'Category', id: 'Kategori' },
          fields: [
            {
              name: 'label',
              type: 'text',
              label: { en: 'Name', id: 'Nama' },
              localized: true,
              maxLength: 120,
              validate: requiredInDefaultLocale('Give the category its name in English.'),
              admin: { description: IN_DEFAULT_LOCALE_NOTE },
            },
            {
              name: 'description',
              type: 'textarea',
              label: { en: 'Short description', id: 'Deskripsi singkat' },
              localized: true,
              maxLength: 600,
              admin: {
                rows: 4,
                description: {
                  en: 'A sentence or two under the title of the category’s page.',
                  id: 'Satu atau dua kalimat di bawah judul halaman kategori.',
                },
              },
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              filterOptions: IMAGES_ONLY,
              label: { en: 'Cover picture', id: 'Gambar sampul' },
              admin: {
                description: {
                  en: 'Shown on the collections index. Left empty, the first product’s picture is used.',
                  id: 'Tampil di daftar koleksi. Bila kosong, gambar produk pertama yang dipakai.',
                },
              },
            },
          ],
        },
        {
          label: { en: 'Search engines', id: 'Mesin pencari' },
          fields: [
            {
              name: 'seo',
              type: 'group',
              label: { en: 'Search engines', id: 'Mesin pencari' },
              admin: {
                description: {
                  en: 'Optional. Left empty, the name and description are used.',
                  id: 'Opsional. Bila kosong, nama dan deskripsi yang dipakai.',
                },
              },
              fields: [
                {
                  name: 'title',
                  type: 'text',
                  label: { en: 'Title', id: 'Judul' },
                  localized: true,
                  maxLength: 70,
                },
                {
                  name: 'description',
                  type: 'textarea',
                  label: { en: 'Description', id: 'Deskripsi' },
                  localized: true,
                  maxLength: 160,
                },
              ],
            },
          ],
        },
      ],
    },
    slugField({ from: 'label' }),
    {
      name: 'position',
      type: 'number',
      label: { en: 'Order', id: 'Urutan' },
      index: true,
      validate: validatePosition,
      // Replaced by the dragged order (`orderable`); kept until the site no longer reads it.
      admin: { hidden: true },
    },
    {
      // The shop page's "Wall Decor" row (TASKS.md 28.1): the categories hung on a wall.
      name: 'wallDecor',
      type: 'checkbox',
      label: { en: 'Wall decor', id: 'Dekorasi dinding' },
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        description: {
          en: 'Listed under Wall Decor on the shop page, e.g. mounted art prints and framed prints.',
          id: 'Tampil di bagian Dekorasi Dinding pada halaman toko, mis. cetakan seni berbingkai.',
        },
      },
    },
    translationStatusField,
  ],
}
