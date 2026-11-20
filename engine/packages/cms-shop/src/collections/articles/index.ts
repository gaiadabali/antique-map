/**
 * `articles` — the shop's articles (TASKS.md 28.1; the owner's feedback of 2026-11-19): each one a
 * PDF with a cover picture, a title, a date and an optional short summary. The landing page shows
 * the latest two and the articles page lists them all, newest first, each opening its PDF.
 *
 * - **Drafts** are Payload's `_status`: the public reads published articles only, through the
 *   shop's loaders (`overrideAccess: false`, `_status: 'published'`, `select`).
 * - **Who** — the owner and the editors write and publish; store staff read none
 *   (`VOCABULARY_ACCESS`, as the categories).
 * - **Files** — the cover takes images only, the article itself PDFs only (the media's `kind`).
 * - **Order** — by date, newest first (`defaultSort`; the loaders sort `-date` too).
 * - **Cache** — a change the public could see expires the shop's pages tag (`pages:shop`), which
 *   the landing page and the articles page are read under.
 */
import { invalidate, pagesTag } from '@engine/cache'
import { VOCABULARY_ACCESS, VOCABULARY_VERSIONS } from '@engine/cms-core/access/vocabulary'
import { hiddenFromAllButCatalogueStaff } from '@engine/cms-core/access'
import { ADMIN_GROUPS } from '@engine/cms-core/admin/groups'
import { IMAGES_ONLY, PDFS_ONLY } from '@engine/cms-core/collections/media/kinds'
import {
  IN_DEFAULT_LOCALE_NOTE,
  requiredInDefaultLocale,
  requiredToPublish,
  slugField,
  translationStatusField,
} from '@engine/cms-core/fields'
import { changedPublishedState } from '@engine/cms-core/hooks'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  Validate,
} from 'payload'
import { upload } from 'payload/shared'

const SHOP_PAGES = pagesTag('shop')

/**
 * Needed to publish, and when set, Payload's own upload check — which a field's `validate`
 * replaces, and which is what refuses a PDF as the cover or a picture as the article
 * (`filterOptions`, on every write path).
 */
const fileToPublish = (message: string): Validate => {
  const needed = requiredToPublish(message)
  return (value, args) => {
    const result = needed(value, args)
    return result === true ? (upload as Validate)(value, args) : result
  }
}

const invalidateOnChange: CollectionAfterChangeHook = async (args) => {
  if (await changedPublishedState(args)) invalidate([SHOP_PAGES], args.context)
  return args.doc
}

const invalidateOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  if ((doc as { _status?: unknown } | null)?._status !== 'draft') invalidate([SHOP_PAGES], context)
  return doc
}

export const Articles: CollectionConfig = {
  slug: 'articles',
  labels: {
    singular: { en: 'Article', id: 'Artikel' },
    plural: { en: 'Articles', id: 'Artikel' },
  },
  admin: {
    group: ADMIN_GROUPS.content,
    hidden: hiddenFromAllButCatalogueStaff,
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description: {
      en: 'Shown on Old East Indies only. Articles as PDFs, each with a cover picture: the newest two on the home page, all of them on the articles page.',
      id: 'Hanya tampil di Old East Indies. Artikel berupa PDF, masing-masing dengan gambar sampul: dua terbaru di beranda, semuanya di halaman artikel.',
    },
  },
  defaultSort: '-date',
  access: VOCABULARY_ACCESS,
  versions: VOCABULARY_VERSIONS,
  hooks: {
    afterChange: [invalidateOnChange],
    afterDelete: [invalidateOnDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      label: { en: 'Title', id: 'Judul' },
      localized: true,
      maxLength: 160,
      validate: requiredInDefaultLocale('Give the article its title in English.'),
      admin: { description: IN_DEFAULT_LOCALE_NOTE },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: { en: 'Short summary', id: 'Ringkasan singkat' },
      localized: true,
      maxLength: 300,
      admin: {
        rows: 3,
        description: {
          en: 'Optional. A sentence under the title in the list of articles.',
          id: 'Opsional. Satu kalimat di bawah judul pada daftar artikel.',
        },
      },
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
      filterOptions: IMAGES_ONLY,
      label: { en: 'Cover picture', id: 'Gambar sampul' },
      validate: fileToPublish('Choose the cover picture before publishing.'),
      admin: {
        description: {
          en: 'The picture visitors click to open the article.',
          id: 'Gambar yang diklik pengunjung untuk membuka artikel.',
        },
      },
    },
    {
      name: 'pdf',
      type: 'upload',
      relationTo: 'media',
      filterOptions: PDFS_ONLY,
      label: { en: 'Article (PDF)', id: 'Artikel (PDF)' },
      validate: fileToPublish('Choose the article’s PDF before publishing.'),
      admin: {
        description: {
          en: 'The PDF that opens when the article is clicked.',
          id: 'PDF yang terbuka saat artikel diklik.',
        },
      },
    },
    {
      name: 'date',
      type: 'date',
      label: { en: 'Date', id: 'Tanggal' },
      index: true,
      defaultValue: () => new Date().toISOString(),
      validate: requiredToPublish('Set the article’s date before publishing.'),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' },
        description: {
          en: 'The newest date comes first.',
          id: 'Tanggal terbaru tampil paling atas.',
        },
      },
    },
    slugField({ from: 'title' }),
    translationStatusField,
  ],
}
