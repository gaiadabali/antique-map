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
const plain = (values: readonly string[]) => values.map((value) => ({ value, label: label(value) }))

export const MEDIA_FIELDS: Field[] = [
  {
    name: 'alt',
    type: 'text',
    localized: true,
    required: true,
    maxLength: ALT_MAX_LENGTH,
    validate: validateAlt,
    admin: {
      description:
        'What the image shows, for someone who cannot see it. For a map or a print: the region, the cartouche, the colouring, anything notable. For a digital mockup or an AI-generated image, start with what it is.',
    },
  },
  {
    name: 'altSource',
    type: 'select',
    localized: true,
    defaultValue: 'cataloguer',
    options: plain(ALT_SOURCES),
    admin: {
      position: 'sidebar',
      description:
        'Baseline: built from the record. AI draft: stays flagged until a person has checked it.',
    },
  },
  {
    name: 'translationStatus',
    type: 'select',
    localized: true,
    defaultValue: 'entered',
    options: plain(TRANSLATION_STATES),
    admin: { position: 'sidebar' },
  },
  { name: 'caption', type: 'textarea', localized: true },
  { name: 'credit', type: 'text' },
  { name: 'licence', type: 'text' },
  {
    name: 'role',
    type: 'select',
    required: true,
    options: ROLE_OPTIONS,
    admin: { description: 'What the image is — set at intake, the same as its master’s.' },
  },
  {
    name: 'provenance',
    type: 'select',
    required: true,
    options: PROVENANCE_OPTIONS,
    admin: {
      description:
        'How it was made. Anything but a photograph is labelled wherever it is shown. There is no default: choose.',
    },
  },
  {
    name: 'master',
    type: 'relationship',
    relationTo: 'masters',
    access: STAFF_ONLY_ACCESS,
    admin: { position: 'sidebar', description: 'The capture this image was processed from.' },
  },
  {
    name: 'assetId',
    type: 'text',
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: 'Derived from the file: the address its derivatives and tiles are stored under.',
    },
  },
  {
    name: 'derivatives',
    type: 'group',
    admin: { readOnly: true },
    fields: [
      {
        name: 'status',
        type: 'select',
        defaultValue: 'pending',
        options: plain(DERIVATIVE_STATES),
      },
      {
        name: 'version',
        type: 'text',
        admin: { description: `The ladder's version once built (now ${DERIVATIVE_VERSION}).` },
      },
      { name: 'blurDataUri', type: 'textarea' },
    ],
  },
  {
    name: 'iiif',
    type: 'group',
    label: 'Deep zoom',
    admin: { readOnly: true },
    fields: [{ name: 'status', type: 'select', defaultValue: 'none', options: plain(TILE_STATES) }],
  },
]

/** The fields only the pipeline writes; `./hooks` restores them on any request's write. */
export const DERIVED_FIELDS = ['assetId', 'derivatives', 'iiif'] as const
