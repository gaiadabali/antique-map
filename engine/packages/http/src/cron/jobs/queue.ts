/**
 * One run of the Payload jobs queue (ARCHITECTURE.md §10): called by the crontab, never `autoRun`
 * inside page renders, with a per-run limit so one call never holds the process for long — the
 * rest waits for the next minute. Decided from a port so it is tested without a database.
 */
export type QueuePort = (options: { readonly limit: number }) => Promise<{ readonly ran: number }>

/** The default per-run limit, and the ceiling a caller's `?limit=` may ask for. */
export const JOBS_PER_RUN = { default: 10, max: 100 } as const

/** `CRON_JOBS_LIMIT` for the host, lowered (never raised) by the call's `?limit=`. */
export function perRunLimit(url: URL, env: Readonly<Record<string, string | undefined>>): number {
  const host = clamp(Number(env.CRON_JOBS_LIMIT), JOBS_PER_RUN.default)
  const asked = clamp(Number(url.searchParams.get('limit')), host)
  return Math.min(host, asked)
}

function clamp(value: number, fallback: number): number {
  return Number.isSafeInteger(value) && value >= 1 ? Math.min(value, JOBS_PER_RUN.max) : fallback
}
