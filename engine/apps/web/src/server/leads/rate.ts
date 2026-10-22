/**
 * The lead forms' per-address limit (SECURITY.md §2.10): 5 posts an hour from one address, in
 * this process's memory — per instance, reset on restart, like `../analytics/rate.ts` (the pattern).
 * A fixed one-hour window per key; entries older than a window are swept as the map grows.
 */
import { setNewest, SweepClock } from '../bounded-map'

export const LEAD_POSTS_PER_HOUR = 5
/** The window, in seconds: what a refused post is told to wait at most (`Retry-After`). */
export const LEAD_WINDOW_SECONDS = 3600
const WINDOW_MS = LEAD_WINDOW_SECONDS * 1000
const SWEEP_AT = 5_000

type Window = { start: number; count: number }

export class PostLimiter {
  private readonly windows = new Map<string, Window>()
  private readonly clock = new SweepClock(WINDOW_MS)

  constructor(private readonly limit: number = LEAD_POSTS_PER_HOUR) {}

  /** Counts this post and answers whether it fits in the key's current hour. */
  allow(key: string, now: number = Date.now()): boolean {
    if (this.clock.due(now, this.windows.size >= SWEEP_AT)) this.sweep(now)
    const window = this.windows.get(key)
    if (window === undefined || now - window.start >= WINDOW_MS) {
      setNewest(this.windows, key, { start: now, count: 1 })
      return true
    }
    if (window.count >= this.limit) return false
    window.count += 1
    return true
  }

  sweep(now: number = Date.now()): void {
    for (const [key, window] of this.windows) {
      if (now - window.start >= WINDOW_MS) this.windows.delete(key)
    }
  }

  reset(): void {
    this.windows.clear()
    this.clock.reset()
  }
}
