/**
 * Dates → C2's `{ from, to, precision, display }`. Precision is part of the
 * fact: "ca. 1795" is circa, never 1795; a range keeps both ends; "18th
 * century" keeps its wording. A year field holding "null", a place
 * ("Leiden"), a three-digit year or anything else unrecognised goes to review.
 *
 * Some sources print the place and the date in one field ("Amsterdam /
 * 1724 - 26 (first edition)"); `splitPublication` takes it apart first.
 */
import type { NormaliseTables } from './tables.ts'
import { clean, isBlank, key } from './text.ts'
import { accept, empty, review, type FuzzyDate, type Parsed } from './types.ts'

const CIRCA = String.raw`(?:ca\.?|c\.|c(?=\d)|circa|approx\.?)`
const YEAR_WORD = String.raw`(?:(?:the\s+)?year\s+)`
const DATE_CORE = String.raw`(?:${YEAR_WORD}?(?:${CIRCA}\s*)?\d{3,4}(?:\s*[-–—]\s*(?:${CIRCA}\s*)?\d{2,4})?|\d{1,2}(?:st|nd|rd|th)\s+century|(?:before|after|pre|post)[-\s]?\d{4})`
/** A date expression standing on its own: at the start, or after a space, slash or comma. */
const DATE_IN_TEXT = new RegExp(String.raw`(^|[\s/,])(${DATE_CORE})(?![\d.]*\d)`, 'i')
const TRAILING_NOTES = /^(?:\s*\([^()]*\)\s*)+$/

export type Publication = {
  /** The place as written, separators trimmed; `null` when none. */
  readonly place: string | null
  /** The date expression alone, or the whole text when no date could be found in it. */
  readonly dateText: string | null
  /** Parenthesised remarks after the date: "(first edition)", "(dated)". */
  readonly note: string | null
}

/** Splits a "Place / Date (note)" field. Never drops text: what it cannot place stays in `dateText`. */
export function splitPublication(text: string | null): Publication {
  const value = clean(text)
  if (value === null || value === '') return { place: null, dateText: null, note: null }
  const match = DATE_IN_TEXT.exec(value)
  if (match === null) {
    // No date: the field holds a place alone — unless it holds digits, which may be a date gone wrong.
    return /\d/.test(value)
      ? { place: null, dateText: value, note: null }
      : { place: trimPlace(value), dateText: null, note: null }
  }
  const start = match.index + (match[1] ?? '').length
  const before = value.slice(0, start)
  const after = value.slice(start + (match[2] ?? '').length)
  const place = trimPlace(before)
  if (after.trim() === '') return { place, dateText: match[2] ?? null, note: null }
  if (TRAILING_NOTES.test(after)) {
    const note = after.replace(/[()]/g, ' ')
    return { place, dateText: match[2] ?? null, note: clean(note) }
  }
  return { place, dateText: value.slice(start), note: null }
}

function trimPlace(text: string): string | null {
  const place = clean(text.replace(/^[\s/,]+|[\s/,]+$/g, ''))
  return place === '' ? null : place
}

/** A date expression → a fuzzy date, or review. */
export function parseDate(text: string | null, tables: NormaliseTables): Parsed<FuzzyDate> {
  const raw = text
  if (isBlank(text)) return empty(raw)
  const value = (clean(text) ?? '').replace(/[–—]/g, '-')
  if (key(value) === 'null')
    return review(raw, null, 'the old site printed "null" for a missing year')
  if (!/\d/.test(value)) return review(raw, null, 'no year in the date field (a place or a word?)')
  const body = value.replace(new RegExp(`^${YEAR_WORD}`, 'i'), '')
  const year = (digits: string) => Number(digits)
  const date = (
    precision: FuzzyDate['precision'],
    from: number | null,
    to: number | null,
    display: string | null = null,
  ) => ({ precision, from, to, display }) satisfies FuzzyDate

  let match = /^(\d{4})$/.exec(body)
  if (match) return windowed(raw, date('exact', year(match[1]!), null), tables)

  match = new RegExp(`^${CIRCA}\\s*(\\d{4})$`, 'i').exec(body)
  if (match) return windowed(raw, date('circa', year(match[1]!), null), tables)

  match = new RegExp(`^(${CIRCA}\\s*)?(\\d{4})\\s*-\\s*(${CIRCA}\\s*)?(\\d{2,4})$`, 'i').exec(body)
  if (match) {
    const from = year(match[2]!)
    const to = expandShortYear(from, match[4]!)
    const proposal = date('range', from, to)
    if (to === null || to <= from) return review(raw, null, 'a range that ends before it starts')
    if (match[1] || match[3]) {
      return review(
        raw,
        proposal,
        'a circa range: the model holds one precision — confirm the range or a circa year',
      )
    }
    if (to - from > 100) return review(raw, proposal, 'a range wider than a century')
    return windowed(raw, proposal, tables)
  }

  match = /^(\d{1,2})(st|nd|rd|th)\s+century$/i.exec(body)
  if (match) {
    const century = Number(match[1])
    if (match[2]!.toLowerCase() !== ordinalSuffix(century)) {
      return review(raw, null, 'a century with the wrong ordinal')
    }
    return windowed(raw, date('range', (century - 1) * 100 + 1, century * 100, clean(text)), tables)
  }

  match = /^(before|pre|after|post)[-\s]?(\d{4})$/i.exec(body)
  if (match) {
    const isBefore = /^(before|pre)$/i.test(match[1]!)
    return windowed(raw, date(isBefore ? 'before' : 'after', year(match[2]!), null), tables)
  }

  if (/^\d{3}$/.test(body)) return review(raw, null, 'a three-digit year (a typo?)')
  return review(raw, null, 'unrecognised date wording')
}

/** "1724 - 26" → 1726; "1880-90" → 1890; a full year stays as written. */
function expandShortYear(from: number, to: string): number | null {
  if (to.length === 4) return Number(to)
  if (to.length === 2) return Math.floor(from / 100) * 100 + Number(to)
  return null
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th'
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'
}

/** A year outside the tables' window is a typo until a person says otherwise. */
function windowed(raw: string | null, date: FuzzyDate, tables: NormaliseTables): Parsed<FuzzyDate> {
  const { earliest, latest } = tables.years
  for (const year of [date.from, date.to]) {
    if (year !== null && (year < earliest || year > latest)) {
      return review(raw, date, `a year outside ${earliest}–${latest}`)
    }
  }
  return accept(raw, date)
}
