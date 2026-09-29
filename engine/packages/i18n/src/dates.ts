/**
 * Dates as a cataloguer states them. Precision is part of the fact: a map "c. 1750" is never
 * shown as "1750" (DESIGN-SYSTEM.md §10, C2 `FuzzyDateVM`), and the cataloguer's own wording
 * ("1724–26") wins over any formatter. Years are written as years — never grouped as `1,750`.
 *
 * The words are neutral defaults per locale; an app passes the brand's own (from its copy,
 * the lexicon of TASKS.md 6.3) when the brand words them differently — "ca." for "c.".
 */
import type { LocaleCode } from '@engine/config/schema'

import { formattingTag } from './locales'

export type DatePrecision = 'exact' | 'circa' | 'before' | 'after' | 'range' | 'unknown'

/** C2's `FuzzyDateVM`, as far as display reads it. */
export type FuzzyDate = {
  readonly precision: DatePrecision
  /** Years; `to` only for a range. */
  readonly from: number | null
  readonly to: number | null
  /** The cataloguer's wording, which wins. */
  readonly display: string | null
}

/** Templates: `{year}`, or `{from}` and `{to}` for a range. */
export type DateWords = {
  readonly circa: string
  readonly before: string
  readonly after: string
  readonly range: string
  readonly unknown: string
}

export const DATE_WORDS = {
  en: {
    circa: 'c. {year}',
    before: 'before {year}',
    after: 'after {year}',
    range: '{from}–{to}',
    unknown: 'undated',
  },
  id: {
    circa: 'sekitar {year}',
    before: 'sebelum {year}',
    after: 'setelah {year}',
    range: '{from}–{to}',
    unknown: 'tanpa tahun',
  },
  nl: {
    circa: 'ca. {year}',
    before: 'vóór {year}',
    after: 'na {year}',
    range: '{from}–{to}',
    unknown: 'ongedateerd',
  },
} as const satisfies Record<LocaleCode, DateWords>

export function formatDate(
  date: FuzzyDate,
  locale: LocaleCode,
  words: Partial<DateWords> = {},
): string {
  const display = date.display?.trim()
  if (display) return display
  const w = { ...DATE_WORDS[locale], ...words }
  const fill = (template: string, values: Record<string, number>) =>
    template.replace(/\{(\w+)\}/g, (whole, name: string) =>
      values[name] === undefined ? whole : String(values[name]),
    )
  const { from, to } = date
  switch (date.precision) {
    case 'exact':
      return from === null ? w.unknown : String(from)
    case 'circa':
    case 'before':
    case 'after':
      return from === null ? w.unknown : fill(w[date.precision], { year: from })
    case 'range':
      if (from !== null && to !== null)
        return from === to ? String(from) : fill(w.range, { from, to })
      if (from !== null) return fill(w.after, { year: from })
      return to === null ? w.unknown : fill(w.before, { year: to })
    case 'unknown':
      return w.unknown
  }
}

export type CalendarPrecision = 'year' | 'month' | 'day'

/**
 * A calendar date (`YYYY-MM-DD`, `YYYY-MM` or `YYYY`) at the precision it is known to —
 * "September 2026", "29 September 2026" — as a date, never an instant: no time zone moves it
 * a day either way. An exhibition's opening, an order's day.
 */
export function formatCalendarDate(
  value: string,
  locale: LocaleCode,
  precision?: CalendarPrecision,
): string {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value)
  if (!match) throw new RangeError(`"${value}" is not a calendar date YYYY[-MM[-DD]]`)
  const [, year = '', month, day] = match
  const known: CalendarPrecision = day ? 'day' : month ? 'month' : 'year'
  const at = precision ?? known
  const rank = { year: 0, month: 1, day: 2 } as const
  if (rank[at] > rank[known]) throw new RangeError(`"${value}" is known only to the ${known}`)
  const instant = new Date(Date.UTC(Number(year), Number(month ?? 1) - 1, Number(day ?? 1)))
  // `Date` rolls 2026-02-30 into March; a date that does not round-trip does not exist.
  const [back] = instant.toISOString().split('T')
  if (back?.slice(0, value.length) !== value)
    throw new RangeError(`"${value}" is not a calendar date`)
  return new Intl.DateTimeFormat(formattingTag(locale), {
    timeZone: 'UTC',
    year: 'numeric',
    ...(at === 'year' ? {} : { month: 'long' }),
    ...(at === 'day' ? { day: 'numeric' } : {}),
  }).format(instant)
}
