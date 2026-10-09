import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('./chat/env', () => ({
  CHAT_LIMITS: { sessionsPerIpPerHour: 6, messagesPerIpPerHour: 60, messageIntervalMs: 2_000 },
}))

import { LIMITS, RateLimiter } from '../security/rate-limit'
import { SlidingWindow } from './chat/limits'
import { MAX_LIMITER_ENTRIES, setNewest, SweepClock } from './bounded-map'
import { PostLimiter } from './leads/rate'

const sizeOf = (limiter: object, field: string): number =>
  (limiter as unknown as Record<string, Map<string, unknown>>)[field]!.size

describe('bounded in-process limiters', () => {
  it('setNewest evicts the oldest and treats a re-set as newest', () => {
    const map = new Map<string, number>()
    setNewest(map, 'a', 1, 2)
    setNewest(map, 'b', 2, 2)
    setNewest(map, 'a', 3, 2) // a is now the newest
    setNewest(map, 'c', 4, 2)
    expect([...map.keys()]).toEqual(['a', 'c'])
  })

  it('SweepClock fires once per period, starting its clock on the first call', () => {
    const clock = new SweepClock(1_000)
    expect(clock.due(5_000)).toBe(false)
    expect(clock.due(5_999)).toBe(false)
    expect(clock.due(6_000)).toBe(true)
    expect(clock.due(6_500)).toBe(false)
  })

  it('the lead limiter sweeps on time well below the size trigger', () => {
    const limiter = new PostLimiter()
    for (let i = 0; i < 100; i += 1) limiter.allow(`ip-${i}`, 1_000)
    expect(sizeOf(limiter, 'windows')).toBe(100)
    limiter.allow('later', 1_000 + 3_600_000)
    expect(sizeOf(limiter, 'windows')).toBe(1)
  })

  it('the security limiter sweeps on time and caps live keys', () => {
    const limiter = new RateLimiter(LIMITS.geocode)
    for (let i = 0; i < 100; i += 1) limiter.hit(`ip-${i}`, 1_000)
    limiter.hit('later', 1_000 + 60_000)
    expect(sizeOf(limiter, 'windows')).toBe(1)
    for (let i = 0; i < MAX_LIMITER_ENTRIES + 10; i += 1) limiter.hit(`k-${i}`, 70_000)
    expect(sizeOf(limiter, 'windows')).toBe(MAX_LIMITER_ENTRIES)
  })

  it('the chat sliding window sweeps on time and caps live keys', () => {
    const window = new SlidingWindow(5, 60_000)
    for (let i = 0; i < 100; i += 1) window.take(`ip-${i}`, 1_000)
    window.take('later', 1_000 + 60_000)
    expect(sizeOf(window, 'hits')).toBe(1)
    for (let i = 0; i < MAX_LIMITER_ENTRIES + 10; i += 1) window.take(`k-${i}`, 70_000)
    expect(sizeOf(window, 'hits')).toBe(MAX_LIMITER_ENTRIES)
  })
})
