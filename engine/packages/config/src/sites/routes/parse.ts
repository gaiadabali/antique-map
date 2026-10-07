/**
 * The inverse of `href()`: what the proxy runs on each public page request of a site — after its
 * root files — to learn which surface a URL names and the internal route to rewrite it to, and
 * what a listing page runs on its search params. `parsePublicPath(site, href(s, p, l))` gives back
 * `s` and `p` in canonical form (a round-trip test proves it). Anything else — an internal path
 * asked for directly, a default-locale or unserved-locale prefix, an extra segment, a segment spelt
 * otherwise than `href()` spells it (`./segments`; an old item link's slug is the one exception,
 * `oldItemLink()`), a first segment the proxy answers first (`./root-files`) — is `notFound`, so no
 * page has two addresses. An old site's URL goes to the legacy handler first (`./legacy`).
 *
 * The internal path is relative to the site's tree: the proxy prefixes it with the site
 * (`/gallery/en/item/1706-…`). It carries a listing's whole canonical state as its query (named
 * path facets included), so a listing page reads `parseListingQuery()` and never the public path.
 * Pure: no database, no request object.
 */
import { LOCALE_CODES, type LocaleCode } from '../../constants'
import { FACET_KEYS, SORT_KEYS, type FacetKey, type SortKey } from '../../constants/facets'
import {
  canonicalListing,
  listingSearch,
  type HrefParams,
  type ListingState,
  type ListingSurface,
} from './href'
import { legacyTarget } from './legacy'
import { reader, type SearchInput } from './query'
import { CLAIMED_SEGMENTS } from './root-files'
import { readSegments, type ReadSegment } from './segments'
import {
  hasIndex,
  RESERVED_SEGMENTS,
  SEGMENT_SURFACES,
  SURFACE_ROUTES,
  type LinkSurface,
  type SegmentSurface,
} from './surfaces'
import type { RouteConfig, RouteMap } from './types'

export type { SearchInput } from './query'

type SurfaceMatch = {
  [S in LinkSurface]: {
    kind: 'surface'
    surface: S
    locale: LocaleCode
    params: HrefParams[S]
    /** The route under the site's tree to rewrite to, `/<locale>/…`, with its canonical query. */
    internal: string
  }
}[LinkSurface]

export type ParsedPath =
  | SurfaceMatch
  /** An old site's URL: rewritten to the legacy handler, which answers 301, 404 or 410. */
  | { kind: 'legacy'; internal: string }
  | { kind: 'notFound' }

const NOT_FOUND = { kind: 'notFound' } as const
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** A listing's state from a query string, unknown keys and invalid values dropped, canonical. */
export function parseListingQuery(
  routes: RouteMap,
  surface: ListingSurface,
  search: SearchInput,
): ListingState {
  const all = reader(search)
  const facets: Partial<Record<FacetKey, readonly string[]>> = {}
  for (const key of FACET_KEYS) facets[key] = all(key)
  const [sort] = all('sort')
  const page = Number(all('page')[0])
  const [q] = all('q')
  return canonicalListing(routes, surface, {
    facets,
    ...(isSortKey(sort) ? { sort } : {}),
    ...(Number.isSafeInteger(page) && page > 1 ? { page } : {}),
    ...(q === undefined ? {} : { q }),
  })
}

/** The surface a public path names on a site, and where the proxy rewrites it. */
export function parsePublicPath(
  config: RouteConfig,
  pathname: string,
  search: SearchInput = {},
): ParsedPath {
  const { routes, locales } = config
  const legacy = legacyTarget(routes, pathname)
  if (legacy !== null) return { kind: 'legacy', internal: legacy }
  const read = readSegments(pathname)
  if (!read) return NOT_FOUND
  if (read.some((segment) => !segment.canonical)) return oldItemLink(config, read) ?? NOT_FOUND
  const parts = read.map((segment) => segment.text)
  let locale = locales.default
  const first = parts[0]
  if (first !== undefined && isLocaleCode(first)) {
    if (first === locales.default || !locales.supported.includes(first)) return NOT_FOUND
    locale = first
    parts.shift()
  }
  const segments = routes[locale]
  const [head, ...rest] = parts
  if (!segments) return NOT_FOUND
  if (head === undefined) return match('home', locale, {}, '')
  if (RESERVED_SEGMENTS.includes(head)) return NOT_FOUND
  if ((CLAIMED_SEGMENTS as readonly string[]).includes(head)) return NOT_FOUND
  const surface = SEGMENT_SURFACES.find((each) => segments[each] === head)
  if (surface) return segmentSurface(config, locale, surface, rest, search)
  const named = namedFacets(routes, locale, parts)
  if (named) {
    const state = parseListingQuery(routes, 'browse', search)
    const browse = canonicalListing(routes, 'browse', {
      ...state,
      facets: { ...state.facets, ...named },
    })
    return match('browse', locale, browse, listingSearch(browse))
  }
  if (rest.length > 0 || !SLUG.test(head)) return NOT_FOUND
  return match('page', locale, { slug: head }, `/${encodeURIComponent(head)}`)
}

/**
 * An old link to a gallery item — `/product/{id}-{anything}` (DATA.md §6) — whose slug part is not
 * in `href()`'s spelling (`%27`, `(…)`, `%61` for `a`, a `+`), every segment before it canonical.
 * It reaches the item route by its id with its slug as asked for, which contains a character no
 * slug has, so it never matches and the route answers a permanent redirect (`permanentRedirect()`,
 * a 308) to the current URL: never a second 200 address, never a lost link.
 *
 * A lower-case escape is no odd spelling in practice: RFC 3986 §6.2.2.1 makes `%c3%a9` the same
 * URI as `%C3%A9`, and Next upper-cases an escape's hex digits before the proxy runs, so such a
 * request is served at the one address, 200 (the Cache Components spike §3). A slug part that
 * does not decode as UTF-8 fails `readSegments()` first and is not found.
 */
function oldItemLink(config: RouteConfig, read: readonly ReadSegment[]): ParsedPath | null {
  const [first] = read
  const prefixed =
    first !== undefined && isLocaleCode(first.text) && first.text !== config.locales.default
  const locale = prefixed ? (first.text as LocaleCode) : config.locales.default
  if (prefixed && !config.locales.supported.includes(locale)) return null
  const [head, item, ...more] = prefixed ? read.slice(1) : read
  const segments = config.routes[locale]
  const itemSegment = segments?.item
  if (!head?.canonical || !item || more.length > 0 || itemSegment === undefined) return null
  if (head.text !== itemSegment) return null
  if (read.slice(0, -1).some((segment) => !segment.canonical)) return null
  const id = /^([1-9]\d*)-(.+)$/.exec(item.raw)
  const publicId = Number(id?.[1])
  if (!id?.[2] || !Number.isSafeInteger(publicId)) return null
  const internal = `/${encodeURIComponent(`${publicId}-${id[2]}`)}`
  return match('item', locale, { publicId, slug: id[2] }, internal)
}

function segmentSurface(
  config: RouteConfig,
  locale: LocaleCode,
  surface: SegmentSurface,
  rest: string[],
  search: SearchInput,
): ParsedPath {
  const [one, ...more] = rest
  const path = (...parts: string[]) => parts.map((p) => `/${encodeURIComponent(p)}`).join('')
  switch (surface) {
    case 'browse':
    case 'search': {
      if (one !== undefined) return NOT_FOUND
      const state = parseListingQuery(config.routes, surface, search)
      if (surface === 'browse') return match('browse', locale, state, listingSearch(state))
      return match('search', locale, { ...state, q: state.q ?? '' }, listingSearch(state))
    }
    case 'item': {
      const id = one === undefined || more.length > 0 ? null : /^([1-9]\d*)(?:-(.+))?$/.exec(one)
      const publicId = Number(id?.[1])
      if (!id || !Number.isSafeInteger(publicId)) return NOT_FOUND
      return match('item', locale, { publicId, slug: id[2] ?? '' }, path(id[0]))
    }
    case 'product': {
      if (one === undefined || more.length > 0 || !SLUG.test(one)) return NOT_FOUND
      return match('product', locale, { slug: one }, path(one))
    }
    case 'place':
      return match('place', locale, rest.length > 0 ? { path: rest } : {}, path(...rest))
    case 'tracking': {
      if (more.length > 0) return NOT_FOUND
      return match('tracking', locale, one === undefined ? {} : { token: one }, path(...rest))
    }
    case 'order': {
      if (one === undefined || more.length > 1 || (more.length === 1 && more[0] !== 'simulate')) {
        return NOT_FOUND
      }
      const simulate = more.length === 1
      return match(
        'order',
        locale,
        simulate ? { token: one, simulate: true } : { token: one },
        path(...rest),
      )
    }
    default: {
      if (more.length > 0 || (one !== undefined && !hasIndex(surface))) return NOT_FOUND
      const params = one === undefined ? {} : { slug: one }
      return match(surface, locale, params as HrefParams[typeof surface], path(...rest))
    }
  }
}

/** A named browse path back to its facets: vocabularies in reverse, the rest from the data. */
function namedFacets(routes: RouteMap, locale: LocaleCode, parts: readonly string[]) {
  const facets: Partial<Record<FacetKey, string>> = {}
  let at = 0
  for (const key of routes.facets.path) {
    if (at >= parts.length) break
    const vocabulary = routes.facets.vocabularies[key]?.[locale]
    if (!vocabulary && at === 0) return null
    const value = vocabulary
      ? Object.keys(vocabulary).find((each) => vocabulary[each] === parts[at])
      : parts.slice(at).join('/')
    if (value === undefined) return null
    facets[key] = value
    at = vocabulary ? at + 1 : parts.length
  }
  return at > 0 && at === parts.length ? facets : null
}

function match<S extends LinkSurface>(
  surface: S,
  locale: LocaleCode,
  params: HrefParams[S],
  rest: string,
): ParsedPath {
  const base = SURFACE_ROUTES[surface].internal.split('/')[0]
  const internal = `/${locale}${base ? `/${base}` : ''}${rest}`
  return { kind: 'surface', surface, locale, params, internal } as SurfaceMatch
}

const isLocaleCode = (value: string): value is LocaleCode =>
  (LOCALE_CODES as readonly string[]).includes(value)
const isSortKey = (value: string | undefined): value is SortKey =>
  (SORT_KEYS as readonly (string | undefined)[]).includes(value)
