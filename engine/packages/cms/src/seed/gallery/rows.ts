/**
 * A normalised legacy record → one antiques row (CONTENT-MODEL.md §9), for the seed's gallery
 * layers. The rules (DATA.md §2, §3, §4):
 *
 * - **Only the normaliser's parsed values land, and a `review` proposal lands only flagged.** A
 *   field the record marks `review` is written with the normaliser's own proposal when it has
 *   one, never silently cleaned — every such field adds a `review:<field>` mark to the record's
 *   `legacy.categories`, so the admin shows the record in the review queue and a person works
 *   from the review file (§4).
 * - **`publicId` is the old product id** (§6), sent as `legacy_id`, which the import plans into
 *   the work's public id.
 * - **The old price is the owner-only asking price, in the full layer only** (owner decision
 *   2026-10-08; the gallery still shows no price, DR-3): a parsed, fixed, USD price whose cents
 *   are whole dollars lands as `asking_price` (whole dollars) + `asking_currency` `USD`; anything
 *   else (empty, review, on request, another currency, part-dollar cents, zero) leaves both cells
 *   empty — never rounded, never guessed. The committed sample never carries a price: its rows
 *   are built without it (`withPrice` false), so nothing priced reaches git. (The column headers
 *   stay: the import refuses a file whose header is not the template.)
 * - **Status** is `sold` or `available` as the old page showed; `location` is `singapore`.
 * - `object_type`, a required cell the old site never stated, comes from the record's own
 *   categories (a photograph is a photograph); a maker's role follows the object, and a credit is
 *   `attributed` — never certain on a script's authority.
 * - The object's technique and the old colour wording are not the data's to state: both stay
 *   empty, marked where the record said something.
 * - A stock number the record does not state falls back to `M.L<old id>` — a key no legacy record
 *   produces, so every record imports.
 */
import { ANTIQUE_COLUMNS } from '../../import/kinds'
import { STOCK_NUMBER_PATTERN, stockNumberError } from '../../validators/work-record'
import type { LegacyImage, NormalisedGalleryRecord } from './records'

export const OLD_SITE_URL = 'https://www.antiquemapsindonesia.com'

/** One sheet row: the column→cell map of one record, with the review marks it carries. */
export type AntiqueRow = {
  cells: Record<string, string>
  /** The record's own legacy category names, as the old site listed them. */
  readonly legacyCategories: readonly string[]
  readonly reviewMarks: readonly string[]
}

/** The object types a legacy category name names, most specific first. */
const CATEGORY_OBJECT_TYPES: ReadonlyArray<{ readonly test: RegExp; readonly type: string }> = [
  { test: /book/i, type: 'book' },
  { test: /poster/i, type: 'poster' },
  { test: /photograph/i, type: 'photograph' },
  { test: /sea chart/i, type: 'sea-chart' },
  { test: /\bmap/i, type: 'map' },
  { test: /\bprint|tribal|ethnographic|costume|wayang|batik/i, type: 'print' },
  { test: /ethnograph/i, type: 'ethnographic' },
]

export function objectTypeOf(categories: readonly string[]): string {
  const joined = categories.join(' ')
  for (const rule of CATEGORY_OBJECT_TYPES) if (rule.test.test(joined)) return rule.type
  return 'other'
}

/** The role a maker is credited with, from the object the record is. */
export function makerRoleOf(objectType: string): string {
  switch (objectType) {
    case 'map':
    case 'sea-chart':
    case 'city-plan':
      return 'cartographer'
    case 'photograph':
      return 'photographer'
    case 'book':
    case 'atlas':
      return 'author'
    default:
      return 'artist'
  }
}

/** A place cell the record parsed, unwrapped of a parenthetical ("Batavia (Jakarta)"). */
function placeCandidates(raw: string): readonly string[] {
  const stripped = raw.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return stripped !== '' && stripped !== raw ? [raw, stripped] : [raw]
}

/** The grade cell and notes a record's condition parses to (marked inside `antiqueRow`). */
function conditionOf(record: NormalisedGalleryRecord): { grade: string; notes: string } {
  const field = record.fields.condition
  const raw = (field.raw ?? '').trim()
  if (field.status === 'parsed' && field.value) {
    return { grade: field.value.grade, notes: field.value.notes ?? '' }
  }
  if (field.status === 'empty') {
    // The old page gave no condition at all: As-is is the scale's no-claim grade, never a quality.
    return { grade: 'As-is', notes: '' }
  }
  // The normaliser's known dirty case, `G-`: below Good — the scale's Fair bucket, with the old
  // page's own words kept as the notes, so a person reads what was there.
  return { grade: 'Fair', notes: raw }
}

/**
 * The asking price a record's old price reads as, in whole US dollars, or null. Integer
 * arithmetic only: cents that are not a whole number of dollars are never rounded (null).
 */
export function askingDollarsOf(record: NormalisedGalleryRecord): string | null {
  const price = record.fields.price
  if (!price || price.status !== 'parsed' || price.value?.mode !== 'fixed') return null
  const base = price.value.base
  if (!base || base.currency !== 'USD') return null
  const cents = base.amount
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents % 100 !== 0) return null
  return String(cents / 100)
}

/**
 * One record → one row. Pure over the record; batch dedupe of stock numbers happens outside.
 * `withPrice` carries the old price into the owner-only asking price (the full layer only).
 */
export function antiqueRow(
  record: NormalisedGalleryRecord,
  imageCells: readonly string[],
  withPrice = false,
): AntiqueRow {
  const marks: string[] = []
  const categories = (
    record.fields.categories.value ??
    record.fields.categories.proposal ??
    []
  ).map((category) => category.name)
  if (record.fields.categories.status === 'review') marks.push('review:categories')
  const objectType = objectTypeOf(categories)

  const cells: Record<string, string> = {}
  for (const column of ANTIQUE_COLUMNS) cells[column] = ''

  // The stock number is the key the owner's later sheet updates by, so the record's own value is
  // kept even when the normaliser marked it — marked, never silently replaced (§4). Only a value
  // the pattern refuses, or nothing at all, takes the fallback.
  const stock = record.fields.stockNumber
  const stockRaw = (stock.raw ?? '').trim()
  // A normalised value the gallery's pattern refuses (the legacy data has book records keyed
  // `B.<n>`) falls back like an empty one — the importer would refuse it as the key, and a row
  // is never seeded with a key it cannot be found by again.
  const stockSaid = (() => {
    const candidate =
      ((stock.value?.value ?? '') || '').trim() || (stock.status === 'review' ? stockRaw : '')
    return candidate !== '' && stockNumberError(candidate, STOCK_NUMBER_PATTERN) === null
      ? candidate
      : ''
  })()
  cells.stock_number = stockSaid
  const stockRefused = stockSaid === '' && ((stock.value?.value ?? '') || '').trim() !== ''
  if (stock.status === 'review' || stockRefused) marks.push('review:stockNumber')

  const title = record.fields.title
  cells.title_en = (title.value ?? title.proposal)?.title ?? ''
  if (title.status === 'review') marks.push('review:title')

  const original = record.fields.originalTitle
  cells.original_title = (original.value ?? original.proposal)?.title ?? ''
  if (original.status === 'review') marks.push('review:originalTitle')

  cells.object_type = objectType

  const date = record.fields.date
  const dateValue = date.value ?? date.proposal
  if (dateValue) {
    cells.date_precision = dateValue.precision
    if (dateValue.from !== null) cells.date_from = String(dateValue.from)
    if (dateValue.to !== null) cells.date_to = String(dateValue.to)
    if (dateValue.display) cells.date_display = dateValue.display
  }
  if (cells.date_display === '' && record.publicationNote) {
    cells.date_display = record.publicationNote
  }
  if (date.status === 'review') marks.push('review:date')

  // Places: only a parsed value the vocabulary layer has seeded will match; a name nothing
  // matches is left out of the cell and marked, never guessed (DATA.md §3).
  const place = record.fields.place
  const placeNames = place.value !== null ? placeCandidates(place.value) : []
  cells.places = placeNames.join(';')
  if (place.status === 'review' || placeNames.length === 0) marks.push('review:place')

  const maker = record.fields.maker
  const makerName = maker.value?.name ?? ''
  cells.makers = makerName ? `${makerName} | ${makerRoleOf(objectType)} | attributed` : ''
  if (maker.status === 'review') marks.push('review:maker')

  const dollars = withPrice ? askingDollarsOf(record) : null
  if (dollars !== null) {
    cells.asking_price = dollars
    cells.asking_currency = 'USD'
  }

  cells.status = record.status.sold ? 'sold' : 'available'
  cells.location = 'singapore'

  const sizes = record.sizes
  if (sizes?.image) {
    cells.image_h_mm = String(sizes.image.heightMm)
    cells.image_w_mm = String(sizes.image.widthMm)
  }
  if (sizes?.sheet) {
    cells.sheet_h_mm = String(sizes.sheet.heightMm)
    cells.sheet_w_mm = String(sizes.sheet.widthMm)
  }
  if (record.fields.dimensions.status === 'review') marks.push('review:dimensions')

  const condition = conditionOf(record)
  cells.grade = condition.grade
  if (condition.notes !== '') cells.condition_notes_en = condition.notes
  if (record.fields.condition.status !== 'parsed') marks.push('review:condition')

  // Colour and technique: the old wording is a review field on almost every record, and the
  // object's making is not the data's to state. Both stay empty, marked where a colour was said.
  if (record.fields.colour.status === 'review' && (record.fields.colour.raw ?? '').trim() !== '') {
    marks.push('review:colour')
  }

  cells.legacy_id = String(record.legacyId)
  if (record.path) cells.legacy_url = `${OLD_SITE_URL}${record.path}`
  cells.image_files = imageCells.join(';')
  if (imageCells.length === 0) marks.push('review:images')

  // The marks ride beside the row (the antiques template has no column for them): the run writes
  // them into the work's `legacy.categories` — the "from the old site" group a cataloguer reads
  // in the admin — after the import applies (§4: the mark is carried, never cleaned away).
  return { cells, legacyCategories: categories.toSorted(), reviewMarks: marks.toSorted() }
}

/** All records → rows, with stock numbers deduped across the batch and images joined. */
export function antiqueRows(
  records: readonly NormalisedGalleryRecord[],
  images: ReadonlyMap<number, readonly LegacyImage[]>,
  imagePathOf: (image: LegacyImage) => string,
  withPrice = false,
): readonly AntiqueRow[] {
  const used = new Set<string>()
  return records.map((record) => {
    const imageCells = (images.get(record.legacyId) ?? []).map(imagePathOf)
    const row = antiqueRow(record, imageCells, withPrice)
    const said = row.cells.stock_number ?? ''
    if (said === '' || used.has(said)) {
      row.cells.stock_number = fallbackStockNumber(record.legacyId, used)
    }
    used.add(row.cells.stock_number!)
    return row
  })
}

/** `M.L<old id>` — a key no legacy record states, so a fallback never collides with one. */
export function fallbackStockNumber(legacyId: number, used: Set<string>): string {
  let candidate = `M.L${legacyId}`
  while (used.has(candidate)) candidate = `${candidate}x`
  return candidate
}

/** The row as CSV text: RFC 4180, CRLF, in the template's column order. */
export function antiqueCsv(rows: readonly AntiqueRow[]): string {
  const quote = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
  const lines = [ANTIQUE_COLUMNS.join(',')]
  for (const row of rows) {
    lines.push(ANTIQUE_COLUMNS.map((column) => quote(row.cells[column] ?? '')).join(','))
  }
  return `${lines.join('\r\n')}\r\n`
}

/** Whether a stock number satisfies the gallery's pattern. */
export const stockNumberMatches = (value: string): boolean =>
  stockNumberError(value, STOCK_NUMBER_PATTERN) === null
