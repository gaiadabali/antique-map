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
    name: 'workUid',
    type: 'text',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: {
        en: 'Made when the work is first saved, and never changed: redirects key on it.',
        id: 'Dibuat saat karya pertama kali disimpan, dan tidak pernah berubah: kunci pengalihan menggunakannya.',
      },
    },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'stockNumber',
    type: 'text',
    index: true,
    maxLength: 40,
    validate: validateStockNumber,
    admin: {
      position: 'sidebar',
      description: {
        en: 'The gallery’s own number: M.1044, P.2098.',
        id: 'Nomor milik galeri: M.1044, P.2098.',
      },
    },
    hooks: { beforeDuplicate: [clear] },
  },
  {
    name: 'title',
    type: 'text',
    localized: true,
    maxLength: 240,
    admin: {
      description: {
        en: `The hook title buyers read: "Bali by François Valentijn, 1726 — the first large-scale map of the island". Needed to publish. ${(IN_DEFAULT_LOCALE_NOTE as { en: string }).en}`,
        id: `Judul yang dibaca pembeli: "Bali by François Valentijn, 1726 — the first large-scale map of the island". Diperlukan untuk menerbitkan. ${(IN_DEFAULT_LOCALE_NOTE as { id: string }).id}`,
      },
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
          description: {
            en: 'As printed, letter for letter: Kaart van het Eyland Bali.',
            id: 'Seperti tercetak, huruf demi huruf: Kaart van het Eyland Bali.',
          },
        },
      },
      {
        name: 'originalTitleLanguage',
        type: 'text',
        maxLength: 35,
        validate: validateLanguage,
        admin: {
          width: '30%',
          description: {
            en: 'Its language: nl, la, ms.',
            id: 'Bahasanya: nl, la, ms.',
          },
        },
      },
    ],
  },
  {
    name: 'objectType',
    type: 'select',
    index: true,
    options: OBJECT_TYPE_OPTIONS,
    admin: {
      description: {
        en: 'What kind of object it is: it decides the HS code and how the page reads.',
        id: 'Jenis objeknya: menentukan kode HS dan cara halaman membacanya.',
      },
    },
  },
  makersField,
  fuzzyDateGroup(
    'date',
    { en: 'Date', id: 'Tanggal' },
    {
      en: 'When this sheet was printed or issued. Needed to publish.',
      id: 'Ketika lembar ini dicetak atau diterbitkan. Diperlukan untuk menerbitkan.',
    },
  ),
  fuzzyDateGroup(
    'firstEdition',
    { en: 'First edition', id: 'Edisi pertama' },
    {
      en: 'When the work first appeared, if earlier.',
      id: 'Ketika karya ini pertama kali muncul, jika lebih awal.',
    },
  ),
  fuzzyDateGroup(
    'dateOnPlate',
    { en: 'Date on the plate', id: 'Tanggal pada pelat' },
    {
      en: 'The date the plate itself bears, if any.',
      id: 'Tanggal yang tertera pada pelat itu sendiri, jika ada.',
    },
  ),
  {
    name: 'publication',
    type: 'group',
    admin: {
      description: {
        en: 'As the imprint and the book it came from say.',
        id: 'Seperti yang tertulis pada impresum dan buku asalnya.',
      },
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'place',
            type: 'text',
            maxLength: 120,
            admin: {
              description: {
                en: 'Amsterdam',
                id: 'Amsterdam',
              },
            },
          },
          {
            name: 'publisher',
            type: 'text',
            maxLength: 200,
            admin: {
              description: {
                en: 'As printed',
                id: 'Seperti tercetak',
              },
            },
          },
        ],
      },
      {
        name: 'sourceWork',
        type: 'text',
        maxLength: 300,
        admin: {
          description: {
            en: 'From: Oud en Nieuw Oost-Indiën, 1724–26.',
            id: 'Dari: Oud en Nieuw Oost-Indiën, 1724–26.',
          },
        },
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
            admin: {
              description: {
                en: 'Of the printed text: nl, la.',
                id: 'Dari teks tercetak: nl, la.',
              },
            },
          },
        ],
      },
      {
        name: 'verso',
        type: 'text',
        localized: true,
        maxLength: 300,
        admin: {
          description: {
            en: '"Verso: blank", or the text printed on the back.',
            id: '"Verso: kosong", atau teks yang tercetak di bagian belakang.',
          },
        },
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
  dimensionsField,
  {
    name: 'book',
    type: 'group',
    label: { en: 'Book or atlas', id: 'Buku atau atlas' },
    admin: {
      condition: isBound,
      description: {
        en: 'A volume’s collation.',
        id: 'Kolasi sebuah volume.',
      },
    },
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
        admin: {
          description: {
            en: 'Photographs of spreads, in order.',
            id: 'Foto penyebaran, berurutan.',
          },
        },
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
