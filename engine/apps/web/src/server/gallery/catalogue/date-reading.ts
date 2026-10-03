/**
 * The fuzzy work date's reading (5.1.a): the two years a work's `date` allows, in SQL and in
 * TypeScript, so the sorts, the period filter and the period counts all read the date the same
 * way. It mirrors `cms/src/validators/work-dates`'s own reading (a `circa` spans
 * CIRCA_SPAN_YEARS either side; `before` opens below, `after` opens above) and restates it here
 * because the cms package's exports do not reach the app — TODO(search-documents): the derived
 * `search_documents` job will own this reading in one place.
 *
 * A work with no year at all (or `unknown`, said on purpose) has no earliest and no latest: it
 * sorts last in either direction and matches no period bound.
 */
export const CIRCA_SPAN_YEARS = 10

/** SQL for the earliest year a work's `date` allows; `NULL` when it sets none. */
export const SQL_EARLIEST_YEAR = `
  CASE
    WHEN w.date_from IS NULL THEN NULL
    WHEN w.date_precision IN ('exact', 'after', 'range') THEN w.date_from
    WHEN w.date_precision = 'circa' THEN w.date_from - ${CIRCA_SPAN_YEARS}
    WHEN w.date_precision = 'before' THEN ${-9999}
    ELSE NULL
  END`

/** SQL for the latest year a work's `date` allows; `NULL` when it sets none. */
export const SQL_LATEST_YEAR = `
  CASE
    WHEN w.date_from IS NULL THEN NULL
    WHEN w.date_precision IN ('exact', 'before') THEN w.date_from
    WHEN w.date_precision = 'range' THEN COALESCE(w.date_to, w.date_from)
    WHEN w.date_precision = 'circa' THEN w.date_from + ${CIRCA_SPAN_YEARS}
    WHEN w.date_precision = 'after' THEN ${9999}
    ELSE NULL
  END`

/** The earliest and latest years a work's date allows, as TypeScript reads the same columns. */
export function dateRangeOf(date: {
  precision?: unknown
  from?: unknown
  to?: unknown
}): { earliest: number | null; latest: number | null } {
  const from = typeof date.from === 'number' ? date.from : null
  if (from === null) return { earliest: null, latest: null }
  switch (date.precision) {
    case 'exact':
      return { earliest: from, latest: from }
    case 'circa':
      return { earliest: from - CIRCA_SPAN_YEARS, latest: from + CIRCA_SPAN_YEARS }
    case 'before':
      return { earliest: null, latest: from }
    case 'after':
      return { earliest: from, latest: null }
    case 'range':
      return { earliest: from, latest: typeof date.to === 'number' ? date.to : from }
    default:
      return { earliest: null, latest: null }
  }
}

/** The card's date words: the cataloguer's own display (`date.display`, localized) when it is
 * one, else the precision's own words — "1726", "c. 1726", "before 1800", "1724–1730" — with a
 * date left `unknown` shown as the page's own words for it (the caller's fallback). Precision
 * rides with the words: a date is never implied certain. */
export function dateTextOf(
  date: { precision?: unknown; from?: unknown; to?: unknown; display?: unknown },
  unknownText: string,
): string {
  if (typeof date.display === 'string' && date.display.trim() !== '') return date.display
  const from = typeof date.from === 'number' ? date.from : null
  if (from === null) return unknownText
  switch (date.precision) {
    case 'exact':
      return String(from)
    case 'circa':
      return `c. ${from}`
    case 'before':
      return `before ${from}`
    case 'after':
      return `after ${from}`
    case 'range':
      return typeof date.to === 'number' && date.to !== from
        ? `${from}–${date.to}`
        : String(from)
    default:
      return unknownText
  }
}
