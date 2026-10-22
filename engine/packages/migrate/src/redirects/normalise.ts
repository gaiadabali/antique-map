/**
 * Legacy redirect key normalisation, shared by the builder and the runtime resolver.
 *
 * A key is the path plus only the query keys that change what the old page showed.
 * Host is stripped (the map is per site). Case and percent-encoding are kept:
 * legacy paths match exactly (ARCHITECTURE.md §5, MIGRATION.md §6). Next answers
 * trailing and doubled slashes with a 308 before the proxy runs, so we collapse
 * them here — the inventory already lists the canonical path.
 */
import { URL, URLSearchParams } from 'node:url'

export type SiteKey = 'gallery' | 'shop'

const GALLERY_QUERY_KEYS = new Set(['s', 'o'])
const SHOP_QUERY_KEYS = new Set(['category', 'tag'])

const SITE_QUERY_KEYS: Record<SiteKey, Set<string>> = {
  gallery: GALLERY_QUERY_KEYS,
  shop: SHOP_QUERY_KEYS,
}

function keptQueryKeys(site: SiteKey): Set<string> {
  return SITE_QUERY_KEYS[site]
}

/**
 * Collapse doubled slashes and drop the trailing one. Next answers both with a
 * 308 before the proxy runs, so `/about/` and `/about` are one legacy URL.
 */
export function normalisePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/')
  const trimmed = collapsed.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * The meaningful query keys for a site, sorted so `?o=newest&s=sold` and
 * `?s=sold&o=newest` are one row. Values are re-encoded the one way
 * `URLSearchParams` does it.
 */
function keptQuery(site: SiteKey, params: URLSearchParams): string {
  const keys = keptQueryKeys(site)
  const kept = [...params.entries()]
    .filter(([key, value]) => keys.has(key) && value !== '')
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
  return new URLSearchParams(kept).toString()
}

/**
 * The key the redirect map is built on: a root-relative path plus meaningful
 * query. The host is ignored — callers pass paths from one site at a time.
 */
export function redirectKey(site: SiteKey, pathname: string, search = ''): string {
  const path = normalisePathname(pathname)
  const params = new URLSearchParams(search)
  const query = keptQuery(site, params)
  return query === '' ? path : `${path}?${query}`
}

/**
 * Split a raw legacy URL into the same key parts. Returns `null` when the URL
 * is not a same-origin path that the map cares about (foreign host, malformed,
 * or an address in the query).
 */
export function parseLegacyUrl(
  site: SiteKey,
  raw: string,
  origin?: string,
): { key: string; path: string; query: string } | null {
  let url: URL
  try {
    url = new URL(raw, origin ?? 'http://localhost')
  } catch {
    return null
  }
  const EMAIL = /[^\s/@]+(?:@|%40)[^\s/@]+\.[a-z]{2,}/i
  const path = normalisePathname(url.pathname)
  const query = keptQuery(site, url.searchParams)
  const key = query === '' ? path : `${path}?${query}`
  if (EMAIL.test(key)) return null
  return { key, path, query }
}

/**
 * Deduplicate an inventory of raw legacy URLs by their normalised redirect key,
 * keeping the first occurrence and ignoring malformed or foreign URLs. The
 * returned array is the input order with duplicates removed — safe to feed to
 * `buildRedirects`, which enforces that no two rows share a `from`.
 */
export function dedupeLegacyUrls(
  site: SiteKey,
  urls: readonly string[],
  origin?: string,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of urls) {
    const parsed = parseLegacyUrl(site, raw, origin)
    if (!parsed) continue
    if (seen.has(parsed.key)) continue
    seen.add(parsed.key)
    out.push(raw)
  }
  return out
}
