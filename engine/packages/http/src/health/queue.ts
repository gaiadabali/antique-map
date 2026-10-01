/**
 * The job queue as `/api/health` reports it (DEPLOYMENT.md §7; 4.1 senior-be #3): **reported,
 * never gating** — a failed health check rolls a deploy back (§3), and a stuck derivative job must
 * not roll back every release, the one that fixes it included; lag is Alloy's alert instead.
 *
 * What counts is what Payload's own `runJobs` would pick (`payload/dist/queues/operations/runJobs`,
 * 3.90.2): not completed, not failed (`hasError`), not being processed, and not waiting for a later
 * `waitUntil` — on every queue, since the cron route runs them all (`allQueues: true`). A job that
 * failed for good, or tomorrow's scheduled digest, is no lag. What is stuck instead is a job still
 * marked `processing` long after its run began: `runJobs` claims a batch by setting it, and a
 * process that died mid-run leaves it set.
 */
import type { CheckResult } from './health'

/** DEPLOYMENT.md §7: "alert on … job-queue lag > 10 min". */
export const QUEUE_LAG_ALERT_SECONDS = 10 * 60
/** A job `processing` for longer than this is stalled: no run holds a job that long. */
export const STALLED_AFTER_SECONDS = 10 * 60

/** Payload's jobs collection (`jobsCollectionSlug`); it exists once a task or workflow is registered. */
export const JOBS_COLLECTION = 'payload-jobs'

export type QueueCheck = CheckResult & {
  /** Jobs `runJobs` would pick now. */
  readonly pending?: number
  /** Seconds the oldest of them has been runnable; 0 when none is. */
  readonly lagSeconds?: number
  /** Jobs still `processing` past `STALLED_AFTER_SECONDS`. */
  readonly stalled?: number
}

/** Payload's `Where`, as far as these filters need it. */
export type JobsWhere = { readonly and: readonly Record<string, unknown>[] }

/** `runJobs`' own filter, with no queue named (`allQueues: true`). */
export function runnableJobsWhere(now: Date): JobsWhere {
  return {
    and: [
      { completedAt: { exists: false } },
      { hasError: { not_equals: true } },
      { processing: { equals: false } },
      {
        or: [{ waitUntil: { exists: false } }, { waitUntil: { less_than: now.toISOString() } }],
      },
    ],
  }
}

/** Claimed by a run that should have finished long ago. */
export function stalledJobsWhere(now: Date): JobsWhere {
  const before = new Date(now.getTime() - STALLED_AFTER_SECONDS * 1000).toISOString()
  return {
    and: [
      { completedAt: { exists: false } },
      { processing: { equals: true } },
      { updatedAt: { less_than: before } },
    ],
  }
}

/** The oldest runnable job, as the queue port reads it. */
export type OldestJob = { readonly createdAt?: unknown; readonly waitUntil?: unknown }

/**
 * The queue's report: lag from the moment the oldest runnable job became runnable — its
 * `waitUntil` when that is later than its creation — and `ok` while lag and stalls stay under the
 * alert. Never read by the status (`./health`).
 */
export function judgeQueue(
  facts: { readonly pending: number; readonly oldest?: OldestJob; readonly stalled: number },
  now: Date,
): QueueCheck {
  const since = Math.max(time(facts.oldest?.createdAt), time(facts.oldest?.waitUntil))
  const lagSeconds =
    facts.pending > 0 && Number.isFinite(since)
      ? Math.max(0, Math.floor((now.getTime() - since) / 1000))
      : 0
  const ok = lagSeconds <= QUEUE_LAG_ALERT_SECONDS && facts.stalled === 0
  return {
    ok,
    ...(ok ? {} : { detail: facts.stalled > 0 ? 'stalled' : 'lagging' }),
    pending: facts.pending,
    lagSeconds,
    stalled: facts.stalled,
  }
}

function time(value: unknown): number {
  if (typeof value !== 'string' && !(value instanceof Date)) return Number.NEGATIVE_INFINITY
  const at = new Date(value).getTime()
  return Number.isNaN(at) ? Number.NEGATIVE_INFINITY : at
}
