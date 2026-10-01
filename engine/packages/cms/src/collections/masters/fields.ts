/**
 * The `masters` record's fields (CONTENT-MODEL.md §6; C9 `IntakeEntry`; TASKS.md 8.3.f): one record
 * per private file. Its consistency rules are `./validators`; that the file is really in the
 * bucket, and is the one declared, is `./hooks`.
 */
import { MEDIA_ROLES } from '@engine/media/contract'
import { MASTER_KINDS } from '@engine/media/storage'
import type { Field } from 'payload'

import {
  optionsOf,
  PROVENANCE_OPTIONS,
  RETOUCHING_OPTIONS,
  ROLE_LABELS,
  TIER_OPTIONS,
  VERDICT_OPTIONS,
} from '../media/options'

/** C9 `MasterRole`: a media role, or a `reference` frame kept to correct the shots it goes with. */
export const MASTER_ROLES = [...MEDIA_ROLES, 'reference'] as const

const KIND_OPTIONS = optionsOf(MASTER_KINDS, {
  capture: 'Capture — a file as received',
  'print-file': "Print file — a design's file for reproduction",
})
const pixels = (name: string, label: string): Field => ({
  name,
  type: 'number',
  label,
  min: 0,
  admin: { step: 1 },
})

export const MASTER_FIELDS: Field[] = [
  { name: 'kind', type: 'select', required: true, options: KIND_OPTIONS },
  {
    name: 'storageKey',
    type: 'text',
    required: true,
    unique: true,
    admin: {
      description: 'Where the file is in the private masters bucket. It has no public URL.',
    },
  },
  {
    name: 'checksum',
    type: 'text',
    required: true,
    unique: true,
    admin: { description: "The file's SHA-256: checked against what the bucket holds." },
  },
  { name: 'byteSize', type: 'number', admin: { readOnly: true, description: 'From the bucket.' } },
  { name: 'contentType', type: 'text', admin: { readOnly: true } },
  {
    type: 'row',
    fields: [pixels('widthPx', 'Frame width (px)'), pixels('heightPx', 'Frame height (px)')],
  },
  { name: 'colourProfile', type: 'text' },
  {
    name: 'brand',
    type: 'text',
    required: true,
    admin: { position: 'sidebar', description: "The owning brand's slug." },
  },
  { name: 'work', type: 'relationship', relationTo: 'works', admin: { position: 'sidebar' } },
  { name: 'design', type: 'relationship', relationTo: 'designs', admin: { position: 'sidebar' } },
  {
    name: 'role',
    type: 'select',
    options: optionsOf(MASTER_ROLES, ROLE_LABELS),
    admin: { description: 'What the capture is, as the intake judged it.' },
  },
  {
    name: 'provenance',
    type: 'select',
    options: PROVENANCE_OPTIONS,
    admin: { description: 'How it was made — declared at intake, never inferred. No default.' },
  },
  {
    name: 'objectBox',
    type: 'group',
    admin: {
      description:
        "The object's bounding box in the frame's pixels — a sheet's outer edge, margins included.",
    },
    fields: [
      {
        type: 'row',
        fields: [
          pixels('x', 'x'),
          pixels('y', 'y'),
          pixels('width', 'Width'),
          pixels('height', 'Height'),
        ],
      },
    ],
  },
  {
    name: 'objectPpi',
    type: 'number',
    min: 1,
    admin: {
      step: 1,
      description:
        "The object's pixels over its real size, from the ruler — never the file's DPI tag.",
    },
  },
  { name: 'captureTier', type: 'select', options: TIER_OPTIONS },
  {
    name: 'intake',
    type: 'group',
    fields: [
      { name: 'batch', type: 'text' },
      {
        name: 'reference',
        type: 'text',
        admin: { description: 'A stock number, a product, "showroom".' },
      },
      {
        name: 'receivedAs',
        type: 'text',
        admin: { description: 'The name it was handed over under.' },
      },
      { name: 'verdict', type: 'select', options: VERDICT_OPTIONS },
      { name: 'retouching', type: 'select', options: RETOUCHING_OPTIONS },
      { name: 'notes', type: 'array', fields: [{ name: 'note', type: 'text', required: true }] },
    ],
  },
]
