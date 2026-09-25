/**
 * @contract C10 — the route map · owner: ARC · consumers: PLT (proxy), WEB, UXG, UXE, SEO, MIG
 *
 * Surface → public path segment per locale, the facet vocabularies that make named
 * browse URLs (`/antique-maps/java/batavia`), the legacy prefixes the proxy hands to
 * `/api/x/legacy/…`, and `href()`. The shape of `brand.routes` (BRANDS.md §3).
 *
 * The leaf of `@engine/config`: `schema.ts` (C1) imports from here and this file imports
 * only types back, so there is no runtime cycle. The locale vocabulary lives here because
 * a locale is the first segment of every non-default URL (ARCHITECTURE.md §11).
 */
import { z } from 'zod'

import type { ModuleKey } from './schema'

/** The superset every database holds (ARCHITECTURE.md §2); a brand serves a subset. */
export const LOCALE_CODES = ['en', 'id', 'nl'] as const
export const localeCodeSchema = z.enum(LOCALE_CODES)
export type LocaleCode = z.infer<typeof localeCodeSchema>

/** Text per locale; `validateBrandConfigs()` requires the brand's default locale. */
export const localisedTextSchema = z.partialRecord(localeCodeSchema, z.string().min(1))
export type LocalisedText = z.infer<typeof localisedTextSchema>

type SurfaceRoute = {
  /**
   * `segment`: `/{segment}/…` from the locale's segment map · `root`: `/` · `slug`: a CMS
   * page's own slug at the root · `forms`: one segment per form kind · `none`: no address.
   */
  address: 'segment' | 'root' | 'slug' | 'forms' | 'none'
  /** The module that switches the surface on — its routes 404 when off. Absent: always on. */
  module?: ModuleKey
}

/** Every surface the engine guarantees (DESIGN-SYSTEM.md §2), one row each. */
export const SURFACE_ROUTES = {
  home: { address: 'root' },
  browse: { address: 'segment' },
  search: { address: 'segment' },
  item: { address: 'segment' },
  design: { address: 'segment', module: 'catalogue.productTypes' },
  maker: { address: 'segment', module: 'content.makers' },
  place: { address: 'segment', module: 'content.gazetteer' },
  collection: { address: 'segment' },
  source: { address: 'segment' },
  exhibition: { address: 'segment', module: 'content.exhibitions' },
  location: { address: 'segment' },
  ig: { address: 'segment', module: 'content.linkInBio' },
  giftCard: { address: 'segment', module: 'commerce.giftCards' },
  newsletterArchive: { address: 'segment', module: 'retention.newsletter' },
  story: { address: 'segment', module: 'content.journal' },
  catalogue: { address: 'segment', module: 'content.catalogues' },
  page: { address: 'slug' },
  cart: { address: 'segment' },
  checkout: { address: 'segment' },
  order: { address: 'segment' },
  account: { address: 'segment' },
  form: { address: 'forms' },
  pay: { address: 'segment' },
  quote: { address: 'segment', module: 'purchase.invoices' },
  orderLookup: { address: 'segment' },
  notFound: { address: 'none' },
  gone: { address: 'none' },
  error: { address: 'none' },
} as const satisfies Record<string, SurfaceRoute>
export type Surface = keyof typeof SURFACE_ROUTES
export const SURFACES = Object.keys(SURFACE_ROUTES) as [Surface, ...Surface[]]

export type SegmentSurface = {
  [S in Surface]: (typeof SURFACE_ROUTES)[S]['address'] extends 'segment' ? S : never
}[Surface]
export const SEGMENT_SURFACES = SURFACES.filter(
  (s): s is SegmentSurface => SURFACE_ROUTES[s].address === 'segment',
) as [SegmentSurface, ...SegmentSurface[]]

/** The `Form` surface's kinds, each at its own public segment, and the module gating it. */
export const FORM_KINDS = {
  enquiry: {},
  offer: { module: 'purchase.offers' },
  consignment: { module: 'services.consignment' },
  appointment: { module: 'services.appointments' },
  wholesale: { module: 'services.wholesale' },
} as const satisfies Record<string, { module?: ModuleKey }>
export type FormKind = keyof typeof FORM_KINDS
const formKindSchema = z.enum(Object.keys(FORM_KINDS) as [FormKind, ...FormKind[]])

/** Browse facets (CONTENT-MODEL.md §3). Query-string keys are these names verbatim. */
export const FACET_KEYS = [
  'objectType',
  'place',
  'maker',
  'date',
  'technique',
  'colour',
  'grade',
  'size',
  'price',
  'availability',
  'subject',
  'productType',
  'format',
  'orientation',
  'dominantColour',
  'room',
  'mood',
  'occasion',
  'recipient',
  'inShowroom',
  'shipsToday',
  'madeToOrder',
] as const
export const facetKeySchema = z.enum(FACET_KEYS)
export type FacetKey = z.infer<typeof facetKeySchema>

/** Root segments that are never a surface, a form, a named facet or a CMS page. */
export const RESERVED_SEGMENTS = [...LOCALE_CODES, 'api', 'admin', 'brand-assets', 'style-guide']

const segmentSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a lower-case ASCII kebab-case path segment')

/** One locale's segments: every segment surface, and every form kind. */
export const localeSegmentsSchema = z.strictObject({
  ...(Object.fromEntries(SEGMENT_SURFACES.map((s) => [s, segmentSchema])) as Record<
    SegmentSurface,
    typeof segmentSchema
  >),
  forms: z.record(formKindSchema, segmentSchema),
})
export type LocaleSegments = z.infer<typeof localeSegmentsSchema>

/**
 * Named browse URLs. `path` lists, in order, the facets a named URL is made of
 * (`['objectType', 'place']` → `/antique-maps/java/batavia`); the first needs a vocabulary
 * for every supported locale. A facet in `path` without a vocabulary takes its segments
 * from the data — a place from the gazetteer's slugs, ancestors first.
 */
export const facetRoutesSchema = z.strictObject({
  path: z.array(facetKeySchema).max(3).default([]),
  vocabularies: z
    .partialRecord(
      facetKeySchema,
      z.partialRecord(localeCodeSchema, z.record(z.string(), segmentSchema)),
    )
    .default({}),
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
    /** Rewritten by the proxy to `/api/x/legacy/…`, which answers 301 or 404. */
    legacyPrefixes: z.array(legacyPrefixSchema).default([]),
  })
  .superRefine((routes, ctx) => {
    // A root segment of one locale resolves to exactly one thing: a surface, a form or a
    // named-facet value — never a reserved path. CMS page slugs are checked against this
    // same set by the pages validator (SCH).
    for (const locale of LOCALE_CODES) {
      const segments = routes[locale]
      if (!segments) continue
      const { forms, ...surfaces } = segments
      const facet = routes.facets.path[0]
      const vocabulary = facet ? (routes.facets.vocabularies[facet]?.[locale] ?? {}) : {}
      const seen = new Set<string>(RESERVED_SEGMENTS)
      for (const segment of [surfaces, forms, vocabulary].flatMap((m) => Object.values(m))) {
        if (seen.has(segment)) {
          ctx.addIssue({
            code: 'custom',
            path: [locale],
            message: `"${segment}" is reserved or used twice at the root of "${locale}"`,
          })
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
