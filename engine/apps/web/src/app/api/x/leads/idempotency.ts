/**
 * The leads route's idempotency memory (5.3.c; AI.md §4): a client-generated
 * `Idempotency-Key` header makes a double tap one lead — a repeat with the same key within ten
 * minutes answers the first result without calling the lead service again. In this process's
 * memory, like the rate limit (`server/leads/rate`): per instance, reset on restart, bounded by
 * the sweep.
 */
const TTL_MS = 10 * 60 * 1000
const SWEEP_AT = 1_000

type Entry = { readonly at: number; readonly status: number; readonly body: string }

export class LeadIdempotency {
  private readonly entries = new Map<string, Entry>()

  /** The first result a key holds, or `null` — an expired key is dropped, never replayed. */
  get(key: string, now: number = Date.now()): { readonly status: number; readonly body: string } | null {
    const entry = this.entries.get(key)
    if (entry === undefined) return null
    if (now - entry.at >= TTL_MS) {
      this.entries.delete(key)
      return null
    }
    return { status: entry.status, body: entry.body }
  }

  /** Keeps the first result for a key; the first one wins, as with the lead itself. */
  put(key: string, status: number, body: string, now: number = Date.now()): void {
    if (this.entries.size >= SWEEP_AT) this.sweep(now)
    if (this.entries.has(key)) return
    this.entries.set(key, { at: now, status, body })
  }

  sweep(now: number = Date.now()): void {
    for (const [key, entry] of this.entries) {
      if (now - entry.at >= TTL_MS) this.entries.delete(key)
    }
  }
}
