// The shop app's proxy as Next runs it (TASKS.md 23.2.c): its own hosts only — the canonical host
// served, an alias 301 to it, any other host a plain 404 — `/admin` on its admin host alone, each
// page rewritten into `app/[locale]/…`, and the security headers and CSP on every answer.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LIMITS, limiters } from '@engine/http/limits'
import { PROXY_MATCHER } from '@engine/http/manifest'

import { config, proxy } from './proxy'

const ORIGIN = 'http://localhost:4881'

function ask(host: string, path: string, init: RequestInit = {}): Response {
  return proxy(new Request(`${ORIGIN}${path}`, { ...init, headers: { host, ...init.headers } }))
}

const rewrite = (response: Response) => response.headers.get('x-middleware-rewrite')
const forwarded = (response: Response, name: string) =>
  response.headers.get(`x-middleware-request-${name}`)

beforeEach(() => {
  vi.stubEnv('SITE_HOSTS', 'shop.localhost,www.shop.localhost')
  vi.stubEnv('ADMIN_HOST', '')
  vi.stubEnv('GALLERY_HOSTS', '')
  vi.stubEnv('SHOP_HOSTS', '')
  vi.stubEnv('PORT', '4881')
})
afterEach(() => vi.unstubAllEnvs())

describe('the shop app’s proxy — its hosts', () => {
  it('serves the canonical host, rewriting the page into the locale tree with no /shop prefix', () => {
    const home = ask('shop.localhost:4881', '/')
    expect(home.status).toBe(200)
    expect(rewrite(home)).toBe(`${ORIGIN}/en`)
    expect(forwarded(home, 'x-locale')).toBe('en')
    expect(forwarded(home, 'x-site')).toBe('shop')
    const product = ask('shop.localhost', '/id/produk/peta-bali')
    expect(rewrite(product)).toBe(`${ORIGIN}/id/product/peta-bali`)
    expect(forwarded(product, 'x-locale')).toBe('id')
  })

  it('answers an alias with a permanent redirect to the canonical host, built from the list', () => {
    const response = ask('www.shop.localhost', '/bag?x=1')
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('http://shop.localhost:4881/bag?x=1')
    expect(ask('www.shop.localhost', '/bag', { method: 'POST' }).status).toBe(308)
  })

  it('answers any other host a plain 404 — the gallery’s, a spoofed one, none', () => {
    for (const host of ['gallery.localhost', 'evil.example', 'localhost', '']) {
      const response = ask(host, '/')
      expect(response.status).toBe(404)
      expect(rewrite(response)).toBeNull()
      expect(response.headers.get('location')).toBeNull()
    }
    // X-Forwarded-Host is never read.
    const spoofed = ask('evil.example', '/', { headers: { 'x-forwarded-host': 'shop.localhost' } })
    expect(spoofed.status).toBe(404)
  })

  it('fails closed on an unusable host list', () => {
    vi.stubEnv('SITE_HOSTS', 'https://shop.localhost')
    expect(ask('shop.localhost', '/').status).toBe(404)
  })

  it('rewrites a path that names no page to the tree’s not-found, with 404', () => {
    // (`/{slug}` alone is a CMS page's address, which the page itself judges.)
    const response = ask('shop.localhost', '/id/nothing/here')
    expect(response.status).toBe(404)
    expect(rewrite(response)).toBe(`${ORIGIN}/id/not-found`)
    // The tree's internal address is no public URL.
    expect(rewrite(ask('shop.localhost', '/en/bag'))).toBe(`${ORIGIN}/en/not-found`)
  })
})

describe('the shop app’s proxy — the admin', () => {
  it('passes /admin and Payload’s REST on the admin host (the canonical host by default)', () => {
    const admin = ask('shop.localhost', '/admin/login')
    expect(admin.headers.get('x-middleware-next')).toBe('1')
    expect(forwarded(admin, 'accept-language')).toBe('en')
    expect(ask('shop.localhost', '/api/users/me').headers.get('x-middleware-next')).toBe('1')
  })

  it('keeps /admin and the REST off every other host', () => {
    vi.stubEnv('ADMIN_HOST', 'admin.shop.localhost')
    const page = ask('shop.localhost', '/admin')
    expect(page.status).toBe(404)
    expect(rewrite(page)).toBe(`${ORIGIN}/en/not-found`)
    expect(ask('shop.localhost', '/api/users/me').status).toBe(404)
    expect(ask('gallery.localhost', '/admin').status).toBe(404)
    // The admin's own host: the admin, its REST, the site's files — and no page.
    expect(ask('admin.shop.localhost', '/admin').headers.get('x-middleware-next')).toBe('1')
    expect(ask('admin.shop.localhost', '/api/users/me').headers.get('x-middleware-next')).toBe('1')
    expect(ask('admin.shop.localhost', '/shop/logo.svg').headers.get('x-middleware-next')).toBe('1')
    expect(ask('admin.shop.localhost', '/').status).toBe(404)
    expect(ask('admin.shop.localhost', '/bag').status).toBe(404)
  })

  it('serves the shop’s own files the admin’s sign-in shows, and the root icons', () => {
    for (const file of ['/shop/logo.svg', '/shop/favicon.ico', '/shop/apple-touch-icon.png']) {
      expect(ask('shop.localhost', file).headers.get('x-middleware-next')).toBe('1')
    }
    expect(rewrite(ask('shop.localhost', '/favicon.ico'))).toBe(`${ORIGIN}/shop/favicon.ico`)
  })
})

describe('the shop app’s proxy — headers', () => {
  it('sets the CSP with a fresh nonce on the answer and the request, and the static headers', () => {
    const one = ask('shop.localhost', '/')
    const two = ask('shop.localhost', '/')
    const csp = one.headers.get('content-security-policy') ?? ''
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
    expect(csp).toContain('frame-ancestors http://shop.localhost:4881')
    expect(forwarded(one, 'content-security-policy')).toBe(csp)
    expect(two.headers.get('content-security-policy')).not.toBe(csp)
    expect(one.headers.get('x-content-type-options')).toBe('nosniff')
    expect(one.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(one.headers.get('cross-origin-opener-policy')).toBe('same-origin')
    expect(one.headers.get('permissions-policy')).toContain('camera=()')
    expect(one.headers.get('strict-transport-security')).toBeNull()
  })

  it('gives the admin its own policy: no third party, its preview frame, blob workers', () => {
    const csp = ask('shop.localhost', '/admin').headers.get('content-security-policy') ?? ''
    expect(csp).toContain("connect-src 'self';")
    expect(csp).toContain('frame-src http://shop.localhost:4881')
    expect(csp).toContain("worker-src 'self' blob:")
    expect(csp).toContain("img-src 'self'")
  })

  it('keeps a tracking token out of the Referer, over the default policy', () => {
    const response = ask('shop.localhost', '/track/abc123')
    expect(response.headers.get('referrer-policy')).toBe('no-referrer')
    expect(response.headers.get('x-robots-tag')).toBe('noindex')
  })

  it('answers its own 404s and redirects with the static headers too', () => {
    expect(ask('evil.example', '/').headers.get('x-content-type-options')).toBe('nosniff')
    expect(ask('www.shop.localhost', '/').headers.get('cross-origin-opener-policy')).toBe(
      'same-origin',
    )
  })

  it('declares the manifest’s matcher, literally', () => {
    expect(config.matcher).toEqual([...PROXY_MATCHER])
  })
})

describe('the shop app’s proxy — sign-in limits and the store user’s landing (23.4)', () => {
  afterEach(() => limiters.signIn.reset())

  const token = (claims: Record<string, unknown>) =>
    `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.signature`

  it('answers the sign-in past its limit 429 with Retry-After, counted per address', () => {
    const signIn = (address: string) =>
      ask('shop.localhost', '/api/users/login', {
        method: 'POST',
        headers: { 'x-forwarded-for': `203.0.113.9, ${address}` },
      })
    for (let i = 0; i < LIMITS.signIn.max; i++) expect(signIn('198.51.100.7').status).not.toBe(429)
    const refused = signIn('198.51.100.7')
    expect(refused.status).toBe(429)
    expect(Number(refused.headers.get('retry-after'))).toBeGreaterThan(0)
    // Another address has its own window.
    expect(signIn('198.51.100.8').status).not.toBe(429)
  })

  it('sends a store user opening /admin to the Order panel; the owner stays', () => {
    const open = (role: string) =>
      ask('shop.localhost', '/admin', { headers: { cookie: `payload-token=${token({ role })}` } })
    const store = open('store')
    expect(store.status).toBe(307)
    expect(store.headers.get('location')).toBe(`${ORIGIN}/admin/orders`)
    expect(open('owner').headers.get('x-middleware-next')).toBe('1')
  })
})
