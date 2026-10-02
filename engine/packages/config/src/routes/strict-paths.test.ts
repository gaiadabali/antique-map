// C10 v1.2 (TASKS.md 3.4.c, 3.4.f): a segment spelt otherwise than href() spells it is no page's
// address (3.1 senior-fe #13), but for an old item link's slug, which answers by its id (3.4
// senior-fe #1), and neither is an empty one, nor a path element href() is given (3.4 senior-be
// #9); an old site's static page that moved reaches the legacy handler as an exact legacy path
// (MIGRATION.md §6), and a rule the proxy never reaches is refused (3.4 senior-be #8); the account
// area is on while either account module is (3.1 qa).
import { describe, expect, it } from 'vitest'

import { testBrandConfig } from '../validate/testing/fixtures'
import {
  CLAIMED_SEGMENTS,
  createHref,
  decodeSegments,
  hasSurface,
  legacyTarget,
  parsePublicPath,
  ROOT_FILES,
  routeMapSchema,
  SURFACES,
} from '../routes'
import { brandConfigSchema, type ModuleKey } from '../schema'

const gallery = brandConfigSchema.parse(testBrandConfig('gallery'))
/** The synthetic gallery's route map as committed, before parsing. */
const galleryRoutes = () => testBrandConfig('gallery').routes as Record<string, unknown>
const parse = (path: string, routes = gallery.routes) =>
  parsePublicPath({ routes, locales: gallery.locales }, path)

describe('C10 — a segment is read only in href()’s own spelling', () => {
  it('refuses a planted %6F, and every other second spelling of a page', () => {
    expect(parse('/product/1706-bali-island')).toMatchObject({ kind: 'surface', surface: 'item' })
    for (const path of [
      '/pr%6Fduct/1706', // `o`, percent-encoded: the item page at a second address (senior-fe #13)
      '/%70roduct/1706-bali-island', // a segment that picks the surface is always canonical
      '/%69d/produk/1706', // the locale prefix
      '/adm%69n', // the app's own route, not only the route map's
      '/antique-maps/java%2Fbatavia', // `%2F` joins two segments into one
      '/places/java%2fbatavia',
      '/product/1706-a%2Fb', // … in an item's slug too
      '/product/17%306-bali', // an item's id is canonical
      '/product/%2E%2E',
      '/%E0%A4%A', // undecodable
      '//product/1706', // an empty segment (Next answers 308 before the proxy runs)
      '/product/1706/',
    ]) {
      expect(parse(path).kind, path).toBe('notFound')
    }
  })

  it('sends an old item link with an odd slug to the item route, whose slug never matches (fe #1)', () => {
    // MIGRATION.md §6: /product/{id}-{anything} answers by its id — a permanent redirect to the
    // current slug, never a second 200 address, so the slug reaches the route as it was asked.
    for (const [path, slug] of [
      ['/product/1706-b%61li-island', 'b%61li-island'],
      ['/product/1706-caf%c3%a9', 'caf%c3%a9'], // the parser's own reading: Next upper-cases it first
      ['/product/1706-a,b', 'a,b'],
      ['/product/1706-van-t%27hoff', 'van-t%27hoff'],
      ['/product/1706-(bali)+java', '(bali)+java'],
      ['/id/produk/1706-b%61li', 'b%61li'],
    ] as const) {
      const parsed = parse(path)
      expect(parsed, path).toMatchObject({ kind: 'surface', surface: 'item' })
      if (parsed.kind !== 'surface' || parsed.surface !== 'item') continue
      expect(parsed.params, path).toEqual({ publicId: 1706, slug })
      // A character no slug has (`%`, a sub-delimiter): it matches no item, ever.
      expect(slug, path).not.toMatch(/^[a-z0-9-]+$/)
      expect(parsed.internal, path).toBe(
        `/${parsed.locale}/item/${encodeURIComponent(`1706-${slug}`)}`,
      )
    }
  })

  it('keeps what href() writes, an encoded character included', () => {
    const href = createHref(gallery)
    const url = href('item', { publicId: 1706, slug: 'café-java' }, 'en')
    expect(url).toBe('/product/1706-caf%C3%A9-java')
    expect(parse(url)).toMatchObject({
      kind: 'surface',
      surface: 'item',
      params: { publicId: 1706, slug: 'café-java' },
    })
    expect(decodeSegments('/product/1706-caf%C3%A9-java')).toEqual(['product', '1706-café-java'])
    expect(decodeSegments('/')).toEqual([])
    expect(decodeSegments('//antique-maps//java/')).toBeNull()
    expect(decodeSegments('/pr%6Fduct')).toBeNull()
  })

  it('refuses a path element href() cannot write as one segment (be #9, fe #6)', () => {
    const href = createHref(gallery)
    expect(() => href('item', { publicId: 1706, slug: 'a/b' }, 'en')).toThrow(/holds a "\/"/)
    expect(() => href('place', { path: ['java/batavia'] }, 'en')).toThrow(/holds a "\/"/)
    expect(() => href('order', { number: '' }, 'en')).toThrow(/is empty/)
    expect(href('place', { path: ['java', 'batavia'] }, 'en')).toBe('/places/java/batavia')
  })
})

describe('C10 — exact legacy paths (MIGRATION.md §6)', () => {
  const routes = routeMapSchema.parse({
    ...galleryRoutes(),
    legacyPaths: ['/about-us', '/terms-conditions', '/new-additions', '/s'],
  })

  it('hands a moved static page to the legacy handler, exactly as asked for', () => {
    expect(parse('/about-us', routes)).toEqual({
      kind: 'legacy',
      internal: '/api/x/legacy/about-us',
    })
    expect(parse('/s', routes)).toEqual({ kind: 'legacy', internal: '/api/x/legacy/s' })
    // Exact: another spelling or a deeper path is no legacy URL, and parses on its own terms.
    expect(parse('/About-Us', routes).kind).toBe('notFound')
    expect(parse('/about-us/team', routes).kind).toBe('notFound')
    expect(parse('/about', routes)).toMatchObject({ kind: 'surface', surface: 'page' })
    expect(legacyTarget(routes, '/category/12-java')).toBe('/api/x/legacy/category/12-java')
    expect(legacyTarget(routes, '/about-us')).toBe('/api/x/legacy/about-us')
    expect(legacyTarget(routes, '/about-us-too')).toBeNull()
  })

  it('refuses a legacy path that is live, sits under a prefix, repeats or is no exact path', () => {
    const issues = (legacyPaths: string[]) => {
      const result = routeMapSchema.safeParse({ ...galleryRoutes(), legacyPaths })
      return result.success ? [] : result.error.issues.map((issue) => issue.message)
    }
    expect(issues(['/stories'])).toEqual([
      'legacy path "/stories" shadows the live root segment "stories"',
    ])
    expect(issues(['/id/tentang-kami'])).toEqual([
      'legacy path "/id/tentang-kami" shadows the live root segment "id"',
    ])
    expect(issues(['/category/12-java'])).toEqual([
      'legacy path "/category/12-java" already sits under the legacy prefix "/category/"',
    ])
    expect(issues(['/about-us', '/about-us'])).toEqual(['legacy path "/about-us" is listed twice'])
    for (const shape of ['/about-us/', 'about-us', '/about us', '/about-us?x=1', '/'])
      expect(issues([shape]), shape).toEqual([
        'an exact path such as "/about-us", with no trailing "/"',
      ])
  })

  it('refuses a rule the proxy never reaches it with: it would be dead (3.4 senior-be #8)', () => {
    const issues = (rules: { legacyPaths?: string[]; legacyPrefixes?: string[] }) => {
      const result = routeMapSchema.safeParse({ ...galleryRoutes(), ...rules })
      return result.success ? [] : result.error.issues.map((issue) => issue.message)
    }
    expect(issues({ legacyPaths: ['/robots.txt', '/sitemap-2019.xml', '/favicon.ico'] })).toEqual(
      ['/robots.txt', '/sitemap-2019.xml', '/favicon.ico'].map(
        (path) => `legacy path "${path}" is a root file, which the proxy answers first`,
      ),
    )
    expect(issues({ legacyPaths: ['/apple-touch-icon-120x120.png'] })).toHaveLength(1)
    expect(issues({ legacyPaths: ['/Not-Found', '/_next/static'] })).toEqual([
      'legacy path "/Not-Found" starts with "Not-Found", which Next or the proxy answers first',
      'legacy path "/_next/static" starts with "_next", which Next or the proxy answers first',
    ])
    expect(issues({ legacyPrefixes: ['/.well-known/'] })).toEqual([
      'legacy prefix "/.well-known/" starts with ".well-known", which Next or the proxy answers first',
    ])
    for (const rule of ['/old/../about', '/./about']) {
      expect(issues({ legacyPaths: [rule] }), rule).toEqual([
        `legacy path "${rule}" has a "." or ".." segment, which the URL parser removes: no request carries one`,
      ])
    }
    // Neither exact nor claimed: a file of the same name under a prefix is the old site's own.
    expect(issues({ legacyPaths: ['/Robots.txt'], legacyPrefixes: ['/robots.txt/'] })).toEqual([])
  })

  it('keeps every root file a prefix claims behind a claimed first segment', () => {
    for (const pattern of ROOT_FILES) {
      const [first, ...deeper] = pattern.split('/').slice(1)
      if (deeper.length > 0) expect(CLAIMED_SEGMENTS, pattern).toContain(first)
    }
    const segments = (en: Record<string, unknown>) =>
      routeMapSchema.safeParse({
        ...galleryRoutes(),
        en: { ...(galleryRoutes().en as object), ...en },
      })
    expect(segments({ story: 'not-found' }).error?.issues[0]?.message).toBe(
      '"not-found" is reserved or used twice at the root of "en"',
    )
    expect(parse('/not-found').kind).toBe('notFound')
  })
})

describe('C10 — the account area is on while either account module is (3.4.f)', () => {
  const modules = (...on: ModuleKey[]) => ({
    modules: Object.fromEntries(on.map((key) => [key, true])),
  })

  it('opens for buyers, for partners, and for neither on a brand without accounts', () => {
    expect(hasSurface(modules('accounts.buyers'), 'account')).toBe(true)
    expect(hasSurface(modules('accounts.retailers'), 'account')).toBe(true)
    expect(hasSurface(modules('accounts.buyers', 'accounts.retailers'), 'account')).toBe(true)
    expect(hasSurface(modules(), 'account')).toBe(false)
    expect(hasSurface(modules('retention.wishlist'), 'account')).toBe(false)
  })

  it('reads every other surface as its module column says', () => {
    // The surfaces one module switches on, pinned: a new one is added here on purpose.
    const gated = new Set([
      'design',
      'maker',
      'place',
      'exhibition',
      'ig',
      'giftCard',
      'newsletterArchive',
      'story',
      'catalogue',
      'cart',
      'checkout',
      'quote',
      'partnership',
      'wishlist',
      'wantList',
    ])
    for (const surface of SURFACES.filter((each) => each !== 'account')) {
      expect(hasSurface(modules(), surface), surface).toBe(!gated.has(surface))
    }
    expect(hasSurface(modules('content.journal'), 'story')).toBe(true)
    // v1.5 (D50): the bag and checkout are a brand's that buys online; a gallery selling by
    // invoice alone has neither, and its pay links, orders and order lookup stay open.
    expect(hasSurface(modules('purchase.checkout'), 'cart')).toBe(true)
    expect(hasSurface(modules('purchase.checkout'), 'checkout')).toBe(true)
    for (const open of ['pay', 'order', 'orderLookup'] as const) {
      expect(hasSurface(modules(), open), open).toBe(true)
    }
  })
})
