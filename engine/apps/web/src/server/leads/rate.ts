/**
 * The lead forms' per-address limit (SECURITY.md §2.10): 10 posts a minute from one address, in
 * this process's memory — per instance, reset on restart, like `../analytics/rate.ts` (the pattern).
 * A fixed one-minute window per key; entries older than a window are swept as the map grows.
 */

export const LEAD_POSTS_PER_MINUTE = 10
const WINDOW_MS = 60_000
const SWEEP_AT = 5_000

type Window = { start: number; count: number }

export class PostLimiter {
  private readonly windows = new Map<string, Window>()

  constructor(private readonly limit: number = LEAD_POSTS_PER_MINUTE) {}

  /** Counts this post and answers whether it fits in the key's current minute. */
  allow(key: string, now: number = Date.now()): boolean {
    if (this.windows.size >= SWEEP_AT) this.sweep(now)
    const window = this.windows.get(key)
    if (window === undefined || now - window.start >= WINDOW_MS) {
      this.windows.set(key, { start: now, count: 1 })
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
  }
}
