// A site's own app's CSP and static headers (SECURITY.md B2, B3, B6, X2).
import { describe, expect, it } from 'vitest'

import { appContentSecurityPolicy, appPreviewOrigin, securityHeaders, surfaceOf } from './route'

const LOCAL = { SITE_HOSTS: 'shop.localhost', PORT: '4881', NODE_ENV: 'production' }

describe('appContentSecurityPolicy()', () => {
  it('picks the storefront, checkout and admin policies by path', () => {
    expect(surfaceOf('shop', '/')).toBe('storefront')
    expect(surfaceOf('shop', '/checkout')).toBe('checkout')
    expect(surfaceOf('shop', '/admin/collections/orders')).toBe('admin')
    const csp = appContentSecurityPolicy('shop', LOCAL)
    expect(csp({ pathname: '/checkout' })).toContain('https://*.googleapis.com')
    expect(csp({ pathname: '/' })).not.toContain('googleapis')
    expect(csp({ pathname: '/admin' })).toContain("connect-src 'self';")
    expect(csp({ pathname: '/api/x/media/12' })).toBe('sandbox')
  })

  it('upgrades insecure requests only on a real host, and allows eval only in development', () => {
    const local = appContentSecurityPolicy('shop', LOCAL)({ pathname: '/' })
    expect(local).not.toContain('upgrade-insecure-requests')
    expect(local).not.toContain('unsafe-eval')
    const real = appContentSecurityPolicy('shop', {
      SITE_HOSTS: 'oldeastindies.com',
      NODE_ENV: 'production',
    })
    expect(real({ pathname: '/' })).toContain('upgrade-insecure-requests')
    const dev = appContentSecurityPolicy('shop', { ...LOCAL, NODE_ENV: 'development' })
    expect(dev({ pathname: '/' })).toContain("'unsafe-eval'")
  })

  it('frames the preview only when the admin shares the site’s origin', () => {
    expect(appPreviewOrigin('shop', LOCAL)).toBe('http://shop.localhost:4881')
    expect(appPreviewOrigin('shop', { ...LOCAL, ADMIN_HOST: 'admin.shop.localhost' })).toBeNull()
    const own = appContentSecurityPolicy('shop', { ...LOCAL, ADMIN_HOST: 'admin.shop.localhost' })
    expect(own({ pathname: '/' })).toContain("frame-ancestors 'none'")
    expect(
      appContentSecurityPolicy('gallery', { SITE_HOSTS: 'gallery.localhost' })({ pathname: '/' }),
    ).toContain("frame-ancestors 'none'")
  })
})

describe('securityHeaders()', () => {
  it('sets B3’s headers, HSTS only when asked', () => {
    expect(securityHeaders()).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Cross-Origin-Opener-Policy': 'same-origin',
    })
    expect(securityHeaders()['Strict-Transport-Security']).toBeUndefined()
    expect(securityHeaders({ hsts: true })['Strict-Transport-Security']).toBe('max-age=31536000')
  })
})
