/**
 * A work's dates and dimensions as fields (TASKS.md 8.2.a, 8.2.b): the three fuzzy dates — this
 * issue's `date`, the collation's `firstEdition` and `dateOnPlate` — and the image, sheet and frame
 * sizes in millimetres. The rules are the pure `validators/work-dates` and
 * `validators/work-dimensions`; each part's validator hands them the whole record and reports its
 * own part's error, so Payload lists every wrong part at once.
 *
 * A date's precision has **no default**: a year typed without one is refused, and publishing
 * demands one be stated (`unknown`, said on purpose, included) — a date is never implied certain.
 */
import type { GroupField, NumberField, Validate } from 'payload'

import { DATE_PRECISIONS, type DatePrecision } from '../../validators/maker-life-dates'
import { workDateErrors, type WorkDateField, type WorkDates } from '../../validators/work-dates'
import { dimensionErrors, type WorkDimensions } from '../../validators/work-dimensions'

const PRECISION_LABELS: Record<DatePrecision, { en: string; id: string }> = {
  exact: { en: 'Exact year', id: 'Tahun pasti' },
  circa: { en: 'Circa (c.)', id: 'Sekitar (c.)' },
  before: { en: 'Before', id: 'Sebelum' },
  after: { en: 'After', id: 'Setelah' },
  range: { en: 'Between two years', id: 'Antara dua tahun' },
  unknown: { en: 'Unknown — said on purpose', id: 'Tidak diketahui — dengan sengaja dinyatakan' },
}

function datePartError(group: WorkDateField, part: 'precision' | 'from' | 'to'): Validate {
  return (_value, { data }) => workDateErrors(data as WorkDates)[`${group}.${part}`] ?? true
}

export function fuzzyDateGroup(
  name: WorkDateField,
  label: { en: string; id: string },
  description: { en: string; id: string },
): GroupField {
  return {
    name,
    type: 'group',
    label,
    admin: { description },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'precision',
            type: 'select',
            options: DATE_PRECISIONS.map((value) => ({ value, label: PRECISION_LABELS[value] })),
            validate: datePartError(name, 'precision'),
          },
          {
            name: 'from',
            type: 'number',
            label: { en: 'Year', id: 'Tahun' },
            admin: { step: 1 },
            validate: datePartError(name, 'from'),
          },
          {
            name: 'to',
            type: 'number',
            label: { en: 'Until (a range only)', id: 'Hingga (hanya rentang)' },
            admin: { step: 1 },
            validate: datePartError(name, 'to'),
          },
        ],
      },
      {
        name: 'display',
        type: 'text',
        localized: true,
        label: { en: 'As written', id: 'Seperti tertulis' },
        maxLength: 80,
        admin: {
          description: {
            en: 'Your own wording, if the year alone says it wrong: "1724–26".',
            id: 'Ungkapan Anda sendiri, bila tahun saja kurang tepat: "1724–26".',
          },
        },
      },
    ],
  }
}

type SizeName = 'image' | 'sheet' | 'framed'
type Part = 'height' | 'width' | 'depth'

function measure(size: SizeName, part: Part, label: { en: string; id: string }): NumberField {
  return {
    name: part,
    type: 'number',
    label,
    min: 0,
    admin: { step: 0.5, placeholder: 'mm' },
    validate: (_value, { data }) =>
      dimensionErrors((data as { dimensions?: WorkDimensions })?.dimensions)[`${size}.${part}`] ??
      true,
  }
}

function sizeGroup(
  name: SizeName,
  label: { en: string; id: string },
  description: { en: string; id: string },
): GroupField {
  const parts: NumberField[] = [
    measure(name, 'height', { en: 'Height', id: 'Tinggi' }),
    measure(name, 'width', { en: 'Width', id: 'Lebar' }),
  ]
  if (name === 'framed') parts.push(measure(name, 'depth', { en: 'Depth', id: 'Kedalaman' }))
  return {
    name,
    type: 'group',
    label,
    admin: { description },
    fields: [{ type: 'row', fields: parts }],
  }
}

/** `dimensions { image, sheet, framed }`, in mm; inches are derived, never typed. */
export const dimensionsField: GroupField = {
  name: 'dimensions',
  type: 'group',
  label: { en: 'Dimensions (mm)', id: 'Dimensi (mm)' },
  admin: {
    description: {
      en: 'In millimetres, height before width. Inches are worked out for you.',
      id: 'Dalam milimeter, tinggi sebelum lebar. Inci dihitungkan otomatis.',
    },
  },
  fields: [
    sizeGroup(
      'image',
      { en: 'Image', id: 'Gambar' },
      {
        en: 'The printed area: to the plate mark, or the neat line.',
        id: 'Area tercetak: sampai tanda pelat atau garis tepi.',
      },
    ),
    sizeGroup(
      'sheet',
      { en: 'Sheet', id: 'Lembar' },
      {
        en: 'The whole sheet, margins included.',
        id: 'Seluruh lembar, termasuk margin.',
      },
    ),
    sizeGroup(
      'framed',
      { en: 'Framed', id: 'Bingkai' },
      {
        en: 'The frame’s outer size, if it is framed.',
        id: 'Ukuran luar bingkai, jika ada.',
      },
    ),
  ],
}
