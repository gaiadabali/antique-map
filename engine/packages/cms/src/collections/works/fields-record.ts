/**
 * The work as catalogued (CONTENT-MODEL.md §1, the Sanderus model; C2 `RecordVM`): what it is
 * called, what it is, who made it and when, how it was published and printed, and its size.
 *
 * - `workUid` is the stable id redirects key on: made once, from the gallery's prefix, and never
 *   changed (`hooks/work-uid`). `stockNumber` is the gallery's own M./P./F. number, checked
 *   against the gallery's pattern (`STOCK_NUMBER_PATTERN`).
 * - `title` is the **hook title** buyers read; `originalTitle` the diplomatic transcription, in
 *   its own language (`originalTitleLanguage`, the `lang` the page sets on it).
 * - `makers` credit a maker with a role and a certainty, never implied certain.
 * - The `book` group, a volume's collation, shows for books and atlases only.
 */
import type { ArrayField, Field, Validate } from 'payload'

import { IN_DEFAULT_LOCALE_NOTE } from '../../fields/validate'
import { creditRowErrors, refId, type CreditRow } from '../../validators/work-credits'
import {
  languageTagError,
  STOCK_NUMBER_PATTERN,
  stockNumberError,
} from '../../validators/work-record'
import { MAKER_ROLE_LABELS, MAKER_ROLES } from '../makers/roles'
import { dimensionsField, fuzzyDateGroup } from './dates-and-sizes'
import {
  BOUND_OBJECT_TYPES,
  CERTAINTY_OPTIONS,
  COLOURING_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  TECHNIQUE_OPTIONS,
} from './vocabulary'

/** The row index of an array field's sub-field, from the path Payload validates it under. */
export const rowOf = (path: readonly (number | string)[]) => Number(path[path.length - 2])

const message = (error: string | null) => error ?? true
const clear = () => null

const validateStockNumber: Validate = (value) =>
  message(stockNumberError(value, STOCK_NUMBER_PATTERN))

const validateLanguage: Validate = (value) => message(languageTagError(value))

const validateCredit: Validate = (value, { data, path }) => {
  if (refId(value) === null) return 'Choose the maker, or remove the row.'
  const rows = ((data as { makers?: CreditRow[] })?.makers ?? []) as CreditRow[]
  return message(creditRowErrors(rows)[rowOf(path)] ?? null)
}

export const makersField: ArrayField = {
  name: 'makers',
  type: 'array',
  labels: { singular: 'Credit', plural: 'Makers' },
  admin: { description: 'Who made it, in what role, and how certain the attribution is.' },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'maker',
          type: 'relationship',
          relationTo: 'makers',
          required: true,
          validate: validateCredit,
        },
        {
          name: 'role',
          type: 'select',
          required: true,
          options: MAKER_ROLES.map((value) => ({ value, label: MAKER_ROLE_LABELS[value] })),
        },
        { name: 'certainty', type: 'select', required: true, options: CERTAINTY_OPTIONS },
      ],
    },
  ],
}

const isBound = (data: unknown) =>
  (BOUND_OBJECT_TYPES as readonly unknown[]).includes(
    (data as { objectType?: unknown })?.objectType,
  )

export const RECORD_FIELDS: Field[] = [
  {
    name: 'workUid',
    type: 'text',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: 'Made when the work is first saved, and never changed: redirects key on it.',
    },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'stockNumber',
    type: 'text',
    index: true,
    maxLength: 40,
    validate: validateStockNumber,
    admin: { position: 'sidebar', description: 'The gallery’s own number: M.1044, P.2098.' },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'title',
    type: 'text',
    localized: true,
    maxLength: 240,
    admin: {
      description: `The hook title buyers read: "Bali by François Valentijn, 1726 — the first large-scale map of the island". Needed to publish. ${IN_DEFAULT_LOCALE_NOTE}`,
    },
  },
  {
    type: 'row',
    fields: [
      {
        name: 'originalTitle',
        type: 'text',
        maxLength: 400,
        admin: {
          width: '70%',
          description: 'As printed, letter for letter: Kaart van het Eyland Bali.',
        },
      },
      {
        name: 'originalTitleLanguage',
        type: 'text',
        maxLength: 35,
        validate: validateLanguage,
        admin: { width: '30%', description: 'Its language: nl, la, ms.' },
      },
    ],
  },
  {
    name: 'objectType',
    type: 'select',
    index: true,
    options: OBJECT_TYPE_OPTIONS,
    admin: {
      description: 'What kind of object it is: it decides the HS code and how the page reads.',
    },
  },
  makersField,
  fuzzyDateGroup('date', 'Date', 'When this sheet was printed or issued. Needed to publish.'),
  fuzzyDateGroup('firstEdition', 'First edition', 'When the work first appeared, if earlier.'),
  fuzzyDateGroup('dateOnPlate', 'Date on the plate', 'The date the plate itself bears, if any.'),
  {
    name: 'publication',
    type: 'group',
    admin: { description: 'As the imprint and the book it came from say.' },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'place', type: 'text', maxLength: 120, admin: { description: 'Amsterdam' } },
          { name: 'publisher', type: 'text', maxLength: 200, admin: { description: 'As printed' } },
        ],
      },
      {
        name: 'sourceWork',
        type: 'text',
        maxLength: 300,
        admin: { description: 'From: Oud en Nieuw Oost-Indiën, 1724–26.' },
      },
      {
        type: 'row',
        fields: [
          { name: 'edition', type: 'text', maxLength: 120 },
          { name: 'state', type: 'text', maxLength: 120 },
          {
            name: 'textLanguage',
            type: 'text',
            maxLength: 35,
            validate: validateLanguage,
            admin: { description: 'Of the printed text: nl, la.' },
          },
        ],
      },
      {
        name: 'verso',
        type: 'text',
        localized: true,
        maxLength: 300,
        admin: { description: '"Verso: blank", or the text printed on the back.' },
      },
    ],
  },
  {
    type: 'row',
    fields: [
      { name: 'technique', type: 'select', options: TECHNIQUE_OPTIONS },
      { name: 'colour', type: 'select', label: 'Colouring', options: COLOURING_OPTIONS },
    ],
  },
  dimensionsField,
  {
    name: 'book',
    type: 'group',
    label: 'Book or atlas',
    admin: { condition: isBound, description: 'A volume’s collation.' },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'binding', type: 'text', localized: true, maxLength: 300 },
          { name: 'pagination', type: 'text', maxLength: 300 },
        ],
      },
      {
        type: 'row',
        fields: [
          { name: 'plates', type: 'text', maxLength: 300 },
          { name: 'completeness', type: 'text', localized: true, maxLength: 300 },
        ],
      },
      {
        name: 'openings',
        type: 'upload',
        relationTo: 'media',
        hasMany: true,
        admin: { description: 'Photographs of spreads, in order.' },
      },
      {
        type: 'row',
        fields: [
          { name: 'spine', type: 'upload', relationTo: 'media' },
          { name: 'cover', type: 'upload', relationTo: 'media' },
        ],
      },
    ],
  },
]
