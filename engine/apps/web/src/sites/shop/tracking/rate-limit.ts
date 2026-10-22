/**
 * The tracking page's rate limit (SECURITY.md §2.10: "tracking page — 30 per minute per IP"; T2:
 * "the tracking route is rate-limited per IP", with a 429 and `Retry-After`).
 *
 * **Known gap, reported rather than fixed here** (outside this ticket's owned paths): Next's App
 * Router page components cannot answer with an arbitrary status — only `notFound()` (404),
 * `forbidden()` (403), `unauthorized()` (401) and `redirect()` (307/308) change a page's status;
 * a 429 needs `proxy` (`engine/packages/http/src/proxy/decide.ts`), which runs before any page
 * renders and can `respond` with one at once (its own `ProxyDecision.kind === 'respond'`). That
 * file is shared, cross-cutting infrastructure outside `engine/apps/web/src/app/(shop)/shop/
 * [locale]/track/**` and `sites/shop/tracking/**`, this ticket's owned paths.
 *
 * `trackGuessAllowed` is the check ready to wire in: `decide.ts`'s `route()`, in the `'surface'`
 * case for the tracking surface (`parsed.surface === 'tracking'`), would call it keyed on the
 * client address and, past the limit, return a `respond('rate-limited', 429, null)` with
 * `Retry-After` set from the seconds this function answers. Until that lands, the page below
 * falls back to the same 404 a wrong token gets — never worse than hiding the page, just less
 * precise than the 429 SECURITY.md asks for.
 */
import { setNewest, SweepClock } from '../../../server/bounded-map'

/** Per SECURITY.md §2.10. */
export const TRACKING_GUESSES_PER_MINUTE = 30
const WINDOW_MS = 60_000

const hits = new Map<string, number[]>()
const clock = new SweepClock(WINDOW_MS)

/** Records a hit for `address` and answers 0 (allowed), or the seconds until the next is. */
export function trackGuessAllowed(address: string, now: number = Date.now()): number {
  if (clock.due(now, hits.size > 50_000)) prune(now)
  const recent = (hits.get(address) ?? []).filter((at) => at > now - WINDOW_MS)
  if (recent.length >= TRACKING_GUESSES_PER_MINUTE) {
    setNewest(hits, address, recent)
    return Math.max(1, Math.ceil(((recent[0] ?? now) + WINDOW_MS - now) / 1000))
  }
  recent.push(now)
  setNewest(hits, address, recent)
  return 0
}

function prune(now: number): void {
  for (const [address, times] of hits) {
    if (times.every((at) => at <= now - WINDOW_MS)) hits.delete(address)
  }
}

/** Tests only: clears every address's history. */
export function resetTrackingRateLimit(): void {
  hits.clear()
  clock.reset()
}
