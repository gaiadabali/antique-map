import { describe, expect, it } from 'vitest'

import { REDIRECT_CODE_LABELS, REDIRECT_SOURCE_LABELS, validateTo } from '.'

describe('redirects labels', () => {
  it('every redirect source label has en and id', () => {
    for (const [source, labels] of Object.entries(REDIRECT_SOURCE_LABELS)) {
      expect(labels, source).toHaveProperty('en')
      expect(labels, source).toHaveProperty('id')
    }
  })

  it('every redirect code label has en and id', () => {
    for (const [code, labels] of Object.entries(REDIRECT_CODE_LABELS)) {
      expect(labels, code).toHaveProperty('en')
      expect(labels, code).toHaveProperty('id')
    }
  })
})

describe('redirects: the destination', () => {
  it('is required unless the code is 410, and empty when it is', () => {
    const gone = { siblingData: { code: '410' } }
    const moved = { siblingData: { code: '301' } }
    expect(validateTo('', gone)).toBe(true)
    expect(validateTo(undefined, gone)).toBe(true)
    expect(validateTo('/new', gone)).toEqual(expect.any(String))
    expect(validateTo('/new', moved)).toBe(true)
    expect(validateTo('', moved)).toEqual(expect.any(String))
    expect(validateTo(null, moved)).toEqual(expect.any(String))
  })

  it('offers 410 as a code', () => {
    expect(Object.keys(REDIRECT_CODE_LABELS)).toEqual(['301', '302', '410'])
    expect(REDIRECT_CODE_LABELS[410]).toEqual({ en: 'Gone (410)', id: 'Hilang (410)' })
  })
})
