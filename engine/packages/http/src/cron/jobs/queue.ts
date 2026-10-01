/**
 * One run of the Payload jobs queue (ARCHITECTURE.md §10): called by the crontab, never `autoRun`
 * inside page renders, with a per-run limit so one call never holds the process for long — the
 * rest waits for the next minute. Decided from a port so it is tested without a database; the
 * port in the process is `./payload-queue`.
 */

/** What one run did, as the route answers it. */
export type QueueRun = {
  /** Jobs this run picked up and ran (each to completion, failure or its next retry). */
  readonly ran: number
  /** Of those, how many are left to retry (Payload's `remainingJobsFromQueried`). */
  readonly remaining: number
  /** Payload found nothing left to pick up, whatever the limit. */
  readonly drained: boolean
  /** `no-tasks` while no task or workflow is registered: Payload has no queue to run yet. */
  readonly detail?: 'no-tasks'
}

export type QueuePort = (options: { readonly limit: number }) => Promise<QueueRun>

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

/** Payload's `RunJobsResult`, as far as a run's summary reads it. */
export type RunJobsSummary = {
  readonly jobStatus?: Readonly<Record<string, unknown>>
  readonly noJobsRemaining?: boolean
  readonly remainingJobsFromQueried?: number
}

export function summariseRun(result: RunJobsSummary): QueueRun {
  return {
    ran: Object.keys(result.jobStatus ?? {}).length,
    remaining: result.remainingJobsFromQueried ?? 0,
    drained: result.noJobsRemaining === true,
  }
}
