/**
 * `trackingGuessAllowed` (TASKS.md 7.3.c: "the tenth wrong guess in a minute is throttled") at the
 * function level; `./proxy.test.ts` proves it is wired into the tracking surface's 429.
 */
import { afterEach, describe, expect, it } from 'vitest'

import {
  resetTrackingGuessLimit,
  trackingGuessAllowed,
  TRACKING_GUESSES_PER_MINUTE,
} from './tracking-rate-limit'

describe('trackingGuessAllowed', () => {
  afterEach(() => resetTrackingGuessLimit())

  it('allows the budget, then throttles the next one in the same minute', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) {
      expect(trackingGuessAllowed('1.2.3.4', now)).toBe(0)
    }
    const wait = trackingGuessAllowed('1.2.3.4', now)
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(60)
  })

  it('one address never spends another’s budget', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) trackingGuessAllowed('1.1.1.1', now)
    expect(trackingGuessAllowed('1.1.1.1', now)).toBeGreaterThan(0)
    expect(trackingGuessAllowed('2.2.2.2', now)).toBe(0)
  })

  it('the window slides: a minute later, the budget is back', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) trackingGuessAllowed('3.3.3.3', now)
    expect(trackingGuessAllowed('3.3.3.3', now)).toBeGreaterThan(0)
    expect(trackingGuessAllowed('3.3.3.3', now + 60_001)).toBe(0)
  })
})
