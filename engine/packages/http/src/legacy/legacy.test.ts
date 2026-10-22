/**
 * The legacy route (TASKS.md 9.4.b): answers 301, 302, 410 and 404 from the `redirects` rows, read
 * through a fake loader — no database, no Payload.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PROXY_REQUEST_HEADERS } from '../manifest'
import { REDIRECT_MAP_TTL_MS } from './map-cache'
import type { RedirectEntry, RedirectMap } from './redirect-map'
import { legacyRoute, type RedirectSourceLoader } from './route'

const MAP: RedirectMap = new Map<string, RedirectEntry>([
  ['/category/1-maps', { to: '/browse/maps', code: 301 }],
  ['/category/1-maps?s=sold', { to: '/browse/maps?s=sold', code: 301 }],
  ['/product/1706-bali', { to: '/item/IG-001706', code: 301 }],
  ['/our-collection/old', { to: 'https://elsewhere.example/page', code: 301 }],
  ['/account', { to: '', code: 410 }],
  ['/promo', { to: '/sale', code: 302 }],
])

/** What the proxy hands the handler: its headers and the rewrite's URL, which carries the query. */
function legacy(
  path: string,
  init: { site?: string | null; search?: string; method?: string } = {},
) {
  const { site = 'gallery', search = '', method = 'GET' } = init
  const headers = new Headers({ [PROXY_REQUEST_HEADERS.publicPath]: path })
  if (site !== null) headers.set(PROXY_REQUEST_HEADERS.site, site)
  return new Request(`http://localhost/api/x/legacy${path}${search}`, { method, headers })
}

function fake(map: RedirectMap = MAP) {
  const loadRedirectMap = vi.fn(async (_site: string) => map)
  const loader: RedirectSourceLoader = async () => ({ loadRedirectMap })
  return { loadRedirectMap, loader }
}

beforeEach(() => {
  vi.stubEnv('GALLERY_HOSTS', 'gallery.test')
  vi.stubEnv('SHOP_HOSTS', 'shop.test')
  vi.stubEnv('ADMIN_HOST', 'shop.test')
})
afterEach(() => vi.unstubAllEnvs())

describe('/api/x/legacy/[...path]', () => {
  it('an old product URL answers one 301 to the item on the canonical origin', async () => {
    const { loadRedirectMap, loader } = fake()
    const response = await legacyRoute(loader)(legacy('/product/1706-bali'))
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('https://gallery.test/item/IG-001706')
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(loadRedirectMap).toHaveBeenCalledWith('gallery')
  })

  it('an absolute destination stays as it is', async () => {
    const route = legacyRoute(fake().loader)
    const response = await route(legacy('/our-collection/old', { site: 'shop' }))
    expect(response.headers.get('location')).toBe('https://elsewhere.example/page')
  })

  it('a row marked 410 answers 410 Gone', async () => {
    const response = await legacyRoute(fake().loader)(legacy('/account'))
    expect(response.status).toBe(410)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/)
    expect(await response.text()).toBe('Gone')
  })

  it('an unknown legacy path is a plain no-store 404', async () => {
    const response = await legacyRoute(fake().loader)(legacy('/category/12-java'))
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/)
  })

  it('the query that the row keeps is matched (?s=sold) and a dropped one (?page=2) still finds the row', async () => {
    const route = legacyRoute(fake().loader)
    const sold = await route(legacy('/category/1-maps', { search: '?s=sold' }))
    expect(sold.headers.get('location')).toBe('https://gallery.test/browse/maps?s=sold')
    const paged = await route(legacy('/category/1-maps', { search: '?page=2' }))
    expect(paged.headers.get('location')).toBe('https://gallery.test/browse/maps')
    const both = await route(legacy('/category/1-maps', { search: '?page=2&s=sold' }))
    expect(both.headers.get('location')).toBe('https://gallery.test/browse/maps?s=sold')
  })

  it('a trailing slash finds the same row', async () => {
    const response = await legacyRoute(fake().loader)(legacy('/category/1-maps/'))
    expect(response.status).toBe(301)
  })

  it('a 302 row answers 302', async () => {
    const response = await legacyRoute(fake().loader)(legacy('/promo'))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('https://gallery.test/sale')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('no site header is a 404, never a guess', async () => {
    const { loadRedirectMap, loader } = fake()
    const route = legacyRoute(loader)
    for (const site of [null, '', 'admin', 'Gallery']) {
      const response = await route(legacy('/account', { site }))
      expect(response.status, String(site)).toBe(404)
    }
    expect(loadRedirectMap).not.toHaveBeenCalled()
  })

  it('each site reads its own map', async () => {
    const { loadRedirectMap, loader } = fake(new Map())
    const route = legacyRoute(loader)
    await route(legacy('/x', { site: 'shop' }))
    await route(legacy('/x', { site: 'gallery' }))
    expect(loadRedirectMap.mock.calls.map(([site]) => site)).toEqual(['shop', 'gallery'])
  })

  it('two concurrent requests load the map once', async () => {
    let release!: (map: RedirectMap) => void
    const loadRedirectMap = vi.fn(() => new Promise<RedirectMap>((resolve) => (release = resolve)))
    const route = legacyRoute(async () => ({ loadRedirectMap }))
    const first = route(legacy('/account'))
    const second = route(legacy('/promo'))
    await vi.waitFor(() => expect(loadRedirectMap).toHaveBeenCalledTimes(1))
    release(MAP)
    expect((await first).status).toBe(410)
    expect((await second).status).toBe(302)
    expect(loadRedirectMap).toHaveBeenCalledTimes(1)
  })

  it('a failed load is not cached and the next request retries', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const loadRedirectMap = vi
      .fn<() => Promise<RedirectMap>>()
      .mockRejectedValueOnce(new Error('connection refused'))
      .mockResolvedValue(MAP)
    const route = legacyRoute(async () => ({ loadRedirectMap }))
    const failed = await route(legacy('/account'))
    expect(failed.status).toBe(404)
    expect(failed.headers.get('cache-control')).toBe('no-store')
    expect(error).toHaveBeenCalledTimes(1)
    expect((await route(legacy('/account'))).status).toBe(410)
    expect(loadRedirectMap).toHaveBeenCalledTimes(2)
    error.mockRestore()
  })

  it('the map expires after its TTL', async () => {
    let clock = 1_000
    const { loadRedirectMap, loader } = fake()
    const route = legacyRoute(loader, () => clock)
    await route(legacy('/account'))
    clock += REDIRECT_MAP_TTL_MS - 1
    await route(legacy('/account'))
    expect(loadRedirectMap).toHaveBeenCalledTimes(1)
    clock += 1
    await route(legacy('/account'))
    expect(loadRedirectMap).toHaveBeenCalledTimes(2)
  })

  it('HEAD answers the same status and Location with no body', async () => {
    const route = legacyRoute(fake().loader)
    for (const path of ['/product/1706-bali', '/account', '/nowhere']) {
      const get = await route(legacy(path))
      const head = await route(legacy(path, { method: 'HEAD' }))
      expect(head.status).toBe(get.status)
      expect(head.headers.get('location')).toBe(get.headers.get('location'))
      expect(head.headers.get('cache-control')).toBe(get.headers.get('cache-control'))
      expect(await head.text()).toBe('')
    }
  })
})
