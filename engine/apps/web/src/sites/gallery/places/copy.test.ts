/**
 * The place pages' words (5.4.a): every key this module defines is in both lexicons (Indonesian
 * has no `one` plural form), the shared empty state a place page borrows exists, and the index's
 * count reads through `placeText()`'s plural base.
 */
import { describe, expect, it } from 'vitest'

import en from '../lexicon/en.json'
import id from '../lexicon/id.json'

import { PLACE_KEYS, placeText } from './copy'

describe('place page copy', () => {
  it('every key this module defines is in both locales', () => {
    for (const key of Object.keys(PLACE_KEYS)) {
      expect(en, `en missing ${key}`).toHaveProperty([key])
      if (!key.endsWith('.one')) expect(id, `id missing ${key}`).toHaveProperty([key])
    }
  })

  it('the borrowed empty state is in both locales', () => {
    expect(en).toHaveProperty(['empty.placeAvailable'])
    expect(id).toHaveProperty(['empty.placeAvailable'])
  })

  it('names the places within a branch with the plural base', () => {
    expect(placeText('en')('placePage.placeCount', { count: 1 })).toBe('1 place within')
    expect(placeText('en')('placePage.placeCount', { count: 4 })).toBe('4 places within')
    expect(placeText('id')('placePage.placeCount', { count: 4 })).toBe('4 tempat di dalamnya')
    expect(placeText('en')('placePage.childrenHeading', { name: 'Java' })).toBe(
      'Places within Java',
    )
  })
})
