/**
 * The seed's rows (DATA.md §2–§4): the committed sample never carries a price — no `asking_price`
 * value, headers included-but-empty — while the full layer maps a parsed whole-dollar USD price
 * to the owner-only asking price and leaves every other reading blank. Every
 * row keys on a stock number that satisfies the pattern, and every row is the old record's
 * address (`legacy_id` is the old product id).
 */
import { describe, expect, it } from 'vitest'

import { ANTIQUE_COLUMNS } from '../../import/kinds'
import { sampleRows } from '../run'
import type { NormalisedGalleryRecord } from './records'
import {
  antiqueRow,
  antiqueRows,
  askingDollarsOf,
  fallbackStockNumber,
  stockNumberMatches,
} from './rows'

describe('the sample rows', () => {
  const rows = sampleRows({ withImages: false })

  it('are the committed 50', () => {
    expect(rows.length).toBe(50)
    const keys = new Set(rows.map((row) => row.cells.stock_number ?? ''))
    expect(keys.size).toBe(50)
    for (const key of keys) expect(stockNumberMatches(key)).toBe(true)
  })

  it('carry no asking price anywhere (DR-3, Q14): headers stay, cells are empty', () => {
    expect(ANTIQUE_COLUMNS).toContain('asking_price')
    expect(ANTIQUE_COLUMNS).toContain('asking_currency')
    for (const row of rows) {
      expect(row.cells.asking_price).toBe('')
      expect(row.cells.asking_currency).toBe('')
    }
  })

  it('carry the old product id as legacy_id', () => {
    for (const row of rows) {
      expect(row.cells.legacy_id).toMatch(/^\d+$/)
    }
  })

  it('carry the old site address when the record has a path', () => {
    const withUrl = rows.filter((row) => (row.cells.legacy_url ?? '') !== '')
    expect(withUrl.length).toBeGreaterThan(0)
    expect(withUrl[0]!.cells.legacy_url).toContain('https://www.antiquemapsindonesia.com')
  })

  it('every sample row arrives flagged as a review field or with its old categories', () => {
    // The sample comes from the legacy data, so every row carries some carried mark or category.
    for (const row of rows) {
      expect(row.reviewMarks.length + row.legacyCategories.length).toBeGreaterThan(0)
    }
  })
})

describe('the fallback stock number', () => {
  it('is M.L<old id> — a key no legacy record states — and never collides', () => {
    const used = new Set<string>()
    const take = (legacyId: number) => {
      const value = fallbackStockNumber(legacyId, used)
      used.add(value)
      return value
    }
    expect(take(7)).toBe('M.L7')
    expect(take(7)).toBe('M.L7x')
    expect(take(7)).toBe('M.L7xx')
    expect(take(8)).toBe('M.L8')
  })
})

type Price = { raw: string; status: string; value: unknown; confidence: number }

const field = (raw: string | null) => ({
  raw,
  status: 'empty',
  value: null,
  proposal: null,
  confidence: 1,
  reason: null,
})

/** A minimal normalised record whose price field is the one under test. */
function recordWith(price: Price | undefined): NormalisedGalleryRecord {
  return {
    source: 'test',
    legacyId: 1,
    path: null,
    status: { listed: true, sold: false, deleted: false },
    publisher: null,
    publicationNote: null,
    sizes: null,
    fields: {
      title: field(null),
      originalTitle: field(null),
      date: field(null),
      place: field(null),
      dimensions: field(null),
      condition: field(null),
      references: field(null),
      stockNumber: field(null),
      colour: field(null),
      maker: field(null),
      categories: field(null),
      ...(price ? { price: { ...field(price.raw), ...price, proposal: null, reason: null } } : {}),
    },
  } as unknown as NormalisedGalleryRecord
}

const fixed = (amount: number, currency = 'USD'): Price => ({
  raw: `${currency} ${amount}`,
  status: 'parsed',
  value: { mode: 'fixed', base: { amount, currency } },
  confidence: 1,
})

describe('the old price in the full layer', () => {
  const priceCells = (price: Price | undefined, withPrice = true) => {
    const { cells } = antiqueRow(recordWith(price), [], withPrice)
    return [cells.asking_price, cells.asking_currency]
  }

  it('maps a parsed USD 1,850 to 1850 dollars and USD', () => {
    expect(priceCells(fixed(185000))).toEqual(['1850', 'USD'])
  })

  it('leaves a review price (USD 0, no value) blank', () => {
    const review = { raw: 'USD 0', status: 'review', value: null, confidence: 0.5 }
    expect(priceCells(review)).toEqual(['', ''])
  })

  it('leaves an empty price (-) blank', () => {
    const empty = { raw: '-', status: 'empty', value: null, confidence: 1 }
    expect(priceCells(empty)).toEqual(['', ''])
  })

  it('leaves a record with no price field blank', () => {
    expect(priceCells(undefined)).toEqual(['', ''])
  })

  it('leaves an on-request price blank', () => {
    const onRequest = {
      raw: 'On request',
      status: 'parsed',
      value: { mode: 'on-request', base: null },
      confidence: 1,
    }
    expect(priceCells(onRequest)).toEqual(['', ''])
  })

  it('never rounds cents that are not whole dollars', () => {
    expect(priceCells(fixed(185050))).toEqual(['', ''])
    expect(askingDollarsOf(recordWith(fixed(99)))).toBeNull()
  })

  it('leaves a non-USD price blank', () => {
    expect(priceCells(fixed(185000, 'EUR'))).toEqual(['', ''])
  })

  it('leaves a zero amount blank', () => {
    expect(priceCells(fixed(0))).toEqual(['', ''])
  })

  it('carries the price of a sold record too', () => {
    const sold = recordWith(fixed(12000))
    const row = antiqueRows(
      [{ ...sold, status: { ...sold.status, sold: true } }],
      new Map(),
      String,
    )[0]!
    expect(row.cells.asking_price).toBe('')
    const priced = antiqueRows(
      [{ ...sold, status: { ...sold.status, sold: true } }],
      new Map(),
      String,
      true,
    )[0]!
    expect([priced.cells.status, priced.cells.asking_price, priced.cells.asking_currency]).toEqual([
      'sold',
      '120',
      'USD',
    ])
  })

  it('carries no price unless the layer asks for it (the sample)', () => {
    expect(priceCells(fixed(185000), false)).toEqual(['', ''])
  })
})
