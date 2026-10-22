/**
 * The maker pages' words (5.4.a): every key this module defines is in both lexicons (Indonesian
 * has no `one` plural form), the shared role labels a maker page borrows exist, and the plural
 * base reads through `makerText()` — an `en`-only key would show an Indonesian visitor English.
 */
import { describe, expect, it } from 'vitest'

import en from '../lexicon/en.json'
import id from '../lexicon/id.json'

import { MAKER_KEYS, makerText } from './copy'

const ROLES = [
  'cartographer',
  'engraver',
  'publisher',
  'author',
  'artist',
  'photographer',
  'studio',
  'printer',
] as const

describe('maker page copy', () => {
  it('every key this module defines is in both locales', () => {
    for (const key of Object.keys(MAKER_KEYS)) {
      expect(en, `en missing ${key}`).toHaveProperty([key])
      if (!key.endsWith('.one')) expect(id, `id missing ${key}`).toHaveProperty([key])
    }
  })

  it('every maker role has a label in both locales', () => {
    for (const role of ROLES) {
      expect(en).toHaveProperty([`maker.role.${role}`])
      expect(id).toHaveProperty([`maker.role.${role}`])
    }
  })

  it('counts works with the plural base', () => {
    expect(makerText('en')('makerPage.workCount', { count: 1 })).toBe('1 work')
    expect(makerText('en')('makerPage.workCount', { count: 3 })).toBe('3 works')
    expect(makerText('id')('makerPage.workCount', { count: 3 })).toBe('3 karya')
  })
})
