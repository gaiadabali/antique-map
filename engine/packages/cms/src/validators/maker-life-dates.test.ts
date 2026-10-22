import { describe, expect, it } from 'vitest'

import {
  earliestYear,
  fuzzyYearErrors,
  latestYear,
  lifeSpanError,
  type FuzzyYear,
} from './maker-life-dates'

const NOW = 2026

describe('a life date with its precision', () => {
  it('accepts every well-formed shape', () => {
    const good: FuzzyYear[] = [
      { precision: 'unknown' },
      {},
      { precision: 'exact', from: 1666 },
      { precision: 'circa', from: 1571 },
      { precision: 'before', from: 1600 },
      { precision: 'after', from: 1700 },
      { precision: 'range', from: 1724, to: 1726 },
      { precision: 'circa', from: 100 },
    ]
    for (const date of good) expect(fuzzyYearErrors(date, NOW)).toEqual({})
  })

  it('never implies certainty: a year with no precision is refused', () => {
    expect(fuzzyYearErrors({ precision: 'unknown', from: 1666 }, NOW).precision).toMatch(
      /say how certain/,
    )
  })

  it('needs the year for exact, circa, before and after', () => {
    for (const precision of ['exact', 'circa', 'before', 'after'] as const) {
      expect(fuzzyYearErrors({ precision }, NOW).from).toMatch(/Give the year/)
    }
  })

  it('needs two years in order for a range, and a second year only for a range', () => {
    expect(fuzzyYearErrors({ precision: 'range', from: 1724 }, NOW).to).toMatch(/ends/)
    expect(fuzzyYearErrors({ precision: 'range', from: 1726, to: 1724 }, NOW).to).toMatch(
      /ends after it starts/,
    )
    expect(fuzzyYearErrors({ precision: 'range', from: 1726, to: 1726 }, NOW).to).toMatch(
      /ends after/,
    )
    expect(fuzzyYearErrors({ precision: 'circa', from: 1700, to: 1710 }, NOW).to).toMatch(
      /Only a range/,
    )
  })

  it('takes whole years in range only', () => {
    expect(fuzzyYearErrors({ precision: 'exact', from: 1666.5 }, NOW).from).toMatch(/whole/)
    expect(fuzzyYearErrors({ precision: 'exact', from: NOW + 1 }, NOW).from).toMatch(/between/)
    expect(fuzzyYearErrors({ precision: 'exact', from: -5000 }, NOW).from).toMatch(/between/)
    expect(fuzzyYearErrors({ precision: 'range', from: 1700, to: 9999 }, NOW).to).toMatch(/between/)
  })

  it('refuses an unknown precision word', () => {
    expect(fuzzyYearErrors({ precision: 'roughly' as never, from: 1 }, NOW).precision).toMatch(
      /Choose/,
    )
  })
})

describe('a life span', () => {
  it('reads the widest the dates allow', () => {
    expect(earliestYear({ precision: 'range', from: 1724, to: 1726 })).toBe(1724)
    expect(latestYear({ precision: 'range', from: 1724, to: 1726 })).toBe(1726)
    expect(latestYear({ precision: 'unknown' })).toBeNull()
    expect(earliestYear(null)).toBeNull()
  })

  it('refuses a death every reading puts before the birth', () => {
    expect(
      lifeSpanError({ precision: 'exact', from: 1700 }, { precision: 'exact', from: 1673 }),
    ).toMatch(/before the year of birth/)
  })

  it('leaves to the cataloguer what fuzzy dates still allow', () => {
    expect(
      lifeSpanError({ precision: 'exact', from: 1666 }, { precision: 'exact', from: 1727 }),
    ).toBeNull()
    expect(
      lifeSpanError(
        { precision: 'circa', from: 1700 },
        { precision: 'range', from: 1690, to: 1705 },
      ),
    ).toBeNull()
    expect(lifeSpanError({ precision: 'unknown' }, { precision: 'exact', from: 1600 })).toBeNull()
    expect(lifeSpanError(undefined, undefined)).toBeNull()
  })
})
