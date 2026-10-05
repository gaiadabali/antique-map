// The 9.4.c verification (DATA.md §6–§7, TASKS.md 9.4.c): for every legacy key, request it without
// following redirects and judge the answer — 200 as itself, one 301 to a 200, 410 for a retired
// address, or a 404 the builder lists unresolved (with its reason). Anything else is a failure,
// and so is a chain (a 301 whose target redirects again). Pure apart from the injected `get`, so a
// test drives both sides with a local server.
import { resolveLocation } from './http.mjs'

const REDIRECT = new Set([301, 302, 307, 308])
const FAILED_REDIRECT = new Set([300, 303, 305, 306])

/** One key's judgement, as it is written to the state file and counted. */
function outcome(kind, extra = {}) {
  return { kind, ...extra }
}

/**
 * Requests one key and returns its outcome. `get(url)` resolves `{ status, headers, url }`.
 * `unresolved` is the builder's map from key to reason (the 9.4a `unresolved.<site>.json`).
 */
export async function judgeKey(base, key, { get, unresolved }) {
  const url = `${base}${key}`
  const first = await get(url)
  const status = first.status

  if (status === 200) return outcome('ok', { url, status })
  if (status === 410) return outcome('gone', { url })

  if (REDIRECT.has(status) || FAILED_REDIRECT.has(status)) {
    const location = resolveLocation(url, first.headers?.location)
    if (location === null)
      return outcome('fail', { url, status, reason: 'redirect without a Location' })
    const hop = await get(location)
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
 */
export async function checkKeys(
  base,
  keys,
  { get, unresolved = {}, done = new Map(), onResult = () => {} },
) {
  const counts = { ok: 0, redirected: 0, gone: 0, unresolved: 0, fail: 0 }
  const failures = []

  for (const key of keys) {
    const url = `${base}${key}`
    let result = done.get(url)
    if (result === undefined) {
      result = await judgeKey(base, key, { get, unresolved })
      onResult(url, result)
    }
    counts[result.kind] += 1
    if (result.kind === 'fail') failures.push(result)
  }

  return { total: keys.length, counts, failures }
}

/** `rows + gone + unresolved = N` — the line the 9.4.c Check asks for. `N` is the key count. */
export function reconciliation(keys, counts) {
  const rows = counts.ok + counts.redirected
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
