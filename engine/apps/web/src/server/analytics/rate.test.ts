import { beforeEach, describe, expect, it } from 'vitest'

import { RateLimiter, SESSION_LIMIT } from './rate'
import { resetDropped } from './dropped'

describe('the rate limits (ANALYTICS.md §6 step 3)', () => {
  let limiter: RateLimiter
  beforeEach(() => {
    limiter = new RateLimiter()
  })

  it('the 121st event a minute from one session is dropped', () => {
    const start = 1_000_000
    for (let i = 0; i < SESSION_LIMIT; i += 1) {
      expect(limiter.allowSession('s1', start), `event ${i + 1}`).toBe(true)
    }
    expect(limiter.allowSession('s1', start + 1_000)).toBe(false)
    // A different session is unaffected.
    expect(limiter.allowSession('s2', start)).toBe(true)
    // The window reopens a minute later.
    expect(limiter.allowSession('s1', start + 61_000)).toBe(true)
  })

  it('an address that bursts past its bucket is dropped until it refills', () => {
    const start = 2_000_000
    for (let i = 0; i < 240; i += 1) {
      limiter.allowAddress('1.2.3.4', start)
    }
    expect(limiter.allowAddress('1.2.3.4', start + 100)).toBe(false)
    expect(limiter.allowAddress('5.6.7.8', start)).toBe(true)
    // Two seconds refills the four tokens a second… two a second, so one request fits again.
    expect(limiter.allowAddress('1.2.3.4', start + 2_000)).toBe(true)
  })

  it('sweep forgets the windows a minute has closed', () => {
    const start = 3_000_000
    limiter.allowSession('s1', start)
    limiter.sweep(start + 61_000)
    limiter.allowSession('s1', start + 61_000) // must not have carried the old count
    expect(limiter.allowSession('s1', start + 61_000)).toBe(true)
    expect(resetDropped).toBeTypeOf('function')
  })
})
