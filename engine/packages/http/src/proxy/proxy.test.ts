import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { loadBrandConfig } from '../../../config/src/loader/index'
import { PROXY_REQUEST_HEADERS } from '../manifest'
import { createProxy, decideProxy, NOT_FOUND_PATH } from './route'

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
    expect(decide('/make-an-offer?item=1706').to).toBe('/en/form/offer?item=1706')
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
        to: NOT_FOUND_PATH,
        why: 'not-found',
      })
    }
    expect(decide('/id/tidak/ada').locale).toBe('id') // the 404 speaks the prefix's language
    expect(decide('/en/produk/1', {}, emporium)).toMatchObject({ to: NOT_FOUND_PATH, locale: 'en' })
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
    expect(decision.removeRequest).toEqual([PROXY_REQUEST_HEADERS.contentSecurityPolicy])
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
      ({ locale }) => `default-src 'self'; x-locale ${locale}`,
    )
    expect(decision.setResponse['Content-Security-Policy']).toBe("default-src 'self'; x-locale en")
    expect(decision.setRequest['content-security-policy']).toBe("default-src 'self'; x-locale en")
    expect(decision.removeRequest).toEqual([])
  })
})
