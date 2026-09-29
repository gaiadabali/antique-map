// Moved from .claude/specs/indies-platform/reviews/smoke-tests/routes.roundtrip.test.ts
// into the package it tests (TASKS.md 2.2.j), so `pnpm test` runs it.
import { describe, expect, it } from 'vitest'

import {
  createHref,
  parseListingQuery,
  parsePublicPath,
  routeMapSchema,
  type HrefParams,
  type LinkSurface,
} from '../src/routes'

const forms = {
  enquiry: 'enquire',
  offer: 'make-an-offer',
  consignment: 'sell-to-us',
  appointment: 'book-a-visit',
  // Module-gated kinds (2.4.e): "Reserve" and a quote or proforma for one item.
  hold: 'hold',
  quote: 'request-a-quote',
}
const en = {
  browse: 'browse',
  search: 'search',
  item: 'product',
  design: 'designs',
  maker: 'makers',
  place: 'places',
  collection: 'collections',
  source: 'sources',
  exhibition: 'exhibitions',
  location: 'visit',
  ig: 'ig',
  giftCard: 'gift-cards',
  newsletterArchive: 'newsletter',
  story: 'stories',
  catalogue: 'catalogues',
  cart: 'bag',
  checkout: 'checkout',
  order: 'orders',
  account: 'account',
  pay: 'pay',
  quote: 'quote',
  orderLookup: 'track',
  partnership: 'partnership',
  wishlist: 'wishlist',
  wantList: 'want-list',
  forms,
}
const id = {
  ...en,
  item: 'produk',
  browse: 'jelajah',
  place: 'tempat',
  search: 'cari',
  order: 'pesanan',
  forms: { ...forms, enquiry: 'tanya' },
}
const routes = routeMapSchema.parse({
  en,
  id,
  facets: {
    path: ['objectType', 'place'],
    vocabularies: {
      objectType: {
        en: { map: 'antique-maps', print: 'antique-prints' },
        id: { map: 'peta-antik', print: 'cetakan-antik' },
      },
    },
  },
  legacyPrefixes: ['/category/', '/storage/products/'],
})
const config = { routes, locales: { default: 'en' as const, supported: ['en', 'id'] as const } }
const href = createHref(config)

const cases: { [S in LinkSurface]?: HrefParams[S][] } = {
  home: [{}],
  browse: [
    {},
    { facets: { objectType: 'map' } },
    { facets: { objectType: ['map'] } },
    { facets: { objectType: 'map', place: 'java/batavia' } },
    { facets: { objectType: 'map', technique: ['etching', 'aquatint', 'etching'] }, page: 2 },
    { facets: { technique: 'etching' }, sort: 'priceAsc' },
    { facets: { objectType: ['map', 'print'] } },
    { sort: 'newest' },
  ],
  search: [
    { q: 'celebes' },
    { q: 'batavia', facets: { maker: 'valentijn' }, sort: 'priceDesc' },
    { q: '' },
  ],
  item: [
    { publicId: 1706, slug: 'bali-island' },
    { publicId: 12, slug: '' },
  ],
  design: [{ slug: 'harbour' }],
  maker: [{}, { slug: 'valentijn' }],
  place: [{}, { path: ['java', 'batavia'] }],
  story: [{ slug: 'survey' }],
  page: [{ slug: 'about' }],
  cart: [{}],
  checkout: [{}],
  order: [{ number: 'SG-000123' }],
  account: [{}, { section: 'wantLists' }, { section: 'offers' }],
  form: [
    { kind: 'enquiry' },
    { kind: 'offer', item: 1706 },
    { kind: 'enquiry', topic: 'framing', item: 3 },
    { kind: 'hold', item: 1001 },
    { kind: 'quote', item: 1001 },
    { kind: 'quote', item: 7001, variant: 70011 },
    { kind: 'appointment', appointment: '0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a' },
  ],
  pay: [{ token: 'tok_abc' }],
  quote: [{ token: 'q_1' }],
  orderLookup: [{}],
  giftCard: [{}],
  ig: [{}],
  // D39's want list by email: the bare page, watching a browse/search path, or waiting for
  // another example of an item (C10 `wantList`).
  wantList: [{}, { watch: '/antique-maps/java/batavia' }, { like: 1706 }],
}

describe('C10 round trip', () => {
  for (const locale of ['en', 'id'] as const) {
    for (const [surface, list] of Object.entries(cases)) {
      for (const params of list ?? []) {
        it(`${locale} ${surface} ${JSON.stringify(params)}`, () => {
          const url = href(surface as LinkSurface, params as never, locale)
          const [path, query = ''] = url.split('?')
          const parsed = parsePublicPath(config, path!, new URLSearchParams(query))
          expect(parsed.kind, url).toBe('surface')
          if (parsed.kind !== 'surface') return
          expect(parsed.surface).toBe(surface)
          expect(parsed.locale).toBe(locale)
          expect(href(parsed.surface, parsed.params as never, parsed.locale)).toBe(url)
        })
      }
    }
  }
})

describe('C10 canonical forms and rewrites', () => {
  it('one URL per state', () => {
    expect(href('browse', { facets: { objectType: ['map'] } }, 'en')).toBe('/antique-maps')
    expect(href('browse', { facets: { objectType: 'map' } }, 'en')).toBe('/antique-maps')
    expect(href('browse', { sort: 'newest' }, 'en')).toBe('/browse')
    expect(href('search', { q: 'x', sort: 'relevance' }, 'en')).toBe('/search?q=x')
    expect(href('browse', { facets: { technique: ['b', 'a', 'b'] } }, 'en')).toBe(
      '/browse?technique=a&technique=b',
    )
    expect(href('order', { number: 'SG-000123' }, 'id')).toBe('/id/pesanan/SG-000123')
  })
  it("writes the C2 fixtures' purchase-panel links", () => {
    // view-models may not import href() (boundary 3), so its fixtures spell these out.
    expect(href('form', { kind: 'hold', item: 1001 }, 'en')).toBe('/hold?item=1001')
    expect(href('form', { kind: 'quote', item: 1001 }, 'en')).toBe('/request-a-quote?item=1001')
    expect(href('form', { kind: 'quote', item: 7001, variant: 70011 }, 'en')).toBe(
      '/request-a-quote?item=7001&variant=70011',
    )
    // The account's reschedule link names the viewing by its id, never by a token (2.4.f).
    const appointment = '0d9c8b7a-6f5e-4d3c-8b2a-1f0e9d8c7b6a'
    expect(href('form', { kind: 'appointment', appointment }, 'en')).toBe(
      `/book-a-visit?appointment=${appointment}`,
    )
  })
  it('keeps an appointment only as the lowercase UUID it is written as', () => {
    const upper = new URLSearchParams('appointment=0D9C8B7A-6F5E-4D3C-8B2A-1F0E9D8C7B6A')
    expect(parsePublicPath(config, '/book-a-visit', upper)).toMatchObject({
      surface: 'form',
      params: { kind: 'appointment' },
      internal: '/en/form/appointment',
    })
  })
  it('rewrites to internal routes carrying the canonical query', () => {
    const p = parsePublicPath(
      config,
      '/antique-maps/java/batavia',
      new URLSearchParams('technique=etching&sort=newest&junk=1'),
    )
    expect(p).toMatchObject({
      kind: 'surface',
      surface: 'browse',
      internal: '/en/browse?objectType=map&place=java%2Fbatavia&technique=etching',
    })
    expect(parsePublicPath(config, '/id/produk/1706-bali-island')).toMatchObject({
      internal: '/id/item/1706-bali-island',
    })
    expect(parsePublicPath(config, '/account/want-lists')).toMatchObject({
      internal: '/en/account/wantLists',
    })
    expect(parsePublicPath(config, '/account')).toMatchObject({ internal: '/en/account/overview' })
    expect(parsePublicPath(config, '/')).toMatchObject({ surface: 'home', internal: '/en' })
    expect(parsePublicPath(config, '/id')).toMatchObject({ surface: 'home', internal: '/id' })
    expect(parsePublicPath(config, '/make-an-offer', { item: '1706' })).toMatchObject({
      surface: 'form',
      internal: '/en/form/offer?item=1706',
    })
    expect(parsePublicPath(config, '/about')).toMatchObject({
      surface: 'page',
      internal: '/en/page/about',
    })
    expect(parsePublicPath(config, '/category/maps/java')).toEqual({
      kind: 'legacy',
      internal: '/api/x/legacy/category/maps/java',
    })
    expect(parsePublicPath(config, '/admin')).toEqual({ kind: 'app' })
  })
  it('answers notFound for second addresses', () => {
    for (const path of [
      '/en/product/1706',
      '/en/item/1706',
      '/item/1706',
      '/nl/product/1',
      '/product/1706/extra',
      '/product/abc',
      '/bag/x',
      '/designs',
      '/About',
      '/id/admin',
      '/%E0%A4%A',
      '/want-list/extra',
    ]) {
      expect(parsePublicPath(config, path).kind, path).toBe('notFound')
    }
    // A want list takes one subject, so one subject has one URL (C10 `wantList`).
    const both = new URLSearchParams('watch=/antique-maps&like=1706')
    expect(parsePublicPath(config, '/want-list', both).kind).toBe('notFound')
  })
  it('parses a listing query, dropping what is not canonical', () => {
    expect(
      parseListingQuery(
        routes,
        'browse',
        new URLSearchParams('page=1&sort=bogus&maker=b&maker=a&maker=a'),
      ),
    ).toEqual({ facets: { maker: ['a', 'b'] } })
    expect(
      parseListingQuery(routes, 'search', { q: ' java ', page: '3', sort: 'relevance' }),
    ).toEqual({ q: 'java', page: 3 })
  })
  it('rejects a legacy prefix that shadows a live segment', () => {
    const bad = routeMapSchema.safeParse({ en, legacyPrefixes: ['/product/'] })
    expect(bad.success).toBe(false)
    const reserved = routeMapSchema.safeParse({ en, legacyPrefixes: ['/id/old/'] })
    expect(reserved.success).toBe(false)
    expect(routeMapSchema.safeParse({ en, legacyPrefixes: ['/category/'] }).success).toBe(true)
  })
})
