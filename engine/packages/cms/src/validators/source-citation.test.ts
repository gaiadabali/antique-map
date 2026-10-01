import { describe, expect, it } from 'vitest'

import { shortCiteError, sourceYearError } from './source-citation'

describe('a bibliography entry', () => {
  it('takes a short cite on one line', () => {
    expect(shortCiteError('Tooley (Australia)')).toBeNull()
    expect(shortCiteError('')).toMatch(/Give the short cite/)
    expect(shortCiteError('Tooley\nThe Mapping of Australia')).toMatch(/one line/)
    expect(shortCiteError('x'.repeat(81))).toMatch(/80 characters/)
  })

  it('takes the year it was published, or none', () => {
    expect(sourceYearError(1979, 2026)).toBeNull()
    expect(sourceYearError(null, 2026)).toBeNull()
    expect(sourceYearError(2027, 2026)).toMatch(/between 1450 and 2026/)
    expect(sourceYearError(1300, 2026)).toMatch(/between/)
    expect(sourceYearError(1979.5, 2026)).toMatch(/whole number/)
    expect(sourceYearError(Number.NaN, 2026)).toMatch(/whole number/)
  })
})
