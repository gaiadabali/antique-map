/**
 * Titles → the hook title buyers read and the original title, a diplomatic
 * transcription (CONTENT-MODEL.md §1). The old store stuffed its titles for
 * search engines — "Southeast Asia map - Year 1661", "… - Extremely rare
 * map", both at once — so trailing year phrases ("- Year 1725", ", ca. 1795")
 * and the store's own tabled phrases are moved out of the title into
 * `seoSuffixes`, kept for the SEO fields. A suffix that only looks like one
 * (an untabled "- Antique Map"), a year phrase in mid-title, or an original
 * title carrying a byline that is not the record's maker goes to review.
 */
import type { NormaliseTables } from './tables.ts'
import { clean, escapeRegExp, isBlank, key } from './text.ts'
import { accept, empty, review, type Parsed } from './types.ts'

export type TitleValue = {
  readonly title: string
  /** What was moved out of the title, in the order it appeared. */
  readonly seoSuffixes: readonly string[]
}

const YEAR_PHRASE = String.raw`(?:(?:the\s+)?year\s+|(?:ca\.?|circa|c\.)\s*)\d{4}(?:\s*[-–]\s*\d{2,4})?`
/** A year phrase at the end, keeping a set designation after it ("(set of 4) A"). */
const TRAILING_YEAR = new RegExp(
  String.raw`(?:\s*[-–—,.~]\s*|\s+(?=(?:the\s+)?year\b))(${YEAR_PHRASE})\.?(\s*\([^()]*\))?(\s+[A-Z0-9]{1,2})?\s*$`,
  'i',
)
const MID_YEAR = new RegExp(String.raw`\s*[-–—,]\s*(?:the\s+)?year\s+\d{4}\b`, 'i')
/** "Studio Portrait circa 1890-99": a year phrase at the end with no separator — part of the title, or not. */
const LOOSE_TRAILING_YEAR = new RegExp(String.raw`\s(${YEAR_PHRASE})\.?$`, 'i')

export type TitleInput = {
  readonly hook: string | null
  readonly original: string | null
  /** The record's maker, so an original title's "by <maker>" byline can be moved out. */
  readonly makerName: string | null
}

export function parseTitles(
  input: TitleInput,
  tables: NormaliseTables,
): { title: Parsed<TitleValue>; originalTitle: Parsed<TitleValue> } {
  const title = parseHook(input.hook, tables)
  const hookKey = title.proposal === null ? null : key(title.proposal.title)
  return { title, originalTitle: parseOriginal(input, hookKey, tables) }
}

function parseHook(raw: string | null, tables: NormaliseTables): Parsed<TitleValue> {
  if (isBlank(raw)) return empty(raw)
  const { rest, removed } = stripSuffixes(clean(raw) ?? '', tables)
  if (rest === '') return review(raw, null, 'nothing left once the SEO suffixes are moved out')
  const doubt = doubtful(rest, tables)
  if (doubt !== null) {
    return review(
      raw,
      { title: doubt.rest, seoSuffixes: [...removed, ...doubt.removed] },
      doubt.reason,
    )
  }
  return accept(raw, { title: rest, seoSuffixes: removed })
}

function parseOriginal(
  input: TitleInput,
  hookKey: string | null,
  tables: NormaliseTables,
): Parsed<TitleValue> {
  const raw = input.original
  if (isBlank(raw)) return empty(raw)
  let { rest, removed } = stripSuffixes(clean(raw) ?? '', tables)
  const maker = clean(input.makerName)
  if (maker) {
    const byline = new RegExp(String.raw`[,\s]+by\s+${escapeRegExp(maker)}\.?$`, 'i').exec(rest)
    if (byline) {
      removed = [clean(byline[0].replace(/^[,\s]+/, '')) ?? '', ...removed]
      rest = clean(rest.slice(0, byline.index)) ?? ''
      ;({ rest, removed } = stripSuffixes(rest, tables, removed))
    }
  }
  if (rest === '') return review(raw, null, 'nothing left once the SEO suffixes are moved out')
  if (hookKey !== null && key(rest) === hookKey) return empty(raw, 'the same as the hook title')
  const value = { title: rest, seoSuffixes: removed }
  const doubt = doubtful(rest, tables)
  if (doubt !== null)
    return review(
      raw,
      { title: doubt.rest, seoSuffixes: [...removed, ...doubt.removed] },
      doubt.reason,
    )
  if (/\sby\s+[A-Z]/.test(rest))
    return review(raw, value, "a byline that is not the record's maker")
  return accept(raw, value)
}

/** Removes trailing year phrases and tabled phrases, repeatedly ("- Year 1640 - Extremely rare map"). */
function stripSuffixes(
  title: string,
  tables: NormaliseTables,
  already: readonly string[] = [],
): { rest: string; removed: string[] } {
  let rest = title
  const removed: string[] = []
  const phrases = [...tables.seoSuffixes].sort((a, b) => b.length - a.length)
  for (;;) {
    const before = rest
    const year = TRAILING_YEAR.exec(rest)
    if (year) {
      removed.unshift(clean(year[1]) ?? '')
      rest = (rest.slice(0, year.index) + (year[2] ?? '') + (year[3] ?? '')).trim()
    }
    for (const phrase of phrases) {
      const match = new RegExp(
        String.raw`(?:\s+[-–—]\s+|\s*,\s*)(${escapeRegExp(phrase)})\.?\s*$`,
        'i',
      ).exec(rest)
      if (match) {
        removed.unshift(clean(match[1]) ?? '')
        rest = rest.slice(0, match.index).trim()
        break
      }
    }
    rest = rest.replace(/[\s,\-–—]+$/, '')
    // What this pass removed stood before what was removed already.
    if (rest === before) return { rest, removed: [...removed, ...already] }
  }
}

/** What still looks like SEO stuffing after the tabled suffixes are gone — proposed, never applied. */
function doubtful(
  title: string,
  tables: NormaliseTables,
): { rest: string; removed: string[]; reason: string } | null {
  let rest = title
  const removed: string[] = []
  const reasons: string[] = []
  const segments = rest.split(/\s+[-–—]\s+/)
  const last = segments.at(-1) ?? ''
  const signals = tables.seoSignalWords.map((word) => key(word))
  if (
    segments.length > 1 &&
    key(last)
      .split(' ')
      .some((word) => signals.includes(word))
  ) {
    const stripped = stripSuffixes(segments.slice(0, -1).join(' - '), tables)
    rest = stripped.rest
    removed.push(...stripped.removed, last)
    reasons.push(`"${last}" looks like an SEO suffix the tables do not list`)
  }
  const mid = MID_YEAR.exec(rest)
  if (mid) {
    removed.push(clean(mid[0].replace(/^[\s,\-–—]+/, '')) ?? '')
    rest = clean(rest.slice(0, mid.index) + rest.slice(mid.index + mid[0].length)) ?? ''
    reasons.push('a year phrase in the middle of the title')
  }
  const loose = LOOSE_TRAILING_YEAR.exec(rest)
  if (loose) {
    removed.push(clean(loose[1]) ?? '')
    rest = clean(rest.slice(0, loose.index)) ?? ''
    reasons.push('a year phrase at the end with no separator')
  }
  return reasons.length === 0 ? null : { rest, removed, reason: reasons.join('; ') }
}
