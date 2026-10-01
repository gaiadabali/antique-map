/**
 * The health route's Payload-backed ports (TASKS.md 4.6.a, ARCHITECTURE.md §15): the one module of
 * `health/` that reaches `@engine/cms`, loaded by `./route` with `import()` once it has read its
 * request — so `next build`, route parity's runner and the route's tests never evaluate the
 * Payload config.
 *
 * - **The database** — `cms()`, the process's one Payload: its first call connects and, in the web
 *   process of a production build with `RUN_MIGRATIONS=1`, migrates under the advisory lock, so a
 *   deploy's first health check is what applies a release's migrations (DEPLOYMENT.md §3). Then
 *   one probe (`@engine/cms/db/probe`: the default isolation, READ COMMITTED), whose answer the
 *   boot check re-reads rather than asking again, and one count of `payload_migrations`: a
 *   database no migration ever reached is no database to serve from (the independent 4.8 review,
 *   S4). `cms()` itself is not timed: a first call may be migrating, and a deploy's check waits for
 *   it; the pool bounds its connect (`@engine/cms`'s adapter).
 * - **The queue** — `./queue`'s filters, `runJobs`' own, on Payload's jobs collection.
 *
 * Each query is `bounded` (`./flight`): answered within its timeout or reported as not answering,
 * and never started again while the last one is pending, so a hung database holds one pool client,
 * never one per check (the independent 4.8 review, S3).
 */
import { databaseProbe } from '@engine/cms/db/probe'
import { cms, cmsPool, type Payload } from '@engine/cms/instance'

import { bounded, NotAnsweredError } from './flight'
import type { DatabaseCheck } from './health'
import type { PayloadHealthPorts } from './ports'
import {
  JOBS_COLLECTION,
  judgeQueue,
  runnableJobsWhere,
  stalledJobsWhere,
  type JobsWhere,
  type OldestJob,
  type QueueCheck,
} from './queue'

/** How long a probe or a queue read may take before the check reports it as not answering. */
export const QUERY_TIMEOUT_MS = 2_500

const MIGRATIONS_COLLECTION = 'payload-migrations'

/**
 * The Local API calls these ports make, typed by what they read. A cast: the jobs collection is in
 * Payload's generated slugs only once a task is registered, and a count needs nothing more.
 */
type Reads = {
  readonly count: (options: {
    readonly collection: string
    readonly where?: JobsWhere
    readonly overrideAccess: true
  }) => Promise<{ readonly totalDocs: number }>
  readonly find: (options: {
    readonly collection: string
    readonly where: JobsWhere
    readonly sort: string
    readonly limit: number
    readonly depth: 0
    readonly select: Readonly<Record<string, true>>
    readonly overrideAccess: true
  }) => Promise<{ readonly totalDocs: number; readonly docs: readonly OldestJob[] }>
}

const reads = (payload: Payload) => payload as unknown as Reads

const probeDatabase = bounded(
  'the database',
  async () => {
    const payload = await cms()
    const answer = await databaseProbe(cmsPool(payload))()
    const migrations = await reads(payload).count({
      collection: MIGRATIONS_COLLECTION,
      overrideAccess: true,
    })
    return { answer, migrated: migrations.totalDocs > 0 }
  },
  QUERY_TIMEOUT_MS,
)

async function database(): Promise<DatabaseCheck> {
  await cms() // untimed, and outside the bound: a first call may be migrating (above)
  try {
    const { answer, migrated } = await probeDatabase()
    const probe = async () => answer
    return migrated ? { ok: true, probe } : { ok: false, detail: 'unmigrated', probe }
  } catch (error) {
    if (!(error instanceof NotAnsweredError)) throw error
    return { ok: false, detail: 'timeout', probe: () => Promise.reject(error) }
  }
}

const readQueue = bounded(
  'the job queue',
  async (): Promise<QueueCheck> => {
    const payload = await cms()
    // No task or workflow registered yet: Payload has no jobs collection, and nothing can lag.
    if (payload.config.jobs.enabled !== true) {
      return { ok: true, detail: 'no-tasks', pending: 0, lagSeconds: 0, stalled: 0 }
    }
    const now = new Date()
    const [oldest, stalled] = await Promise.all([
      reads(payload).find({
        collection: JOBS_COLLECTION,
        where: runnableJobsWhere(now),
        sort: 'createdAt',
        limit: 1,
        depth: 0,
        select: { createdAt: true, waitUntil: true },
        overrideAccess: true,
      }),
      reads(payload).count({
        collection: JOBS_COLLECTION,
        where: stalledJobsWhere(now),
        overrideAccess: true,
      }),
    ])
    return judgeQueue(
      { pending: oldest.totalDocs, oldest: oldest.docs[0], stalled: stalled.totalDocs },
      now,
    )
  },
  QUERY_TIMEOUT_MS,
)

async function queue(): Promise<QueueCheck> {
  try {
    return await readQueue()
  } catch (error) {
    if (error instanceof NotAnsweredError) return { ok: false, detail: 'timeout' }
    throw error
  }
}

export function payloadHealthPorts(): PayloadHealthPorts {
  return { database, queue }
}
