/**
 * `href()`: every public URL, from a surface, its params and a locale, for one site. Deterministic
 * — a listing's state goes through `canonicalListing()` first — so a canonical URL is `href()` of
 * a page's own state and one state never has two URLs; `./parse` is the inverse. It builds a
 * root-relative path only: an absolute URL takes its origin from the site's canonical host
 * (`../hosts`), never from a request.
 */
import type { LocaleCode } from '../../constants'
import { FACET_KEYS, type FacetKey, type SortKey } from '../../constants/facets'
import type { LinkSurface, SegmentSurface } from './surfaces'
import type { LocaleSegments, RouteConfig, RouteMap } from './types'

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
  product: { slug: string }
  maker: IndexOrSlug
  place: { path?: readonly string[] }
  story: IndexOrSlug
  collection: IndexOrSlug
  cart: NoParams
  checkout: NoParams
  /** No token: the find-my-order page. A token is the order's whole credential. */
  tracking: { token?: string }
  /** The order page after checkout, or its simulator child when `simulate` is set. */
  order: { token: string; simulate?: true }
  partnership: NoParams
  stores: NoParams
  sellToUs: NoParams
  contact: NoParams
  page: { slug: string }
}

/** `HrefParams[S]` fails to compile for a surface with an address but no params entry. */
export type Href = <S extends LinkSurface>(s: S, params: HrefParams[S], l: LocaleCode) => string

type Intersect<U> = (U extends unknown ? (u: U) => void : never) extends (i: infer I) => void
  ? I
  : never
/** Every surface's params in one optional bag, for the implementation only. */
type Params = Partial<Intersect<HrefParams[LinkSurface]>>
type Context = { routes: RouteMap; segments: LocaleSegments; locale: LocaleCode; p: Params }

/**
 * A listing's state in its one canonical form: each facet's values deduped and sorted, a single
 * value as a string (so `['map']` and `'map'` are one URL), empty values dropped, and page 1, the
 * listing's `defaultSort` and an empty search left out.
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
 * `const href = createHref(SITES.gallery)`, then `href(surface, params, locale)` → a
 * root-relative path. A locale the site does not serve throws, and so does a surface the site
 * does not have (no segment in its map): nothing may link there, so either is a bug. So does a
 * path element that is empty or holds a `/` (a slug, a token, a place's element): it cannot be one
 * segment, and `parsePublicPath()` would answer its URL not-found.
 */
export function createHref(config: RouteConfig): Href {
  return (surface, params, locale) => {
    const segments = config.routes[locale]
    if (!segments || !config.locales.supported.includes(locale)) {
      throw new Error(`no route segments for locale "${locale}"`)
    }
    const context = { routes: config.routes, segments, locale, p: params as Params }
    const [parts, search] = partsOf(context, surface)
    const prefix = locale === config.locales.default ? '' : `/${locale}`
    const path = parts.map((part) => `/${segmentOf(part, surface)}`).join('')
    return (prefix + path || '/') + search
  }
}

/** A path element as one segment, in the one spelling `parsePublicPath()` reads. */
function segmentOf(part: string, surface: LinkSurface): string {
  if (part === '') throw new Error(`a path element of "${surface}" is empty`)
  if (part.includes('/')) {
    throw new Error(`a path element of "${surface}" holds a "/": "${part}" would be two segments`)
  }
  return encodeURIComponent(part)
}

function partsOf(context: Context, surface: LinkSurface): [string[], string] {
  const { p } = context
  const at = (s: SegmentSurface) => present(context, s)
  switch (surface) {
    case 'home':
      return [[], '']
    case 'page':
      return [[p.slug ?? ''], '']
    case 'item':
      return [[at('item'), p.slug ? `${p.publicId}-${p.slug}` : `${p.publicId}`], '']
    case 'product':
      return [[at('product'), p.slug ?? ''], '']
    case 'place':
      return [[at('place'), ...(p.path ?? [])], '']
    case 'tracking':
      return [[at('tracking'), ...(p.token === undefined ? [] : [p.token])], '']
    case 'order':
      return [[at('order'), p.token as string, ...(p.simulate ? ['simulate'] : [])], '']
    case 'browse':
    case 'search':
      return listing(context, surface)
    default:
      return [[at(surface), ...(p.slug ? [p.slug] : [])], '']
  }
}

function present({ segments, locale }: Context, surface: SegmentSurface): string {
  const segment = segments[surface]
  if (segment === undefined) throw new Error(`no segment for ${surface} in "${locale}"`)
  return segment
}

/** `/{base}?state…`, or for browse a named facet path when the state allows one. */
function listing(context: Context, surface: ListingSurface): [string[], string] {
  const { routes, locale, p } = context
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
  const parts = path.length > 0 ? path : [present(context, surface)]
  return [parts, listingSearch(state, named)]
}

/** Insertion-ordered; an array value repeats its key; `undefined` is left out. */
function searchOf(query: Record<string, string | number | readonly string[] | undefined>) {
  const pairs = Object.entries(query).flatMap(([key, value]) =>
    [value ?? []].flat().map((each) => `${key}=${encodeURIComponent(each)}`),
  )
  return pairs.length > 0 ? `?${pairs.join('&')}` : ''
}
