// The sites (DR-1) and host trust (CARRY-OVER.md §6.5): a host picks a site only from the env
// allow-list, the port and a trailing dot aside; everything else — an unlisted host, a spoofed
// one, a malformed list — picks nothing; every origin comes from the list, never a request.
import { describe, expect, it } from 'vitest'

import {
  adminOrigin,
  canonicalHost,
  requestHostname,
  routeIssues,
  siteFromHost,
  siteHostProblems,
  siteOrigin,
  siteOrigins,
  SITES,
  type RouteConfig,
} from './index'

const LOCAL = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost', PORT: '4123' }
const STAGING = {
  GALLERY_HOSTS: 'indies-gallery.gaiada.com, www.indies-gallery.gaiada.com',
  SHOP_HOSTS: 'old-east-indies.gaiada.com',
}

describe('siteFromHost()', () => {
  it('names each listed host’s site, whatever its port or case, and which is canonical', () => {
    expect(siteFromHost('gallery.localhost:4123', LOCAL)).toEqual({
      site: 'gallery',
      hostname: 'gallery.localhost',
      canonical: true,
      admin: false,
    })
    expect(siteFromHost('SHOP.localhost', LOCAL)).toMatchObject({ site: 'shop', admin: true })
    expect(siteFromHost('www.indies-gallery.gaiada.com.', STAGING)).toEqual({
      site: 'gallery',
      hostname: 'www.indies-gallery.gaiada.com',
      canonical: false,
      admin: false,
    })
  })

  it('names nothing for a host on no list, or one that is not a hostname at all', () => {
    for (const host of [
      'localhost:4123',
      '127.0.0.1:4123',
      'evil.example.com',
      'gallery.localhost.evil.example.com',
      'evil.example.com@gallery.localhost',
      'gallery.localhost/x',
      '[::1]:4123',
      ' ',
      '',
      null,
      undefined,
    ]) {
      expect(siteFromHost(host, LOCAL), String(host)).toBeNull()
    }
  })

  it('fails closed on a malformed allow-list: no host picks a site, and the boot check says why', () => {
    const broken = [
      { GALLERY_HOSTS: '', SHOP_HOSTS: 'shop.localhost' },
      { GALLERY_HOSTS: 'gallery.localhost:3000', SHOP_HOSTS: 'shop.localhost' },
      { GALLERY_HOSTS: 'http://gallery.localhost', SHOP_HOSTS: 'shop.localhost' },
      { GALLERY_HOSTS: 'both.localhost', SHOP_HOSTS: 'both.localhost' },
      { ...LOCAL, ADMIN_HOST: 'admin.localhost' },
    ]
    for (const env of broken) {
      expect(siteFromHost('shop.localhost', env), JSON.stringify(env)).toBeNull()
      expect(siteHostProblems(env).length, JSON.stringify(env)).toBeGreaterThan(0)
      expect(siteOrigins(env)).toEqual([])
      expect(adminOrigin(env)).toBeNull()
    }
    expect(siteHostProblems(LOCAL)).toEqual([])
  })

  it('takes ADMIN_HOST, by default the shop’s canonical host (Q1)', () => {
    expect(siteFromHost('shop.localhost', LOCAL)?.admin).toBe(true)
    expect(siteFromHost('gallery.localhost', LOCAL)?.admin).toBe(false)
    const gallery = { ...LOCAL, ADMIN_HOST: 'gallery.localhost' }
    expect(siteFromHost('gallery.localhost', gallery)?.admin).toBe(true)
    expect(siteFromHost('shop.localhost', gallery)?.admin).toBe(false)
  })

  it('reads the host header alone: lower case, port and root dot dropped', () => {
    expect(requestHostname('Gallery.Localhost:80')).toBe('gallery.localhost')
    expect(requestHostname('gallery.localhost.:4123')).toBe('gallery.localhost')
    expect(requestHostname('gallery.localhost:99999999')).toBeNull()
  })
})

describe('origins come from the allow-list, never a request', () => {
  it('is https for a real host and http on the process’s port for a local one', () => {
    expect(siteOrigin('gallery', STAGING)).toBe('https://indies-gallery.gaiada.com')
    expect(siteOrigin('shop', LOCAL)).toBe('http://shop.localhost:4123')
    expect(siteOrigin('shop', { ...LOCAL, PORT: undefined })).toBe('http://shop.localhost')
    expect(canonicalHost('gallery', STAGING)).toBe('indies-gallery.gaiada.com')
  })

  it('lists each site’s canonical origin for CSRF and CORS, and the admin’s for serverURL', () => {
    expect(siteOrigins(STAGING)).toEqual([
      'https://indies-gallery.gaiada.com',
      'https://old-east-indies.gaiada.com',
    ])
    expect(adminOrigin(STAGING)).toBe('https://old-east-indies.gaiada.com')
    expect(siteOrigins(LOCAL)).toEqual([
      'http://gallery.localhost:4123',
      'http://shop.localhost:4123',
    ])
  })
})

describe('SITES', () => {
  it('commits two route maps that give no page two addresses', () => {
    expect(routeIssues(SITES.gallery)).toEqual([])
    expect(routeIssues(SITES.shop)).toEqual([])
  })

  it('refuses a map with a planted fault: a twice-used, reserved or misspelt segment, a gap', () => {
    const planted = (change: (routes: Record<string, unknown>) => void): string[] => {
      const routes = structuredClone(SITES.gallery.routes) as unknown as Record<string, unknown>
      change(routes)
      return routeIssues({ ...SITES.gallery, routes } as unknown as RouteConfig)
    }
    const en = (routes: Record<string, unknown>) => routes.en as Record<string, string>
    expect(planted((r) => (en(r).maker = 'places'))).toEqual([
      '"places" is reserved or used twice at the root of "en"',
    ])
    expect(planted((r) => (en(r).maker = 'admin'))).toContain(
      '"admin" is reserved or used twice at the root of "en"',
    )
    expect(planted((r) => (en(r).maker = 'Makers'))[0]).toMatch(/not a lower-case ASCII/)
    expect(planted((r) => delete en(r).story)).toEqual([
      '"id" has other surfaces than the default locale "en"',
    ])
    expect(planted((r) => (en(r).maker = 'antique-maps'))).toContain(
      '"antique-maps" is reserved or used twice at the root of "en"',
    )
    expect(planted((r) => (r.legacyPrefixes = ['/product/']))[0]).toMatch(/shadows the live root/)
  })

  it('serves English unprefixed and Indonesian on both sites', () => {
    for (const site of Object.values(SITES)) {
      expect(site.locales).toEqual({ default: 'en', supported: ['en', 'id'] })
    }
  })
})
