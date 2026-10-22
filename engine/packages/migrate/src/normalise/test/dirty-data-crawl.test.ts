// The dirty-data cases MIGRATION.md §4 gained from the 1,823 crawled records
// (7.5), one test each, named after the case — on synthetic public-read
// records and short synthetic field values only (TASKS.md 7.4.d). The cases
// §4 listed before live in dirty-data.test.ts.
import { describe, expect, it } from 'vitest'

import type { PublicProductRecord } from '../../sources/public-read/index.ts'
import { fromPublicRead } from '../adapters.ts'
import { parseCondition } from '../condition.ts'
import type { ImageSize } from '../image-size.ts'
import { normaliseRecord, type NormalisedRecord } from '../record.ts'
import { DEFAULT_TABLES, parseTables, type NormaliseTables } from '../tables.ts'
import { parseColour, parseStockNumber } from '../vocabulary.ts'

const PORTRAIT: ImageSize = { widthPx: 2400, heightPx: 3000 }

/** A synthetic crawled record; `panel` replaces side-panel values by label. */
function crawled(
  panel: Record<string, string>,
  overrides: Partial<PublicProductRecord> = {},
): PublicProductRecord {
  const defaults: Record<string, string> = {
    Title: 'Mock chart',
    'Publication Place / Date': 'Mockville / 1689',
    'Image Dimensions': '450 x 380 mm',
    Color: '',
    Condition: 'G+',
    'Product Price': 'USD 1,380',
    'Product Number': 'SKU #M.1001',
  }
  const values = { ...defaults, ...panel }
  return {
    source: 'public-read',
    legacyId: 9100,
    path: '/product/9100-mock-chart',
    slug: 'mock-chart',
    fetchedAt: null,
    availability: 'listed',
    soldEvidence: [],
    heading: 'Mock Maker',
    longTitle: 'Mock chart (mock long title)',
    fields: Object.entries(values).map(([label, value]) => ({ label, value })),
    cardTitle: 'Mock chart',
    cardFields: [],
    cardPrice: null,
    maker: { legacyId: 1, name: 'Mock Maker', path: '/mapmaker/1-mock-maker' },
    categories: [],
    descriptionHtml: null,
    images: [],
    ...overrides,
  }
}

function normalise(
  record: PublicProductRecord,
  image: ImageSize | null = PORTRAIT,
  tables: NormaliseTables = DEFAULT_TABLES,
): NormalisedRecord {
  return normaliseRecord(fromPublicRead(record, tables, image), tables)
}

describe('MIGRATION.md §4 dirty data, from the crawled records', () => {
  it('sizes typed in both orders — the height comes from the photograph, never from the order', () => {
    const heightFirst = normalise(crawled({ 'Image Dimensions': '450 x 380 mm' }))
    const widthFirst = normalise(crawled({ 'Image Dimensions': '380 x 450 mm' }))
    for (const record of [heightFirst, widthFirst]) {
      expect(record.fields.orientation.value).toBe('portrait')
      expect(record.sizes?.image).toEqual({ heightMm: 450, widthMm: 380 })
    }
    const landscape = normalise(crawled({ 'Image Dimensions': '450 x 380 mm' }), {
      widthPx: 3000,
      heightPx: 2400,
    })
    expect(landscape.sizes?.image).toEqual({ heightMm: 380, widthMm: 450 })
    const noImage = normalise(crawled({ 'Image Dimensions': '450 x 380 mm' }), null)
    expect(noImage.fields.orientation).toMatchObject({ status: 'review', value: null })
    expect(noImage.sizes).toBeNull()
  })

  it('G- — not on the D10 scale, so it goes to review, never rounded to G', () => {
    expect(parseCondition('G- / Study images carefully', DEFAULT_TABLES)).toMatchObject({
      raw: 'G- / Study images carefully',
      status: 'review',
      value: null,
      reason: '"G-" is not a grade on the scale',
    })
    expect(normalise(crawled({ Condition: 'G-' })).fields.condition.status).toBe('review')
  })

  it('SKUs in more than two patterns — B., IM., PM. read; a lower-case p. and a bare DavDw go to review', () => {
    for (const [sku, prefix] of [
      ['B.12', 'B'],
      ['IM.345', 'IM'],
      ['PM.6', 'PM'],
    ] as const) {
      expect(parseStockNumber(sku, DEFAULT_TABLES).value).toEqual({
        value: sku,
        prefix,
        pattern: 'numbered',
      })
    }
    for (const sku of ['p.78', 'DavDw']) {
      expect(parseStockNumber(sku, DEFAULT_TABLES)).toMatchObject({
        raw: sku,
        status: 'review',
        value: null,
      })
    }
    // A store's tables that name its prefixes send any other one to review, proposed as read.
    const named = parseTables({ stockPrefixes: ['M', 'P', 'F'] })
    expect(parseStockNumber('IM.345', named)).toMatchObject({
      status: 'review',
      proposal: { value: 'IM.345', prefix: 'IM', pattern: 'numbered' },
      reason: 'an unknown prefix "IM"',
    })
  })

  it('technique words in the colour field — never read as a colour', () => {
    for (const word of ['Lithograph', 'Copperplate Engraving']) {
      expect(parseColour(word, DEFAULT_TABLES)).toMatchObject({
        status: 'review',
        value: null,
        reason: 'no mapping for this colour wording',
      })
    }
    const mapped = parseTables({ colours: { lithograph: null, 'copperplate engraving': null } })
    expect(parseColour('Copperplate Engraving', mapped)).toMatchObject({
      status: 'empty',
      value: null,
      reason: 'says nothing about colour (a technique or object word)',
    })
  })

  it('a sold page\'s "-" price — empty, never a zero price', () => {
    const sold = normalise(crawled({ 'Product Price': '-' }, { availability: 'sold' }))
    expect(sold.status.sold).toBe(true)
    expect(sold.fields.price).toMatchObject({
      raw: '-',
      status: 'empty',
      value: null,
      proposal: null,
      reason: 'no price shown',
    })
  })

  it('Year: null on the card beside a dated Publication Place / Date panel — the date comes from the panel', () => {
    const record = normalise(
      crawled(
        { 'Publication Place / Date': 'Mockville / 1689' },
        { cardFields: [{ label: 'Year', value: 'null' }] },
      ),
    )
    expect(record.fields.date).toMatchObject({
      status: 'parsed',
      value: { precision: 'exact', from: 1689, to: null, display: null },
    })
    expect(record.fields.place.value).toBe('Mockville')
  })

  it('a maker’s name in the place slot — NOT caught yet: it parses as the place (gap, reported in 7.4)', () => {
    const record = normalise(crawled({ 'Publication Place / Date': 'Mock Maker / 1689' }))
    expect(record.fields.maker.value?.name).toBe('Mock Maker')
    // Wanted: review, as "the place names the maker". Actual: accepted as a place.
    expect(record.fields.place).toMatchObject({ status: 'parsed', value: 'Mock Maker' })
  })
})
