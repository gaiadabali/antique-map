// Each site's URLs (ARCHITECTURE.md §5): href() and parsePublicPath() are inverses on both sites,
// a segment spelt otherwise than href() spells it is no page's address (an old item link's slug
// excepted, which answers by its id), a surface the site does not have is no page there, and an
// old site's URL reaches the legacy handler.
import { describe, expect, it } from 'vitest'

import { SITES } from '../table'
import {
  createHref,
  decodeSegments,
  isSensitive,
  legacyTarget,
  parsePublicPath,
  type HrefParams,
  type LinkSurface,
} from './index'

const { gallery, shop } = SITES
/** A URL as the proxy reads it: its path as spelt (`URL.pathname` keeps escapes) and its query. */
const parseOn = (site: typeof gallery | typeof shop) => (url: string) => {
  const [path = '', query = ''] = url.split('?')
  return parsePublicPath(site, path, new URLSearchParams(query))
}

describe('href() and parsePublicPath() round-trip on each site', () => {
  const cases = {
    gallery: [
      ['home', {}],
      ['browse', {}],
      ['browse', { facets: { objectType: 'map' } }],
      ['browse', { facets: { objectType: 'map', place: 'java/batavia' } }],
      ['browse', { facets: { objectType: 'print', maker: 'blaeu' }, page: 2 }],
      ['search', { q: 'celebes' }],
      ['item', { publicId: 1706, slug: 'café-de-java' }],
      ['maker', {}],
      ['maker', { slug: 'blaeu' }],
      ['place', { path: ['java', 'batavia'] }],
      ['story', { slug: 'a-voyage' }],
      ['sellToUs', {}],
      ['page', { slug: 'about' }],
    ],
    shop: [
      ['home', {}],
      ['browse', {}],
      ['search', { q: 'tote' }],
      ['product', { slug: 'batik-tote' }],
      ['collection', {}],
      ['collection', { slug: 'homeware' }],
      ['cart', {}],
      ['checkout', {}],
      ['tracking', {}],
      ['tracking', { token: 'k3Jd9xQ2' }],
      ['order', { token: 'k3Jd9xQ2' }],
      ['order', { token: 'k3Jd9xQ2', simulate: true }],
      ['partnership', {}],
      ['stores', {}],
      ['page', { slug: 'delivery' }],
    ],
  } as const satisfies Record<'gallery' | 'shop', readonly (readonly [LinkSurface, object])[]>

  for (const [key, list] of Object.entries(cases) as ['gallery' | 'shop', typeof cases.gallery][]) {
    const site = SITES[key]
    const href = createHref(site)
    for (const locale of site.locales.supported) {
      for (const [surface, params] of list) {
        it(`${key} ${locale} ${surface} ${JSON.stringify(params)}`, () => {
          const url = href(surface, params as HrefParams[typeof surface], locale)
          const parsed = parseOn(site)(url)
          expect(parsed).toMatchObject({ kind: 'surface', surface, locale })
          if (parsed.kind !== 'surface') return
          expect(href(parsed.surface, parsed.params as never, parsed.locale)).toBe(url)
          expect(parsed.internal.startsWith(`/${locale}`)).toBe(true)
        })
      }
    }
  }

  it('spells the URLs ARCHITECTURE.md §5 lists', () => {
    const g = createHref(gallery)
    const s = createHref(shop)
    expect(g('browse', { facets: { objectType: 'map' } }, 'id')).toBe('/id/peta-antik')
    expect(g('item', { publicId: 1706, slug: 'bali' }, 'en')).toBe('/product/1706-bali')
    expect(g('sellToUs', {}, 'id')).toBe('/id/jual-ke-kami')
    expect(s('product', { slug: 'batik-tote' }, 'id')).toBe('/id/produk/batik-tote')
    expect(s('cart', {}, 'id')).toBe('/id/keranjang')
    expect(s('tracking', { token: 'abc' }, 'en')).toBe('/track/abc')
    expect(s('stores', {}, 'id')).toBe('/id/toko')
    expect(s('order', { token: 'abc' }, 'en')).toBe('/order/abc')
    expect(s('order', { token: 'abc' }, 'id')).toBe('/id/pesanan/abc')
    expect(s('order', { token: 'abc', simulate: true }, 'en')).toBe('/order/abc/simulate')
  })
})

describe('the order surface is sensitive, and its shape is exact', () => {
  it('is sensitive, carries no index, and refuses anything but a token and "simulate"', () => {
    expect(isSensitive('order')).toBe(true)
    const parse = parseOn(shop)
    for (const path of ['/order', '/order/a/b', '/order/a/simulate/x']) {
      expect(parse(path).kind, path).toBe('notFound')
    }
    expect(parse('/order/a/simulate')).toMatchObject({
      kind: 'surface',
      surface: 'order',
      params: { token: 'a', simulate: true },
    })
  })
})

describe('a site has only its own surfaces', () => {
  it('throws for a surface the site does not have, and never parses one', () => {
    expect(() => createHref(gallery)('cart', {}, 'en')).toThrow(/no segment for cart/)
    expect(() => createHref(shop)('maker', {}, 'en')).toThrow(/no segment for maker/)
    // The gallery's `/bag` is just a page slug there, the shop's `/makers` too.
    expect(parseOn(gallery)('/bag')).toMatchObject({ surface: 'page', params: { slug: 'bag' } })
    expect(parseOn(shop)('/makers')).toMatchObject({ surface: 'page', params: { slug: 'makers' } })
    // One segment, two meanings: the gallery's item by id, the shop's product by slug.
    expect(parseOn(gallery)('/product/1706-bali')).toMatchObject({ surface: 'item' })
    expect(parseOn(shop)('/product/batik-tote')).toMatchObject({ surface: 'product' })
    expect(parseOn(shop)('/product/Batik').kind).toBe('notFound')
  })

  it('throws for a locale the site does not serve', () => {
    expect(() => createHref(gallery)('home', {}, 'nl')).toThrow(/locale "nl"/)
    expect(parseOn(gallery)('/nl').kind).toBe('notFound')
  })
})

describe('a segment is read only in href()’s own spelling', () => {
  const parse = parseOn(gallery)
  it('refuses a second spelling of a page, a reserved or an internal-looking path', () => {
    expect(parse('/product/1706-bali-island')).toMatchObject({ kind: 'surface', surface: 'item' })
    for (const path of [
      '/pr%6Fduct/1706',
      '/%69d/produk/1706',
      '/adm%69n',
      '/admin',
      '/api/works',
      '/en',
      '/en/product/1706',
      '/id/id',
      '/not-found',
      '/_next/static/x.js',
      '/antique-maps/java%2Fbatavia',
      '/product/1706-a%2Fb',
      '/product/17%306-bali',
      '/%E0%A4%A',
      '//product/1706',
      '/product/1706/',
      '/makers/blaeu/extra',
      '/gallery/en',
      '/gallery/en/item/1706-bali',
    ]) {
      expect(parse(path).kind, path).toBe('notFound')
    }
    expect(parseOn(shop)('/shop/en/browse').kind).toBe('notFound')
  })

  it('sends an old item link with an odd slug to the item route, whose slug never matches', () => {
    for (const [path, slug] of [
      ['/product/1706-b%61li-island', 'b%61li-island'],
      ['/product/1706-van-t%27hoff', 'van-t%27hoff'],
      ['/id/produk/1706-b%61li', 'b%61li'],
    ] as const) {
      const parsed = parse(path)
      expect(parsed, path).toMatchObject({ kind: 'surface', surface: 'item', params: { slug } })
      if (parsed.kind !== 'surface') continue
      expect(parsed.internal).toBe(`/${parsed.locale}/item/${encodeURIComponent(`1706-${slug}`)}`)
    }
  })

  it('keeps what href() writes, an encoded character included', () => {
    expect(createHref(gallery)('item', { publicId: 1706, slug: 'café-java' }, 'en')).toBe(
      '/product/1706-caf%C3%A9-java',
    )
    expect(decodeSegments('/product/1706-caf%C3%A9-java')).toEqual(['product', '1706-café-java'])
    expect(decodeSegments('//antique-maps//java/')).toBeNull()
  })

  it('refuses a path element href() cannot write as one segment', () => {
    const href = createHref(gallery)
    expect(() => href('item', { publicId: 1706, slug: 'a/b' }, 'en')).toThrow(/holds a "\/"/)
    expect(() => createHref(shop)('product', { slug: '' }, 'en')).toThrow(/is empty/)
  })
})

describe('an old site’s URLs go to the legacy handler (DATA.md §6)', () => {
  it('takes each site’s own prefixes, with nothing of the other’s', () => {
    expect(parseOn(gallery)('/category/12-java')).toEqual({
      kind: 'legacy',
      internal: '/api/x/legacy/category/12-java',
    })
    expect(parseOn(gallery)('/account')).toMatchObject({ kind: 'legacy' })
    expect(parseOn(shop)('/our-collection/batik')).toMatchObject({ kind: 'legacy' })
    expect(legacyTarget(shop.routes, '/category/12-java')).toBeNull()
  })
})
