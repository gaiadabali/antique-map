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

import { facetKeySchema } from './schema/facets'
import { LOCALE_CODES, localeCodeSchema } from './schema/locales'
import {
  FORM_KINDS,
  RESERVED_SEGMENTS,
  SEGMENT_SURFACES,
  type FormKind,
  type SegmentSurface,
} from './routes/surfaces'

export * from './routes/href'
export * from './routes/surfaces'

const formKindSchema = z.enum(Object.keys(FORM_KINDS) as [FormKind, ...FormKind[]])

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
