/**
 * A bibliography entry (CONTENT-MODEL.md §3 `sources`: short cite, full citation, year, url) —
 * Tooley, Koeman, Parry, Schilder, Suárez, Tibbetts — each reference on a work links to its
 * source page (C2 `SourceVM`). Pure.
 */

/** Printed bibliographies of maps start with the incunabula; nothing is published next year. */
export const EARLIEST_SOURCE_YEAR = 1450

export function sourceYearError(
  year: number | null | undefined,
  latest: number = new Date().getUTCFullYear(),
): string | null {
  if (year === null || year === undefined) return null
  if (!Number.isInteger(year)) return 'A year is a whole number, such as 1979.'
  if (year < EARLIEST_SOURCE_YEAR || year > latest) {
    return `The year it was published, between ${EARLIEST_SOURCE_YEAR} and ${latest}.`
  }
  return null
}

/** How references cite it — "Tooley", "Koeman", "Tooley (Australia)": short, one line. */
export const SHORT_CITE_MAX_LENGTH = 80

export function shortCiteError(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === '') {
    return 'Give the short cite references use, such as "Tooley" or "Koeman".'
  }
  if (/[\r\n]/.test(value)) return 'A short cite is one line; the full citation goes below.'
  if (value.trim().length > SHORT_CITE_MAX_LENGTH) {
    return `Keep the short cite to ${SHORT_CITE_MAX_LENGTH} characters; the full citation goes below.`
  }
  return null
}
