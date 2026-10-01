/**
 * The smaller fields: colour, stock number, maker, place and categories.
 * Each keeps what the source said and decides only what is certain — an
 * empty colour is empty, a missing maker is missing (never invented), a
 * stock number is preserved exactly as written in either of its two
 * patterns (`M.1044`, `M.Dav5`), and every category tag is kept for the
 * curator's category → facet mapping (MIGRATION.md §2), however many.
 */
import type { NormaliseTables } from './tables.ts'
import { clean, isBlank, key } from './text.ts'
import {
  accept,
  empty,
  review,
  type CategoryValue,
  type MakerValue,
  type Parsed,
  type StockNumber,
} from './types.ts'

/** Colour wording → the colour select value through the tables; unmapped wording goes to review. */
export function parseColour(text: string | null, tables: NormaliseTables): Parsed<string> {
  if (isBlank(text)) return empty(text)
  const wording = key(text ?? '')
  const entry = Object.entries(tables.colours).find(([wordingKey]) => key(wordingKey) === wording)
  if (entry === undefined) return review(text, null, 'no mapping for this colour wording')
  if (entry[1] === null)
    return empty(text, 'says nothing about colour (a technique or object word)')
  return accept(text, entry[1])
}

const NUMBERED = /^([A-Z]{1,3})\.(\d+[A-Z]?)$/
const NAMED = /^([A-Z]{1,3})\.([A-Z][a-z]+\d*)$/

/** A stock number, preserved verbatim; anything outside the two patterns goes to review. */
export function parseStockNumber(
  text: string | null,
  tables: NormaliseTables,
): Parsed<StockNumber> {
  if (isBlank(text)) return empty(text)
  const value = clean(text) ?? ''
  const numbered = NUMBERED.exec(value)
  const named = numbered === null ? NAMED.exec(value) : null
  const match = numbered ?? named
  if (match === null)
    return review(text, null, 'not in either stock-number pattern (M.1044, M.Dav5)')
  const prefix = match[1] ?? ''
  const known = tables.stockPrefixes
  if (known.length > 0 && !known.includes(prefix)) {
    return review(
      text,
      { value, prefix, pattern: numbered ? 'numbered' : 'named' },
      `an unknown prefix "${prefix}"`,
    )
  }
  return accept(text, { value, prefix, pattern: numbered ? 'numbered' : 'named' })
}

/** The maker as the source names it; de-duplication and aliases are a later step (TASKS.md 36.1). */
export function parseMaker(
  maker: { legacyId: number | null; name: string | null } | null,
  tables: NormaliseTables,
): Parsed<MakerValue> {
  const name = clean(maker?.name)
  const raw = maker === null ? null : `${maker.legacyId ?? ''}:${maker.name ?? ''}`
  if (maker === null || name === null || name === '') return empty(raw, 'no maker in the source')
  if (isPlaceholder(name, tables)) return empty(raw, 'a placeholder maker')
  return accept(raw, { legacyId: maker.legacyId, name })
}

/** A publication place as written ("Dordrecht / Amsterdam"); the gazetteer resolves it later. */
export function parsePlace(text: string | null, tables: NormaliseTables): Parsed<string> {
  if (isBlank(text)) return empty(text)
  const value = clean(text) ?? ''
  if (isPlaceholder(value, tables)) return empty(text, 'a placeholder place')
  if (/\d/.test(value)) return review(text, null, 'digits in the place (a date or a stock number?)')
  return accept(text, value)
}

/** Every category tag, de-duplicated by id, in source order. */
export function parseCategories(categories: readonly CategoryValue[]): Parsed<CategoryValue[]> {
  const raw = categories.map((category) => category.legacyId ?? category.name).join(',')
  if (categories.length === 0) return empty(null)
  const seen = new Set<string>()
  const kept = categories.filter((category) => {
    const id = String(category.legacyId ?? key(category.name ?? ''))
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  return accept(raw, kept)
}

function isPlaceholder(value: string, tables: NormaliseTables): boolean {
  return tables.placeholders.some((placeholder) => key(placeholder) === key(value))
}
