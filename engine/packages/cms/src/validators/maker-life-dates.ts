/**
 * A maker's life dates (TASKS.md 8.1.a): years with their precision, because precision is part
 * of the fact — `c. 1666`, never `1666` (DESIGN-SYSTEM.md §10, C2 `FuzzyDateVM`), and a date is
 * **never implied certain** (CONTENT-MODEL.md §1). Pure, so every write path — the admin, REST,
 * the seed, the importer — gets the same answer, and the unit test is the specification.
 *
 * The precision words are C2's `DatePrecision`, the same six a work's date uses.
 */

export const DATE_PRECISIONS = ['exact', 'circa', 'before', 'after', 'range', 'unknown'] as const
export type DatePrecision = (typeof DATE_PRECISIONS)[number]

/** Years, as C2's `FuzzyDateVM` holds them; `to` only for a range. */
export type FuzzyYear = {
  readonly precision?: DatePrecision | null
  readonly from?: number | null
  readonly to?: number | null
}

export type FuzzyYearErrors = Partial<Record<'precision' | 'from' | 'to', string>>

/** Ptolemy (c. 100–170) is in range; a year after this one is not a life date yet. */
export const EARLIEST_YEAR = -1000

const present = (year: number | null | undefined): year is number =>
  year !== null && year !== undefined

function yearError(year: number, latest: number): string | null {
  if (!Number.isInteger(year)) return 'A year is a whole number, such as 1666.'
  if (year < EARLIEST_YEAR || year > latest) {
    return `A year between ${EARLIEST_YEAR} and ${latest}.`
  }
  return null
}

/**
 * What is wrong with one date, field by field — empty when nothing is. `unknown` holds no year;
 * `exact`, `circa`, `before` and `after` hold one (`from`); a `range` holds two, in order.
 */
export function fuzzyYearErrors(
  date: FuzzyYear | null | undefined,
  latest: number = new Date().getUTCFullYear(),
): FuzzyYearErrors {
  const errors: FuzzyYearErrors = {}
  const precision = date?.precision ?? 'unknown'
  const from = date?.from
  const to = date?.to
  if (!(DATE_PRECISIONS as readonly string[]).includes(precision)) {
    errors.precision = 'Choose how certain the date is.'
    return errors
  }
  const fromError = present(from) ? yearError(from, latest) : null
  const toError = present(to) ? yearError(to, latest) : null
  if (fromError) errors.from = fromError
  if (toError) errors.to = toError

  if (precision === 'unknown') {
    if (present(from) || present(to)) {
      errors.precision =
        'A year is given: say how certain it is — exact, circa, before, after or a range.'
    }
    return errors
  }
  if (!present(from)) errors.from ??= 'Give the year, or set the date to unknown.'
  if (precision === 'range') {
    if (!present(to)) errors.to ??= 'A range needs the year it ends.'
    else if (present(from) && !fromError && !toError && to <= from) {
      errors.to = 'A range ends after it starts.'
    }
  } else if (present(to)) {
    errors.to ??= 'Only a range has a second year.'
  }
  return errors
}

/** The earliest year a date allows, or null when it gives none. */
export function earliestYear(date: FuzzyYear | null | undefined): number | null {
  if (!date || (date.precision ?? 'unknown') === 'unknown') return null
  return present(date.from) ? date.from : null
}

/** The latest year a date allows, or null when it gives none. */
export function latestYear(date: FuzzyYear | null | undefined): number | null {
  if (!date || (date.precision ?? 'unknown') === 'unknown') return null
  if (date.precision === 'range' && present(date.to)) return date.to
  return present(date.from) ? date.from : null
}

/**
 * A death that every reading puts before the birth — the earliest birth year after the latest
 * death year — is a typo, refused. Anything a fuzzy pair still allows passes: `after 1700` and
 * `c. 1699` are left to the cataloguer.
 */
export function lifeSpanError(
  born: FuzzyYear | null | undefined,
  died: FuzzyYear | null | undefined,
): string | null {
  const birth = earliestYear(born)
  const death = latestYear(died)
  if (birth === null || death === null) return null
  return birth > death ? 'The year of death comes before the year of birth.' : null
}
