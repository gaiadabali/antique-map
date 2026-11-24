import { describe, expect, it } from 'vitest'

import { chatExpiry } from './chat-expiry'

describe('chatExpiry', () => {
  it('is exactly 30 days later', () => {
    const start = new Date('2026-05-15T08:30:00.000Z')
    const expiry = chatExpiry(start)
    expect(expiry.toISOString()).toBe('2026-06-14T08:30:00.000Z')
  })

  it('preserves UTC time across month boundaries', () => {
    const start = new Date('2026-01-31T23:00:00.000Z')
    const expiry = chatExpiry(start)
    expect(expiry.toISOString()).toBe('2026-03-02T23:00:00.000Z')
  })
})
