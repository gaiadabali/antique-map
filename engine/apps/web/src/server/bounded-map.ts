/**
 * The in-process limiters' memory bound. Each limiter sweeps on time (at most once per its window,
 * from the hot path) as well as on size, and caps its map so live distinct keys cannot grow it
 * without end or make a sweep O(n) on every request.
 */

/** The most keys one limiter map may hold; past it the oldest entries are evicted. */
export const MAX_LIMITER_ENTRIES = 100_000

/** Sets `key` as the newest entry (delete-then-set, as a re-set keeps its old place), evicting the oldest past `max`. */
export function setNewest<V>(
  map: Map<string, V>,
  key: string,
  value: V,
  max: number = MAX_LIMITER_ENTRIES,
): void {
  map.delete(key)
  map.set(key, value)
  while (map.size > max) {
    const oldest = map.keys().next()
    if (oldest.done) break
    map.delete(oldest.value)
  }
}

/** Whether a sweep is due: once `everyMs` has passed since the last one (the first call only starts the clock). */
export class SweepClock {
  private last: number | null = null

  constructor(private readonly everyMs: number) {}

  /**
   * `oversized` (the map passed its size trigger) shortens the wait to at most a second, so a map
   * of live keys that a sweep cannot shrink is not re-scanned on every request.
   */
  due(now: number, oversized = false): boolean {
    if (this.last === null) {
      this.last = now
      return false
    }
    if (now - this.last < (oversized ? Math.min(this.everyMs, 1_000) : this.everyMs)) return false
    this.last = now
    return true
  }

  reset(): void {
    this.last = null
  }
}
