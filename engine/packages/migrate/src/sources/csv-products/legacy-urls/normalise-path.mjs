// Turns one archived or indexed URL into the key the legacy redirect map is
// built on: a root-relative path, plus only the query that changes what the
// old page showed. The domain is always an argument — engine code names no
// brand's domain (CONVENTIONS.md §1).
import { URL, URLSearchParams } from 'node:url'

// A Squarespace collection filtered by `?category=` or `?tag=` is a different
// listing, which the new site answers with a facet URL (MIGRATION.md §6: a
// query is mapped, not dropped). Everything else in a query — `?format=json`,
// `?format=rss`, `?offset=` pagination, `?nochrome=`, tracking tags, cart and
// order tokens — is noise to a redirect map, or worse, a session value that
// must not be committed.
const MEANINGFUL_QUERY_KEYS = new Set(['category', 'tag'])

// An address in a path is a person's (a `mailto:` crawled as a link, a
// newsletter confirmation): it never goes into a committed inventory.
const EMAIL = /[^\s/@]+(?:@|%40)[^\s/@]+\.[a-z]{2,}/i

/**
 * @typedef {{ ok: true, key: string, path: string, query: string, host: string }} Normalised
 * @typedef {{ ok: false, reason: 'unparsable' | 'foreign-host' | 'personal' }} Rejected
 */

/**
 * `true` when `host` is `domain` or one of its subdomains (`www.` included).
 * @param {string} host
 * @param {string} domain
 */
export function isOnDomain(host, domain) {
  const bare = domain.toLowerCase()
  return host === bare || host.endsWith(`.${bare}`)
}

/**
 * The host as the inventory reports it: `@` for the apex or `www.`, otherwise
 * the subdomain label (`shop`), so a path served by another subdomain is kept
 * apart from the main site's.
 * @param {string} host
 * @param {string} domain
 */
export function hostLabel(host, domain) {
  const bare = domain.toLowerCase()
  if (host === bare || host === `www.${bare}`) return '@'
  return host.slice(0, -(bare.length + 1))
}

/**
 * @param {string} raw   an absolute URL (a CDX `original`, a Search Console page)
 * @param {string} domain the site's registrable domain, e.g. `example.com`
 * @returns {Normalised | Rejected}
 */
export function normaliseUrl(raw, domain) {
  let url
  try {
    // CDX keeps what the crawler saw, and some crawlers saw a bare host.
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`)
  } catch {
    return { ok: false, reason: 'unparsable' }
  }
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!isOnDomain(host, domain)) return { ok: false, reason: 'foreign-host' }

  const path = normalisePathname(url.pathname)
  const query = keptQuery(url.searchParams)
  const key = query === '' ? path : `${path}?${query}`
  if (EMAIL.test(key)) return { ok: false, reason: 'personal' }
  return { ok: true, key, path, query, host: hostLabel(host, domain) }
}

/**
 * Collapses doubled slashes and drops the trailing one — Next answers both
 * with a 308 before the proxy runs (MIGRATION.md §6), so `/about/` and
 * `/about` are one legacy URL. Case and percent-encoding are kept as sent:
 * legacy paths are matched exactly (C10).
 * @param {string} pathname
 */
export function normalisePathname(pathname) {
  const collapsed = pathname.replace(/\/{2,}/g, '/')
  const trimmed = collapsed.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * The meaningful part of a query, keys sorted so `?tag=a&category=b` and
 * `?category=b&tag=a` are one row; values are re-encoded the one way
 * `URLSearchParams` does it.
 * @param {URLSearchParams} params
 */
export function keptQuery(params) {
  const kept = [...params.entries()]
    .filter(([key, value]) => MEANINGFUL_QUERY_KEYS.has(key) && value !== '')
    .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
  return new URLSearchParams(kept).toString()
}
