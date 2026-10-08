import { decideProxy } from '@engine/http/proxy'
import { describe, expect, it } from 'vitest'

import { buildCsp, contentSecurityPolicy, mediaOriginOf, newNonce, surfaceOf } from './csp'

const ENV = {
  GALLERY_HOSTS: 'indies-gallery.gaiada.com',
  SHOP_HOSTS: 'old-east-indies.gaiada.com',
  ADMIN_HOST: 'old-east-indies.gaiada.com',
}

/** The sources of one directive in a policy. */
function directive(policy: string, name: string): string[] {
  const found = policy
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name} `))
  return found === undefined ? [] : found.split(/\s+/).slice(1)
}

describe('newNonce', () => {
  it('is 128 random bits in base64, different every time', () => {
    const nonces = new Set(Array.from({ length: 500 }, newNonce))
    expect(nonces.size).toBe(500)
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/)
      expect(Buffer.from(nonce, 'base64')).toHaveLength(16)
    }
  })
})

describe('the storefront policy (B2)', () => {
  const policy = buildCsp('storefront', 'N0NCE')

  it('lets a script run only by nonce, and what a nonced script loads', () => {
    expect(directive(policy, 'script-src')).toEqual([`'self'`, `'nonce-N0NCE'`, `'strict-dynamic'`])
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(policy).not.toMatch(/script-src[^;]*'unsafe-eval'/)
  })

  it('closes plugins, base-URL rewriting and framing', () => {
    expect(directive(policy, 'object-src')).toEqual([`'none'`])
    expect(directive(policy, 'base-uri')).toEqual([`'none'`])
    expect(directive(policy, 'frame-ancestors')).toEqual([`'none'`])
    expect(directive(policy, 'form-action')).toEqual([`'self'`])
    expect(directive(policy, 'default-src')).toEqual([`'self'`])
  })

  it('allows Midtrans Snap and Turnstile in frames and connections, and nobody else', () => {
    const allowed = [
      'https://app.midtrans.com',
      'https://app.sandbox.midtrans.com',
      'https://challenges.cloudflare.com',
    ]
    expect(directive(policy, 'frame-src')).toEqual(allowed)
    expect(directive(policy, 'connect-src')).toEqual([`'self'`, ...allowed])
  })

  it('names nothing from Google, and no Google Fonts', () => {
    expect(policy).not.toMatch(/google|gstatic/i)
  })

  it('upgrades insecure requests in production only', () => {
    expect(policy).toContain('upgrade-insecure-requests')
    expect(buildCsp('storefront', 'N', { development: true })).not.toContain(
      'upgrade-insecure-requests',
    )
    expect(directive(buildCsp('storefront', 'N', { development: true }), 'script-src')).toContain(
      `'unsafe-eval'`,
    )
  })

  it('serves images from the public media origin when one is set', () => {
    expect(
      directive(buildCsp('storefront', 'N', { mediaOrigin: 'https://media.example' }), 'img-src'),
    ).toContain('https://media.example')
    expect(mediaOriginOf({ MEDIA_PUBLIC_URL: 'https://media.example/bucket/x' })).toBe(
      'https://media.example',
    )
    expect(mediaOriginOf({ MEDIA_PUBLIC_URL: 'not a url' })).toBeNull()
    expect(mediaOriginOf({})).toBeNull()
  })
})

describe('the checkout page’s Google Maps allowance (B6)', () => {
  const policy = buildCsp('checkout', 'N0NCE')
  const storefront = buildCsp('storefront', 'N0NCE')

  it('adds exactly what Google documents for the Maps JavaScript API', () => {
    expect(directive(policy, 'script-src')).toEqual([
      `'self'`,
      `'nonce-N0NCE'`,
      `'strict-dynamic'`,
      `'unsafe-eval'`,
      'blob:',
    ])
    expect(directive(policy, 'worker-src')).toContain('blob:')
    for (const host of [
      'https://*.googleapis.com',
      'https://*.gstatic.com',
      'https://*.google.com',
      'https://*.googleusercontent.com',
    ]) {
      expect(directive(policy, 'img-src'), host).toContain(host)
      expect(directive(policy, 'connect-src'), host).toContain(host)
    }
    expect(directive(policy, 'frame-src')).toContain('https://*.google.com')
  })

  it('still names no Google Fonts host, and keeps every other directive', () => {
    expect(policy).not.toContain('fonts.googleapis.com')
    expect(policy).not.toContain('fonts.gstatic.com')
    expect(directive(policy, 'font-src')).toEqual([`'self'`, 'data:'])
    for (const name of [
      'object-src',
      'base-uri',
      'frame-ancestors',
      'form-action',
      'default-src',
    ]) {
      expect(directive(policy, name)).toEqual(directive(storefront, name))
    }
  })

  it('applies to the checkout in both languages and to no other page', () => {
    const at = (pathname: string, site: 'shop' | 'gallery' = 'shop') =>
      surfaceOf({ site, pathname })
    expect(at('/checkout')).toBe('checkout')
    expect(at('/id/checkout')).toBe('checkout')
    for (const other of [
      '/',
      '/bag',
      '/order/AAAAAAAAAAAAAAAAAAAAAA',
      '/track/AAAAAAAAAAAAAAAAAAAAAA',
      '/checkout/extra',
      '/product/x',
    ]) {
      expect(at(other), other).toBe('storefront')
    }
    expect(at('/checkout', 'gallery')).toBe('storefront')
  })
})

describe('the admin policy (X2)', () => {
  const policy = buildCsp('admin', 'N0NCE')

  it('keeps scripts nonce-only and loads nothing from a third party', () => {
    expect(directive(policy, 'script-src')).toEqual([`'self'`, `'nonce-N0NCE'`, `'strict-dynamic'`])
    expect(directive(policy, 'connect-src')).toEqual([`'self'`])
    expect(directive(policy, 'frame-src')).toEqual([`'none'`])
    expect(policy).not.toMatch(/midtrans|cloudflare|google/i)
    expect(directive(policy, 'worker-src')).toEqual([`'self'`, 'blob:'])
    expect(directive(policy, 'frame-ancestors')).toEqual([`'none'`])
  })

  it('is the policy of /admin and its sub-paths only', () => {
    expect(surfaceOf({ site: 'shop', pathname: '/admin' })).toBe('admin')
    expect(surfaceOf({ site: 'shop', pathname: '/admin/collections/works' })).toBe('admin')
    expect(surfaceOf({ site: 'shop', pathname: '/administer' })).toBe('storefront')
  })
})

describe('wired into the proxy', () => {
  const builder = contentSecurityPolicy({
    NODE_ENV: 'production',
    MEDIA_PUBLIC_URL: 'https://media.example/b',
  })
  const decide = (path: string, host = 'old-east-indies.gaiada.com') =>
    decideProxy(
      {
        url: new URL(`https://${host}${path}`),
        headers: new Headers({ host, 'user-agent': 'x' }),
        method: 'GET',
      },
      { env: ENV, contentSecurityPolicy: builder },
    )

  it('sets the policy on the response and on the request Next reads its nonce from, the same string', () => {
    const decision = decide('/')
    const header = decision.setResponse['Content-Security-Policy']!
    expect(header).toContain('script-src')
    expect(
      decision.setRequest['content-security-policy'] ??
        decision.setRequest['Content-Security-Policy'],
    ).toBe(header)
  })

  it('draws a new nonce for every request', () => {
    const nonces = new Set(
      Array.from(
        { length: 50 },
        () => /'nonce-([^']+)'/.exec(decide('/').setResponse['Content-Security-Policy']!)![1],
      ),
    )
    expect(nonces.size).toBe(50)
  })

  it('drops a CSP header a client sent, so no client nonce reaches a page', () => {
    const decision = decideProxy(
      {
        url: new URL('https://old-east-indies.gaiada.com/'),
        headers: new Headers({
          host: 'old-east-indies.gaiada.com',
          'content-security-policy': "script-src 'nonce-attacker'",
          'user-agent': 'x',
        }),
        method: 'GET',
      },
      { env: ENV, contentSecurityPolicy: builder },
    )
    expect(decision.removeRequest).toContain('content-security-policy')
    expect(JSON.stringify(decision.setRequest)).not.toContain('attacker')
  })

  it('gives the admin its policy, the checkout its Maps allowance, and the gallery the plain one', () => {
    expect(decide('/admin/login').setResponse['Content-Security-Policy']).not.toContain('midtrans')
    expect(decide('/checkout').setResponse['Content-Security-Policy']).toContain(
      'https://*.googleapis.com',
    )
    expect(
      decide('/', 'indies-gallery.gaiada.com').setResponse['Content-Security-Policy'],
    ).not.toContain('google')
  })

  it('leaves the tracking page’s own headers beside it', () => {
    const headers = decide('/track/AAAAAAAAAAAAAAAAAAAAAA').setResponse
    expect(headers['Referrer-Policy']).toBe('no-referrer')
    expect(headers['X-Robots-Tag']).toBe('noindex')
    expect(headers['Content-Security-Policy']).toContain('frame-ancestors')
  })
})
