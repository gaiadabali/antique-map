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

const PRECISION_LABELS: Record<DatePrecision, string> = {
  exact: 'Exact year',
  circa: 'Circa (c.)',
  before: 'Before',
  after: 'After',
  range: 'Between two years',
  unknown: 'Unknown — said on purpose',
}

function datePartError(group: WorkDateField, part: 'precision' | 'from' | 'to'): Validate {
  return (_value, { data }) => workDateErrors(data as WorkDates)[`${group}.${part}`] ?? true
}

export function fuzzyDateGroup(
  name: WorkDateField,
  label: string,
  description: string,
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
            label: 'Year',
            admin: { step: 1 },
            validate: datePartError(name, 'from'),
          },
          {
            name: 'to',
            type: 'number',
            label: 'Until (a range only)',
            admin: { step: 1 },
            validate: datePartError(name, 'to'),
          },
        ],
      },
      {
        name: 'display',
        type: 'text',
        localized: true,
        label: 'As written',
        maxLength: 80,
        admin: { description: 'Your own wording, if the year alone says it wrong: "1724–26".' },
      },
    ],
  }
}

type SizeName = 'image' | 'sheet' | 'framed'
type Part = 'height' | 'width' | 'depth'

function measure(size: SizeName, part: Part, label: string): NumberField {
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

function sizeGroup(name: SizeName, label: string, description: string): GroupField {
  const parts: NumberField[] = [measure(name, 'height', 'Height'), measure(name, 'width', 'Width')]
  if (name === 'framed') parts.push(measure(name, 'depth', 'Depth'))
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
  label: 'Dimensions (mm)',
  admin: { description: 'In millimetres, height before width. Inches are worked out for you.' },
  fields: [
    sizeGroup('image', 'Image', 'The printed area: to the plate mark, or the neat line.'),
    sizeGroup('sheet', 'Sheet', 'The whole sheet, margins included.'),
    sizeGroup('framed', 'Framed', 'The frame’s outer size, if it is framed.'),
  ],
}
