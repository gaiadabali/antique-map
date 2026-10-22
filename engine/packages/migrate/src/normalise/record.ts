/**
 * One legacy product through every parser. Sources differ in shape (a
 * crawled page prints place and date in one field; a database has them in
 * two columns and a separate on-request flag), so each source adapter
 * (`adapters.ts`) first maps its record onto `LegacyProductInput` — raw
 * strings, nothing interpreted — and this file does the rest.
 */
import { parseCondition } from './condition.ts'
import { parseDate, splitPublication } from './dates.ts'
import { parseDimensions } from './dimensions.ts'
import type { ImageSize } from './image-size.ts'
import { parseOrientation, toSizes } from './orientation.ts'
import { parsePrice } from './price.ts'
import { parseReferences } from './references.ts'
import type { NormaliseTables } from './tables.ts'
import { clean, isBlank } from './text.ts'
import { parseTitles, type TitleValue } from './titles.ts'
import {
  review,
  type CategoryValue,
  type ConditionValue,
  type FuzzyDate,
  type MakerValue,
} from './types.ts'
import type {
  MeasuredDimensions,
  Orientation,
  Parsed,
  PriceValue,
  Reference,
  Size,
  StockNumber,
} from './types.ts'
import {
  parseCategories,
  parseColour,
  parseMaker,
  parsePlace,
  parseStockNumber,
} from './vocabulary.ts'

export type LegacyProductInput = {
  readonly source: string
  readonly legacyId: number
  readonly path: string | null
  readonly title: string | null
  readonly originalTitle: string | null
  /** `combined`: one "Place / Date" field; otherwise separate year and place values. */
  readonly publication:
    | { readonly combined: string | null }
    | { readonly year: string | null; readonly place: string | null }
  readonly size: string | null
  readonly colour: string | null
  readonly condition: string | null
  readonly price: { readonly text: string | null; readonly onRequestFlag?: boolean | null }
  readonly stockNumber: string | null
  readonly maker: { readonly legacyId: number | null; readonly name: string | null } | null
  readonly publisher: string | null
  readonly categories: readonly CategoryValue[]
  readonly descriptionHtml: string | null
  /** The primary image's pixel size — the evidence for height versus width. */
  readonly image: ImageSize | null
  readonly status: { readonly listed: boolean; readonly sold: boolean; readonly deleted: boolean }
}

export const FIELDS = [
  'title',
  'originalTitle',
  'date',
  'place',
  'dimensions',
  'orientation',
  'condition',
  'price',
  'references',
  'stockNumber',
  'colour',
  'maker',
  'categories',
] as const
export type FieldName = (typeof FIELDS)[number]

export type NormalisedFields = {
  title: Parsed<TitleValue>
  originalTitle: Parsed<TitleValue>
  date: Parsed<FuzzyDate>
  place: Parsed<string>
  dimensions: Parsed<MeasuredDimensions>
  orientation: Parsed<Orientation>
  condition: Parsed<ConditionValue>
  price: Parsed<PriceValue>
  references: Parsed<Reference[]>
  stockNumber: Parsed<StockNumber>
  colour: Parsed<string>
  maker: Parsed<MakerValue>
  categories: Parsed<CategoryValue[]>
}

export type NormalisedRecord = {
  readonly source: string
  readonly legacyId: number
  readonly path: string | null
  readonly status: LegacyProductInput['status']
  readonly publisher: string | null
  /** Parenthesised remarks beside the date: "(first edition)", "(dated)". */
  readonly publicationNote: string | null
  /** C2 `SizeVM`s, present once both the measurement and the orientation parsed. */
  readonly sizes: { image: Size | null; sheet: Size | null } | null
  readonly fields: NormalisedFields
}

export function normaliseRecord(
  input: LegacyProductInput,
  tables: NormaliseTables,
): NormalisedRecord {
  const { date, place, note } = publication(input, tables)
  const dimensions = parseDimensions(input.size, tables)
  const orientation = parseOrientation(dimensions.value ?? dimensions.proposal, input.image)
  const maker = parseMaker(input.maker, tables)
  const titles = parseTitles(
    { hook: input.title, original: input.originalTitle, makerName: maker.value?.name ?? null },
    tables,
  )
  const fields: NormalisedFields = {
    title: titles.title,
    originalTitle: titles.originalTitle,
    date,
    place,
    dimensions,
    orientation,
    condition: parseCondition(input.condition, tables),
    price: parsePrice(input.price, tables),
    references: parseReferences(input.descriptionHtml, tables),
    stockNumber: parseStockNumber(input.stockNumber, tables),
    colour: parseColour(input.colour, tables),
    maker,
    categories: parseCategories(input.categories),
  }
  const sizes =
    dimensions.value !== null && orientation.value !== null
      ? toSizes(dimensions.value, orientation.value)
      : null
  return {
    source: input.source,
    legacyId: input.legacyId,
    path: input.path,
    status: input.status,
    publisher: clean(input.publisher),
    publicationNote: note,
    sizes,
    fields,
  }
}

function publication(
  input: LegacyProductInput,
  tables: NormaliseTables,
): { date: Parsed<FuzzyDate>; place: Parsed<string>; note: string | null } {
  if ('combined' in input.publication) {
    const split = splitPublication(input.publication.combined)
    const date = parseDate(split.dateText, tables)
    // A combined field keeps its raw text on both halves, so a reviewer sees what was split.
    return {
      date: { ...date, raw: input.publication.combined },
      place: { ...parsePlace(split.place, tables), raw: input.publication.combined },
      note: split.note,
    }
  }
  const { year, place: placeText } = input.publication
  const date = parseDate(year, tables)
  const place = parsePlace(placeText, tables)
  // "Year: Leiden" — a word in the year column and no place: propose it as the place, for a person.
  const word = clean(year)
  if (
    date.status === 'review' &&
    word &&
    !/\d/.test(word) &&
    word.toLowerCase() !== 'null' &&
    isBlank(placeText)
  ) {
    return { date, place: review(placeText, word, 'the year field holds a place name'), note: null }
  }
  return { date, place, note: null }
}

/** One record, stock numbers checked across the batch: a stock number two records share goes to review. */
export function normaliseAll(
  inputs: readonly LegacyProductInput[],
  tables: NormaliseTables,
): NormalisedRecord[] {
  const records = inputs.map((input) => normaliseRecord(input, tables))
  const counts = new Map<string, number>()
  for (const record of records) {
    const value = record.fields.stockNumber.value?.value
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return records.map((record) => {
    const stock = record.fields.stockNumber
    const shared = stock.value !== null && (counts.get(stock.value.value) ?? 0) > 1
    if (!shared || stock.value === null) return record
    const reason = `a stock number ${counts.get(stock.value.value)} records share`
    return {
      ...record,
      fields: { ...record.fields, stockNumber: review(stock.raw, stock.value, reason) },
    }
  })
}
