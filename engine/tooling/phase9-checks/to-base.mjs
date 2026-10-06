// The base/origin split both phase-9 checks need. A check is pointed at what it can actually reach
// (`--base`: an IP, a tunnel, `http://localhost:<port>`), while pages, sitemaps and redirects speak
// the site's canonical origin (`--origin`, e.g. `https://gallery.staging.example`). A URL on the
// canonical origin is rewritten onto the base so it can be requested; a URL on any other origin is
// left alone and flagged `foreign`, so the caller can fail it rather than fetch a stranger.

/**
 * `toBase(url, { origin, base })` → `{ url, foreign }`. A URL on `origin` (same protocol+host+port)
 * is rewritten onto `base` keeping its path and query. A URL on any other origin is returned
 * unchanged with `foreign: true`. A URL that cannot be parsed is returned unchanged, `foreign: true`.
 */
export function toBase(url, { origin, base }) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { url, foreign: true }
  }
  if (parsed.origin !== origin) return { url, foreign: true }
  return { url: `${base}${parsed.pathname}${parsed.search}`, foreign: false }
}

/** True when `url` sits on `origin` (a thin helper for callers that only want the predicate). */
export function isOnOrigin(url, origin) {
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}
