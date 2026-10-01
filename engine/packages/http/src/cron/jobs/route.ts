/**
 * `POST /api/x/cron/jobs` — `@engine/http/cron/jobs` (C13, TASKS.md 4.1.b, 4.6.a; ARCHITECTURE.md
 * §10, DEPLOYMENT.md §5): runs the Payload jobs queue — every queue — with a per-run limit, behind
 * `CRON_SECRET` (503 while it is unset, 401 without it).
 *
 * The caller is authenticated first; only then is `./payload-queue` loaded with `import()`, the
 * one module here that reaches Payload (ARCHITECTURE.md §15). The route is a factory taking that
 * loader, so a test hands it a fake and never loads Payload (4.3 senior-be #13).
 *
 * **One run at a time in the process** (4.1 senior-be #4): a run longer than a minute would meet
 * the next crontab tick, and Payload's own claim (`updateJobs({ processing: true })`, outside a
 * transaction) is no lock. A call that arrives mid-run answers 409 `busy` and runs nothing; the
 * running one carries on. Exact while one process serves the brand (DEPLOYMENT.md §3). A run that
 * throws is logged, its cause redacted, and answered with a plain 500 — never Next's error page,
 * never the cause.
 */
import { describeError } from '@engine/config/loader'

import { plain } from '../../shared/respond'
import { refuseCron } from '../auth'
import { perRunLimit, type QueuePort, type QueueRun } from './queue'

type Env = Readonly<Record<string, string | undefined>>

/** Loads the Payload-backed port: `./payload-queue` in the process, a fake in a test. */
export type QueuePortLoader = () => Promise<{ runQueue: QueuePort }>

const loadQueue: QueuePortLoader = () => import('./payload-queue')

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

export function jobsRoute(
  load: QueuePortLoader = loadQueue,
  env: Env = process.env,
): (request: Request) => Promise<Response> {
  let running: Promise<QueueRun> | null = null

  return async function POST(request: Request): Promise<Response> {
    const refused = refuseCron(request, env)
    if (refused) return refused
    if (running !== null) {
      return Response.json(
        { busy: true },
        { status: 409, headers: { ...JSON_HEADERS, 'Retry-After': '60' } },
      )
    }
    const limit = perRunLimit(new URL(request.url), env)
    const run = load().then(({ runQueue }) => runQueue({ limit }))
    running = run
    try {
      const result = await run
      return Response.json({ ...result, limit }, { headers: JSON_HEADERS })
    } catch (error) {
      console.error(`[cron/jobs] the run failed: ${describeError(error)}`)
      return plain(500, 'the jobs run failed; the cause is in the process log')
    } finally {
      running = null
    }
  }
}

export const POST = jobsRoute()
