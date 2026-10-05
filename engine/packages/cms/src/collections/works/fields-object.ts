/**
 * Where the work sits in the discovery vocabulary, and the object itself (CONTENT-MODEL.md §1):
 * its places, subjects and references; its provenance and other examples; its condition, with the
 * grade a **term** of the gallery's own published scale (never a shared enum); its images; and the
 * master its reproductions are made from.
 *
 * - **Images**: a row orders and captions an image; what the image is — its role — and how it was
 *   made — its provenance — are the `media` record's own (C9), and `hooks/work-guard` holds every
 *   row to what a work may show. The page shows them in C9 `orderImages()` order and leads with the
 *   first photographed recto.
 * - **Master**: the recto's capture, or a better scan of it; staff-only, like every master's field.
 */
import type { ArrayField, Field, Validate } from 'payload'

import { STAFF_ONLY_ACCESS } from '../../access/fields'
import { placeRowErrors, refId, type PlaceRow } from '../../validators/work-credits'
import { rowOf } from './fields-record'
import { MAX_SECONDARY_PLACES, PLACE_ROLE_OPTIONS } from './vocabulary'

const message = (error: string | null | undefined) => error ?? true

const validatePlace: Validate = (value, { data, path }) => {
  if (refId(value) === null) return 'Choose the place, or remove the row.'
  const rows = ((data as { places?: PlaceRow[] })?.places ?? []) as PlaceRow[]
  return message(placeRowErrors(rows).place[rowOf(path)])
}

const validatePrimary: Validate = (_value, { data, path }) => {
  const rows = ((data as { places?: PlaceRow[] })?.places ?? []) as PlaceRow[]
  return message(placeRowErrors(rows).primary[rowOf(path)])
}

/** A reference is text, as catalogued: "Tooley (Australia) 1268", never a row in a source table. */
const validateCitation: Validate = (value) =>
  typeof value === 'string' && value.trim() === ''
    ? 'Give the citation as the catalogue writes it: "Tooley (Australia) 1268".'
    : true

const grades = { kind: { equals: 'grade' } } as const
const subjects = { kind: { equals: 'subject' } } as const

export const placesField: ArrayField = {
  name: 'places',
  type: 'array',
  maxRows: 1 + MAX_SECONDARY_PLACES,
  labels: {
    singular: { en: 'Place', id: 'Tempat' },
    plural: { en: 'Places', id: 'Tempat' },
  },
  admin: {
    description: {
      en: `One primary place, and up to ${MAX_SECONDARY_PLACES} more as tags.`,
      id: `Satu tempat utama, dan hingga ${MAX_SECONDARY_PLACES} lagi sebagai tag.`,
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'place',
          type: 'relationship',
          relationTo: 'places',
          label: { en: 'Place', id: 'Tempat' },
          required: true,
          validate: validatePlace,
        },
        {
          name: 'role',
          type: 'select',
          label: { en: 'Role', id: 'Peran' },
          required: true,
          options: PLACE_ROLE_OPTIONS,
        },
        {
          name: 'primary',
          type: 'checkbox',
          label: { en: 'Primary', id: 'Utama' },
          validate: validatePrimary,
        },
      ],
    },
  ],
}

export const imagesField: ArrayField = {
  name: 'images',
  type: 'array',
  labels: {
    singular: { en: 'Image', id: 'Gambar' },
    plural: { en: 'Images', id: 'Gambar' },
  },
  admin: {
    description: {
      en: 'Each image’s role — recto, verso, detail … — is the image’s own. The page leads with the first photographed recto; nothing on a work is AI-generated.',
      id: 'Peran setiap gambar — recto, verso, detail … — adalah milik gambar itu sendiri. Halaman memulai dengan recto pertama yang difoto; tidak ada gambar pada karya yang dibuat AI.',
    },
  },
  fields: [
    {
      name: 'media',
      type: 'upload',
      relationTo: 'media',
      label: { en: 'Image', id: 'Gambar' },
      required: true,
    },
    {
      name: 'caption',
      type: 'text',
      label: { en: 'Caption', id: 'Keterangan' },
      localized: true,
      maxLength: 300,
    },
  ],
}

export const OBJECT_FIELDS: Field[] = [
  placesField,
  {
    name: 'subjects',
    type: 'relationship',
    relationTo: 'terms',
    label: { en: 'Subjects', id: 'Subjek' },
    hasMany: true,
    filterOptions: subjects,
    admin: {
      description: {
        en: 'Wayang, Batik, Temples, Spices, VOC, Costume …',
        id: 'Wayang, Batik, Candi, Rempah, VOC, Pakaian …',
      },
    },
  },
  {
    name: 'references',
    type: 'array',
    labels: {
      singular: { en: 'Reference', id: 'Referensi' },
      plural: { en: 'References', id: 'Referensi' },
    },
    admin: {
      description: {
        en: 'Text, as catalogued: "Tooley (Australia) 1268", Koeman, Parry numbers — the bibliography in the catalogue’s own words.',
        id: 'Teks sebagaimana dikatalogkan: "Tooley (Australia) 1268", nomor Koeman, Parry — bibliografi dengan kata-kata katalognya sendiri.',
      },
    },
    fields: [
      {
        name: 'citation',
        type: 'text',
        label: { en: 'Citation', id: 'Kutipan' },
        required: true,
        maxLength: 300,
        validate: validateCitation,
      },
      {
        name: 'note',
        type: 'textarea',
        label: { en: 'Note', id: 'Catatan' },
        localized: true,
        maxLength: 600,
      },
    ],
  },
  {
    name: 'provenance',
    type: 'array',
    labels: {
      singular: { en: 'Former owner', id: 'Pemilik sebelumnya' },
      plural: { en: 'Provenance', id: 'Asal-usul' },
    },
    admin: {
      description: {
        en: 'Who held it before, and when.',
        id: 'Siapa yang memilikinya sebelumnya, dan kapan.',
      },
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'holder',
            type: 'text',
            label: { en: 'Holder', id: 'Pemilik' },
            required: true,
            maxLength: 200,
          },
          { name: 'period', type: 'text', label: { en: 'Period', id: 'Periode' }, maxLength: 80 },
        ],
      },
      {
        name: 'note',
        type: 'text',
        label: { en: 'Note', id: 'Catatan' },
        localized: true,
        maxLength: 400,
      },
    ],
  },
  {
    name: 'sameEdition',
    type: 'relationship',
    relationTo: 'works',
    hasMany: true,
    label: { en: 'Other examples', id: 'Contoh lain' },
    filterOptions: ({ id }) =>
      id === undefined || id === null ? true : { id: { not_equals: id } },
    admin: {
      description: {
        en: 'Other copies of this map: offered when this one has sold.',
        id: 'Salinan lain dari peta ini: ditawarkan ketika yang ini terjual.',
      },
    },
  },
  {
    name: 'condition',
    type: 'group',
    label: { en: 'Condition', id: 'Kondisi' },
    fields: [
      {
        name: 'grade',
        type: 'relationship',
        relationTo: 'terms',
        label: { en: 'Grade', id: 'Tingkat' },
        filterOptions: grades,
        admin: {
          description: {
            en: 'From the gallery’s published scale (Terms → Condition grade).',
            id: 'Dari skala yang diterbitkan galeri (Terms → Condition grade).',
          },
        },
      },
      {
        name: 'notes',
        type: 'textarea',
        label: { en: 'Notes', id: 'Catatan' },
        localized: true,
        maxLength: 2000,
      },
      {
        name: 'defects',
        type: 'array',
        labels: {
          singular: { en: 'Defect', id: 'Cacat' },
          plural: { en: 'Defects', id: 'Cacat' },
        },
        fields: [
          {
            name: 'defect',
            type: 'text',
            label: { en: 'Defect', id: 'Cacat' },
            localized: true,
            required: true,
            maxLength: 200,
          },
        ],
      },
      {
        name: 'restoration',
        type: 'textarea',
        label: { en: 'Restoration', id: 'Restorasi' },
        localized: true,
        maxLength: 1000,
      },
    ],
  },
  imagesField,
  {
    name: 'master',
    type: 'relationship',
    relationTo: 'masters',
    label: { en: 'Master', id: 'Master' },
    access: STAFF_ONLY_ACCESS,
    admin: {
      position: 'sidebar',
      description: {
        en: 'The recto’s capture its reproductions are made from.',
        id: 'Hasil tangkapan recto yang menjadi dasar reproduksinya.',
      },
    },
  },
]
