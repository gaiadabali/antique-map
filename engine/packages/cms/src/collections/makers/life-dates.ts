/**
 * `makers.born` and `makers.died` (TASKS.md 8.1.a: life dates with precision): C2's
 * `FuzzyDateVM` as stored — `precision`, `from`, `to` (a range only) and `display`, the
 * cataloguer's own wording ("1724–26", "abad ke-18"), which wins over the formatter. The rules
 * are `validators/maker-life-dates`, pure; these fields only hand them their values.
 *
 * The precision starts `unknown`: typing a year without saying how certain it is is refused, so
 * a date is never implied certain (CONTENT-MODEL.md §1).
 */
import type { GroupField, Validate } from 'payload'

import {
  DATE_PRECISIONS,
  fuzzyYearErrors,
  lifeSpanError,
  type DatePrecision,
  type FuzzyYear,
} from '../../validators/maker-life-dates'

const PRECISION_LABELS: Record<DatePrecision, string> = {
  exact: 'Exact year',
  circa: 'Circa (c.)',
  before: 'Before',
  after: 'After',
  range: 'Between two years',
  unknown: 'Unknown',
}

type Part = 'precision' | 'from' | 'to'

function partError(part: Part, group: 'born' | 'died'): Validate {
  return (_value, { data, siblingData }) => {
    const errors = fuzzyYearErrors(siblingData as FuzzyYear)
    if (errors[part]) return errors[part]!
    // The span is judged once, on the death year, where a cataloguer reads it.
    if (group === 'died' && part === 'from') {
      const record = data as { born?: FuzzyYear; died?: FuzzyYear } | undefined
      const error = lifeSpanError(record?.born, siblingData as FuzzyYear)
      if (error) return error
    }
    return true
  }
}

export function lifeDateGroup(name: 'born' | 'died', label: string): GroupField {
  return {
    name,
    type: 'group',
    label,
    fields: [
      {
        name: 'precision',
        type: 'select',
        required: true,
        defaultValue: 'unknown',
        options: DATE_PRECISIONS.map((value) => ({ value, label: PRECISION_LABELS[value] })),
        validate: partError('precision', name),
      },
      {
        name: 'from',
        type: 'number',
        label: 'Year',
        admin: { step: 1 },
        validate: partError('from', name),
      },
      {
        name: 'to',
        type: 'number',
        label: 'Until (a range only)',
        admin: { step: 1 },
        validate: partError('to', name),
      },
      {
        name: 'display',
        type: 'text',
        localized: true,
        label: 'As written',
        admin: { description: 'Your own wording, if the year alone says it wrong: "1724–26".' },
      },
    ],
  }
}
