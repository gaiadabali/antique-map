import { describe, expect, it } from 'vitest'

import { HSTS_MAX_AGE_SECONDS, securityHeaders } from './headers'
import { clientAddress, LIMITS, limited, limitFor, limiters, RateLimiter } from './rate-limit'

const value = (name: string, options?: Parameters<typeof securityHeaders>[0]) =>
  securityHeaders(options).find((header) => header.key === name)?.value

describe('the static security headers (B3)', () => {
  it('sends nosniff, the default referrer policy, a locked Permissions-Policy and COOP', () => {
    expect(value('X-Content-Type-Options')).toBe('nosniff')
    expect(value('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(value('Cross-Origin-Opener-Policy')).toBe('same-origin')
    const permissions = value('Permissions-Policy')!
    expect(permissions).toContain('geolocation=(self)')
    expect(permissions).toContain('camera=()')
    expect(permissions).toContain('microphone=()')
  })

  it('sends HSTS only when asked, for a year, never with preload or includeSubDomains by default', () => {
    expect(value('Strict-Transport-Security')).toBeUndefined()
    expect(value('Strict-Transport-Security', { hsts: false })).toBeUndefined()
    expect(value('Strict-Transport-Security', { hsts: true })).toBe(`max-age=${HSTS_MAX_AGE_SECONDS}`)
  })
})

describe('the rate limits of §2.10 that nothing enforced', () => {
  it('states the table: sign-in 10 per 15 minutes, password reset 3 per hour, checkout 10 per hour', () => {
    expect(LIMITS.signIn).toMatchObject({ max: 10, windowMs: 15 * 60_000 })
    expect(LIMITS.passwordReset).toMatchObject({ max: 3, windowMs: 60 * 60_000 })
    expect(LIMITS.checkout).toMatchObject({ max: 10, windowMs: 60 * 60_000 })
  })

  it('lets the limit through and answers the next with the seconds left', () => {
    const limiter = new RateLimiter({ name: 'x', max: 3, windowMs: 60_000 })
    const t0 = 1_000_000
    expect([0, 1, 2].map((i) => limiter.hit('a', t0 + i))).toEqual([0, 0, 0])
    expect(limiter.hit('a', t0 + 10_000)).toBe(50)
    expect(limiter.hit('b', t0 + 10_000)).toBe(0)
  })

  it('opens a new window when the old one ends, and sweeps what is stale', () => {
    const limiter = new RateLimiter({ name: 'x', max: 1, windowMs: 1000 })
    expect(limiter.hit('a', 0)).toBe(0)
    expect(limiter.hit('a', 500)).toBeGreaterThan(0)
    expect(limiter.hit('a', 1000)).toBe(0)
    limiter.sweep(5000)
    expect(limiter.hit('a', 5000)).toBe(0)
  })

  it('maps the sign-in and password routes, by POST only, to their limiters', () => {
    expect(limitFor('POST', '/api/users/login')).toBe(limiters.signIn)
    expect(limitFor('post', '/api/users/forgot-password')).toBe(limiters.passwordReset)
    expect(limitFor('POST', '/api/users/reset-password')).toBe(limiters.passwordReset)
    expect(limitFor('GET', '/api/users/login')).toBeNull()
    expect(limitFor('POST', '/api/works')).toBeNull()
  })

  it('the next sign-in after ten gets 429 with Retry-After', () => {
    const limiter = limiters.signIn
    limiter.reset()
    const attempts = Array.from({ length: 11 }, () => limiter.hit('203.0.113.9', 0))
    expect(attempts.slice(0, 10)).toEqual(Array(10).fill(0))
    const wait = attempts[10]!
    expect(wait).toBeGreaterThan(0)
    const response = limited(wait)
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe(String(wait))
    limiter.reset()
  })

  it('keys on the last X-Forwarded-For entry, which nginx appends, and refuses a malformed one', () => {
    expect(clientAddress(new Headers({ 'x-forwarded-for': '1.1.1.1, 198.51.100.4' }))).toBe('198.51.100.4')
    expect(clientAddress(new Headers({ 'x-forwarded-for': 'evil<script>' }))).toBe('unknown')
    expect(clientAddress(new Headers())).toBe('unknown')
  })
})
