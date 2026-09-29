/**
 * @contract C10 — the route map: what is answered before it · owner: ARC · entry: `@engine/config/routes`
 *
 * The public paths the proxy answers before it reads the route map (C13, ARCHITECTURE.md §11), so
 * that no surface, form, named facet, CMS page or legacy rule is ever one of them — it would be
 * dead, the proxy having answered first (3.4 senior-be #8, senior-fe #7):
 * - `ROOT_FILES` — the root files C13's `ROOT_REWRITES` answers (robots, the sitemaps,
 *   `.well-known`, the favicon, the home-screen icons, the web manifest), as its patterns: `:name`
 *   one segment's worth, `:path*` the rest. C13's rewrites take exactly these as their `from`,
 *   which its test pins;
 * - `CLAIMED_SEGMENTS` — first segments claimed whatever follows: Next's own `_next`, the
 *   not-found route's `not-found` (C13 `NOT_FOUND_SEGMENT`, which the proxy answers in any locale
 *   and any case), and `.well-known`, the one root file that is a prefix.
 * Pure: a leaf, importing nothing.
 */

export const ROOT_FILES = [
  '/robots.txt',
  '/sitemap.xml',
  '/sitemap-:name.xml',
  '/.well-known/:path*',
  '/favicon.ico',
  '/apple-touch-icon.png',
  // Sized and precomposed (`-180x180`, `-precomposed`, `-180x180-precomposed`): one icon for all.
  '/apple-touch-icon-:size.png',
  '/site.webmanifest',
] as const
export type RootFile = (typeof ROOT_FILES)[number]

export const CLAIMED_SEGMENTS = ['_next', 'not-found', '.well-known'] as const

const patterns = new Map<string, RegExp>()

/**
 * A root-file pattern's match on a path — its `:params`, by name — or `null`:
 * `/sitemap-:name.xml` matches `/sitemap-items.xml` with `{ name: 'items' }`.
 */
export function matchRootFile(pattern: string, pathname: string): Record<string, string> | null {
  let regex = patterns.get(pattern)
  if (!regex) {
    const source = pattern
      .split(/(:\w+\*?)/)
      .map((part) => {
        const param = /^:(\w+)(\*)?$/.exec(part)
        if (!param) return part.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
        return param[2] ? `(?<${param[1]}>.*)` : `(?<${param[1]}>[^/]+?)`
      })
      .join('')
    regex = new RegExp(`^${source}$`)
    patterns.set(pattern, regex)
  }
  const match = regex.exec(pathname)
  return match ? { ...match.groups } : null
}

/** The root file a path is, or `null`. */
export function rootFileOf(pathname: string): RootFile | null {
  return ROOT_FILES.find((pattern) => matchRootFile(pattern, pathname) !== null) ?? null
}
