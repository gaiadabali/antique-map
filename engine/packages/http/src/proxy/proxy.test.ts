// The proxy's routing on a known host (ARCHITECTURE.md §2, §5): each site's public paths rewrite
// into that site's own tree, the default locale unprefixed; anything else is the site's designed
// 404; root files and the site's own files answer per site; the headers it sets overwrite a
// client's.
import { afterEach, describe, expect, it } from 'vitest'

import { PROXY_NOT_FOUND_STATUS, PROXY_REQUEST_HEADERS, PROXY_USER_AGENT } from '../manifest'
import { decideProxy, notFoundPath } from './route'
import { resetTrackingGuessLimit, TRACKING_GUESSES_PER_MINUTE } from './tracking-rate-limit'

const ENV = { GALLERY_HOSTS: 'gallery.localhost', SHOP_HOSTS: 'shop.localhost', PORT: '4230' }
type Site = 'gallery' | 'shop'

const decide = (site: Site, path: string, headers: Record<string, string> = {}) =>
  decideProxy(
    {
      url: new URL(path, 'http://localhost:4230'),
      headers: new Headers({ host: `${site}.localhost:4230`, ...headers }),
    },
    { env: ENV },
  )

describe('each host serves its own site, in its own tree', () => {
  it('rewrites the gallery’s pages into /gallery/<locale>/…', () => {
    expect(decide('gallery', '/')).toMatchObject({
      kind: 'rewrite',
      to: '/gallery/en',
      site: 'gallery',
    })
    expect(decide('gallery', '/id')).toMatchObject({ to: '/gallery/id', locale: 'id' })
    expect(decide('gallery', '/product/1706-bali-island').to).toBe(
      '/gallery/en/item/1706-bali-island',
    )
    expect(decide('gallery', '/antique-maps/java/batavia').to).toBe(
      '/gallery/en/browse?objectType=map&place=java%2Fbatavia',
    )
    expect(decide('gallery', '/id/cari?q=celebes').to).toBe('/gallery/id/search?q=celebes')
    expect(decide('gallery', '/sell-to-us').to).toBe('/gallery/en/sell-to-us')
    expect(decide('gallery', '/about').to).toBe('/gallery/en/page/about')
  })

  it('rewrites the shop’s pages into /shop/<locale>/…', () => {
    expect(decide('shop', '/')).toMatchObject({ kind: 'rewrite', to: '/shop/en', site: 'shop' })
    expect(decide('shop', '/shop').to).toBe('/shop/en/browse')
    expect(decide('shop', '/id/belanja').to).toBe('/shop/id/browse')
    expect(decide('shop', '/product/batik-tote').to).toBe('/shop/en/product/batik-tote')
    expect(decide('shop', '/id/keranjang').to).toBe('/shop/id/cart')
  })

  it('gives one path to each site’s own page, never the other’s', () => {
    // `/bag` is the shop's bag and only a page slug on the gallery; `/makers` the other way round.
    expect(decide('shop', '/bag').to).toBe('/shop/en/cart')
    expect(decide('gallery', '/bag').to).toBe('/gallery/en/page/bag')
    expect(decide('gallery', '/makers').to).toBe('/gallery/en/maker')
    expect(decide('shop', '/makers').to).toBe('/shop/en/page/makers')
  })

  it('answers an internal path asked for directly with the site’s 404, in either tree', () => {
    for (const site of ['gallery', 'shop'] as const) {
      for (const path of [
        '/gallery/en',
        '/gallery/en/item/1706-bali',
        '/shop/en/cart',
        '/shop/id',
        '/gallery/en/not-found',
        '/en',
        '/en/product/1706',
        '/not-found',
        '/nope/deeper',
      ]) {
        const decision = decide(site, path)
        expect(decision, `${site} ${path}`).toMatchObject({
          kind: 'rewrite',
          why: 'not-found',
          to: notFoundPath(site, 'en'),
          status: PROXY_NOT_FOUND_STATUS,
        })
      }
    }
    expect(decide('shop', '/id/nope/deeper').to).toBe('/shop/id/not-found')
  })

  it('passes the host’s own site files on, and no other site’s', () => {
    expect(decide('gallery', '/gallery/logo.svg')).toMatchObject({
      kind: 'next',
      why: 'site-asset',
    })
    expect(decide('shop', '/shop/og.png')).toMatchObject({ kind: 'next', why: 'site-asset' })
    expect(decide('gallery', '/shop/logo.svg').why).toBe('not-found')
    expect(decide('gallery', '/gallery/secret.txt').why).toBe('not-found')
  })

  it('answers the root files per site', () => {
    expect(decide('gallery', '/favicon.ico')).toMatchObject({
      kind: 'rewrite',
      to: '/gallery/favicon.ico',
      why: 'root-file',
    })
    expect(decide('shop', '/apple-touch-icon-180x180-precomposed.png').to).toBe(
      '/shop/apple-touch-icon.png',
    )
    expect(decide('shop', '/site.webmanifest').to).toBe('/shop/site.webmanifest')
    expect(decide('gallery', '/robots.txt').to).toBe('/api/x/robots')
    expect(decide('gallery', '/sitemap-works.xml').to).toBe('/api/x/sitemap/works')
    // Only at the root, where browsers look: under a locale prefix it is no page and no file.
    expect(decide('gallery', '/id/site.webmanifest').why).toBe('not-found')
  })

  it('hands an old site’s URL to the legacy handler with its query', () => {
    expect(decide('gallery', '/category/7?s=sold')).toMatchObject({
      kind: 'rewrite',
      to: '/api/x/legacy/category/7?s=sold',
      why: 'legacy',
    })
    expect(decide('shop', '/our-collection/batik').why).toBe('legacy')
    expect(decide('shop', '/category/7').why).toBe('not-found')
  })
})

describe('what the proxy sets on what it passes on', () => {
  it('overwrites the client’s own copies of its headers', () => {
    const { setRequest } = decide('gallery', '/product/1706-bali', {
      'x-site': 'shop',
      'x-public-path': '/forged',
      'x-public-search': '?forged',
      'x-locale': 'id',
    })
    expect(setRequest).toMatchObject({
      [PROXY_REQUEST_HEADERS.site]: 'gallery',
      [PROXY_REQUEST_HEADERS.publicPath]: '/product/1706-bali',
      [PROXY_REQUEST_HEADERS.publicSearch]: '',
      [PROXY_REQUEST_HEADERS.locale]: 'en',
    })
  })

  it('keeps the item route’s own query in x-public-search, and no other page’s', () => {
    const item = decide('gallery', '/product/1706-old-slug?utm_source=mail')
    expect(item.setRequest[PROXY_REQUEST_HEADERS.publicSearch]).toBe('?utm_source=mail')
    const track = decide('shop', '/track/k3Jd9xQ2?ref=mail')
    expect(track.setRequest[PROXY_REQUEST_HEADERS.publicSearch]).toBe('')
  })

  it('marks a tracking token’s page no-referrer and noindex', () => {
    expect(decide('shop', '/track/k3Jd9xQ2').setResponse).toEqual({
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex',
    })
    expect(decide('shop', '/bag').setResponse).toEqual({})
  })

  it('supplies a User-Agent only when the request has none, and drops a client’s CSP', () => {
    expect(decide('gallery', '/').setRequest['user-agent']).toBe(PROXY_USER_AGENT)
    expect(decide('gallery', '/', { 'user-agent': '  ' }).setRequest['user-agent']).toBe(
      PROXY_USER_AGENT,
    )
    expect(decide('gallery', '/', { 'user-agent': 'Mozilla/5.0' }).setRequest['user-agent']).toBe(
      undefined,
    )
    expect(decide('gallery', '/').removeRequest).toEqual([
      'content-security-policy',
      'content-security-policy-report-only',
    ])
  })

  it('sets the CSP a builder gives, per site, on the answer and the request', () => {
    const decision = decideProxy(
      {
        url: new URL('http://localhost:4230/id'),
        headers: new Headers({ host: 'shop.localhost' }),
      },
      {
        env: ENV,
        contentSecurityPolicy: ({ site, locale }) => `default-src 'self'; x-${site}-${locale}`,
      },
    )
    expect(decision.setResponse['Content-Security-Policy']).toBe("default-src 'self'; x-shop-id")
    expect(decision.setRequest['content-security-policy']).toBe("default-src 'self'; x-shop-id")
  })
})

describe('the tenth tracking guess in a minute is throttled (TASKS.md 7.3.c)', () => {
  afterEach(() => resetTrackingGuessLimit())

  const guess = (address: string, token = 'k3Jd9xQ2') =>
    decide('shop', `/track/${token}`, { 'x-forwarded-for': address })

  it('the 10th distinct token in a minute passes and the 11th is a 429 with Retry-After', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) {
      expect(guess('5.5.5.5', `g${i}`), `request ${i + 1}`).toMatchObject({ kind: 'rewrite' })
    }
    const eleventh = guess('5.5.5.5', 'g-new')
    expect(eleventh).toMatchObject({ kind: 'respond', why: 'rate-limited', status: 429 })
    const wait = Number(eleventh.setResponse['Retry-After'])
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(60)
  })

  it('another address is unaffected', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) guess('6.6.6.6', `a${i}`)
    expect(guess('6.6.6.6', 'a-new')).toMatchObject({ kind: 'respond', status: 429 })
    expect(guess('7.7.7.7', 'a-new')).toMatchObject({ kind: 'rewrite' })
  })

  it('the order page’s tokens share the budget: the 11th new token is a 429 there too', () => {
    const headers = { 'x-forwarded-for': '9.9.9.9' }
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE / 2; i++) {
      expect(decide('shop', `/order/o${i}`, headers)).toMatchObject({ kind: 'rewrite' })
      expect(decide('shop', `/track/t${i}`, headers)).toMatchObject({ kind: 'rewrite' })
    }
    expect(decide('shop', '/order/o-new', headers)).toMatchObject({
      kind: 'respond',
      why: 'rate-limited',
      status: 429,
    })
  })

  it('a non-tracking surface is never counted against the budget', () => {
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE * 2; i++) {
      expect(decide('shop', '/bag', { 'x-forwarded-for': '8.8.8.8' })).toMatchObject({
        kind: 'rewrite',
      })
    }
    // The find-my-order page (no token) is not the per-guess surface either.
    expect(decide('shop', '/track', { 'x-forwarded-for': '8.8.8.8' })).toMatchObject({
      kind: 'rewrite',
    })
    expect(guess('8.8.8.8')).toMatchObject({ kind: 'rewrite' })
  })

  it('a buyer polling their own pending order page is never throttled', () => {
    const headers = { 'x-forwarded-for': '11.11.11.11' }
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE * 3; i++) {
      expect(decide('shop', '/order/my-token', headers), `refresh ${i + 1}`).toMatchObject({
        kind: 'rewrite',
      })
    }
  })

  it('the window slides: a minute later the budget is back', () => {
    const headers = { 'x-forwarded-for': '10.10.10.10' }
    for (let i = 0; i < TRACKING_GUESSES_PER_MINUTE; i++) decide('shop', `/track/s${i}`, headers)
    expect(decide('shop', '/track/a', headers)).toMatchObject({ kind: 'respond', status: 429 })

    const realNow = Date.now
    try {
      Date.now = () => realNow() + 60_001
      expect(decide('shop', '/track/a', headers)).toMatchObject({ kind: 'rewrite' })
    } finally {
      Date.now = realNow
    }
  })
})
