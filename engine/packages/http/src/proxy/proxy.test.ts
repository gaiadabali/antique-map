import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { loadBrandConfig } from '@engine/config/loader'
import { PROXY_NOT_FOUND_STATUS, PROXY_REQUEST_HEADERS, PROXY_USER_AGENT } from '../manifest'
import { createProxy, decideProxy, notFoundPath } from './route'

const REPO_ROOT = fileURLToPath(new URL('../../../../../', import.meta.url))
const brand = (storefront: 'gallery' | 'emporium') =>
  loadBrandConfig({
    env: { BRAND: 'test', BRAND_ROOT: './test', TEST_STOREFRONT: storefront },
    cwd: REPO_ROOT,
  })
const gallery = brand('gallery') // default en, with id and nl
const emporium = brand('emporium') // default id, with en

const decide = (path: string, headers: Record<string, string> = {}, config = gallery) =>
  decideProxy(config, {
    url: new URL(path, 'https://shop.example.com'),
    headers: new Headers(headers),
  })

describe('the proxy — rewrites only, the default locale unprefixed (ARCHITECTURE.md §11)', () => {
  it('serves the default locale unprefixed and every other under its prefix', () => {
    expect(decide('/product/1706-bali-island')).toMatchObject({
      kind: 'rewrite',
      to: '/en/item/1706-bali-island',
      locale: 'en',
    })
    expect(decide('/id/produk/1706-bali-island')).toMatchObject({
      to: '/id/item/1706-bali-island',
      locale: 'id',
    })
    expect(decide('/nl/product/1706')).toMatchObject({ to: '/nl/item/1706', locale: 'nl' })
    expect(decide('/')).toMatchObject({ to: '/en', locale: 'en' })
    expect(decide('/id')).toMatchObject({ to: '/id', locale: 'id' })
    // A brand whose default is Indonesian serves Indonesian at the root.
    expect(decide('/produk/12-peta', {}, emporium)).toMatchObject({
      to: '/id/item/12-peta',
      locale: 'id',
    })
    expect(decide('/en/product/12-map', {}, emporium)).toMatchObject({
      to: '/en/item/12-map',
      locale: 'en',
    })
  })

  it('rewrites localised segments and named facet vocabularies (C10)', () => {
    expect(decide('/old-maps/java/batavia').to).toBe(
      '/en/browse?objectType=map&place=java%2Fbatavia',
    )
    expect(decide('/id/peta-lama?technique=etching&page=2').to).toBe(
      '/id/browse?objectType=map&technique=etching&page=2',
    )
    expect(decide('/id/cari?q=celebes').to).toBe('/id/search?q=celebes')
    // The offer form is the emporium's: the gallery takes no online offers (D50).
    expect(decide('/en/make-an-offer?item=1706', {}, emporium).to).toBe('/en/form/offer?item=1706')
    expect(decide('/about').to).toBe('/en/page/about')
  })

  it('answers 404 for internal paths, a default-locale prefix and an unsupported locale', () => {
    for (const path of [
      '/en/item/1706',
      '/item/1706',
      '/en/product/1706',
      '/id/item/1706',
      '/de/product/1706',
      '/id/admin',
      '/product/0',
    ]) {
      expect(decide(path), path).toMatchObject({
        kind: 'rewrite',
        to: expect.stringMatching(/^\/(?:en|id|nl)\/not-found$/),
        why: 'not-found',
      })
    }
    expect(decide('/id/tidak/ada')).toMatchObject({ to: '/id/not-found', locale: 'id' }) // its language
    expect(decide('/en/produk/1', {}, emporium)).toMatchObject({
      to: notFoundPath('en'),
      locale: 'en',
    })
  })

  it('rewrites legacy prefixes to /api/x/legacy/…, keeping the old query', () => {
    expect(decide('/category/12-java?s=sold&o=newest')).toMatchObject({
      to: '/api/x/legacy/category/12-java?s=sold&o=newest',
      why: 'legacy',
    })
    expect(decide('/storage/products/1706.jpg').to).toBe('/api/x/legacy/storage/products/1706.jpg')
    expect(decide('/old-shop/p/bali', {}, emporium).to).toBe('/api/x/legacy/old-shop/p/bali')
  })

  it('rewrites the root files to their engine routes, the favicon to the brand’s own', () => {
    expect(decide('/robots.txt').to).toBe('/api/x/robots')
    expect(decide('/sitemap.xml').to).toBe('/api/x/sitemap')
    expect(decide('/sitemap-id.xml').to).toBe('/api/x/sitemap/id')
    expect(decide('/.well-known/security.txt').to).toBe('/api/x/well-known/security.txt')
    expect(decide('/favicon.ico').to).toBe(`/brand-assets/${gallery.assets.favicon}`)
  })

  it('passes the app’s own routes through, and starts the admin in English unless its user chose', () => {
    expect(decide('/style-guide')).toMatchObject({ kind: 'next', why: 'app' })
    const admin = decide('/admin/collections/works', { 'accept-language': 'id-ID,id;q=0.9' })
    expect(admin).toMatchObject({ kind: 'next', setRequest: { 'accept-language': 'en' } })
    const chosen = decide('/admin', { 'accept-language': 'id', cookie: 'a=1; payload-lng=id' })
    expect(chosen.setRequest['accept-language']).toBeUndefined()
    expect(decide('/', { 'accept-language': 'id' }).setRequest['accept-language']).toBeUndefined()
  })

  it('redirects nothing at the root by Accept-Language: the root is the default locale', async () => {
    const proxy = createProxy({ config: () => gallery })
    for (const accept of ['id-ID,id;q=0.9', 'nl', 'en']) {
      const answer = proxy(
        new Request('https://shop.example.com/', { headers: { 'accept-language': accept } }),
      )
      expect(answer.status).toBe(200)
      expect(answer.headers.get('location')).toBeNull()
      expect(answer.headers.get('x-middleware-rewrite')).toBe('https://shop.example.com/en')
    }
  })

  it('sets x-public-path and x-locale on every request, overwriting a client’s, and strips a client’s CSP', () => {
    const decision = decide('/id/produk/1706', {
      'x-public-path': '/forged',
      'x-locale': 'nl',
      'content-security-policy': "script-src 'unsafe-inline'",
    })
    expect(decision.setRequest).toMatchObject({
      [PROXY_REQUEST_HEADERS.publicPath]: '/id/produk/1706',
      [PROXY_REQUEST_HEADERS.locale]: 'id',
    })
    expect(decision.removeRequest).toEqual([
      'content-security-policy',
      'content-security-policy-report-only',
    ])
    expect(decide('/en/item/1').setRequest[PROXY_REQUEST_HEADERS.publicPath]).toBe('/en/item/1')
  })

  it('answers a sensitive page with no-referrer and noindex, and only those pages', () => {
    for (const path of ['/orders/TSG-000123', '/pay/abc', '/id/penawaran/xyz']) {
      expect(decide(path).setResponse, path).toEqual({
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex',
      })
    }
    expect(decide('/product/1706').setResponse).toEqual({})
  })

  it('copies the one CSP builder’s policy onto the answer and the request, once 41.1.a passes it in', () => {
    const decision = decideProxy(
      gallery,
      { url: new URL('https://shop.example.com/product/1'), headers: new Headers() },
      { contentSecurityPolicy: ({ locale }) => `default-src 'self'; x-locale ${locale}` },
    )
    expect(decision.setResponse['Content-Security-Policy']).toBe("default-src 'self'; x-locale en")
    expect(decision.setRequest['content-security-policy']).toBe("default-src 'self'; x-locale en")
    // Both are still removed first; the builder's policy is then set on the request.
    expect(decision.removeRequest).toContain('content-security-policy-report-only')
  })
})

/** A path of every kind the proxy decides: a surface, the item, legacy, a root file, the app, a miss. */
const EVERY_KIND = [
  '/product/1706-bali',
  '/old-maps/java',
  '/pay/abc',
  '/category/12-java?s=sold',
  '/robots.txt',
  '/admin',
  '/style-guide',
  '/nope',
  '/nope/deeper',
  '/en/item/1706',
] as const

describe('the proxy — C13 v1.3: the User-Agent, the not-found’s status, the item’s query (5.3)', () => {
  it('supplies PROXY_USER_AGENT on every request with none, or an empty one', () => {
    for (const path of EVERY_KIND) {
      for (const headers of [{}, { 'user-agent': '' }, { 'user-agent': '   ' }] as Record<
        string,
        string
      >[]) {
        expect(decide(path, headers).setRequest['user-agent'], path).toBe(PROXY_USER_AGENT)
      }
    }
    expect(PROXY_USER_AGENT).toBe('engine-proxy (no user-agent)')
  })

  it('never replaces a client’s own User-Agent, whatever it says', () => {
    for (const path of EVERY_KIND) {
      for (const agent of ['Mozilla/5.0 (X11; Linux x86_64)', 'curl/8.9.1', 'x']) {
        expect(decide(path, { 'user-agent': agent }).setRequest, path).not.toHaveProperty(
          'user-agent',
        )
      }
    }
  })

  it('answers every not-found decision with PROXY_NOT_FOUND_STATUS, and no other with a status', () => {
    // `/nope` is not among them: one segment is a CMS page's address (C10 `page`), which only the
    // database can find missing — its route calls `notFound()` under the status Next's render gives.
    const notFound = [
      '/nope/deeper',
      '/en/item/1706',
      '/de/product/1',
      '/not-found',
      '/id/not-found',
    ]
    for (const path of notFound) {
      expect(decide(path), path).toMatchObject({ why: 'not-found', status: PROXY_NOT_FOUND_STATUS })
    }
    // A page whose module is off is the proxy's not-found too.
    const noInvoices = { ...gallery, modules: { ...gallery.modules, 'purchase.invoices': false } }
    expect(decide('/quote/abc', {}, noInvoices)).toMatchObject({ why: 'not-found', status: 404 })
    expect(decide('/quote/abc').status).toBeNull()
    expect(decide('/nope')).toMatchObject({ to: '/en/page/nope', status: null })
    for (const path of EVERY_KIND.filter((path) => !notFound.includes(path))) {
      expect(decide(path).status, path).toBeNull() // the status Next's render gives it stands
    }
  })

  it('copies the public query into x-public-search on the item route’s rewrite alone', () => {
    const search = PROXY_REQUEST_HEADERS.publicSearch
    expect(decide('/product/1706-old?utm_source=mail&gclid=a%20b').setRequest[search]).toBe(
      '?utm_source=mail&gclid=a%20b',
    )
    expect(decide('/id/produk/1706?fbclid=x').setRequest[search]).toBe('?fbclid=x')
    // No query, or a bare `?`, is `''` — URL.search's own spelling of none.
    expect(decide('/product/1706-bali').setRequest[search]).toBe('')
    expect(decide('/product/1706-bali?').setRequest[search]).toBe('')
    // A client's copy never survives, on the item route or anywhere else.
    const forged = { [search]: '?token=forged' }
    expect(decide('/product/1706?a=1', forged).setRequest[search]).toBe('?a=1')
    expect(decide('/product/1706', forged).setRequest[search]).toBe('')
  })

  it('sets x-public-search to "" on every other request, a capability’s query included', () => {
    const search = PROXY_REQUEST_HEADERS.publicSearch
    for (const path of [
      '/pay/abc?token=secret',
      '/orders/TSG-1?access=secret',
      '/id/cari?q=celebes',
      '/old-maps/java?page=2',
      '/category/12-java?s=sold',
      '/robots.txt?x=1',
      '/admin?next=/admin/account',
      '/nope?q=1',
      '/en/item/1706?utm_source=mail', // an internal path asked for directly is not the item route
    ]) {
      expect(decide(path, { [search]: '?forged=1' }).setRequest[search], path).toBe('')
    }
  })
})
