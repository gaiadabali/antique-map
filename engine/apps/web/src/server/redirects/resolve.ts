/**
 * Runtime redirect resolver: one hop only.
 *
 * The legacy handler under `/api/x/legacy/[...path]` keeps a cached
 * `Map<string, { to: string; code: 301 | 302 | 410 }>` per site and passes the
 * public path + query to `resolveRedirect()`. The map's keys are already
 * normalised by the builder; the request path is normalised here with the same
 * function exported from `@engine/migrate/redirects`.
 */
import { redirectKey, type SiteKey } from '@engine/migrate/redirects'

export type RedirectMap = ReadonlyMap<
  string,
  { readonly to: string; readonly code: 301 | 302 | 410 }
>

export type ResolveResult =
  { readonly status: 301 | 302; readonly location: string } | { readonly status: 410 } | null

/**
 * Resolve a request path against the redirect map. Returns one redirect/gone or
 * null when the path is unknown. The map is built and normalised elsewhere; this
 * function does one hop only.
 */
export function resolveRedirect(
  site: SiteKey,
  map: RedirectMap,
  path: string,
  search = '',
): ResolveResult {
  const key = redirectKey(site, path, search)
  const hit = map.get(key)
  if (!hit) return null
  if (hit.code === 410) return { status: 410 }
  return { status: hit.code, location: hit.to }
}
