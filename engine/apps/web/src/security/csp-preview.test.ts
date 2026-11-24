/**
 * The CSP's shop page preview frame (TASKS.md 27.5.a): the admin frames the shop's own origin and
 * nothing else; only the shop's storefront pages may be framed, by that origin alone.
 */
import { describe, expect, it } from 'vitest'

import { contentSecurityPolicy, previewOriginOf } from './csp'

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

describe('the shop page preview frame (TASKS.md 27.5.a)', () => {
  const SHOP = 'https://old-east-indies.gaiada.com'
  const build = contentSecurityPolicy({ ...ENV, NODE_ENV: 'production' })

  it('is the shop’s own origin, while the admin answers there', () => {
    expect(previewOriginOf(ENV)).toBe(SHOP)
    expect(previewOriginOf({ ...ENV, ADMIN_HOST: 'indies-gallery.gaiada.com' })).toBeNull()
  })

  it('lets the admin frame the shop’s origin and nothing else', () => {
    const admin = build({ site: 'shop', pathname: '/admin/collections/pages/1' })
    expect(directive(admin, 'frame-src')).toEqual([SHOP])
    expect(directive(admin, 'frame-ancestors')).toEqual([`'none'`])
  })

  it('lets a shop page be framed by the admin’s origin alone', () => {
    const page = build({ site: 'shop', pathname: '/collaboration' })
    expect(directive(page, 'frame-ancestors')).toEqual([SHOP])
  })

  it('never lets the gallery or the checkout be framed', () => {
    expect(directive(build({ site: 'gallery', pathname: '/' }), 'frame-ancestors')).toEqual([
      `'none'`,
    ])
    expect(directive(build({ site: 'shop', pathname: '/checkout' }), 'frame-ancestors')).toEqual([
      `'none'`,
    ])
  })

  it('allows no frame at all when the admin is on the other host', () => {
    const elsewhere = contentSecurityPolicy({
      ...ENV,
      ADMIN_HOST: 'indies-gallery.gaiada.com',
      NODE_ENV: 'production',
    })
    expect(directive(elsewhere({ site: 'gallery', pathname: '/admin' }), 'frame-src')).toEqual([
      `'none'`,
    ])
    expect(directive(elsewhere({ site: 'shop', pathname: '/' }), 'frame-ancestors')).toEqual([
      `'none'`,
    ])
  })
})

describe('a local production build on plain http (TASKS.md 27.5.a)', () => {
  it('sends no upgrade-insecure-requests there, and keeps it on a real host', () => {
    const local = contentSecurityPolicy({
      GALLERY_HOSTS: 'gallery.localhost',
      SHOP_HOSTS: 'shop.localhost',
      NODE_ENV: 'production',
      PORT: '4857',
    })
    const admin = local({ site: 'shop', pathname: '/admin' })
    expect(admin).not.toContain('upgrade-insecure-requests')
    expect(directive(admin, 'frame-src')).toEqual(['http://shop.localhost:4857'])
    const real = contentSecurityPolicy({ ...ENV, NODE_ENV: 'production' })
    expect(real({ site: 'shop', pathname: '/' })).toContain('upgrade-insecure-requests')
  })
})
