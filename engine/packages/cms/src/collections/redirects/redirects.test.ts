import { describe, expect, it } from 'vitest'

import { REDIRECT_CODE_LABELS, REDIRECT_SOURCE_LABELS } from '.'

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
