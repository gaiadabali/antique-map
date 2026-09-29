// C10 v1.2 (TASKS.md 3.4.c, 3.4.f): a segment spelt otherwise than href() spells it is no page's
// address (3.1 senior-fe #13); an old site's static page that moved reaches the legacy handler
// as an exact legacy path (MIGRATION.md §6); the account area is on while either account module
// is (3.1 qa).
import { describe, expect, it } from 'vitest'

import { testBrandConfig } from '../validate/testing/fixtures'
import {
  createHref,
  decodeSegments,
  hasSurface,
  legacyTarget,
  parsePublicPath,
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
      '/%70roduct/1706-bali-island',
      '/product/1706-b%61li-island', // the slug part too: the item route sees only the decoded slug
      '/%69d/produk/1706', // the locale prefix
      '/adm%69n', // the app's own route, not only the route map's
      '/antique-maps/java%2Fbatavia', // `%2F` joins two segments into one
      '/places/java%2fbatavia',
      '/product/1706-caf%c3%a9', // lower-case hex: encodeURIComponent writes upper case
      '/product/1706-a,b', // a raw sub-delimiter href() would have encoded
      '/product/%2E%2E',
      '/%E0%A4%A', // undecodable
    ]) {
      expect(parse(path).kind, path).toBe('notFound')
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
    expect(decodeSegments('//antique-maps//java/')).toEqual(['antique-maps', 'java'])
    expect(decodeSegments('/pr%6Fduct')).toBeNull()
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
      'quote',
      'partnership',
      'wishlist',
      'wantList',
    ])
    for (const surface of SURFACES.filter((each) => each !== 'account')) {
      expect(hasSurface(modules(), surface), surface).toBe(!gated.has(surface))
    }
    expect(hasSurface(modules('content.journal'), 'story')).toBe(true)
  })
})
