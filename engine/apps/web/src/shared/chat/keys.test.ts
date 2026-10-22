import { describe, expect, it } from 'vitest'

import { isEscapeKey, isSendKey } from './keys'

describe('isEscapeKey', () => {
  it('matches the Escape key and nothing else', () => {
    expect(isEscapeKey({ key: 'Escape' })).toBe(true)
    expect(isEscapeKey({ key: 'Enter' })).toBe(false)
    expect(isEscapeKey({ key: 'a' })).toBe(false)
  })
})

describe('isSendKey', () => {
  it('sends on Enter', () => {
    expect(isSendKey({ key: 'Enter', shiftKey: false })).toBe(true)
  })

  it('leaves Shift+Enter for a new line and ignores other keys', () => {
    expect(isSendKey({ key: 'Enter', shiftKey: true })).toBe(false)
    expect(isSendKey({ key: 'a', shiftKey: false })).toBe(false)
  })

  it('does not send while an input method is composing', () => {
    expect(isSendKey({ key: 'Enter', shiftKey: false, isComposing: true })).toBe(false)
  })
})
