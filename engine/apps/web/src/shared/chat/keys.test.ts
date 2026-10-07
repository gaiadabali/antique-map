import { describe, expect, it } from 'vitest'

import { isEscapeKey } from './keys'

describe('isEscapeKey', () => {
  it('matches the Escape key and nothing else', () => {
    expect(isEscapeKey({ key: 'Escape' })).toBe(true)
    expect(isEscapeKey({ key: 'Enter' })).toBe(false)
    expect(isEscapeKey({ key: 'a' })).toBe(false)
  })
})
