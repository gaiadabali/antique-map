/**
 * `themes` — what a print shows, across product types (TASKS.md 28.1; the owner's feedback of
 * 2026-11-19): Bali, Java, Singapore, Botanicals… The shop page's "Shop by theme" lists them, and a
 * product names any number of them (`products.themes`). A collection rather than a fixed list, so
 * the owner adds a theme in the admin, with its cover picture and its place in the order.
 *
 * - **Drafts** are Payload's `_status`: the public reads published themes only, through the shop's
 *   loaders (`overrideAccess: false`, `_status: 'published'`, `select`).
 * - **Who** — the owner and the editors write and publish; store staff read none.
 * - **Order** — dragged in the list (Payload's `orderable`, the hidden `_order` key).
 * - **Deleting** a theme only unlinks it from its products (a many-to-many link, no stock or sale
 *   rests on it); unpublish it to hide it.
 * - **Cache** — a change the public could see expires the shop's listings (`catalogue:shop`).
 */
import { catalogueTag, invalidate } from '@engine/cache'
import { hiddenFromAllButCatalogueStaff } from '@engine/cms-core/access'
import { VOCABULARY_ACCESS, VOCABULARY_VERSIONS } from '@engine/cms-core/access/vocabulary'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { IMAGES_ONLY } from '@engine/cms-core/collections/media/kinds'
import {
  IN_DEFAULT_LOCALE_NOTE,
  requiredInDefaultLocale,
  slugField,
  translationStatusField,
} from '@engine/cms-core/fields'
import { changedPublishedState } from '@engine/cms-core/hooks'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload'

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

export const Themes: CollectionConfig = {
  slug: 'themes',
  labels: {
    singular: { en: 'Theme', id: 'Tema' },
    plural: { en: 'Themes', id: 'Tema' },
  },
  admin: {
    group: ADMIN_GROUPS.catalogue,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'label',
    defaultColumns: ['label', 'slug', '_status', 'updatedAt'],
    listSearchableFields: ['label', 'slug'],
    description: {
      en: 'Shown on Old East Indies only. What a print shows — Bali, Java, Botanicals… A product may have several. Drag to set the order on the shop page.',
      id: 'Hanya tampil di Old East Indies. Apa yang ditampilkan cetakan — Bali, Jawa, Botani… Satu produk boleh punya beberapa. Seret untuk mengatur urutan di halaman toko.',
    },
  },
  orderable: true,
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: {
    afterChange: [invalidateOnChange],
    afterDelete: [invalidateOnDelete],
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      label: { en: 'Name', id: 'Nama' },
      localized: true,
      maxLength: 120,
      validate: requiredInDefaultLocale('Give the theme its name in English.'),
      admin: { description: IN_DEFAULT_LOCALE_NOTE },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      filterOptions: IMAGES_ONLY,
      label: { en: 'Cover picture', id: 'Gambar sampul' },
      admin: {
        description: {
          en: 'Shown on the shop page. Left empty, the first product’s picture is used.',
          id: 'Tampil di halaman toko. Bila kosong, gambar produk pertama yang dipakai.',
        },
      },
    },
    slugField({ from: 'label' }),
    translationStatusField,
  ],
}
