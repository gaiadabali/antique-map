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
 */
import { catalogueTag, invalidate } from '@engine/cache'
import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeDeleteHook,
  type CollectionConfig,
  type Validate,
} from 'payload'

import { ADMIN_GROUPS } from '../../admin/groups'
import { hiddenFromAllButCatalogueStaff } from '../../admin/hidden'
import { slugField } from '../../fields/slug'
import { translationStatusField } from '../../fields/translation-status'
import { IN_DEFAULT_LOCALE_NOTE, requiredInDefaultLocale } from '../../fields/validate'
import { changedPublishedState } from '../../hooks/published-state'
import { VOCABULARY_ACCESS, VOCABULARY_VERSIONS } from '../terms/vocabulary/access'

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
    group: ADMIN_GROUPS.shop,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'label',
    defaultColumns: ['label', 'slug', 'position', '_status', 'updatedAt'],
    listSearchableFields: ['label', 'slug'],
    description: {
      en: 'Shown on Old East Indies only. The shop’s collections — each product belongs to one. Unpublish a category to hide it from the shop.',
      id: 'Hanya tampil di Old East Indies. Koleksi toko — setiap produk masuk ke satu kategori. Batalkan terbit untuk menyembunyikannya dari toko.',
    },
  },
  defaultSort: 'position',
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
      admin: {
        position: 'sidebar',
        step: 1,
        description: {
          en: 'Lower comes first on the collections index and the home page.',
          id: 'Angka kecil tampil lebih dulu di daftar koleksi dan beranda.',
        },
      },
    },
    translationStatusField,
  ],
}
