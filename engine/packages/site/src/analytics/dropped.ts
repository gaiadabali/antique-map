/**
 * Why collect dropped a beacon event or a whole batch (ANALYTICS.md §6): counted per reason, so a
 * filter that eats real traffic shows on the dashboard (9.3's). In-memory, per process — like the
 * rate limiter, it resets on restart; the dashboard reads it through a later route.
 */

/** The reasons collect drops, in the order it checks (§6). */
export const DROP_REASONS = [
  'origin',
  'body',
  'batch-size',
  'bot',
  'rate-session',
  'rate-address',
  'unknown-name',
  'props',
  'site',
  'insert',
] as const

export type DropReason = (typeof DROP_REASONS)[number]

const counters: Map<DropReason, number> = new Map(DROP_REASONS.map((reason) => [reason, 0]))

/** One drop (or a whole batch's drops), for the reason. */
export function countDropped(reason: DropReason, by = 1): void {
  counters.set(reason, (counters.get(reason) ?? 0) + by)
}

/** A snapshot of every counter, in `DROP_REASONS` order — the dashboard's reading. */
export function readDropped(): Readonly<Record<DropReason, number>> {
  return Object.fromEntries(counters) as Record<DropReason, number>
}

/** The tests' reset: this is process state, so a test that does not clear it sees another's. */
export function resetDropped(): void {
  for (const reason of DROP_REASONS) counters.set(reason, 0)
}
