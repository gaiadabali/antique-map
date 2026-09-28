/**
 * @contract C10 — the route map: href() · owner: ARC · entry: `@engine/config/routes`
 *
 * Builds every public URL from a surface, its params and a locale. Deterministic, so a
 * canonical URL is `href()` of a page's own state.
 */
import { FACET_KEYS, type FacetKey } from '../schema/facets'
import type { LocaleCode } from '../schema/locales'
import type { LocaleSegments, RouteMap } from '../routes'
import { ACCOUNT_SECTIONS, type AccountSection, type FormKind, type LinkSurface } from './surfaces'

/** A listing's state in the URL. A place value is its gazetteer path: `java/batavia`. */
export type ListingQuery = {
  facets?: Partial<Record<FacetKey, string | readonly string[]>>
  sort?: string
  page?: number
}
/** No params: `{}`. Any property is an excess-property error. */
type NoParams = { _?: never }
type IndexOrSlug = { slug?: string }

export type HrefParams = {
  home: NoParams
  browse: ListingQuery
  search: ListingQuery & { q: string }
  item: { publicId: number; slug: string }
  design: { slug: string }
  maker: IndexOrSlug
  place: { path?: readonly string[] }
  collection: IndexOrSlug
  source: IndexOrSlug
  exhibition: IndexOrSlug
  location: IndexOrSlug
  ig: NoParams
  giftCard: NoParams
  newsletterArchive: IndexOrSlug
  story: IndexOrSlug
  catalogue: IndexOrSlug
  page: { slug: string }
  cart: NoParams
  checkout: NoParams
  /** Without `lookupToken`, only the signed-in buyer's session opens it (C6 `OrderAccess`). */
  order: { number: string; lookupToken?: string }
  account: { section?: AccountSection }
  form: { kind: FormKind; item?: number; topic?: string }
  pay: { token: string }
  quote: { token: string }
  orderLookup: NoParams
}
/** What `href()` reads from a brand config. */
export type HrefConfig = { routes: RouteMap; locales: { default: LocaleCode } }
/** `HrefParams[S]` fails to compile for a surface with an address but no params entry. */
export type Href = <S extends LinkSurface>(s: S, params: HrefParams[S], l: LocaleCode) => string

type Intersect<U> = (U extends unknown ? (u: U) => void : never) extends (i: infer I) => void
  ? I
  : never
/** Every surface's params in one optional bag, for the implementation only. */
type Params = Partial<Intersect<HrefParams[LinkSurface]>>
/** Insertion-ordered; an array value repeats its key; `undefined` is left out. */
type Query = Record<string, string | number | readonly string[] | undefined>
type Context = { routes: RouteMap; segments: LocaleSegments; locale: LocaleCode; p: Params }

/**
 * `const href = createHref(brand)`, then `href(surface, params, locale)` → a root-relative
 * path. Deterministic — facets in `FACET_KEYS` order, values sorted, page 1 omitted — so a
 * canonical URL is `href()` of the listing's own state. A locale without a segment map
 * throws: `validateBrandConfigs()` guarantees one per supported locale, so that is a bug.
 */
export function createHref(config: HrefConfig): Href {
  return (surface, params, locale) => {
    const segments = config.routes[locale]
    if (!segments) throw new Error(`no route segments for locale "${locale}"`)
    const context = { routes: config.routes, segments, locale, p: params as Params }
    const [parts, query] = partsOf(context, surface)
    const prefix = locale === config.locales.default ? '' : `/${locale}`
    const path = parts.map((part) => `/${encodeURIComponent(part)}`).join('')
    const search = Object.entries(query).flatMap(([key, value]) =>
      [value ?? []].flat().map((each) => `${key}=${encodeURIComponent(each)}`),
    )
    return (prefix + path || '/') + (search.length > 0 ? `?${search.join('&')}` : '')
  }
}

function partsOf(context: Context, surface: LinkSurface): [string[], Query] {
  const { segments, p } = context
  const slug = p.slug ? [p.slug] : []
  switch (surface) {
    case 'home':
      return [[], {}]
    case 'page':
      return [slug, {}]
    case 'form':
      return [[segments.forms[p.kind ?? 'enquiry']], { item: p.item, topic: p.topic }]
    case 'item':
      return [[segments.item, p.slug ? `${p.publicId}-${p.slug}` : `${p.publicId}`], {}]
    case 'place':
      return [[segments.place, ...(p.path ?? [])], {}]
    case 'order':
      return [[segments.order, p.number ?? ''], { lookupToken: p.lookupToken }]
    case 'account': {
      const section = ACCOUNT_SECTIONS[p.section ?? 'overview'].segment
      return [[segments.account, ...(section ? [section] : [])], {}]
    }
    case 'pay':
    case 'quote':
      return [[segments[surface], p.token ?? ''], {}]
    case 'browse':
      return listing(context, segments.browse, true)
    case 'search':
      return listing(context, segments.search, false)
    default:
      return [[segments[surface], ...slug], {}]
  }
}

/** `/{base}?facets…`, or for browse a named facet path when the facets allow one. */
function listing({ routes, locale, p }: Context, base: string, named: boolean): [string[], Query] {
  const facets = { ...p.facets }
  const path: string[] = []
  for (const key of named ? routes.facets.path : []) {
    const value = facets[key]
    const vocabulary = routes.facets.vocabularies[key]
    if (typeof value !== 'string' || (path.length === 0 && !vocabulary)) break
    const segment = vocabulary ? vocabulary[locale]?.[value] : value
    if (segment === undefined) break
    path.push(...segment.split('/'))
    delete facets[key]
  }
  const query: Query = { q: p.q }
  for (const key of FACET_KEYS) {
    const value = facets[key]
    query[key] = typeof value === 'object' ? [...value].sort() : value
  }
  Object.assign(query, { sort: p.sort, page: p.page && p.page > 1 ? p.page : undefined })
  return [path.length > 0 ? path : [base], query]
}
