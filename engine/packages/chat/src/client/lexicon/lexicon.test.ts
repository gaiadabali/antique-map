import { describe, expect, it } from 'vitest'

import EN from './en.json'
import ID from './id.json'

describe('the chat panel lexicon', () => {
  it('both lexicons have the same keys', () => {
    expect(Object.keys(ID).sort()).toEqual(Object.keys(EN).sort())
  })

  it('every value is a non-empty string', () => {
    for (const words of [EN, ID]) {
      for (const value of Object.values(words)) {
        expect(typeof value).toBe('string')
        expect((value as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('each site has at least 3 and at most 4 suggested starts', () => {
    for (const site of ['gallery', 'shop']) {
      const count = Object.keys(EN).filter((key) => key.startsWith(`suggest.${site}.`)).length
      expect(count).toBeGreaterThanOrEqual(3)
      expect(count).toBeLessThanOrEqual(4)
    }
  })
})
