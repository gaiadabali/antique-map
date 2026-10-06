// The 9.4.c verification (DATA.md §6–§7, TASKS.md 9.4.c): for every legacy key, request it without
// following redirects and judge the answer — 200 as itself, one 301 to a 200, 410 for a retired
// address, or a 404 the builder lists unresolved (with its reason). The Check asks for a **301**
// specifically, so 302 and 307 are failures with their status; a 308 is acceptable only when its
// Location differs from the request just by a trailing slash, and is counted as `normalised`.
//
// The redirect is judged against the site's canonical `origin` (the Location a page would carry),
// while the walk is pointed at what it can reach (`base`): a Location on `origin` is rewritten onto
// `base` with `toBase` and requested; a Location on any other origin is a failure ("redirects
// off-site"). Pure apart from the injected `get`, so a test drives both sides with a local server.
import { resolveLocation } from './http.mjs'
import { toBase } from './to-base.mjs'

const REDIRECT = new Set([301, 302, 307, 308])
const FAILED_REDIRECT = new Set([300, 303, 305, 306])

/** One key's judgement, as it is written to the state file and counted. */
function outcome(kind, extra = {}) {
  return { kind, ...extra }
}

/** `http://host[:port]` origin of a base string. */
function originOf(url) {
  return new URL(url).origin
}

/** True when two pathnames are the same but for a trailing slash, and they are not identical. */
function differsBySlash(a, b) {
  const strip = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p)
  return a !== b && strip(a) === strip(b)
}

/** A Location on the canonical origin is rewritten onto `base`; on `base` itself it is used as is. */
function mapLocation(location, { origin, base }) {
  if (new URL(location).origin === origin) return toBase(location, { origin, base })
  if (new URL(location).origin === originOf(base)) return { url: location, foreign: false }
  return { url: location, foreign: true }
}

/**
 * Requests one key and returns its outcome. `get(url)` resolves `{ status, headers, url }`.
 * `unresolved` is the builder's map from key to reason (the 9.4a `unresolved.<site>.json`).
 * `origin` is the site's canonical origin (defaults to `base` when the caller has none).
 */
export async function judgeKey(base, key, { get, unresolved, origin = originOf(base) }) {
  const url = `${base}${key}`
  const first = await get(url)
  const status = first.status

  if (status === 200) return outcome('ok', { url, status })
  if (status === 410) return outcome('gone', { url })

  if (status === 308) {
    const location = resolveLocation(url, first.headers?.location)
    if (location !== null && !mapLocation(location, { origin, base }).foreign) {
      const loc = new URL(location)
      if (differsBySlash(new URL(url).pathname, loc.pathname))
        return outcome('normalised', { url, status, to: location })
    }
    return outcome('fail', { url, status, reason: `unexpected status ${status}` })
  }

  if (status === 302 || status === 307) {
    return outcome('fail', { url, status, reason: `expected 301, got ${status}` })
  }

  if (status === 301 || REDIRECT.has(status) || FAILED_REDIRECT.has(status)) {
    const location = resolveLocation(url, first.headers?.location)
    if (location === null)
      return outcome('fail', { url, status, reason: 'redirect without a Location' })
    const mapped = mapLocation(location, { origin, base })
    if (mapped.foreign)
      return outcome('fail', { url, status, to: location, reason: 'redirects off-site' })
    const hop = await get(mapped.url)
    if (hop.status === 200) return outcome('redirected', { url, status, to: location })
    if (REDIRECT.has(hop.status) || FAILED_REDIRECT.has(hop.status)) {
      return outcome('fail', {
        url,
        status,
        to: location,
        reason: `chain: the target answers ${hop.status}`,
      })
    }
    return outcome('fail', {
      url,
      status,
      to: location,
      reason: `the target answers ${hop.status}`,
    })
  }

  if (status === 404) {
    const reason = unresolved[key]
    if (typeof reason === 'string') return outcome('unresolved', { url, reason })
    return outcome('fail', { url, status, reason: '404 the builder does not list unresolved' })
  }

  return outcome('fail', { url, status, reason: `unexpected status ${status}` })
}

/**
 * Judges every key, resuming from `done` (a Map from URL to outcome). Returns the tallies and the
 * failures; `onResult(url, outcome)` is called once per fresh answer so the caller persists it.
 * `counts.statuses` counts each redirect code seen (301, 302, 307, 308), so the report can show 301
 * apart from the rest.
 */
export async function checkKeys(
  base,
  keys,
  { get, unresolved = {}, done = new Map(), onResult = () => {}, origin = originOf(base) },
) {
  const counts = {
    ok: 0,
    redirected: 0,
    normalised: 0,
    gone: 0,
    unresolved: 0,
    fail: 0,
    statuses: { 301: 0, 302: 0, 307: 0, 308: 0 },
  }
  const failures = []

  for (const key of keys) {
    const url = `${base}${key}`
    let result = done.get(url)
    if (result === undefined) {
      result = await judgeKey(base, key, { get, unresolved, origin })
      onResult(url, result)
    }
    counts[result.kind] += 1
    if (REDIRECT.has(result.status) && result.status in counts.statuses) {
      counts.statuses[result.status] += 1
    }
    if (result.kind === 'fail') failures.push(result)
  }

  return { total: keys.length, counts, failures }
}

/** `rows + gone + unresolved = N` — the line the 9.4.c Check asks for. `N` is the key count. */
export function reconciliation(keys, counts) {
  const rows = counts.ok + counts.redirected + counts.normalised
  const sum = rows + counts.gone + counts.unresolved
  return {
    rows,
    gone: counts.gone,
    unresolved: counts.unresolved,
    total: keys,
    sum,
    matches: sum === keys,
  }
}
