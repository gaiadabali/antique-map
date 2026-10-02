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
import {
  placeRowErrors,
  referenceRowErrors,
  refId,
  type PlaceRow,
} from '../../validators/work-credits'
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

const validateReference: Validate = (value, { data, path }) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'Give the number or page in the source: "1268", "pl. 14".'
  }
  const rows = ((data as { references?: [] })?.references ?? []) as []
  return message(referenceRowErrors(rows)[rowOf(path)])
}

const grades = { kind: { equals: 'grade' } } as const
const subjects = { kind: { equals: 'subject' } } as const

export const placesField: ArrayField = {
  name: 'places',
  type: 'array',
  maxRows: 1 + MAX_SECONDARY_PLACES,
  labels: { singular: 'Place', plural: 'Places' },
  admin: {
    description: `One primary place, and up to ${MAX_SECONDARY_PLACES} more as tags.`,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'place',
          type: 'relationship',
          relationTo: 'places',
          required: true,
          validate: validatePlace,
        },
        { name: 'role', type: 'select', required: true, options: PLACE_ROLE_OPTIONS },
        { name: 'primary', type: 'checkbox', validate: validatePrimary },
      ],
    },
  ],
}

export const imagesField: ArrayField = {
  name: 'images',
  type: 'array',
  labels: { singular: 'Image', plural: 'Images' },
  admin: {
    description:
      'Each image’s role — recto, verso, detail … — is the image’s own. The page leads with the first photographed recto; nothing on a work is AI-generated.',
  },
  fields: [
    { name: 'media', type: 'upload', relationTo: 'media', required: true },
    { name: 'caption', type: 'text', localized: true, maxLength: 300 },
  ],
}

export const OBJECT_FIELDS: Field[] = [
  placesField,
  {
    name: 'subjects',
    type: 'relationship',
    relationTo: 'terms',
    hasMany: true,
    filterOptions: subjects,
    admin: { description: 'Wayang, Batik, Temples, Spices, VOC, Costume …' },
  },
  {
    name: 'references',
    type: 'array',
    labels: { singular: 'Reference', plural: 'References' },
    admin: { description: '"Tooley (Australia) 1268", Koeman, Parry numbers.' },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'source', type: 'relationship', relationTo: 'sources', required: true },
          { name: 'ref', type: 'text', maxLength: 120, validate: validateReference },
        ],
      },
      { name: 'note', type: 'text', localized: true, maxLength: 300 },
    ],
  },
  {
    name: 'provenance',
    type: 'array',
    labels: { singular: 'Former owner', plural: 'Provenance' },
    admin: { description: 'Who held it before, and when.' },
    fields: [
      {
        type: 'row',
        fields: [
          { name: 'holder', type: 'text', required: true, maxLength: 200 },
          { name: 'period', type: 'text', maxLength: 80 },
        ],
      },
      { name: 'note', type: 'text', localized: true, maxLength: 400 },
    ],
  },
  {
    name: 'sameEdition',
    type: 'relationship',
    relationTo: 'works',
    hasMany: true,
    label: 'Other examples',
    filterOptions: ({ id }) =>
      id === undefined || id === null ? true : { id: { not_equals: id } },
    admin: { description: 'Other copies of this map: offered when this one has sold.' },
  },
  {
    name: 'condition',
    type: 'group',
    fields: [
      {
        name: 'grade',
        type: 'relationship',
        relationTo: 'terms',
        filterOptions: grades,
        admin: { description: 'From the gallery’s published scale (Terms → Condition grade).' },
      },
      { name: 'notes', type: 'textarea', localized: true, maxLength: 2000 },
      {
        name: 'defects',
        type: 'array',
        labels: { singular: 'Defect', plural: 'Defects' },
        fields: [{ name: 'defect', type: 'text', localized: true, required: true, maxLength: 200 }],
      },
      { name: 'restoration', type: 'textarea', localized: true, maxLength: 1000 },
    ],
  },
  imagesField,
  {
    name: 'master',
    type: 'relationship',
    relationTo: 'masters',
    access: STAFF_ONLY_ACCESS,
    admin: {
      position: 'sidebar',
      description: 'The recto’s capture its reproductions are made from.',
    },
  },
]
