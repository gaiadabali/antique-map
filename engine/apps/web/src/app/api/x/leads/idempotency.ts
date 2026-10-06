/**
 * The leads route's idempotency memory (5.3.c; AI.md §4): a client-generated `Idempotency-Key`
 * header makes a double tap one lead — a repeat within ten minutes answers the first result
 * without calling the lead service again, including a repeat that arrives while the first is still
 * in flight (the second waits for the first's answer).
 *
 * **Scope.** The map is keyed by the route's `scopeKey()`: a hash of the client address, the
 * visitor's key and the body. Another address sending the same key, or the same key with a
 * different body (the visitor corrected a refused field, or a fresh Turnstile token), is a
 * different entry — one visitor's result is never replayed to another, and a correction is never
 * answered with the old refusal. The hash keeps no personal data in memory beyond the request.
 *
 * **Bound.** At most `MAX_ENTRIES` keys; past it the expired ones are swept, then the oldest are
 * dropped (a `Map` iterates in insertion order). In this process's memory, like the rate limit
 * (`server/leads/rate`): per instance, reset on restart.
 */
import { createHash } from 'node:crypto'

const TTL_MS = 10 * 60 * 1000
export const MAX_ENTRIES = 2_000

export type StoredAnswer = { readonly status: number; readonly body: string }

type Entry = { readonly at: number; readonly answer: Promise<StoredAnswer> }

/** The entry's key: the address, the visitor's key and the body, hashed together. */
export function scopeKey(ip: string | null, key: string, body: string): string {
  return createHash('sha256')
    .update(`${ip ?? 'unknown'}\u0000${key}\u0000${body}`)
    .digest('base64url')
}

export class LeadIdempotency {
  private readonly entries = new Map<string, Entry>()

  constructor(private readonly max: number = MAX_ENTRIES) {}

  /**
   * The first answer for `scope`, or a fresh run of `work`. Only answers `keep` accepts are
   * remembered — a transient refusal (the limit, the challenge, an outage) is forgotten once it
   * settles, so a later retry is a real attempt.
   */
  async run(
    scope: string,
    work: () => Promise<StoredAnswer>,
    keep: (answer: StoredAnswer) => boolean,
    now: number = Date.now(),
  ): Promise<StoredAnswer & { readonly replayed: boolean }> {
    const entry = this.entries.get(scope)
    if (entry !== undefined && now - entry.at < TTL_MS) {
      return { ...(await entry.answer), replayed: true }
    }
    if (entry !== undefined) this.entries.delete(scope)
    this.makeRoom(now)
    const answer = work()
    this.entries.set(scope, { at: now, answer })
    try {
      const settled = await answer
      if (!keep(settled)) this.forget(scope, answer)
      return { ...settled, replayed: false }
    } catch (error) {
      this.forget(scope, answer)
      throw error
    }
  }

  get size(): number {
    return this.entries.size
  }

  private forget(scope: string, answer: Promise<StoredAnswer>): void {
    if (this.entries.get(scope)?.answer === answer) this.entries.delete(scope)
  }

  private makeRoom(now: number): void {
    if (this.entries.size < this.max) return
    for (const [scope, entry] of this.entries) {
      if (now - entry.at >= TTL_MS) this.entries.delete(scope)
    }
    for (const scope of this.entries.keys()) {
      if (this.entries.size < this.max) break
      this.entries.delete(scope)
    }
  }
}
