// One app's hosts (PLAN-V2 §4.5): `SITE_HOSTS` and `ADMIN_HOST` per app, today's two-site lists as
// the transition's fallback, and the sister site's origin from configuration alone.
import { describe, expect, it } from 'vitest'

import {
  adminOrigin,
  appAdminOrigin,
  appHostOf,
  appHostProblems,
  appOrigin,
  sisterOrigin,
} from './index'

const SHOP = { SITE_HOSTS: 'shop.localhost, www.shop.localhost', PORT: '4881' }
const TWO_SITE = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost', PORT: '4881' }

describe('appHostOf()', () => {
  it('knows the canonical host, an alias and nothing else', () => {
    expect(appHostOf('shop', 'shop.localhost:4881', SHOP)).toEqual({
      site: 'shop',
      hostname: 'shop.localhost',
      canonical: true,
      admin: true,
      adminOnly: false,
    })
    expect(appHostOf('shop', 'WWW.shop.localhost.', SHOP)).toMatchObject({
      canonical: false,
      admin: false,
    })
    expect(appHostOf('shop', 'gallery.localhost', SHOP)).toBeNull()
    expect(appHostOf('shop', 'evil.example', SHOP)).toBeNull()
    expect(appHostOf('shop', '', SHOP)).toBeNull()
  })

  it('serves the admin on a host of its own, which serves no page', () => {
    const env = { ...SHOP, ADMIN_HOST: 'admin.shop.localhost' }
    expect(appHostOf('shop', 'admin.shop.localhost', env)).toMatchObject({
      admin: true,
      adminOnly: true,
      canonical: false,
    })
    expect(appHostOf('shop', 'shop.localhost', env)).toMatchObject({ admin: false })
    expect(appAdminOrigin('shop', env)).toBe('http://admin.shop.localhost:4881')
  })

  it('refuses an alias as the admin host, and a malformed list, failing closed', () => {
    expect(appHostProblems('shop', { ...SHOP, ADMIN_HOST: 'www.shop.localhost' })).toHaveLength(1)
    expect(
      appHostOf('shop', 'shop.localhost', { ...SHOP, ADMIN_HOST: 'www.shop.localhost' }),
    ).toBeNull()
    expect(appHostProblems('shop', { SITE_HOSTS: 'https://shop.localhost' })).toHaveLength(1)
    expect(appHostProblems('shop', { SITE_HOSTS: 'a.localhost,a.localhost' })).toHaveLength(1)
    expect(appHostProblems('shop', {})).toHaveLength(1)
    expect(appOrigin('shop', {})).toBeNull()
  })

  it('falls back to the site’s own two-site list in transition', () => {
    expect(appHostOf('shop', 'shop.localhost', TWO_SITE)).toMatchObject({
      canonical: true,
      admin: true,
    })
    expect(appHostOf('shop', 'gallery.localhost', TWO_SITE)).toBeNull()
    // Today's one admin on the shop's host is not the gallery app's: its own is.
    expect(appAdminOrigin('gallery', { ...TWO_SITE, ADMIN_HOST: 'shop.localhost' })).toBe(
      'http://gallery.localhost:4881',
    )
    expect(appOrigin('shop', TWO_SITE)).toBe('http://shop.localhost:4881')
  })

  it('builds https origins for real hosts', () => {
    expect(appOrigin('shop', { SITE_HOSTS: 'oldeastindies.com,www.oldeastindies.com' })).toBe(
      'https://oldeastindies.com',
    )
  })
})

describe('adminOrigin() in one app’s environment', () => {
  it('names the app’s admin host, as the shared CMS factories read it', () => {
    expect(adminOrigin(SHOP)).toBe('http://shop.localhost:4881')
    expect(adminOrigin({ ...SHOP, ADMIN_HOST: 'admin.shop.localhost' })).toBe(
      'http://admin.shop.localhost:4881',
    )
    expect(adminOrigin(TWO_SITE)).toBe('http://shop.localhost:4881')
    expect(adminOrigin({ SITE_HOSTS: 'not a host' })).toBeNull()
  })
})

describe('sisterOrigin()', () => {
  it('reads the sister’s origin from configuration, never a request', () => {
    expect(sisterOrigin('shop', { GALLERY_ORIGIN: 'https://antiquemapsindonesia.com' })).toBe(
      'https://antiquemapsindonesia.com',
    )
    expect(sisterOrigin('shop', { GALLERY_ORIGIN: 'http://gallery.localhost:4880/' })).toBe(
      'http://gallery.localhost:4880',
    )
    expect(sisterOrigin('gallery', { SHOP_ORIGIN: 'https://oldeastindies.com' })).toBe(
      'https://oldeastindies.com',
    )
    expect(sisterOrigin('shop', TWO_SITE)).toBe('http://gallery.localhost:4881')
    expect(sisterOrigin('shop', SHOP)).toBeNull()
  })

  it('refuses anything but a bare origin: no path, credentials or plain http off a workstation', () => {
    for (const bad of [
      'http://antiquemapsindonesia.com',
      'https://antiquemapsindonesia.com/maps',
      'https://user:pw@antiquemapsindonesia.com',
      'javascript:alert(1)',
      'antiquemapsindonesia.com',
    ]) {
      expect(sisterOrigin('shop', { GALLERY_ORIGIN: bad })).toBeNull()
    }
  })
})
