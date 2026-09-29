/**
 * @contract C10 — the route map: an old site's URLs · owner: ARC · entry: `@engine/config/routes`
 *
 * What the proxy hands to the legacy handler (C13 `/api/x/legacy/…`), which answers 301, 404 or
 * 410 from the `redirects` collection (MIGRATION.md §6). Two shapes, both matched on the path as
 * asked for, case and spelling exact, the query carried along by the proxy:
 * - `legacyPrefixes` — every path under a prefix ending in `/` (`/category/`, `/storage/products/`);
 * - `legacyPaths` — one exact path with no trailing `/`, for a static page that moved
 *   (`/about-us` → the CMS page it became).
 * A page kept at its old address is simply live, like the product URLs — a CMS page with the same
 * slug, or a surface whose segment is the same — and listed in neither. Neither shape shadows a
 * live root segment in any locale, so the two never compete: the pages validator (SCH) refuses a
 * CMS slug that is a prefix's first segment or a one-segment legacy path. C13's root files
 * (`ROOT_REWRITES`) come before both.
 */

const PATH_SEGMENTS = String.raw`\/[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*`
export const LEGACY_PREFIX = new RegExp(`^${PATH_SEGMENTS}\\/$`)
export const LEGACY_PATH = new RegExp(`^${PATH_SEGMENTS}$`)

/** What the legacy rules read from a route map. */
export type LegacyRoutes = {
  readonly legacyPrefixes: readonly string[]
  readonly legacyPaths: readonly string[]
}

/** The legacy handler's address for a public path, or `null` when it is no old site's URL. */
export function legacyTarget(routes: LegacyRoutes, pathname: string): string | null {
  const legacy =
    routes.legacyPaths.includes(pathname) ||
    routes.legacyPrefixes.some((prefix) => pathname.startsWith(prefix))
  return legacy ? `/api/x/legacy${pathname}` : null
}

/**
 * Why a legacy rule is refused: it shadows a live root segment (`everyRoot`: the reserved ones,
 * every locale's surfaces and forms, the named-facet values), a path is listed twice, or a path
 * already sits under a legacy prefix.
 */
export function legacyIssues(
  routes: LegacyRoutes,
  everyRoot: ReadonlySet<string>,
): { path: [string, number]; message: string }[] {
  const issues: { path: [string, number]; message: string }[] = []
  const shadows = (rule: string) => {
    const first = rule.split('/')[1] ?? ''
    return everyRoot.has(first.toLowerCase()) ? first : null
  }
  routes.legacyPrefixes.forEach((prefix, i) => {
    const live = shadows(prefix)
    if (live !== null) {
      const message = `legacy prefix "${prefix}" shadows the live root segment "${live}"`
      issues.push({ path: ['legacyPrefixes', i], message })
    }
  })
  routes.legacyPaths.forEach((path, i) => {
    const at: [string, number] = ['legacyPaths', i]
    const live = shadows(path)
    const prefix = routes.legacyPrefixes.find((each) => path.startsWith(each))
    if (live !== null) {
      issues.push({
        path: at,
        message: `legacy path "${path}" shadows the live root segment "${live}"`,
      })
    } else if (prefix !== undefined) {
      issues.push({
        path: at,
        message: `legacy path "${path}" already sits under the legacy prefix "${prefix}"`,
      })
    } else if (routes.legacyPaths.indexOf(path) !== i) {
      issues.push({ path: at, message: `legacy path "${path}" is listed twice` })
    }
  })
  return issues
}
