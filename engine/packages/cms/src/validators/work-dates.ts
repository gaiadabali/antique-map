/**
 * A work's three dates (TASKS.md 8.2.b; CONTENT-MODEL.md §1, §9): `date` — this issue's — and the
 * collation's `firstEdition` and `dateOnPlate` (the Sanderus model), each a year or a range with
 * its precision, as a maker's life dates are (`./maker-life-dates`, whose rules each date reuses).
 * A date is **never implied certain**: a year without a precision is refused.
 *
 * Across the three, only what no reading could allow is refused: the earliest year a plate's date
 * or a first edition allows after the latest year this issue allows. A later state's re-dated
 * plate may postdate the first edition, so plate and first edition are never compared.
 *
 * Every save, drafts included. Pure: the field validators only hand it the record.
 */
import {
  earliestYear,
  fuzzyYearErrors,
  latestYear,
  type FuzzyYear,
  type FuzzyYearErrors,
} from './maker-life-dates'

export const WORK_DATE_FIELDS = ['date', 'firstEdition', 'dateOnPlate'] as const
export type WorkDateField = (typeof WORK_DATE_FIELDS)[number]

export type WorkDates = Partial<Record<WorkDateField, FuzzyYear | null>>

/** Each date's own errors, plus the order across them, keyed `<date>.<part>`. */
export function workDateErrors(
  dates: WorkDates | null | undefined,
  latest: number = new Date().getUTCFullYear(),
): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const field of WORK_DATE_FIELDS) {
    const own: FuzzyYearErrors = fuzzyYearErrors(dates?.[field], latest)
    for (const [part, message] of Object.entries(own)) errors[`${field}.${part}`] = message
  }
  const issued = latestYear(dates?.date)
  if (issued === null) return errors
  const plate = earliestYear(dates?.dateOnPlate)
  if (plate !== null && plate > issued && !errors['dateOnPlate.from']) {
    errors['dateOnPlate.from'] =
      'The date on the plate comes after the date of this issue: a plate is dated on or before the sheet is printed.'
  }
  const first = earliestYear(dates?.firstEdition)
  if (first !== null && first > issued && !errors['firstEdition.from']) {
    errors['firstEdition.from'] =
      'The first edition comes after the date of this issue: this issue cannot predate it.'
  }
  return errors
}

/** Whether a date was given at all — any precision, `unknown` included, said on purpose. */
export function hasStatedDate(date: { readonly precision?: unknown } | null | undefined): boolean {
  return typeof date?.precision === 'string' && date.precision.length > 0
}
