// The rate limiter and its Retry-After reader (ticket: "the limiter never exceeds the rate" and
// "Retry-After is honoured"). A fake clock proves the pacing without real waiting.
import { describe, expect, it } from 'vitest'

import { createLimiter, retryAfterMs } from './limiter.mjs'

function fakeClock() {
  let t = 0
  const sleep = (ms) => {
    t += ms
    return Promise.resolve()
  }
  return { now: () => t, sleep }
}

describe('createLimiter', () => {
  it('never starts more than `rate` requests a second, however many hosts', async () => {
    const clock = fakeClock()
    const limiter = createLimiter({ rate: 5, now: clock.now, sleep: clock.sleep })
    const starts = []
    const tasks = []
    for (let i = 0; i < 12; i += 1) {
      const host = `h${i % 3}`
      tasks.push(
        limiter.run(host, (start) => {
          starts.push(start)
          return Promise.resolve(i)
        }),
      )
    }
    await Promise.all(tasks)
    expect(starts).toHaveLength(12)
    // Every grant is at least 200 ms after the one before it: at most 5 in any second.
    starts.sort((a, b) => a - b)
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(200)
    }
  })

  it('runs one request in flight per host', async () => {
    const clock = fakeClock()
    const limiter = createLimiter({ rate: 5, now: clock.now, sleep: clock.sleep })
    let active = 0
    let peak = 0
    await Promise.all(
      Array.from({ length: 4 }, () =>
        limiter.run('one-host', async () => {
          active += 1
          peak = Math.max(peak, active)
          await Promise.resolve()
          active -= 1
        }),
      ),
    )
    expect(peak).toBe(1)
  })
})

describe('retryAfterMs', () => {
  it('reads seconds', () => {
    expect(retryAfterMs('2')).toBe(2000)
  })

  it('reads an HTTP date relative to now', () => {
    const now = () => Date.parse('2026-10-06T00:00:00Z')
    expect(retryAfterMs('Tue, 06 Oct 2026 00:00:05 GMT', now)).toBe(5000)
  })

  it('caps a huge delay and ignores a missing or junk header', () => {
    expect(retryAfterMs('99999')).toBe(30_000)
    expect(retryAfterMs('')).toBeNull()
    expect(retryAfterMs('soon')).toBeNull()
  })
})
