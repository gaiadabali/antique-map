/**
 * The only way the reader talks to the old site (D41): GET, one request at a
 * time, at least `minIntervalMs` between the end of one answer and the start
 * of the next (longer if robots.txt asks), no cookies, no credentials, no
 * redirects followed silently (each hop is its own polite request), an
 * honest User-Agent — and never the same URL twice, because every answer is
 * cached on disk before it is used.
 *
 * On 429 or 5xx it backs off (Retry-After first, else exponential), and a
 * 429 also doubles the interval for the rest of the run. A run of URLs that
 * exhaust their attempts stops the whole read: it never hammers a site that
 * is struggling.
 */
import type { ResponseCache, CachedResponse } from './cache.ts'
import type { ReaderConfig } from './config.ts'
import { DISALLOW_ALL, isAllowed, parseRobots, ALLOW_ALL, type RobotsPolicy } from './robots.ts'

export type Sleep = (ms: number) => Promise<void>
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>

export type FetchOutcome =
  | { kind: 'response'; entry: CachedResponse; fromCache: boolean }
  | { kind: 'skipped'; reason: 'robots' | 'offsite' | 'never' }
  | { kind: 'failed'; status: number | null; message: string }

export class ReadAborted extends Error {}

export type RequestOptions = { maxAttempts?: number; recordFailure?: boolean }

const TRANSIENT = new Set([429, 500, 502, 503, 504])
const MAX_BACKOFF_MS = 15 * 60_000
const MAX_INTERVAL_MS = 60_000
const FORBIDDEN_STOP = 5

export type FetcherStats = { requests: number; bytes: number; byStatus: Record<string, number> }

export class PoliteFetcher {
  private readonly config: ReaderConfig
  private readonly cache: ResponseCache
  private readonly fetchImpl: FetchLike
  private readonly sleep: Sleep
  private readonly now: () => number
  private readonly log: (line: string) => void
  private readonly never: RegExp[]
  private readonly offline: boolean
  private robots: RobotsPolicy = ALLOW_ALL
  private intervalMs: number
  private nextAllowedAt = 0
  private consecutiveFailures = 0
  private consecutiveForbidden = 0
  readonly stats: FetcherStats = { requests: 0, bytes: 0, byStatus: {} }

  constructor(options: {
    config: ReaderConfig
    cache: ResponseCache
    fetchImpl?: FetchLike
    sleep?: Sleep
    now?: () => number
    log?: (line: string) => void
    /** Answer from the cache alone: an uncached URL fails at once and nothing leaves the machine. */
    offline?: boolean
  }) {
    this.config = options.config
    this.cache = options.cache
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init))
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
    this.now = options.now ?? (() => Date.now())
    this.log = options.log ?? (() => {})
    this.never = options.config.never.map((pattern) => new RegExp(pattern))
    this.intervalMs = options.config.minIntervalMs
    this.offline = options.offline ?? false
  }

  get robotsPolicy(): RobotsPolicy {
    return this.robots
  }

  /** What the cache holds for `url` — never a request. */
  cachedEntry(url: string): CachedResponse | null {
    return this.cache.get(url)
  }

  readText(entry: CachedResponse): string | null {
    return this.cache.readText(entry)
  }

  bodyPath(entry: CachedResponse): string | null {
    return this.cache.bodyPath(entry)
  }

  get currentIntervalMs(): number {
    return this.intervalMs
  }

  /** Reads robots.txt (cached like any URL) and applies it. Call once before `get`. */
  async init(): Promise<RobotsPolicy> {
    const productToken = this.config.userAgent.split(/[\s/]/)[0] ?? this.config.userAgent
    const outcome = await this.request(`${this.config.baseUrl}/robots.txt`, 'text/plain')
    if (outcome.kind === 'response' && outcome.entry.status === 200) {
      this.robots = parseRobots(this.cache.readText(outcome.entry) ?? '', productToken)
    } else if (outcome.kind === 'response' && outcome.entry.status < 500) {
      this.robots = ALLOW_ALL // 4xx: no robots.txt, RFC 9309 §2.3.1.3
    } else {
      this.robots = DISALLOW_ALL
    }
    const delayMs = (this.robots.crawlDelaySeconds ?? 0) * 1000
    if (delayMs > this.intervalMs) this.intervalMs = Math.min(delayMs, MAX_INTERVAL_MS)
    return this.robots
  }

  /** Whether `url` is ours to request at all — same origin, not a never-path, robots-allowed. */
  permission(url: string): 'ok' | 'robots' | 'offsite' | 'never' {
    const parsed = new URL(url)
    if (parsed.origin !== this.config.baseUrl) return 'offsite'
    const pathAndQuery = `${parsed.pathname}${parsed.search}`
    if (this.never.some((pattern) => pattern.test(pathAndQuery))) return 'never'
    return isAllowed(this.robots, pathAndQuery) ? 'ok' : 'robots'
  }

  /**
   * `maxAttempts` lowers the config's for one URL, and `recordFailure` caches its final failure
   * (status only) — so a probe such as the sitemap is asked once, ever, not once per run.
   */
  async get(
    url: string,
    accept = 'text/html',
    options: RequestOptions = {},
  ): Promise<FetchOutcome> {
    const verdict = this.permission(url)
    if (verdict !== 'ok') return { kind: 'skipped', reason: verdict }
    return this.request(url, accept, options)
  }

  private async request(
    url: string,
    accept: string,
    options: RequestOptions = {},
  ): Promise<FetchOutcome> {
    const { maxAttempts, recordFailure = false } = options
    const cached = this.cache.get(url)
    if (cached !== null) return { kind: 'response', entry: cached, fromCache: true }
    if (this.offline) return { kind: 'failed', status: null, message: 'offline: not in the cache' }

    const attempts = Math.min(maxAttempts ?? this.config.maxAttempts, this.config.maxAttempts)
    let lastStatus: number | null = null
    let lastMessage = ''
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      await this.waitForTurn()
      let response: Response | null = null
      let turnFinished = false
      lastStatus = null
      try {
        response = await this.fetchImpl(url, {
          method: 'GET',
          redirect: 'manual',
          credentials: 'omit',
          headers: { 'User-Agent': this.config.userAgent, Accept: accept },
          signal: AbortSignal.timeout(accept.startsWith('image/') ? 180_000 : 60_000),
        })
        const body = new Uint8Array(await response.arrayBuffer())
        this.finishTurn(response.status, body.byteLength)
        turnFinished = true
        if (!TRANSIENT.has(response.status)) {
          this.consecutiveFailures = 0
          // A run of 403s means the site has chosen to refuse us: stop, never argue with it.
          this.consecutiveForbidden = response.status === 403 ? this.consecutiveForbidden + 1 : 0
          if (this.consecutiveForbidden >= FORBIDDEN_STOP) {
            throw new ReadAborted(`${FORBIDDEN_STOP} answers in a row were 403; stopping`)
          }
          const entry = this.cache.put(
            {
              url,
              status: response.status,
              fetchedAt: new Date(this.now()).toISOString(),
              contentType: response.headers.get('content-type'),
              location: response.headers.get('location'),
              lastModified: response.headers.get('last-modified'),
            },
            body,
          )
          return { kind: 'response', entry, fromCache: false }
        }
        lastStatus = response.status
        lastMessage = `HTTP ${response.status}`
      } catch (error) {
        if (error instanceof ReadAborted) throw error
        if (!turnFinished) this.finishTurn(response === null ? 'network' : response.status, 0)
        lastMessage = error instanceof Error ? error.message : String(error)
      }
      if (lastStatus === 429) this.intervalMs = Math.min(this.intervalMs * 2, MAX_INTERVAL_MS)
      if (attempt < attempts) {
        const waitMs = this.backoffMs(attempt, lastStatus, response)
        this.log(`backing off ${Math.round(waitMs / 1000)}s after ${lastMessage} on ${url}`)
        await this.sleep(waitMs)
      }
    }
    if (recordFailure && lastStatus !== null) {
      const entry = this.cache.put(
        {
          url,
          status: lastStatus,
          fetchedAt: new Date(this.now()).toISOString(),
          contentType: null,
          location: null,
          lastModified: null,
        },
        null,
      )
      return { kind: 'response', entry, fromCache: false }
    }
    this.consecutiveFailures += 1
    if (this.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      throw new ReadAborted(
        `${this.consecutiveFailures} URLs in a row failed (last: ${lastMessage} on ${url}); stopping`,
      )
    }
    return { kind: 'failed', status: lastStatus, message: lastMessage }
  }

  private backoffMs(attempt: number, status: number | null, response: Response | null): number {
    const retryAfter = response?.headers.get('retry-after') ?? null
    if (retryAfter !== null) {
      const seconds = Number(retryAfter)
      const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter) - this.now()
      if (Number.isFinite(ms) && ms > 0) return Math.min(ms, MAX_BACKOFF_MS)
    }
    const base = status === 429 || status === 503 ? 30_000 : 10_000
    return Math.min(base * 2 ** (attempt - 1), MAX_BACKOFF_MS)
  }

  private async waitForTurn(): Promise<void> {
    const wait = this.nextAllowedAt - this.now()
    if (wait > 0) await this.sleep(wait)
  }

  private finishTurn(status: number | 'network', bytes: number): void {
    this.stats.requests += 1
    this.stats.bytes += bytes
    const key = String(status)
    this.stats.byStatus[key] = (this.stats.byStatus[key] ?? 0) + 1
    this.nextAllowedAt = this.now() + this.intervalMs
  }
}
