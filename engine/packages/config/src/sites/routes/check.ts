/**
 * What would make a site's route map give one page two addresses, or none — checked over `SITES`
 * by a unit test (`../sites.test.ts`), since the maps are committed code, not runtime input:
 * - a segment that is not lower-case ASCII kebab-case, the one spelling `href()` writes;
 * - a locale the site serves with no map, or one whose surfaces differ from the default locale's
 *   (a page in English only would have no Indonesian address to link);
 * - two things at one root segment of a locale — two surfaces, or a surface and a named-facet
 *   value — or a reserved or claimed segment, which the proxy answers before it reads the map;
 * - a named-facet path whose first facet has no vocabulary for a served locale;
 * - a legacy rule that is dead or shadows a live root segment (`./legacy`).
 * Pure.
 */
import { legacyIssues, LEGACY_PATH, LEGACY_PREFIX } from './legacy'
import { CLAIMED_SEGMENTS } from './root-files'
import { RESERVED_SEGMENTS, SEGMENT_SURFACES } from './surfaces'
import type { RouteConfig } from './types'

const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function routeIssues(config: RouteConfig): string[] {
  const { routes, locales } = config
  const issues: string[] = []
  const everyRoot = new Set<string>(RESERVED_SEGMENTS)
  const surfacesOf = (locale: string) => {
    const segments = routes[locale as keyof typeof routes] as Record<string, unknown> | undefined
    return SEGMENT_SURFACES.filter((surface) => segments?.[surface] !== undefined).join()
  }
  const facet = routes.facets.path[0]
  for (const locale of locales.supported) {
    const segments = routes[locale]
    if (!segments) {
      issues.push(`"${locale}" is served but has no route segments`)
      continue
    }
    if (surfacesOf(locale) !== surfacesOf(locales.default)) {
      issues.push(`"${locale}" has other surfaces than the default locale "${locales.default}"`)
    }
    const vocabulary = facet ? routes.facets.vocabularies[facet]?.[locale] : {}
    if (facet && !vocabulary) {
      issues.push(`the named browse path's first facet "${facet}" has no "${locale}" vocabulary`)
    }
    const seen = new Set<string>([...RESERVED_SEGMENTS, ...CLAIMED_SEGMENTS])
    for (const segment of [...Object.values(segments), ...Object.values(vocabulary ?? {})]) {
      if (!SEGMENT.test(segment)) {
        issues.push(`"${segment}" in "${locale}" is not a lower-case ASCII kebab-case segment`)
      }
      if (seen.has(segment)) {
        issues.push(`"${segment}" is reserved or used twice at the root of "${locale}"`)
      }
      seen.add(segment)
      everyRoot.add(segment)
    }
  }
  routes.legacyPrefixes
    .filter((prefix) => !LEGACY_PREFIX.test(prefix))
    .forEach((prefix) => issues.push(`legacy prefix "${prefix}" is not a path prefix ending in /`))
  routes.legacyPaths
    .filter((path) => !LEGACY_PATH.test(path))
    .forEach((path) => issues.push(`legacy path "${path}" is not an exact path with no trailing /`))
  for (const { message } of legacyIssues(routes, everyRoot)) issues.push(message)
  return issues
}
