/**
 * @contract C10 — the route map and href() · owner: ARC · consumers: PLT, WEB, UXG, UXE, SEO, NTF, MIG
 *
 * Public URLs (ARCHITECTURE.md §11): the default locale unprefixed, others prefixed; each
 * surface at one localised first segment, CMS pages at their own slug, named browse URLs
 * from facet vocabularies (`/antique-maps/java/batavia`), legacy prefixes handed to
 * `/api/x/legacy/…`. The proxy (PLT) parses what `href()` builds and rewrites it to the app
 * route in `SURFACE_ROUTES` — inverses, proven by a round-trip test — and answers 404 for
 * an internal path requested directly, so no page exists at two addresses.
 */
import { z } from 'zod'

import { FACET_KEYS, facetKeySchema, type FacetKey } from './schema/facets'
import { LOCALE_CODES, localeCodeSchema, type LocaleCode } from './schema/locales'
import type { ModuleKey } from './schema/modules'

type SurfaceRoute = {
  /** The app route under `src/app/(site)/[locale]/`; `''` the locale root, `null` no address. */
  internal: string | null
  /** The bare segment is also a page: the surface's index (a `DirectoryVM`, C2). */
  index?: true
  /** The module that switches the surface on — its routes 404 when off. Absent: always on. */
  module?: ModuleKey
}

/** Every surface the engine guarantees (DESIGN-SYSTEM.md §2), one row each. */
export const SURFACE_ROUTES = {
  home: { internal: '' },
  browse: { internal: 'browse' },
  search: { internal: 'search' },
  item: { internal: 'item/[idSlug]' },
  design: { internal: 'design/[slug]', module: 'catalogue.productTypes' },
  maker: { internal: 'maker/[slug]', index: true, module: 'content.makers' },
  place: { internal: 'place/[...path]', index: true, module: 'content.gazetteer' },
  collection: { internal: 'collection/[slug]', index: true },
  source: { internal: 'source/[slug]', index: true },
  exhibition: { internal: 'exhibition/[slug]', index: true, module: 'content.exhibitions' },
  location: { internal: 'location/[slug]', index: true },
  ig: { internal: 'ig', module: 'content.linkInBio' },
  giftCard: { internal: 'gift-card', module: 'commerce.giftCards' },
  newsletterArchive: { internal: 'newsletter/[slug]', index: true, module: 'retention.newsletter' },
  story: { internal: 'story/[slug]', index: true, module: 'content.journal' },
  catalogue: { internal: 'catalogue/[slug]', index: true, module: 'content.catalogues' },
  page: { internal: 'page/[slug]' },
  cart: { internal: 'cart' },
  checkout: { internal: 'checkout' },
  order: { internal: 'order/[number]' },
  account: { internal: 'account/[section]', index: true },
  form: { internal: 'form/[kind]' },
  pay: { internal: 'pay/[token]' },
  quote: { internal: 'quote/[token]', module: 'purchase.invoices' },
  orderLookup: { internal: 'order-lookup' },
  notFound: { internal: null },
  gone: { internal: null },
  error: { internal: null },
} as const satisfies Record<string, SurfaceRoute>
export type Surface = keyof typeof SURFACE_ROUTES
export const SURFACES = Object.keys(SURFACE_ROUTES) as [Surface, ...Surface[]]

/** Surfaces with an address, i.e. everything `href()` can build. */
export type LinkSurface = Exclude<Surface, 'notFound' | 'gone' | 'error'>
/** Surfaces at one localised first segment: all but the root, CMS pages and forms. */
export type SegmentSurface = Exclude<LinkSurface, 'home' | 'page' | 'form'>
const NOT_SEGMENT: readonly Surface[] = ['home', 'page', 'form', 'notFound', 'gone', 'error']
const isSegmentSurface = (s: Surface): s is SegmentSurface => !NOT_SEGMENT.includes(s)
export const SEGMENT_SURFACES = SURFACES.filter(isSegmentSurface)

/** The `Form` surface's kinds, each at its own localised segment. */
export const FORM_KINDS = {
  enquiry: {},
  offer: { module: 'purchase.offers' },
  consignment: { module: 'services.consignment' },
  appointment: { module: 'services.appointments' },
  wholesale: { module: 'services.wholesale' },
} as const satisfies Record<string, { module?: ModuleKey }>
export type FormKind = keyof typeof FORM_KINDS
const formKindSchema = z.enum(Object.keys(FORM_KINDS) as [FormKind, ...FormKind[]])

/**
 * Account sections (DESIGN-SYSTEM.md §2 `Account`). Their segments are not localised:
 * the pages are private and never shared, so a translated URL buys nothing.
 */
export const ACCOUNT_SECTIONS = {
  overview: { segment: null },
  orders: { segment: 'orders' },
  wishlist: { segment: 'wishlist', module: 'retention.wishlist' },
  wantLists: { segment: 'want-lists', module: 'retention.wantList' },
  addresses: { segment: 'addresses' },
  profile: { segment: 'profile' },
  privacy: { segment: 'privacy' },
  offers: { segment: 'offers', module: 'purchase.offers' },
  holds: { segment: 'holds', module: 'purchase.holds' },
  priceRequests: { segment: 'price-requests', module: 'purchase.requestPrice' },
  viewings: { segment: 'viewings', module: 'services.appointments' },
  consignments: { segment: 'consignments', module: 'services.consignment' },
} as const satisfies Record<string, { segment: string | null; module?: ModuleKey }>
export type AccountSection = keyof typeof ACCOUNT_SECTIONS

/** Root segments that are never a surface, a form, a named facet or a CMS page. */
export const RESERVED_SEGMENTS = [...LOCALE_CODES, 'api', 'admin', 'brand-assets', 'style-guide']

const segmentSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a lower-case ASCII kebab-case path segment')

const surfaceSegments = Object.fromEntries(SEGMENT_SURFACES.map((s) => [s, segmentSchema]))

/** One locale's segments: every segment surface, and every form kind. */
export const localeSegmentsSchema = z.strictObject({
  ...(surfaceSegments as Record<SegmentSurface, typeof segmentSchema>),
  forms: z.record(formKindSchema, segmentSchema),
})
export type LocaleSegments = z.infer<typeof localeSegmentsSchema>

/** A facet's vocabulary: value → public segment, per locale. */
const vocabularySchema = z.partialRecord(localeCodeSchema, z.record(z.string(), segmentSchema))

/**
 * Named browse URLs: `path` lists, in order, the facets a named URL is made of
 * (`['objectType', 'place']` → `/antique-maps/java/batavia`). The first needs a vocabulary
 * (value → segment per locale); a later facet without one takes its segments from the
 * data — a place's gazetteer slugs, ancestors first. Other facets go to the query string.
 */
export const facetRoutesSchema = z.strictObject({
  path: z.array(facetKeySchema).max(3).default([]),
  vocabularies: z.partialRecord(facetKeySchema, vocabularySchema).default({}),
})

const legacyPrefixSchema = z
  .string()
  .regex(/^\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/$/, 'a path prefix such as "/category/"')

export const routeMapSchema = z
  .strictObject({
    en: localeSegmentsSchema.optional(),
    id: localeSegmentsSchema.optional(),
    nl: localeSegmentsSchema.optional(),
    facets: facetRoutesSchema.prefault({}),
    /** Rewritten by the proxy to `/api/x/legacy/…`, which answers 301, 404 or 410. */
    legacyPrefixes: z.array(legacyPrefixSchema).default([]),
  })
  .superRefine((routes, ctx) => {
    // A root segment resolves to exactly one thing — a surface, a form or a named-facet
    // value — and never a reserved path. The pages validator (SCH) checks CMS page slugs
    // against the same set.
    for (const locale of LOCALE_CODES) {
      const segments = routes[locale]
      if (!segments) continue
      const { forms, ...surfaces } = segments
      const facet = routes.facets.path[0]
      const vocabulary = facet ? (routes.facets.vocabularies[facet]?.[locale] ?? {}) : {}
      const seen = new Set<string>(RESERVED_SEGMENTS)
      for (const segment of [surfaces, forms, vocabulary].flatMap((m) => Object.values(m))) {
        if (seen.has(segment)) {
          const message = `"${segment}" is reserved or used twice at the root of "${locale}"`
          ctx.addIssue({ code: 'custom', path: [locale], message })
        }
        seen.add(segment)
      }
    }
  })
export type RouteMap = z.infer<typeof routeMapSchema>

/** A typed link target (nav floors, CMS links), resolved per locale through `href()`. */
export const routeTargetSchema = z.strictObject({
  surface: z.enum([...SEGMENT_SURFACES, 'home', 'page']),
  slug: z.string().min(1).optional(),
  facets: z.partialRecord(facetKeySchema, z.string().min(1)).optional(),
})
export type RouteTarget = z.infer<typeof routeTargetSchema>

// ── href() ─────────────────────────────────────────────────────────────────────────────

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
  order: { number: string; token?: string }
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
      return [[segments.order, p.number ?? ''], { token: p.token }]
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
