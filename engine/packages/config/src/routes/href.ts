/**
 * @contract C10 — the route map: href() · owner: ARC · entry: `@engine/config/routes`
 *
 * Builds every public URL from a surface, its params and a locale. Deterministic — a
 * listing's state goes through `canonicalListing()` first — so a canonical URL is `href()` of
 * a page's own state and one state never has two URLs; `./parse.ts` is the inverse. No URL
 * built here carries a credential: an order opens with the session or the order-access
 * cookie (C13 `ORDER_ACCESS`), never with a token in its query string.
 */
import { FACET_KEYS, type FacetKey, type SortKey } from '../schema/facets'
import type { LocaleCode } from '../schema/locales'
import type { LocaleSegments, RouteMap } from '../routes'
import { ACCOUNT_SECTIONS, type AccountSection, type FormKind, type LinkSurface } from './surfaces'

/** A listing's state in the URL. A place value is its gazetteer path: `java/batavia`. */
export type ListingQuery = {
  facets?: Partial<Record<FacetKey, string | readonly string[]>>
  sort?: SortKey
  page?: number
}
/** What a listing page's URL holds: its query, and for search the words searched. */
export type ListingState = ListingQuery & { q?: string }
export type ListingSurface = 'browse' | 'search'

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
  /** The number alone opens nothing: the session or the order-access cookie does (C13). */
  order: { number: string }
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
type Context = { routes: RouteMap; segments: LocaleSegments; locale: LocaleCode; p: Params }

/**
 * A listing's state in its one canonical form: each facet's values deduped and sorted, a
 * single value as a string (so `['map']` and `'map'` are one URL), empty values dropped, and
 * page 1, the listing's `defaultSort` and an empty search left out.
 */
export function canonicalListing(
  routes: RouteMap,
  surface: ListingSurface,
  state: ListingState,
): ListingState {
  const facets: Partial<Record<FacetKey, string | readonly string[]>> = {}
  for (const key of FACET_KEYS) {
    const values = [...new Set([state.facets?.[key] ?? []].flat())].filter((v) => v !== '')
    const [only] = values
    if (only !== undefined) facets[key] = values.length === 1 ? only : values.sort()
  }
  const q = surface === 'search' ? state.q?.trim() : undefined
  const sort = state.sort === routes.defaultSort[surface] ? undefined : state.sort
  const page = state.page !== undefined && state.page > 1 ? state.page : undefined
  return {
    ...(q ? { q } : {}),
    ...(Object.keys(facets).length > 0 ? { facets } : {}),
    ...(sort ? { sort } : {}),
    ...(page ? { page } : {}),
  }
}

/** A canonical state as a query string, keys in one order: `q`, `FACET_KEYS`, `sort`, `page`. */
export function listingSearch(state: ListingState, omit: readonly FacetKey[] = []): string {
  const values: Record<string, string | number | readonly string[] | undefined> = { q: state.q }
  for (const key of FACET_KEYS) values[key] = omit.includes(key) ? undefined : state.facets?.[key]
  return searchOf({ ...values, sort: state.sort, page: state.page })
}

/**
 * `const href = createHref(brand)`, then `href(surface, params, locale)` → a root-relative
 * path. A locale without a segment map throws: `validateBrandConfigs()` guarantees one per
 * supported locale, so that is a bug.
 */
export function createHref(config: HrefConfig): Href {
  return (surface, params, locale) => {
    const segments = config.routes[locale]
    if (!segments) throw new Error(`no route segments for locale "${locale}"`)
    const context = { routes: config.routes, segments, locale, p: params as Params }
    const [parts, search] = partsOf(context, surface)
    const prefix = locale === config.locales.default ? '' : `/${locale}`
    const path = parts.map((part) => `/${encodeURIComponent(part)}`).join('')
    return (prefix + path || '/') + search
  }
}

function partsOf(context: Context, surface: LinkSurface): [string[], string] {
  const { segments, p } = context
  const slug = p.slug ? [p.slug] : []
  switch (surface) {
    case 'home':
      return [[], '']
    case 'page':
      return [slug, '']
    case 'form':
      return [[segments.forms[p.kind ?? 'enquiry']], searchOf({ item: p.item, topic: p.topic })]
    case 'item':
      return [[segments.item, p.slug ? `${p.publicId}-${p.slug}` : `${p.publicId}`], '']
    case 'place':
      return [[segments.place, ...(p.path ?? [])], '']
    case 'order':
      return [[segments.order, p.number ?? ''], '']
    case 'account': {
      const section = ACCOUNT_SECTIONS[p.section ?? 'overview'].segment
      return [[segments.account, ...(section ? [section] : [])], '']
    }
    case 'pay':
    case 'quote':
      return [[segments[surface], p.token ?? ''], '']
    case 'browse':
    case 'search':
      return listing(context, surface)
    default:
      return [[segments[surface], ...slug], '']
  }
}

/** `/{base}?state…`, or for browse a named facet path when the state allows one. */
function listing({ routes, segments, locale, p }: Context, surface: ListingSurface) {
  const state = canonicalListing(routes, surface, p)
  const path: string[] = []
  const named: FacetKey[] = []
  for (const key of surface === 'browse' ? routes.facets.path : []) {
    const value = state.facets?.[key]
    const vocabulary = routes.facets.vocabularies[key]
    if (typeof value !== 'string' || (path.length === 0 && !vocabulary)) break
    const segment = vocabulary ? vocabulary[locale]?.[value] : value
    if (segment === undefined) break
    path.push(...segment.split('/'))
    named.push(key)
  }
  const parts = path.length > 0 ? path : [segments[surface]]
  return [parts, listingSearch(state, named)] satisfies [string[], string]
}

/** Insertion-ordered; an array value repeats its key; `undefined` is left out. */
function searchOf(query: Record<string, string | number | readonly string[] | undefined>) {
  const pairs = Object.entries(query).flatMap(([key, value]) =>
    [value ?? []].flat().map((each) => `${key}=${encodeURIComponent(each)}`),
  )
  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}
