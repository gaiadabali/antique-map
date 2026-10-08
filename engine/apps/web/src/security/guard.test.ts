import { beforeEach, describe, expect, it } from 'vitest'

import { checkoutWait, withRateLimits } from './guard'
import { limiters } from './rate-limit'

const passed = new Response(null, { status: 200, headers: { 'x-middleware-next': '1' } })
const guarded = withRateLimits(() => passed)

const post = (path: string, forwarded?: string) =>
  new Request(`https://admin.example.test${path}`, {
    method: 'POST',
    headers: forwarded === undefined ? {} : { 'x-forwarded-for': forwarded },
  })

beforeEach(() => {
  for (const limiter of Object.values(limiters)) limiter.reset()
})

describe('the proxy guard (F-02)', () => {
  it('lets ten sign-ins an address through, answers the eleventh 429 with Retry-After', () => {
    const answers = Array.from({ length: 11 }, () =>
      guarded(post('/api/users/login', '203.0.113.9')),
    )
    expect(answers.slice(0, 10).every((response) => response === passed)).toBe(true)
    const refused = answers[10]!
    expect(refused.status).toBe(429)
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(refused.headers.get('cache-control')).toBe('no-store')
  })

  it('counts forgot and reset password together, three an hour', () => {
    const run = (path: string) => guarded(post(path, '203.0.113.9')).status
    expect([
      run('/api/users/forgot-password'),
      run('/api/users/reset-password'),
      run('/api/users/forgot-password'),
      run('/api/users/reset-password'),
    ]).toEqual([200, 200, 200, 429])
  })

  it('keeps one allowance per address', () => {
    for (let i = 0; i < 10; i += 1) guarded(post('/api/users/login', '203.0.113.9'))
    expect(guarded(post('/api/users/login', '203.0.113.9')).status).toBe(429)
    expect(guarded(post('/api/users/login', '203.0.113.10')).status).toBe(200)
  })

  it('is not escaped by forging the entries before the one nginx appended', () => {
    const statuses = Array.from(
      { length: 12 },
      (_, i) =>
        guarded(post('/api/users/login', `10.0.${i}.1, 198.51.100.${i}, 203.0.113.9`)).status,
    )
    expect(statuses).toEqual([...Array(10).fill(200), 429, 429])
  })

  it('leaves other paths and methods alone, however many', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(guarded(post('/api/works', '203.0.113.9'))).toBe(passed)
      const get = new Request('https://admin.example.test/api/users/login', {
        headers: { 'x-forwarded-for': '203.0.113.9' },
      })
      expect(guarded(get)).toBe(passed)
    }
  })

  it('does not count a request with no usable address (off nginx), so local sign-ins never lock out', () => {
    for (let i = 0; i < 30; i += 1) {
      expect(guarded(post('/api/users/login'))).toBe(passed)
      expect(guarded(post('/api/users/login', 'not an address'))).toBe(passed)
    }
  })
})

describe('the checkout action gate (F-02)', () => {
  const headers = (forwarded: string) => new Headers({ 'x-forwarded-for': forwarded })

  it('lets ten submits an hour through and refuses the eleventh with a wait', () => {
    const waits = Array.from({ length: 11 }, () => checkoutWait(headers('203.0.113.9')))
    expect(waits.slice(0, 10)).toEqual(Array(10).fill(0))
    expect(waits[10]).toBeGreaterThan(0)
    expect(checkoutWait(headers('203.0.113.10'))).toBe(0)
  })

  it('is not escaped by a forged prefix, and does not count an unknown address', () => {
    const waits = Array.from({ length: 11 }, (_, i) =>
      checkoutWait(headers(`10.0.${i}.1, 203.0.113.9`)),
    )
    expect(waits[10]).toBeGreaterThan(0)
    for (let i = 0; i < 30; i += 1) expect(checkoutWait(new Headers())).toBe(0)
  })
})
