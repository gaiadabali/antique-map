/**
 * A site's route map (ARCHITECTURE.md §5): one localised first segment per surface the site has,
 * per locale it serves; the named browse paths built from facet vocabularies
 * (`/antique-maps/java/batavia`); each listing's default order; and the old site's URLs the proxy
 * hands to the legacy handler. Committed in `SITES` (`../table`), typed here and checked by
 * `routeIssues()` (`./check`) in a unit test, so a map that would give one page two addresses
 * never ships.
 */
import type { LocaleCode } from '../../constants'
import type { FacetKey, SortKey } from '../../constants/facets'
import type { SegmentSurface } from './surfaces'

/** One locale's segments: the surfaces the site has, each at one lower-case ASCII segment. */
export type LocaleSegments = Readonly<Partial<Record<SegmentSurface, string>>>

/** A facet's vocabulary: value → public segment, per locale. */
export type FacetVocabulary = Readonly<
  Partial<Record<LocaleCode, Readonly<Record<string, string>>>>
>

/**
 * Named browse URLs: `path` lists, in order, the facets a named URL is made of
 * (`['objectType', 'place']` → `/antique-maps/java/batavia`). The first needs a vocabulary
 * (value → segment per locale); a later facet without one takes its segments from the data — a
 * place's gazetteer slugs, ancestors first. Other facets go to the query string.
 */
export type FacetRoutes = {
  readonly path: readonly FacetKey[]
  readonly vocabularies: Readonly<Partial<Record<FacetKey, FacetVocabulary>>>
}

export type RouteMap = Readonly<Partial<Record<LocaleCode, LocaleSegments>>> & {
  readonly facets: FacetRoutes
  /** Each listing's order when the URL names none — never written into a URL. */
  readonly defaultSort: { readonly browse: SortKey; readonly search: SortKey }
  /** Every path under each: rewritten by the proxy to `/api/x/legacy/…` (301, 404 or 410). */
  readonly legacyPrefixes: readonly string[]
  /** Exact old-site paths — a static page that moved (`/about-us`) — rewritten like a prefix. */
  readonly legacyPaths: readonly string[]
}

/** What routing reads from a site: its route map and its locales, the default unprefixed. */
export type RouteConfig = {
  readonly routes: RouteMap
  readonly locales: { readonly default: LocaleCode; readonly supported: readonly LocaleCode[] }
}
