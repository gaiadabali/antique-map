/**
 * The committed sample's rows (DATA.md §2–§4): the gallery never carries a price — no
 * `asking_price` value anywhere in what the seed generates, headers included-but-empty — every
 * row keys on a stock number that satisfies the pattern, and every row is the old record's
 * address (`legacy_id` is the old product id).
 */
import { describe, expect, it } from 'vitest'

import { ANTIQUE_COLUMNS } from '../../import/kinds'
import { sampleRows } from '../run'
import { fallbackStockNumber, stockNumberMatches } from './rows'

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