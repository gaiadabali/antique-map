/**
 * @contract C10 — the route map, href() and its inverse · owner: ARC · consumers: PLT, WEB, UXG, UXE, SEO, NTF, MIG
 *
 * Public URLs (ARCHITECTURE.md §11): the default locale unprefixed, others prefixed; each
 * surface at one localised first segment, CMS pages at their own slug, named browse URLs
 * from facet vocabularies (`/antique-maps/java/batavia`), an old site's URLs — legacy prefixes
 * and exact legacy paths — handed to `/api/x/legacy/…` (`./routes/legacy`). `href()`
 * (`./routes/href`) builds them; `parsePublicPath()` (`./routes/parse`) is its inverse — what
 * the proxy (PLT) runs to rewrite a public URL to its app route, whose query carries the page's
 * whole canonical state — and answers `notFound` for an internal path asked for directly, or a
 * segment spelt otherwise than `href()` spells it (`./routes/segments`), so no page exists at two
 * addresses. The surface, form and account tables are `./routes/surfaces`, and what the proxy
 * answers before the route map is read — C13's root files, the claimed first segments —
 * `./routes/root-files`; this file is the schema.
 */
import { z } from 'zod'

import { facetKeySchema, sortKeySchema } from './schema/facets'
import { LOCALE_CODES, localeCodeSchema } from './schema/locales'
import type { ModuleKey } from './schema/modules'
import { LEGACY_PATH, LEGACY_PREFIX, legacyIssues } from './routes/legacy'
import { CLAIMED_SEGMENTS } from './routes/root-files'
import {
  FORM_KINDS,
  RESERVED_SEGMENTS,
  SEGMENT_SURFACES,
  SURFACE_ROUTES,
  type FormKind,
  type SegmentSurface,
} from './routes/surfaces'

export * from './routes/href'
export { legacyTarget, type LegacyRoutes } from './routes/legacy'
export * from './routes/parse'
export * from './routes/root-files'
export { decodeSegments } from './routes/segments'
export * from './routes/surfaces'

const segmentSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'a lower-case ASCII kebab-case path segment')
type Segment = typeof segmentSchema

/** The rows a module switches on: their segment may be left out while it is off. */
type Gated<T> = { [K in keyof T]: T[K] extends { module: ModuleKey } ? K : never }[keyof T]
type Segments<K extends string, G> = {
  [Key in K]: Key extends G ? z.ZodOptional<Segment> : Segment
}
const segmentFor = (row: object) => ('module' in row ? segmentSchema.optional() : segmentSchema)
const surfaceSegments = Object.fromEntries(
  SEGMENT_SURFACES.map((s) => [s, segmentFor(SURFACE_ROUTES[s])]),
) as Segments<SegmentSurface, Gated<typeof SURFACE_ROUTES>>
const formSegments = Object.fromEntries(
  (Object.keys(FORM_KINDS) as FormKind[]).map((kind) => [kind, segmentFor(FORM_KINDS[kind])]),
) as Segments<FormKind, Gated<typeof FORM_KINDS>>

/**
 * One locale's segments: every surface and form kind that is always on, and each one a module
 * switches on — which may be left out while the module is off (`validateBrandConfigs()`
 * requires it once the module is on).
 */
export const localeSegmentsSchema = z.strictObject({
  ...surfaceSegments,
  forms: z.strictObject(formSegments),
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

const legacyPrefixSchema = z.string().regex(LEGACY_PREFIX, 'a path prefix such as "/category/"')
const legacyPathSchema = z
  .string()
  .regex(LEGACY_PATH, 'an exact path such as "/about-us", with no trailing "/"')

export const routeMapSchema = z
  .strictObject({
    en: localeSegmentsSchema.optional(),
    id: localeSegmentsSchema.optional(),
    nl: localeSegmentsSchema.optional(),
    facets: facetRoutesSchema.prefault({}),
    /** Each listing's order when the URL names none — never written into a URL. */
    defaultSort: z
      .strictObject({
        browse: sortKeySchema.default('newest'),
        search: sortKeySchema.default('relevance'),
      })
      .prefault({}),
    /** Every path under each: rewritten by the proxy to `/api/x/legacy/…` (301, 404 or 410). */
    legacyPrefixes: z.array(legacyPrefixSchema).default([]),
    /**
     * Exact old-site paths — a static page that moved (`/about-us`, `/terms-conditions`) —
     * rewritten like a prefix. A page kept at its old address is live, never listed (MIGRATION.md §6).
     */
    legacyPaths: z.array(legacyPathSchema).default([]),
  })
  .superRefine((routes, ctx) => {
    // A root segment resolves to exactly one thing — a surface, a form or a named-facet
    // value — and never a reserved path, nor one the proxy answers first (`CLAIMED_SEGMENTS`).
    // The pages validator (SCH) checks CMS page slugs against the same sets, and against the
    // legacy prefixes' first segments and the one-segment legacy paths.
    const everyRoot = new Set<string>(RESERVED_SEGMENTS)
    for (const locale of LOCALE_CODES) {
      const segments = routes[locale]
      if (!segments) continue
      const { forms, ...surfaces } = segments
      const facet = routes.facets.path[0]
      const vocabulary = facet ? (routes.facets.vocabularies[facet]?.[locale] ?? {}) : {}
      const seen = new Set<string>([...RESERVED_SEGMENTS, ...CLAIMED_SEGMENTS])
      const all = [surfaces, forms, vocabulary].flatMap((m) => Object.values<string | undefined>(m))
      for (const segment of all.filter((each) => each !== undefined)) {
        if (seen.has(segment)) {
          const message = `"${segment}" is reserved or used twice at the root of "${locale}"`
          ctx.addIssue({ code: 'custom', path: [locale], message })
        }
        seen.add(segment)
        everyRoot.add(segment)
      }
    }
    // A legacy rule never shadows a live root segment in any locale (`/product/` is the item
    // page's own segment on the gallery, so it can never be legacy): there is no precedence.
    for (const { path, message } of legacyIssues(routes, everyRoot)) {
      ctx.addIssue({ code: 'custom', path, message })
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
