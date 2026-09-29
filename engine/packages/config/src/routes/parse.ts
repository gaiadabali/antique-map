/**
 * @contract C10 — the route map: the inverse of href() · owner: ARC · entry: `@engine/config/routes`
 *
 * What the proxy (PLT) runs on each public request — after C13's `ROOT_REWRITES` — to learn
 * which surface a URL names and the app route to rewrite it to, and what a listing page runs
 * on its search params. `parsePublicPath(config, href(s, p, l))` gives back `s` and `p` in
 * canonical form (a round-trip test proves it). Anything else — an internal path asked for
 * directly, a default-locale or unsupported-locale prefix, an extra segment, a segment spelt
 * otherwise than `href()` spells it (`./segments`; an old item link's slug is the one exception,
 * `oldItemLink()`), a first segment the proxy answers first (`./root-files`) — is `notFound`, so
 * no page has two addresses. An old site's URL goes to the legacy handler first (`./legacy`). The
 * internal URL carries a listing's whole canonical state as its query (named-path facets
 * included), so a listing page reads `parseListingQuery()` and never the public path. Pure: no
 * database, no request object.
 */
import { FACET_KEYS, SORT_KEYS, type FacetKey, type SortKey } from '../schema/facets'
import { LOCALE_CODES, type LocaleCode } from '../constants'
import type { RouteMap } from '../routes'
import {
  canonicalListing,
  listingSearch,
  type HrefParams,
  type ListingState,
  type ListingSurface,
} from './href'
import { legacyTarget } from './legacy'
import { positive, query, reader, uuid, type SearchInput } from './query'
import { CLAIMED_SEGMENTS } from './root-files'
import { readSegments, type ReadSegment } from './segments'
import {
  ACCOUNT_SECTIONS,
  FORM_KINDS,
  RESERVED_SEGMENTS,
  SEGMENT_SURFACES,
  SURFACE_ROUTES,
  type AccountSection,
  type FormKind,
  type LinkSurface,
  type SegmentSurface,
} from './surfaces'

export type { SearchInput } from './query'

/** What parsing reads from a brand config. */
export type ParseConfig = {
  routes: RouteMap
  locales: { default: LocaleCode; supported: readonly LocaleCode[] }
}

type SurfaceMatch = {
  [S in LinkSurface]: {
    kind: 'surface'
    surface: S
    locale: LocaleCode
    params: HrefParams[S]
    /** The app route under `src/app/(site)/[locale]/` to rewrite to, with its canonical query. */
    internal: string
  }
}[LinkSurface]

export type ParsedPath =
  | SurfaceMatch
  /** An old site's URL: rewritten to the legacy handler (C13), which answers 301, 404 or 410. */
  | { kind: 'legacy'; internal: string }
  /** The app's own route beside the route map (`/admin`, `/style-guide`): left alone. */
  | { kind: 'app' }
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

/** The surface a public path names, and where the proxy rewrites it. */
export function parsePublicPath(
  config: ParseConfig,
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
  if (RESERVED_SEGMENTS.includes(head))
    return locale === locales.default ? { kind: 'app' } : NOT_FOUND
  if ((CLAIMED_SEGMENTS as readonly string[]).includes(head)) return NOT_FOUND
  const surface = SEGMENT_SURFACES.find((each) => segments[each] === head)
  if (surface) return segmentSurface(config, locale, surface, rest, search)
  const kind = (Object.keys(FORM_KINDS) as FormKind[]).find((each) => segments.forms[each] === head)
  if (kind) {
    if (rest.length > 0) return NOT_FOUND
    const all = reader(search)
    const [item, variant] = [positive(all('item')[0]), positive(all('variant')[0])]
    const [topic] = all('topic')
    const appointment = uuid(all('appointment')[0])
    const params: HrefParams['form'] = {
      kind,
      ...(item ? { item } : {}),
      ...(variant ? { variant } : {}),
      ...(topic ? { topic } : {}),
      ...(appointment ? { appointment } : {}),
    }
    // The canonical query, in href()'s order: whatever was dropped above is dropped here too.
    const q = query({ ...params, kind: undefined })
    return match('form', locale, params, `/${kind}${q}`)
  }
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
 * An old link to an item — `/product/{id}-{anything}` (MIGRATION.md §6) — whose slug part is not
 * in `href()`'s spelling (`%27`, `(…)`, a lower-case hex, a `+`), every segment before it canonical.
 * It reaches the item route by its id with its slug as asked for, which contains a character no
 * slug has, so it never matches and the route answers a permanent redirect to the current URL:
 * never a second 200 address, never a lost link (3.4 senior-fe #1). The id itself must be canonical,
 * and a segment that picks a surface or a locale always is.
 */
function oldItemLink(config: ParseConfig, read: readonly ReadSegment[]): ParsedPath | null {
  const [first] = read
  const prefixed =
    first !== undefined && isLocaleCode(first.text) && first.text !== config.locales.default
  const locale = prefixed ? (first.text as LocaleCode) : config.locales.default
  if (prefixed && !config.locales.supported.includes(locale)) return null
  const [head, item, ...more] = prefixed ? read.slice(1) : read
  const segments = config.routes[locale]
  if (!head?.canonical || !item || more.length > 0 || head.text !== segments?.item) return null
  if (read.slice(0, -1).some((segment) => !segment.canonical)) return null
  const id = /^([1-9]\d*)-(.+)$/.exec(item.raw)
  const publicId = Number(id?.[1])
  if (!id?.[2] || !Number.isSafeInteger(publicId)) return null
  const internal = `/${encodeURIComponent(`${publicId}-${id[2]}`)}`
  return match('item', locale, { publicId, slug: id[2] }, internal)
}

function segmentSurface(
  config: ParseConfig,
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
    case 'place':
      return match('place', locale, rest.length > 0 ? { path: rest } : {}, path(...rest))
    case 'account': {
      const sections = Object.keys(ACCOUNT_SECTIONS) as AccountSection[]
      const section = one === undefined ? 'overview' : sections.find((s) => segmentOf(s) === one)
      if (!section || more.length > 0) return NOT_FOUND
      return match('account', locale, one === undefined ? {} : { section }, path(section))
    }
    case 'wantList': {
      if (one !== undefined) return NOT_FOUND
      const all = reader(search)
      const [watch] = all('watch')
      const like = positive(all('like')[0])
      // Two subjects are no page: one subject, one URL.
      if (watch && like) return NOT_FOUND
      const params: HrefParams['wantList'] = watch ? { watch } : like ? { like } : {}
      return match('wantList', locale, params, query({ watch, like: like ?? undefined }))
    }
    case 'design':
    case 'order':
    case 'pay':
    case 'quote': {
      if (one === undefined || more.length > 0) return NOT_FOUND
      const key = surface === 'design' ? 'slug' : surface === 'order' ? 'number' : 'token'
      return match(surface, locale, { [key]: one } as HrefParams[typeof surface], path(one))
    }
    default: {
      const indexed = 'index' in SURFACE_ROUTES[surface]
      if (more.length > 0 || (one !== undefined && !indexed)) return NOT_FOUND
      return match(surface, locale, one === undefined ? {} : { slug: one }, path(...rest))
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

function segmentOf(section: AccountSection): string | null {
  return ACCOUNT_SECTIONS[section].segment
}

const isLocaleCode = (value: string): value is LocaleCode =>
  (LOCALE_CODES as readonly string[]).includes(value)
const isSortKey = (value: string | undefined): value is SortKey =>
  (SORT_KEYS as readonly (string | undefined)[]).includes(value)
