/**
 * `POST /api/x/cron/retention` — `@engine/http/cron/retention` (TASKS.md 9.1.d; COMPLIANCE.md §1):
 * deletes what is past its retention date — chat transcripts, closed and spam leads, driver
 * images — and answers the counts as JSON. Daily, behind `CRON_SECRET` (503 while it is unset, 401
 * without it), like the jobs and sweeps routes.
 *
 * The caller is authenticated first; only then is `./payload-retention` loaded with `import()`,
 * the one module here that reaches Payload (ARCHITECTURE.md §15), so `next build`, route parity
 * and the route's test never evaluate the Payload config. One run at a time in the process: a tick
 * that meets a run still going answers 409 and runs nothing. A run that throws is logged, its cause
 * redacted, and answered with a plain 500. Neither the log nor the answer carries more than counts.
 */
import { describeError } from '@engine/config/boot-check'

import { plain } from '../../shared/respond'
import { refuseCron } from '../auth'

type Env = Readonly<Record<string, string | undefined>>

/** What a sweep answers: counts, nothing that identifies anyone. */
export type RetentionRun = Readonly<Record<'chatSessions' | 'leads' | 'driverImages', number>>

/** Loads the Payload-backed sweep: `./payload-retention` in the process, a fake in a test. */
export type RetentionLoader = () => Promise<{ sweep(now: Date): Promise<RetentionRun> }>

const loadSweep: RetentionLoader = () => import('./payload-retention')

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

export function retentionRoute(
  load: RetentionLoader = loadSweep,
  env: Env = process.env,
  now: () => Date = () => new Date(),
): (request: Request) => Promise<Response> {
  let running = false

  return async function POST(request: Request): Promise<Response> {
    const refused = refuseCron(request, env)
    if (refused) return refused
    if (running) {
      return Response.json(
        { busy: true },
        { status: 409, headers: { ...JSON_HEADERS, 'Retry-After': '300' } },
      )
    }
    running = true
    try {
      const { sweep } = await load()
      const counts = await sweep(now())
      return Response.json({ job: 'retention', ...counts }, { headers: JSON_HEADERS })
    } catch (error) {
      console.error(`[cron/retention] the run failed: ${describeError(error)}`)
      return plain(500, 'the retention run failed; the cause is in the process log')
    } finally {
      running = false
    }
  }
}

export const POST = retentionRoute()
