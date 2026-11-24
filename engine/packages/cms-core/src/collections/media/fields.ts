/**
 * The `media` record's fields (CONTENT-MODEL.md §6; C9 v1.4, TASKS.md 8.3.a, 8.3.f). Payload adds
 * the upload's own (filename, mime type, size, focal point) and the storage plugin its `prefix`,
 * `_objectKey` and `url`.
 *
 * A record is an image, a video or a PDF (`./kinds`): what follows is an image's, and the admin
 * shows it, and the server requires it, for an image only. A video or a PDF has a title and a
 * description instead (`./kinds` `FILE_FIELDS`), and no pipeline.
 *
 * - `alt` is localised and required of an image: what a screen-reader user gets instead of it.
 * - `role` and `provenance` are set once, at intake, from the master: what the image is and how it
 *   was made. `provenance` has **no default** — a synthetic image must be declared, never
 *   inferred, and a default would declare every forgotten one a photograph. It replaces KOI's
 *   `aiGenerated` flag, whose meaning is its `ai-generated` value.
 * - A CMS may add its own intake fields (`mediaFields`): the gallery's `master`, the capture it
 *   was processed from — staff only, like every master's field.
 * - `assetId`, `derivatives` and `iiif` are the pipeline's (TASKS.md 15.1, 15.2): the content
 *   address C9 keys the derivatives and tiles by, and how far they have got. Nobody types them:
 *   `./hooks` sets the address from the file and keeps the rest out of any request's hands.
 */
import { DERIVATIVE_VERSION } from '@engine/media/contract'
import {
  validations,
  type Field,
  type SelectFieldSingleValidation,
  type TextFieldSingleValidation,
} from 'payload'

import { FILE_FIELDS, forImagesOnly, KIND_FIELD, kindOfData } from './kinds'
import { LABEL_FIELD } from './label'
import { PROVENANCE_OPTIONS, ROLE_OPTIONS } from './options'

export const ALT_MAX_LENGTH = 500

type Data = Record<string, unknown> | undefined
const isImage = (data: unknown) => kindOfData(data as Data) === 'image'

/**
 * An image's alt text: required, and never only whitespace. A video or a PDF has none; a record
 * whose type is not yet known (the admin's new record, before its file is saved) is judged when
 * it is saved, once Payload has read the file.
 */
export const validateAlt: TextFieldSingleValidation = (value, { data } = {} as never) => {
  if (data !== undefined && !isImage(data)) return true
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Describe the image in words: alt text is what a person who cannot see it reads instead.'
  }
  if (value.length > ALT_MAX_LENGTH) {
    return `Keep alt text to ${ALT_MAX_LENGTH} characters; put the rest in the caption.`
  }
  return true
}

/** Payload's select check, plus: an image must have one (a video or a PDF has none). */
export const requiredOfAnImage: SelectFieldSingleValidation = (value, args) => {
  if (isImage(args.data) && (value === null || value === undefined || value === '')) {
    return args.req.t('validation:required')
  }
  return (validations.select as SelectFieldSingleValidation)(value, args)
}

export const DERIVATIVE_STATES = ['pending', 'ready', 'failed'] as const
export const TILE_STATES = ['none', 'pending', 'ready', 'failed'] as const
export const ALT_SOURCES = ['baseline', 'cataloguer', 'ai-draft'] as const
export const TRANSLATION_STATES = ['entered', 'machine', 'reviewed'] as const

const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).replace('-', ' ')
const plain = (values: readonly string[]) =>
  values.map((value) => ({ value, label: { en: label(value), id: label(value) } }))

/**
 * What the image is an image **of** (CONTENT-MODEL.md §5's subject table; TASKS.md 3.2.e): work,
 * product, store or other. Set once, at intake, with the role — the two decide together what a
 * work may show and what store staff may read (work images are the gallery's alone).
 */
export const MEDIA_SUBJECTS = ['work', 'product', 'store', 'other'] as const
export type MediaSubject = (typeof MEDIA_SUBJECTS)[number]
export const SUBJECT_OPTIONS = plain(MEDIA_SUBJECTS)

const INTAKE_FIELDS: Field[] = [
  {
    name: 'alt',
    type: 'text',
    label: { en: 'Alt text', id: 'Teks alternatif' },
    localized: true,
    maxLength: ALT_MAX_LENGTH,
    validate: validateAlt,
    admin: {
      description: {
        en: 'What the image shows, for someone who cannot see it. For a product: what it is, its colour and material, e.g. "Black batik tote bag, front view". For a map or a print: the region, the cartouche, the colouring, anything notable. For a digital mockup or an AI-generated image, start with what it is.',
        id: 'Apa yang ditunjukkan gambar, untuk seseorang yang tidak dapat melihatnya. Untuk produk: apa itu, warna dan bahannya, mis. "Tas tote batik hitam, tampak depan". Untuk peta atau cetakan: wilayahnya, kartusnya, pewarnaannya, apa pun yang mencolok. Untuk mockup digital atau gambar buatan AI, mulailah dengan apa itu.',
      },
    },
  },
  {
    name: 'altSource',
    type: 'select',
    label: { en: 'Alt text source', id: 'Sumber teks alternatif' },
    localized: true,
    defaultValue: 'cataloguer',
    options: plain(ALT_SOURCES),
    admin: {
      position: 'sidebar',
      description: {
        en: 'Baseline: built from the record. AI draft: stays flagged until a person has checked it.',
        id: 'Garis dasar: dibuat dari catatan. Draf AI: tetap ditandai sampai seseorang memeriksanya.',
      },
    },
  },
  {
    name: 'translationStatus',
    type: 'select',
    label: { en: 'Translation status', id: 'Status terjemahan' },
    localized: true,
    defaultValue: 'entered',
    options: plain(TRANSLATION_STATES),
    admin: { position: 'sidebar' },
  },
  {
    name: 'caption',
    type: 'textarea',
    label: { en: 'Caption', id: 'Keterangan' },
    localized: true,
  },
  // Rarely set: folded, so the first screen is what a person fills (TASKS.md 27.6). Layout only.
  {
    type: 'collapsible',
    label: { en: 'Credit and licence', id: 'Kredit dan lisensi' },
    admin: { initCollapsed: true },
    fields: [
      { name: 'credit', type: 'text', label: { en: 'Credit', id: 'Kredit' } },
      { name: 'licence', type: 'text', label: { en: 'Licence', id: 'Lisensi' } },
    ],
  },
  {
    name: 'subject',
    type: 'select',
    label: { en: 'Subject', id: 'Subjek' },
    validate: requiredOfAnImage,
    options: SUBJECT_OPTIONS,
    admin: {
      description: {
        en: 'What it is an image of. Choose Product for a shop product photo, Work for an antique (store staff cannot read those), Store for a shop front. Set at intake, with the role. No default: a wrong subject changes who can read the image.',
        id: 'Apa yang digambarkan. Pilih Product untuk foto produk toko, Work untuk barang antik (staf toko tidak dapat membacanya), Store untuk tampak toko. Diatur saat intake, bersama perannya. Tanpa default: subjek yang salah mengubah siapa yang dapat membaca gambar.',
      },
    },
  },
  {
    name: 'role',
    type: 'select',
    label: { en: 'Role', id: 'Peran' },
    validate: requiredOfAnImage,
    options: ROLE_OPTIONS,
    admin: {
      description: {
        en: 'What the image is — set at intake, the same as its master’s. For a product photo on a plain background choose "Flat (a product)"; a product being used, "In use (a product)".',
        id: 'Apa gambar ini — diatur saat masuk, sama seperti master-nya. Untuk foto produk berlatar polos pilih "Datar (produk)"; produk yang sedang dipakai, "Sedang dipakai (produk)".',
      },
    },
  },
  {
    name: 'provenance',
    type: 'select',
    label: { en: 'Provenance', id: 'Asal-usul' },
    validate: requiredOfAnImage,
    options: PROVENANCE_OPTIONS,
    admin: {
      description: {
        en: 'How it was made. For a picture you took of the real thing, choose "Photograph of the real thing". Anything else is labelled wherever it is shown. There is no default on purpose: a mockup or AI image must be declared, never assumed to be a photograph.',
        id: 'Cara pembuatannya. Untuk gambar yang Anda ambil dari benda aslinya, pilih "Foto dari benda aslinya". Selain itu diberi label di mana pun ditampilkan. Tanpa default dengan sengaja: mockup atau gambar AI harus dinyatakan, tidak boleh dianggap foto.',
      },
    },
  },
]

const PIPELINE_ADDRESS: Field[] = [
  {
    name: 'assetId',
    type: 'text',
    label: { en: 'Asset id', id: 'Id aset' },
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: {
        en: 'Derived from the file: the address its derivatives and tiles are stored under.',
        id: 'Diperoleh dari berkas: alamat tempat turunan dan tile-nya disimpan.',
      },
    },
  },
]

/** The pipeline's progress, nobody's to type: folded under one heading (TASKS.md 27.6). */
const PIPELINE_PROGRESS: Field[] = [
  {
    name: 'derivatives',
    type: 'group',
    label: { en: 'Derivatives', id: 'Turunan' },
    admin: { readOnly: true },
    fields: [
      {
        name: 'status',
        type: 'select',
        label: { en: 'Status', id: 'Status' },
        defaultValue: 'pending',
        options: plain(DERIVATIVE_STATES),
      },
      {
        name: 'version',
        type: 'text',
        label: { en: 'Version', id: 'Versi' },
        admin: {
          description: {
            en: `The ladder's version once built (now ${DERIVATIVE_VERSION}).`,
            id: `Versi tangga setelah dibangun (sekarang ${DERIVATIVE_VERSION}).`,
          },
        },
      },
      {
        name: 'blurDataUri',
        type: 'textarea',
        label: { en: 'Blur placeholder', id: 'Plaseholder blur' },
      },
    ],
  },
  {
    name: 'iiif',
    type: 'group',
    label: { en: 'Deep zoom', id: 'Zoom dalam' },
    admin: { readOnly: true },
    fields: [
      {
        name: 'status',
        type: 'select',
        label: { en: 'Status', id: 'Status' },
        defaultValue: 'none',
        options: plain(TILE_STATES),
      },
    ],
  },
]

/** The intake fields every kind has: the translation status, the credit and the licence. */
const FOR_EVERY_KIND = new Set(['translationStatus'])
const forEveryKind = (field: Field) =>
  field.type === 'collapsible' || ('name' in field && FOR_EVERY_KIND.has(field.name))

/**
 * The record's fields: its kind; what intake sets of an image, then the CMS's own `intake` fields
 * (the gallery's `master`, the capture it was processed from); a video's or a PDF's title and
 * description; then the pipeline's, an image's alone.
 */
export function mediaFields(intake: readonly Field[] = []): Field[] {
  return [
    KIND_FIELD,
    ...INTAKE_FIELDS.map((field) => (forEveryKind(field) ? field : forImagesOnly(field))),
    ...intake.map(forImagesOnly),
    ...FILE_FIELDS,
    LABEL_FIELD,
    ...PIPELINE_ADDRESS.map(forImagesOnly),
    forImagesOnly({
      type: 'collapsible',
      label: { en: 'Image processing (automatic)', id: 'Pemrosesan gambar (otomatis)' },
      admin: { initCollapsed: true },
      fields: PIPELINE_PROGRESS,
    }),
  ]
}

/** The fields only the pipeline writes; `./hooks` restores them on any request's write. */
export const DERIVED_FIELDS = ['assetId', 'derivatives', 'iiif'] as const
