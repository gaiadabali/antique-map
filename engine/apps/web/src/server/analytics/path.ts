/**
 * The path, referrer and utm an event is stamped with (ANALYTICS.md §3, §5): the query string is
 * dropped except `utm_*` and the search page's `q` — which is redacted — and the tracking token is
 * removed from `/track/…` and `/id/lacak/…`, so no shared link's token lands in the table.
 * Neither the full referrer URL nor the raw page URL is ever stored.
 */

/** The only query parameters a stored path may keep. */
const KEPT_PARAMS = /^utm_[a-z]+$/i
/** The search page's parameter, kept but redacted. */
const SEARCH_PARAM = 'q'

/** Anything shaped like an email address, a phone number or a run of 6+ digits is private. */
const EMAIL_LIKE = /\S+@\S+\.\S+/
const PHONE_LIKE = /(?:\+?\d[\d\s().-]{7,}\d)/
const DIGIT_RUN = /\d{6,}/
const REMOVED = '[removed]'
const QUERY_MAX = 100

/** The redaction of §5: private-looking queries become `[removed]`, then the cut to 100 chars. */
export function redactQuery(query: string): string {
  let redacted = query
  if (EMAIL_LIKE.test(redacted) || PHONE_LIKE.test(redacted) || DIGIT_RUN.test(redacted)) {
    redacted = REMOVED
  }
  return redacted.slice(0, QUERY_MAX)
}

/** The prefixes whose last segment is a tracking token (COMPLIANCE.md; SECURITY.md §2.5). */
const TOKENISED_PREFIXES = ['/track/', '/id/lacak/']

/** The path with its trailing tracking token removed; other paths pass through. */
function stripTrackingToken(pathname: string): string {
  const lower = pathname.toLowerCase()
  const prefix = TOKENISED_PREFIXES.find((candidate) => lower.startsWith(candidate))
  if (prefix === undefined) return pathname
  const base = prefix.slice(0, -1) // '/track' or '/id/lacak'
  const segments = pathname
    .slice(prefix.length)
    .split('/')
    .filter((segment) => segment !== '')
  if (segments.length === 0) return base
  // The first segment under the prefix is the token; deeper segments (if a page ever adds them)
  // stay, the token never does.
  return [base, ...segments.slice(1)].join('/')
}

/**
 * A page URL's stored path: the pathname, its token stripped, then the kept query parameters —
 * `utm_*` as sent and `q` redacted — in their original order. A URL that does not parse gives
 * `null` (the caller drops the path, never guesses one).
 */
export function normalisePath(url: string | null | undefined): string | null {
  if (url === null || url === undefined || url === '') return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const path = stripTrackingToken(parsed.pathname)
  const kept: string[] = []
  for (const [key, value] of parsed.searchParams) {
    if (KEPT_PARAMS.test(key)) kept.push(`${key}=${encodeURIComponent(value).slice(0, 120)}`)
    else if (key === SEARCH_PARAM) kept.push(`${key}=${encodeURIComponent(redactQuery(value))}`)
  }
  return kept.length > 0 ? `${path}?${kept.join('&')}` : path
}

/** A referrer's host only — never the full URL (§5) — or `null` when there is none. */
export function referrerHost(referrer: string | null | undefined): string | null {
  if (referrer === null || referrer === undefined || referrer === '') return null
  try {
    const parsed = new URL(referrer)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.hostname.toLowerCase()
  } catch {
    return null
  }
}

/** The `utm` trio §7 keeps, from a landing URL's or an envelope's `utm_*` keys: cut, lower cased,
 * nothing else rides along. */
export function utmOf(source: string | null | undefined | Record<string, unknown>): {
  source: string | null
  medium: string | null
  campaign: string | null
} {
  const empty = { source: null, medium: null, campaign: null }
  const params =
    typeof source === 'string' && source !== ''
      ? tryParams(source)
      : source !== null &&
          source !== undefined &&
          typeof source === 'object' &&
          !Array.isArray(source)
        ? source
        : null
  if (params === null) return empty
  const pick = (name: string): string | null => {
    const raw = params[`utm_${name}`]
    if (typeof raw !== 'string') return null
    const value = raw.trim().slice(0, 120)
    return value !== '' ? value.toLowerCase() : null
  }
  return { source: pick('source'), medium: pick('medium'), campaign: pick('campaign') }
}

function tryParams(url: string): Record<string, unknown> | null {
  try {
    return Object.fromEntries(new URL(url).searchParams) as Record<string, unknown>
  } catch {
    return null
  }
}
