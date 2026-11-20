/**
 * The rate limits of ANALYTICS.md §6 step 3: more than 120 events a minute from one `sessionId`,
 * and a per-address burst token bucket, are dropped for that session (or that address). Both live
 * in this process's memory only — per process, not shared — so limits are per instance behind the
 * load balancer and reset on restart; SECURITY.md §2.10's Postgres backing is for the routes a
 * 429 answers, which this is not (collect always answers 204 and just stops counting).
 */

/** Events one session may send per rolling minute window. */
export const SESSION_LIMIT = 120
/** The per-address bucket: a burst of this many requests is soaked before drops begin… */
export const ADDRESS_CAPACITY = 240
/** …and it refills at this many requests a second. */
export const ADDRESS_REFILL_PER_SECOND = 2

/** Hard cap per map: past it the oldest entries go, so live distinct keys cannot grow memory. */
export const MAX_ENTRIES = 100_000
const SWEEP_EVERY_MS = 60_000

type SessionWindow = { windowStart: number; count: number }
type Bucket = { tokens: number; updatedAt: number }

export class RateLimiter {
  private readonly sessions = new Map<string, SessionWindow>()
  private readonly addresses = new Map<string, Bucket>()
  private lastSweep: number | null = null

  /** The time trigger: a sweep at most once a minute, from the hot path, so no caller must run it. */
  private maybeSweep(now: number): void {
    if (this.lastSweep === null) this.lastSweep = now
    if (now - this.lastSweep >= SWEEP_EVERY_MS) {
      this.sweep(now)
      this.lastSweep = now
    }
  }

  /** Set with recency, then drop the oldest entries past the cap (a Map iterates oldest first). */
  private put<V>(map: Map<string, V>, key: string, value: V): void {
    map.delete(key)
    map.set(key, value)
    while (map.size > MAX_ENTRIES) {
      const oldest = map.keys().next()
      if (oldest.done) break
      map.delete(oldest.value)
    }
  }

  /** Whether this session's next `count` events fit in the last minute's 120; they count at once. */
  allowSession(sessionId: string, now: number = Date.now(), count = 1): boolean {
    this.maybeSweep(now)
    const window = this.sessions.get(sessionId)
    if (window === undefined || now - window.windowStart >= 60_000) {
      this.put(this.sessions, sessionId, { windowStart: now, count })
      return count <= SESSION_LIMIT
    }
    if (window.count + count > SESSION_LIMIT) return false
    window.count += count
    return true
  }

  /** Whether the address's bucket had `count` tokens; it consumes them when it did. */
  allowAddress(address: string, now: number = Date.now(), count = 1): boolean {
    this.maybeSweep(now)
    const bucket = this.addresses.get(address) ?? {
      tokens: ADDRESS_CAPACITY,
      updatedAt: now,
    }
    const elapsedSeconds = (now - bucket.updatedAt) / 1000
    bucket.tokens = Math.min(
      ADDRESS_CAPACITY,
      bucket.tokens + elapsedSeconds * ADDRESS_REFILL_PER_SECOND,
    )
    bucket.updatedAt = now
    if (bucket.tokens < count) {
      this.put(this.addresses, address, bucket)
      return false
    }
    bucket.tokens -= count
    this.put(this.addresses, address, bucket)
    return true
  }

  /** The entries older than a minute are swept, so long-lived processes do not grow without end. */
  sweep(now: number = Date.now()): void {
    for (const [id, window] of this.sessions) {
      if (now - window.windowStart >= 60_000) this.sessions.delete(id)
    }
    for (const [id, bucket] of this.addresses) {
      if (now - bucket.updatedAt >= 3_600_000) this.addresses.delete(id)
    }
  }

  /** The tests' reset: process state, so a test that does not clear it sees another's. */
  reset(): void {
    this.lastSweep = null
    this.sessions.clear()
    this.addresses.clear()
  }
}

/** The process's one limiter, shared by every request it answers. */
export const rateLimiter = new RateLimiter()
