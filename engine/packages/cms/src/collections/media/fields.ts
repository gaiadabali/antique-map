/**
 * The `media` record's fields (CONTENT-MODEL.md §6; C9 v1.4, TASKS.md 8.3.a, 8.3.f). Payload adds
 * the upload's own (filename, mime type, size, focal point) and the storage plugin its `prefix`,
 * `_objectKey` and `url`.
 *
 * - `alt` is localised and required: what a screen-reader user gets instead of the image.
 * - `role` and `provenance` are set once, at intake, from the master: what the image is and how it
 *   was made. `provenance` has **no default** — a synthetic image must be declared, never
 *   inferred, and a default would declare every forgotten one a photograph. It replaces KOI's
 *   `aiGenerated` flag, whose meaning is its `ai-generated` value.
 * - `master` is the capture it was processed from — staff only, like every master's field.
 * - `assetId`, `derivatives` and `iiif` are the pipeline's (TASKS.md 15.1, 15.2): the content
 *   address C9 keys the derivatives and tiles by, and how far they have got. Nobody types them:
 *   `./hooks` sets the address from the file and keeps the rest out of any request's hands.
 */
import { DERIVATIVE_VERSION } from '@engine/media/contract'
import type { Field, TextFieldSingleValidation } from 'payload'

import { STAFF_ONLY_ACCESS } from '../../access/fields'
import { PROVENANCE_OPTIONS, ROLE_OPTIONS } from './options'

export const ALT_MAX_LENGTH = 500

/** Payload's own `required` check, plus a refusal of alt text that is only whitespace. */
export const validateAlt: TextFieldSingleValidation = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return 'Describe the image in words: alt text is what a person who cannot see it reads instead.'
  }
  if (value.length > ALT_MAX_LENGTH) {
    return `Keep alt text to ${ALT_MAX_LENGTH} characters; put the rest in the caption.`
  }
  return true
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

export const MEDIA_FIELDS: Field[] = [
  {
    name: 'alt',
    type: 'text',
    label: { en: 'Alt text', id: 'Teks alternatif' },
    localized: true,
    required: true,
    maxLength: ALT_MAX_LENGTH,
    validate: validateAlt,
    admin: {
      description: {
        en: 'What the image shows, for someone who cannot see it. For a map or a print: the region, the cartouche, the colouring, anything notable. For a digital mockup or an AI-generated image, start with what it is.',
        id: 'Apa yang ditunjukkan gambar, untuk seseorang yang tidak dapat melihatnya. Untuk peta atau cetakan: wilayahnya, kartusnya, pewarnaannya, apa pun yang mencolok. Untuk mockup digital atau gambar buatan AI, mulailah dengan apa itu.',
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
  { name: 'credit', type: 'text', label: { en: 'Credit', id: 'Kredit' } },
  { name: 'licence', type: 'text', label: { en: 'Licence', id: 'Lisensi' } },
  {
    name: 'subject',
    type: 'select',
    label: { en: 'Subject', id: 'Subjek' },
    required: true,
    options: SUBJECT_OPTIONS,
    admin: {
      description: {
        en: 'What it is an image of — a work, a product, a store, or something else. Set at intake, with the role.',
        id: 'Apa yang digambarkan — karya, produk, toko, atau yang lain. Diatur saat intake, bersama perannya.',
      },
    },
  },
  {
    name: 'role',
    type: 'select',
    label: { en: 'Role', id: 'Peran' },
    required: true,
    options: ROLE_OPTIONS,
    admin: {
      description: {
        en: 'What the image is — set at intake, the same as its master’s.',
        id: 'Apa gambar ini — diatur saat masuk, sama seperti master-nya.',
      },
    },
  },
  {
    name: 'provenance',
    type: 'select',
    label: { en: 'Provenance', id: 'Asal-usul' },
    required: true,
    options: PROVENANCE_OPTIONS,
    admin: {
      description: {
        en: 'How it was made. Anything but a photograph is labelled wherever it is shown. There is no default: choose.',
        id: 'Cara pembuatannya. Apa pun selain foto diberi label di mana pun ditampilkan. Tidak ada default: pilih.',
      },
    },
  },
  {
    name: 'master',
    type: 'relationship',
    relationTo: 'masters',
    label: { en: 'Master', id: 'Master' },
    access: STAFF_ONLY_ACCESS,
    admin: {
      position: 'sidebar',
      description: {
        en: 'The capture this image was processed from.',
        id: 'Tangkapan tempat gambar ini diolah.',
      },
    },
  },
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

/** The fields only the pipeline writes; `./hooks` restores them on any request's write. */
export const DERIVED_FIELDS = ['assetId', 'derivatives', 'iiif'] as const
