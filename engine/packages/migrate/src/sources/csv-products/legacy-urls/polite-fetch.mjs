// One HTTP client for the Wayback Machine, polite by construction: one
// request at a time, a floor on the gap between them, backoff on 429 / 5xx,
// and a host allowlist so this tool can only ever ask the archive — never the
// old site itself (MIGRATION.md §10; AGENTS.md "Never touch the current live
// sites").
import { setTimeout as sleep } from 'node:timers/promises'
import { URL } from 'node:url'

/** The archive asks for no more than about one CDX request a second; we stay under it. */
export const MIN_INTERVAL_FLOOR_MS = 1000

const RETRYABLE = new Set([429, 500, 502, 503, 504])
const REDIRECTS = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECTS = 3

/** @param {string | null} header */
function retryAfterMs(header) {
  if (header === null) return 0
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return seconds * 1000
  const when = Date.parse(header)
  return Number.isNaN(when) ? 0 : Math.max(0, when - Date.now())
}

/**
 * @typedef {object} PoliteFetchOptions
 * @property {string[]} allowedHosts       every request's host must be one of these
 * @property {string} userAgent
 * @property {number} [minIntervalMs]      gap between the starts of two requests (≥ 1000)
 * @property {number} [maxAttempts]
 * @property {number} [timeoutMs]
 * @property {typeof globalThis.fetch} [fetchImpl]
 * @property {(ms: number) => Promise<unknown>} [sleepImpl]
 * @property {() => number} [now]
 * @property {(line: string) => void} [log]
 */

/**
 * @param {PoliteFetchOptions} options
 * @returns {{ getText: (url: string) => Promise<string>, requests: string[] }}
 */
export function createPoliteFetch(options) {
  const {
    allowedHosts,
    userAgent,
    minIntervalMs = 1500,
    maxAttempts = 5,
    timeoutMs = 180_000,
    fetchImpl = globalThis.fetch,
    sleepImpl = sleep,
    now = Date.now,
    log = () => {},
  } = options
  if (minIntervalMs < MIN_INTERVAL_FLOOR_MS) {
    throw new Error(`minIntervalMs ${minIntervalMs} is below the ${MIN_INTERVAL_FLOOR_MS} ms floor`)
  }
  const allowed = new Set(allowedHosts.map((host) => host.toLowerCase()))
  /** Every URL actually requested, in order — the audit trail the report quotes. */
  const requests = []
  let lastStart = Number.NEGATIVE_INFINITY

  async function waitTurn() {
    const wait = lastStart + minIntervalMs - now()
    if (wait > 0) await sleepImpl(wait)
    lastStart = now()
  }

  /**
   * Redirects are followed by hand, so each hop passes the host allowlist:
   * a playback that redirected to the original site would be refused, not
   * followed.
   * @param {string} url
   * @param {number} [hops]
   * @returns {Promise<string>}
   */
  async function getText(url, hops = 0) {
    const host = new URL(url).hostname.toLowerCase()
    if (!allowed.has(host)) throw new Error(`refusing to request ${host}: not an allowed host`)
    for (let attempt = 1; ; attempt += 1) {
      await waitTurn()
      requests.push(url)
      let response
      try {
        response = await fetchImpl(url, {
          headers: {
            'user-agent': userAgent,
            accept: 'application/json, application/xml, text/plain',
          },
          signal: globalThis.AbortSignal.timeout(timeoutMs),
          redirect: 'manual',
        })
      } catch (error) {
        if (attempt >= maxAttempts) throw error
        log(`  network error (${String(error)}), retry ${attempt}/${maxAttempts - 1}`)
        await sleepImpl(backoffMs(attempt))
        continue
      }
      if (response.ok) return await response.text()
      const location = response.headers.get('location')
      if (REDIRECTS.has(response.status) && location !== null) {
        if (hops >= MAX_REDIRECTS) throw new Error(`too many redirects from ${url}`)
        log(`  HTTP ${response.status} → ${location}`)
        return getText(new URL(location, url).toString(), hops + 1)
      }
      if (!RETRYABLE.has(response.status) || attempt >= maxAttempts) {
        throw new Error(`HTTP ${response.status} for ${url}`)
      }
      const wait = Math.max(retryAfterMs(response.headers.get('retry-after')), backoffMs(attempt))
      log(`  HTTP ${response.status}, waiting ${Math.round(wait / 1000)} s before retry ${attempt}`)
      await sleepImpl(wait)
    }
  }

  return { getText, requests }
}

/** 10 s, 20 s, 40 s … — the archive's 429 means "slow down", not "try again now". */
export function backoffMs(attempt) {
  return 10_000 * 2 ** (attempt - 1)
}
