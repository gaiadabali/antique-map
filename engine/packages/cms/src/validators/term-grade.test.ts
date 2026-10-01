import { describe, expect, it } from 'vitest'

import { gradeEquivalentError } from './term-grade'

describe('a grade’s A–D equivalent', () => {
  it('accepts a letter, a signed letter, a span — or nothing yet', () => {
    for (const value of ['A', 'B+', 'C-', 'B/C', 'A-/B+', null, undefined, ' ']) {
      expect(gradeEquivalentError(value)).toBeNull()
    }
  })

  it('refuses anything outside A–D', () => {
    for (const value of ['E', 'a', 'VG+', 'A++', 'B/', '1']) {
      expect(gradeEquivalentError(value)).toMatch(/A–D equivalent/)
    }
  })
})
