// The proxy in a site's own app (`app`, PLAN-V2 §3): its own hosts alone, its pages at the root of
// its tree, an admin host of its own serving no page — and today's two-site shape unchanged.
import { describe, expect, it } from 'vitest'

import { decideProxy, type DecideOptions } from './route'

const SHOP: DecideOptions = {
  app: 'shop',
  env: { SITE_HOSTS: 'shop.localhost,www.shop.localhost', PORT: '4881' },
  securityHeaders: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'origin' },
}

function decide(host: string, path: string, options: DecideOptions = SHOP) {
  return decideProxy(
    { url: new URL(`http://localhost:4881${path}`), headers: new Headers({ host }) },
    options,
  )
}

describe('decideProxy({ app })', () => {
  it('rewrites into the locale tree without the site prefix', () => {
    expect(decide('shop.localhost', '/')).toMatchObject({
      kind: 'rewrite',
      to: '/en',
      site: 'shop',
    })
    expect(decide('shop.localhost', '/id/keranjang')).toMatchObject({
      to: '/id/cart',
      locale: 'id',
    })
    expect(decide('shop.localhost', '/x/y')).toMatchObject({ to: '/en/not-found', status: 404 })
  })

  it('knows only its own hosts', () => {
    expect(decide('gallery.localhost', '/')).toMatchObject({ kind: 'respond', why: 'unknown-host' })
    expect(decide('www.shop.localhost', '/a')).toMatchObject({
      why: 'alias',
      status: 301,
      to: 'http://shop.localhost:4881/a',
    })
    // Today's lists name the gallery too; the shop's app still answers its own hosts alone.
    const twoSite = {
      app: 'shop' as const,
      env: { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost' },
    }
    expect(decide('gallery.localhost', '/', twoSite).why).toBe('unknown-host')
    expect(decide('shop.localhost', '/', twoSite).why).toBe('surface')
  })

  it('serves an admin host of its own the admin, REST and files alone', () => {
    const options = { ...SHOP, env: { ...SHOP.env, ADMIN_HOST: 'admin.shop.localhost' } }
    expect(decide('admin.shop.localhost', '/admin', options).why).toBe('admin')
    expect(decide('admin.shop.localhost', '/api/users', options).why).toBe('api')
    expect(decide('admin.shop.localhost', '/shop/logo.svg', options).why).toBe('site-asset')
    expect(decide('admin.shop.localhost', '/', options)).toMatchObject({
      why: 'admin-host-only',
      status: 404,
    })
    expect(decide('shop.localhost', '/admin', options)).toMatchObject({ why: 'not-found' })
    expect(decide('shop.localhost', '/api/users', options).why).toBe('not-admin-host')
  })

  it('sets the security headers on every answer, under the decision’s own', () => {
    expect(decide('evil.example', '/').setResponse).toMatchObject({
      'X-Content-Type-Options': 'nosniff',
    })
    expect(decide('shop.localhost', '/track/t0k').setResponse['Referrer-Policy']).toBe(
      'no-referrer',
    )
    expect(decide('shop.localhost', '/').setResponse['Referrer-Policy']).toBe('origin')
  })

  it('leaves today’s two-site proxy as it was: the site’s prefix, no extra headers', () => {
    const today = { env: { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost' } }
    expect(decide('shop.localhost', '/', today)).toMatchObject({ to: '/shop/en', site: 'shop' })
    expect(decide('gallery.localhost', '/x/y', today).to).toBe('/gallery/en/not-found')
    expect(decide('shop.localhost', '/', today).setResponse).toEqual({})
  })
})
