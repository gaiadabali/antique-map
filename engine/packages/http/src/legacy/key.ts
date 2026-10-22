/**
 * The key a legacy URL is looked up by: a root-relative path plus only the query keys that change
 * what the old page showed (DATA.md §6). It is `@engine/migrate/redirects`' `redirectKey()` — the
 * function the 9.4a builder keyed every row with — restated here because `@engine/http` does not
 * depend on `@engine/migrate` (a CLI package: its `package.json` and the lockfile are not this
 * task's). `key.test.ts` holds the two to the same answers over a battery of URLs; change one and
 * that test fails until the other follows.
 *
 * Host is never part of a key (the map is per site); case and percent-encoding are kept, since
 * legacy paths match exactly. Doubled and trailing slashes collapse: Next answers both with a 308
 * before the proxy runs.
 */
import type { SiteKey } from '@engine/config/sites'

/** The query keys that decide which old page was shown, per site. */
const KEPT_QUERY_KEYS: Record<SiteKey, ReadonlySet<string>> = {
  gallery: new Set(['s', 'o']),
  shop: new Set(['category', 'tag']),
}

function normalisePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

function keptQuery(site: SiteKey, params: URLSearchParams): string {
  const keys = KEPT_QUERY_KEYS[site]
  const kept = [...params.entries()]
    .filter(([key, value]) => keys.has(key) && value !== '')
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
  return new URLSearchParams(kept).toString()
}

/** `path` plus the kept, sorted query (`?s=sold`); an editor's row `from` is passed with `search` `''`. */
export function redirectKey(site: SiteKey, pathname: string, search = ''): string {
  const path = normalisePathname(pathname)
  const query = keptQuery(site, new URLSearchParams(search))
  return query === '' ? path : `${path}?${query}`
}
