/**
 * The tracking page's rate limit (SECURITY.md §2.10: "tracking page — 30 per minute"; TASKS.md
 * 7.3.c "the tenth wrong guess … is throttled" is the ticket's shorthand for this same budget).
 * Proven at the function level because the page's own fallback (`./rate-limit`'s header) makes a
 * throttled guess answer the same 404 a wrong token does — an e2e spec cannot tell the two apart
 * by the response alone.
 */
import { afterEach, describe, expect, it } from 'vitest'

import {
  resetTrackingRateLimit,
  trackGuessAllowed,
  TRACKING_GUESSES_PER_MINUTE,
} from './rate-limit'

describe('trackGuessAllowed', () => {
  afterEach(() => resetTrackingRateLimit())

  it('allows the budget, then throttles the next one in the same minute', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) {
      expect(trackGuessAllowed('1.2.3.4', now)).toBe(0)
    }
    const wait = trackGuessAllowed('1.2.3.4', now)
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(60)
  })

  it('one address never spends another’s budget', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) trackGuessAllowed('1.1.1.1', now)
    expect(trackGuessAllowed('1.1.1.1', now)).toBeGreaterThan(0)
    expect(trackGuessAllowed('2.2.2.2', now)).toBe(0)
  })

  it('a minute later, the budget is back', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) trackGuessAllowed('3.3.3.3', now)
    expect(trackGuessAllowed('3.3.3.3', now)).toBeGreaterThan(0)
    expect(trackGuessAllowed('3.3.3.3', now + 60_001)).toBe(0)
  })
})
