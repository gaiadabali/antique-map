/**
 * The tracking surface's guess budget (TASKS.md 7.3.c: "the tenth wrong guess in a minute is
 * throttled") — counted here, not in the page (`apps/web/src/sites/shop/tracking/rate-limit.ts`'s
 * own header explains why only the proxy can answer 429 on a page request). A stricter window than
 * SECURITY.md §2.10's general "30 per minute" ceiling: a token guess at `/track/{token}` is a try
 * against the one credential an order has, so it gets its own, tighter budget.
 *
 * Counted per client address (`./gates`'s `clientAddress`), in memory, sliding: the proxy runs in
 * one process per instance, same as every other proxy state.
 */

/** Per TASKS.md 7.3.c, not SECURITY.md §2.10's general ceiling. */
export const TRACKING_GUESSES_PER_MINUTE = 10
const WINDOW_MS = 60_000

const hits = new Map<string, number[]>()

/** Records a hit for `address` and answers 0 (allowed), or the seconds until the next is. */
export function trackingGuessAllowed(address: string, now: number = Date.now()): number {
  const recent = (hits.get(address) ?? []).filter((at) => at > now - WINDOW_MS)
  if (recent.length >= TRACKING_GUESSES_PER_MINUTE) {
    hits.set(address, recent)
    return Math.max(1, Math.ceil(((recent[0] ?? now) + WINDOW_MS - now) / 1000))
  }
  recent.push(now)
  hits.set(address, recent)
  if (hits.size > 50_000) prune(now)
  return 0
}

function prune(now: number): void {
  for (const [address, times] of hits) {
    if (times.every((at) => at <= now - WINDOW_MS)) hits.delete(address)
  }
}

/** Tests only: clears every address's history. */
export function resetTrackingGuessLimit(): void {
  hits.clear()
}
