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
 *
 * The fields' bilingual admin copy lives beside this file (`./record-copy`, TASKS.md 3.6.a).
 */
import type { ArrayField, Field, Validate } from 'payload'

import { creditRowErrors, refId, type CreditRow } from '../../validators/work-credits'
import {
  languageTagError,
  STOCK_NUMBER_PATTERN,
  stockNumberError,
} from '../../validators/work-record'
import { MAKER_ROLE_LABELS, MAKER_ROLES } from '../makers/roles'
import { dimensionsField, fuzzyDateGroup } from './dates-and-sizes'
import { RECORD_NOTES } from './record-copy'
import {
  BOUND_OBJECT_TYPES,
  CERTAINTY_OPTIONS,
  COLOURING_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  TECHNIQUE_OPTIONS,
  WORK_LOCATION_OPTIONS,
  WORK_STATUS_OPTIONS,
} from './vocabulary'

/** The row index of an array field's sub-field, from the path Payload validates it under. */
export const rowOf = (path: readonly (number | string)[]) => Number(path[path.length - 2])

const described = (note: { en: string; id: string }) => ({ description: note })

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
  labels: {
    singular: { en: 'Credit', id: 'Kredit' },
    plural: { en: 'Makers', id: 'Pembuat' },
  },
  admin: {
    description: {
      en: 'Who made it, in what role, and how certain the attribution is.',
      id: 'Siapa yang membuatnya, dalam peran apa, dan seberapa pasti atribusinya.',
    },
  },
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
    name: 'publicId',
    type: 'number',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
      ...described(RECORD_NOTES.publicId),
    },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'workUid',
    type: 'text',
    unique: true,
    index: true,
    admin: { position: 'sidebar', readOnly: true, ...described(RECORD_NOTES.workUid) },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'stockNumber',
    type: 'text',
    index: true,
    maxLength: 40,
    validate: validateStockNumber,
    admin: { position: 'sidebar', ...described(RECORD_NOTES.stockNumber) },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'title',
    type: 'text',
    localized: true,
    maxLength: 240,
    admin: described(RECORD_NOTES.title),
  },
  {
    type: 'row',
    fields: [
      {
        name: 'originalTitle',
        type: 'text',
        maxLength: 400,
        admin: { width: '70%', ...described(RECORD_NOTES.originalTitle) },
      },
      {
        name: 'originalTitleLanguage',
        type: 'text',
        maxLength: 35,
        validate: validateLanguage,
        admin: { width: '30%', ...described(RECORD_NOTES.originalTitleLanguage) },
      },
    ],
  },
  {
    name: 'objectType',
    type: 'select',
    index: true,
    options: OBJECT_TYPE_OPTIONS,
    admin: described(RECORD_NOTES.objectType),
  },
  makersField,
  fuzzyDateGroup('date', { en: 'Date', id: 'Tanggal' }, RECORD_NOTES.date),
  fuzzyDateGroup(
    'firstEdition',
    { en: 'First edition', id: 'Edisi pertama' },
    RECORD_NOTES.firstEdition,
  ),
  fuzzyDateGroup(
    'dateOnPlate',
    { en: 'Date on the plate', id: 'Tanggal pada pelat' },
    RECORD_NOTES.dateOnPlate,
  ),
  {
    name: 'publication',
    type: 'group',
    admin: described(RECORD_NOTES.publication),
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'place',
            type: 'text',
            maxLength: 120,
            admin: described(RECORD_NOTES.publicationPlace),
          },
          {
            name: 'publisher',
            type: 'text',
            maxLength: 200,
            admin: described(RECORD_NOTES.publicationPublisher),
          },
        ],
      },
      {
        name: 'sourceWork',
        type: 'text',
        maxLength: 300,
        admin: described(RECORD_NOTES.sourceWork),
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
            admin: described(RECORD_NOTES.textLanguage),
          },
        ],
      },
      {
        name: 'verso',
        type: 'text',
        localized: true,
        maxLength: 300,
        admin: described(RECORD_NOTES.verso),
      },
    ],
  },
  {
    type: 'row',
    fields: [
      { name: 'technique', type: 'select', options: TECHNIQUE_OPTIONS },
      {
        name: 'colour',
        type: 'select',
        label: { en: 'Colouring', id: 'Pewarnaan' },
        options: COLOURING_OPTIONS,
      },
    ],
  },
  {
    type: 'row',
    fields: [
      {
        name: 'status',
        type: 'select',
        // Not `enum_works_status`: toSnakeCase('_status') is 'status', so that name is taken by
        // the drafts column's enum — this one needs its own.
        enumName: 'work_status_vocabulary',
        defaultValue: 'available',
        index: true,
        options: WORK_STATUS_OPTIONS,
        admin: described(RECORD_NOTES.status),
      },
      {
        name: 'location',
        type: 'select',
        options: WORK_LOCATION_OPTIONS,
        admin: described(RECORD_NOTES.location),
      },
    ],
  },
  dimensionsField,
  {
    name: 'book',
    type: 'group',
    label: { en: 'Book or atlas', id: 'Buku atau atlas' },
    admin: { condition: isBound, ...described(RECORD_NOTES.book) },
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
        admin: described(RECORD_NOTES.bookOpenings),
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
