import { describe, expect, it } from 'vitest'

import {
  formatCalendarDate,
  formatDate,
  formatDimensionParts,
  formatDimensions,
  inchesOf,
  type FuzzyDate,
} from '../src/index'

const date = (
  precision: FuzzyDate['precision'],
  from: number | null,
  to: number | null = null,
): FuzzyDate => ({
  precision,
  from,
  to,
  display: null,
})

describe('formatDate — precision is part of the fact', () => {
  it('renders c. 1750, never 1750, for a circa date', () => {
    expect(formatDate(date('circa', 1750), 'en')).toBe('c. 1750')
    expect(formatDate(date('circa', 1750), 'id')).toBe('sekitar 1750')
    expect(formatDate(date('circa', 1750), 'nl')).toBe('ca. 1750')
  })

  it('renders exact, before, after, a range and an unknown date', () => {
    expect(formatDate(date('exact', 1706), 'en')).toBe('1706')
    expect(formatDate(date('before', 1800), 'en')).toBe('before 1800')
    expect(formatDate(date('after', 1602), 'nl')).toBe('na 1602')
    expect(formatDate(date('range', 1724, 1726), 'en')).toBe('1724–1726')
    expect(formatDate(date('range', 1724, 1724), 'en')).toBe('1724')
    expect(formatDate(date('range', 1724, null), 'en')).toBe('after 1724')
    expect(formatDate(date('range', null, 1726), 'id')).toBe('sebelum 1726')
    expect(formatDate(date('unknown', null), 'en')).toBe('undated')
    expect(formatDate(date('circa', null), 'id')).toBe('tanpa tahun')
  })

  it('lets the cataloguer’s wording win, and a brand word its own terms', () => {
    expect(formatDate({ ...date('range', 1724, 1726), display: '1724–26' }, 'en')).toBe('1724–26')
    expect(formatDate({ ...date('circa', 1750), display: '  ' }, 'en')).toBe('c. 1750')
    expect(formatDate(date('circa', 1750), 'en', { circa: 'ca. {year}' })).toBe('ca. 1750')
  })

  it('never groups a year’s digits', () => {
    expect(formatDate(date('exact', 12000), 'en')).toBe('12000')
  })
})

describe('formatCalendarDate — a date at the precision it is known to', () => {
  it('formats a day, a month and a year, and never moves a day by time zone', () => {
    expect(formatCalendarDate('2026-09-29', 'en')).toBe('29 September 2026')
    expect(formatCalendarDate('2026-09-29', 'id')).toBe('29 September 2026')
    expect(formatCalendarDate('2026-01-01', 'nl')).toBe('1 januari 2026')
    expect(formatCalendarDate('2026-09', 'en')).toBe('September 2026')
    expect(formatCalendarDate('2026-09-29', 'en', 'year')).toBe('2026')
  })

  it('refuses more precision than the date has, and a non-date', () => {
    expect(() => formatCalendarDate('2026', 'en', 'day')).toThrow(/known only to the year/)
    expect(() => formatCalendarDate('29/09/2026', 'en')).toThrow(/not a calendar date/)
  })
})

describe('formatDimensions — millimetres, with inches to the eighth', () => {
  it('450 mm is 17¾ in', () => {
    expect(inchesOf(450)).toBe('17¾')
  })

  it.each([
    [600, '23⅝'],
    [25.4, '1'],
    [12.7, '½'],
    [1, '⅛'],
    [0, '0'],
    [1000, '39⅜'],
  ])('%d mm is %s in', (mm, inches) => {
    expect(inchesOf(mm)).toBe(inches)
  })

  it('writes height × width, then depth, in the locale’s digits and unit', () => {
    expect(formatDimensions({ heightMm: 450, widthMm: 600 }, 'en')).toBe(
      '450 × 600 mm (17¾ × 23⅝ in)',
    )
    expect(formatDimensions({ heightMm: 452.5, widthMm: 1200 }, 'id')).toBe(
      '452,5 × 1200 mm (17⅞ × 47¼ inci)',
    )
    expect(formatDimensionParts({ heightMm: 450, widthMm: 600, depthMm: 30 }, 'nl')).toEqual({
      metric: '450 × 600 × 30 mm',
      imperial: '17¾ × 23⅝ × 1⅛ inch',
    })
  })

  it('refuses a length that is not one', () => {
    expect(() => inchesOf(-1)).toThrow(RangeError)
    expect(() => inchesOf(Number.NaN)).toThrow(RangeError)
  })
})
