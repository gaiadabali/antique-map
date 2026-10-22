/**
 * The tracking surface's guess budget (TASKS.md 7.3.c: "the tenth wrong guess in a minute is
 * throttled") — counted here, not in the page (`apps/web/src/sites/shop/tracking/rate-limit.ts`'s
 * own header explains why only the proxy can answer 429 on a page request). A stricter window than
 * SECURITY.md §2.10's general "30 per minute" ceiling: a token guess at `/track/{token}` is a try
 * against the one credential an order has, so it gets its own, tighter budget.
 *
 * Counted per client address (`./gates`'s `clientAddress`) **by distinct tokens**, in memory,
 * sliding: a guesser spends a new token on every try, while a buyer reloads their own one — the
 * pending order page refreshes itself every 5 s (`sites/shop/payment/auto-refresh.tsx`) — so a
 * token already presented in the window never counts again. The proxy runs in one process per
 * instance, same as every other proxy state.
 */

/** Distinct tokens an address may present in a minute (TASKS.md 7.3.c). */
export const TRACKING_GUESSES_PER_MINUTE = 10
const WINDOW_MS = 60_000

/** Per address: each distinct token and when it was last presented. */
const seen = new Map<string, Map<string, number>>()
/** Live distinct addresses past this evict the oldest, so the map (and every prune) stays bounded. */
const MAX_ADDRESSES = 100_000
let lastPrune: number | null = null

/**
 * Records `token` for `address` and answers 0 (allowed), or the seconds until a new token is. A
 * token this address already presented inside the window is always allowed (and its time renewed).
 */
export function trackingGuessAllowed(
  address: string,
  token: string,
  now: number = Date.now(),
): number {
  if (lastPrune === null) lastPrune = now
  if (now - lastPrune >= (seen.size > 50_000 ? 1_000 : WINDOW_MS)) {
    prune(now)
    lastPrune = now
  }
  const tokens = seen.get(address) ?? new Map<string, number>()
  for (const [each, at] of tokens) if (at <= now - WINDOW_MS) tokens.delete(each)
  if (tokens.has(token)) {
    tokens.set(token, now)
    remember(address, tokens)
    return 0
  }
  if (tokens.size >= TRACKING_GUESSES_PER_MINUTE) {
    remember(address, tokens)
    const oldest = Math.min(...tokens.values())
    return Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000))
  }
  tokens.set(token, now)
  remember(address, tokens)
  return 0
}

/** Stores the address as the newest entry (a re-set keeps its place), evicting the oldest past the cap. */
function remember(address: string, tokens: Map<string, number>): void {
  seen.delete(address)
  seen.set(address, tokens)
  while (seen.size > MAX_ADDRESSES) {
    const oldest = seen.keys().next()
    if (oldest.done) break
    seen.delete(oldest.value)
  }
}

function prune(now: number): void {
  for (const [address, tokens] of seen) {
    if ([...tokens.values()].every((at) => at <= now - WINDOW_MS)) seen.delete(address)
  }
}

/** Tests only: clears every address's history. */
export function resetTrackingGuessLimit(): void {
  seen.clear()
  lastPrune = null
}
