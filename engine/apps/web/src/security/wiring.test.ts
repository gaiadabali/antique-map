/**
 * The security modules are wired, not just written (finding F-01, F-02): the real `proxy` sets a
 * nonce-bearing CSP on the page it passes on and counts a sign-in against the address, and the
 * app's `next.config` sends the static headers with HSTS off.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import nextConfig from '../../next.config'
import { proxy } from '../proxy'
import { limiters } from './rate-limit'

beforeEach(() => {
  vi.stubEnv('GALLERY_HOSTS', 'gallery.localhost')
  vi.stubEnv('SHOP_HOSTS', 'shop.localhost')
  vi.stubEnv('MEDIA_PUBLIC_URL', 'https://media.example/_media')
  limiters.signIn.reset()
})
afterEach(() => vi.unstubAllEnvs())

const request = (url: string, init: RequestInit = {}) =>
  new Request(url, {
    ...init,
    headers: { host: new URL(url).host, ...(init.headers as Record<string, string> | undefined) },
  })

describe('the proxy', () => {
  it('sets a fresh CSP on a page, with the media origin the env names', () => {
    const first = proxy(request('http://gallery.localhost/'))
    const second = proxy(request('http://gallery.localhost/'))
    const policy = first.headers.get('content-security-policy')!
    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
    expect(policy).toContain('img-src')
    expect(policy).toContain('https://media.example')
    expect(second.headers.get('content-security-policy')).not.toBe(policy)
  })

  it('gives the admin its own policy and the checkout its Maps allowance', () => {
    const admin = proxy(request('http://shop.localhost/admin/login'))
    expect(admin.headers.get('content-security-policy')).toContain("worker-src 'self' blob:")
    const checkout = proxy(request('http://shop.localhost/checkout'))
    expect(checkout.headers.get('content-security-policy')).toContain('googleapis.com')
  })

  it('answers the eleventh sign-in from one address 429, whatever it forges before it', () => {
    const login = (i: number) =>
      proxy(
        request('http://shop.localhost/api/users/login', {
          method: 'POST',
          headers: { 'x-forwarded-for': `10.0.${i}.1, 203.0.113.9` },
        }),
      ).status
    const statuses = Array.from({ length: 11 }, (_, i) => login(i))
    expect(statuses.slice(0, 10)).not.toContain(429)
    expect(statuses[10]).toBe(429)
  })
})

describe('next.config headers()', () => {
  it('sends the static security headers on every path, and no HSTS', async () => {
    const rules = await nextConfig.headers!()
    const all = rules.find((rule) => rule.source === '/:path*')!
    const names = all.headers.map((header) => header.key)
    expect(names).toEqual(
      expect.arrayContaining([
        'X-Content-Type-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Cross-Origin-Opener-Policy',
      ]),
    )
    expect(names).not.toContain('Strict-Transport-Security')
    // Payload's colour-theme client hints stay on the admin only.
    expect(all.headers.map((header) => header.key)).not.toContain('Critical-CH')
  })
})
