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

const KIND_OPTIONS = optionsOf(MASTER_KINDS, { capture: 'Capture — a file as received' })
const pixels = (name: string, label: { en: string; id: string }): Field => ({
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
      description: {
        en: 'Where the file is in the private masters bucket. It has no public URL.',
        id: 'Lokasi berkas di bucket master pribadi. Tidak memiliki URL publik.',
      },
    },
  },
  {
    name: 'checksum',
    type: 'text',
    required: true,
    unique: true,
    admin: {
      description: {
        en: "The file's SHA-256: checked against what the bucket holds.",
        id: 'SHA-256 berkas: diperiksa dengan yang disimpan di bucket.',
      },
    },
  },
  {
    name: 'byteSize',
    type: 'number',
    admin: {
      readOnly: true,
      description: { en: 'From the bucket.', id: 'Dari bucket.' },
    },
  },
  { name: 'contentType', type: 'text', admin: { readOnly: true } },
  {
    type: 'row',
    fields: [
      pixels('widthPx', { en: 'Frame width (px)', id: 'Lebar bingkai (px)' }),
      pixels('heightPx', { en: 'Frame height (px)', id: 'Tinggi bingkai (px)' }),
    ],
  },
  { name: 'colourProfile', type: 'text' },
  { name: 'work', type: 'relationship', relationTo: 'works', admin: { position: 'sidebar' } },
  {
    name: 'role',
    type: 'select',
    options: optionsOf(MASTER_ROLES, ROLE_LABELS),
    admin: {
      description: {
        en: 'What the capture is, as the intake judged it.',
        id: 'Apa tangkapan ini, menurut penilaian intake.',
      },
    },
  },
  {
    name: 'provenance',
    type: 'select',
    options: PROVENANCE_OPTIONS,
    admin: {
      description: {
        en: 'How it was made — declared at intake, never inferred. No default.',
        id: 'Cara pembuatannya — dideklarasikan saat intake, tidak boleh disimpulkan. Tidak ada default.',
      },
    },
  },
  {
    name: 'objectBox',
    type: 'group',
    admin: {
      description: {
        en: "The object's bounding box in the frame's pixels — a sheet's outer edge, margins included.",
        id: 'Kotak batas objek dalam piksel bingkai — tepi luar lembar, termasuk margin.',
      },
    },
    fields: [
      {
        type: 'row',
        fields: [
          pixels('x', { en: 'x', id: 'x' }),
          pixels('y', { en: 'y', id: 'y' }),
          pixels('width', { en: 'Width', id: 'Lebar' }),
          pixels('height', { en: 'Height', id: 'Tinggi' }),
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
      description: {
        en: "The object's pixels over its real size, from the ruler — never the file's DPI tag.",
        id: 'Piksel objek dibandingkan ukuran sebenarnya, dari penggaris — bukan tag DPI berkas.',
      },
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
        admin: {
          description: {
            en: 'A stock number, a product, "showroom".',
            id: 'Nomor stok, produk, atau "showroom".',
          },
        },
      },
      {
        name: 'receivedAs',
        type: 'text',
        admin: {
          description: {
            en: 'The name it was handed over under.',
            id: 'Nama yang tercatat saat diserahkan.',
          },
        },
      },
      { name: 'verdict', type: 'select', options: VERDICT_OPTIONS },
      { name: 'retouching', type: 'select', options: RETOUCHING_OPTIONS },
      {
        name: 'notes',
        type: 'array',
        fields: [{ name: 'note', type: 'text', required: true }],
      },
    ],
  },
]
