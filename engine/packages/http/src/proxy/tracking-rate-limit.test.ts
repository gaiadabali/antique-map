/**
 * `trackingGuessAllowed` (TASKS.md 7.3.c: "the tenth wrong guess in a minute is throttled") at the
 * function level, counted by distinct tokens; `./proxy.test.ts` proves it is wired into the
 * tracking and order surfaces' 429.
 */
import { afterEach, describe, expect, it } from 'vitest'

import {
  resetTrackingGuessLimit,
  trackingGuessAllowed,
  TRACKING_GUESSES_PER_MINUTE,
} from './tracking-rate-limit'

describe('trackingGuessAllowed', () => {
  afterEach(() => resetTrackingGuessLimit())

  it('allows the budget of distinct tokens, then throttles the next new one in the same minute', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) {
      expect(trackingGuessAllowed('1.2.3.4', `guess-${i}`, now)).toBe(0)
    }
    const wait = trackingGuessAllowed('1.2.3.4', 'guess-new', now)
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(60)
  })

  it('a buyer reloading their own token is never throttled (the pending page polls every 5 s)', () => {
    const now = Date.now()
    for (let i = 0; i < 30; i++) {
      expect(
        trackingGuessAllowed('4.4.4.4', 'my-own-token', now + i * 5_000),
        `reload ${i + 1}`,
      ).toBe(0)
    }
  })

  it('once throttled, a token already presented still passes, a new one does not', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++)
      trackingGuessAllowed('5.5.5.5', `t${i}`, now)
    expect(trackingGuessAllowed('5.5.5.5', 't0', now)).toBe(0)
    expect(trackingGuessAllowed('5.5.5.5', 'brand-new', now)).toBeGreaterThan(0)
  })

  it('one address never spends another’s budget', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++)
      trackingGuessAllowed('1.1.1.1', `g${i}`, now)
    expect(trackingGuessAllowed('1.1.1.1', 'g-new', now)).toBeGreaterThan(0)
    expect(trackingGuessAllowed('2.2.2.2', 'g-new', now)).toBe(0)
  })

  it('the window slides: a minute after the oldest token, a new one is allowed again', () => {
    const now = Date.now()
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++)
      trackingGuessAllowed('3.3.3.3', `w${i}`, now)
    expect(trackingGuessAllowed('3.3.3.3', 'w-new', now)).toBeGreaterThan(0)
    expect(trackingGuessAllowed('3.3.3.3', 'w-new', now + 60_001)).toBe(0)
  })
})
