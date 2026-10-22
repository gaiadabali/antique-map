/**
 * `POST /api/x/cron/sweeps` (every minute) and `POST /api/x/cron/reconcile` (every
 * 10 minutes) — the payment jobs behind the crontab's bearer (ARCHITECTURE.md §10; TASKS.md 6.4.c).
 *
 * The caller's authentication is handed in (`refuse`): the mount passes `@engine/http`'s
 * `refuseCron` — `CRON_SECRET`, 503 while unset, 401 when wrong, compared in constant time — the
 * same check `cron/jobs` makes; cms never imports `@engine/http`. Only after it passes is the
 * Payload-backed port loaded with `import()`.
 *
 * One run at a time in the process, as `cron/jobs` does it: a tick that meets a run still going
 * answers 409 `busy`. Correctness never rests on it — two sweeps, concurrent or repeated, return
 * an order's stock once (`../release`) — it only keeps a slow Midtrans from stacking runs.
 */
import { describeError } from '@engine/config/boot-check'

import { paymentsConfigFromEnv, type PaymentsConfig } from '../config'
import type { JobRun } from '../jobs'
import { plain, type Env } from './respond'

export type PaymentJob = 'sweep' | 'reconcile'
export type JobsPort = { run(job: PaymentJob, config: PaymentsConfig): Promise<JobRun> }
export type JobsPortLoader = () => Promise<JobsPort>

const loadPort: JobsPortLoader = async () => (await import('./payload-port')).jobsPort()

export type CronOptions = {
  /** The cron bearer check: `null` to proceed, else the answer to send. Required. */
  readonly refuse: (request: Request) => Response | null
  readonly load?: JobsPortLoader
  readonly env?: Env
}

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

function paymentJobRoute(job: PaymentJob, options: CronOptions) {
  const load = options.load ?? loadPort
  let running = false

  return async function POST(request: Request): Promise<Response> {
    const refused = options.refuse(request)
    if (refused) return refused
    const configured = paymentsConfigFromEnv(options.env ?? process.env)
    if (!configured.ok) {
      console.error(`[payments] ${job} refused: ${configured.subject} ${configured.reason}`)
      return plain(503, 'payments are not configured on this host')
    }
    if (running) {
      return Response.json(
        { busy: true },
        { status: 409, headers: { ...JSON_HEADERS, 'Retry-After': '60' } },
      )
    }
    running = true
    try {
      const port = await load()
      const result = await port.run(job, configured.config)
      return Response.json({ job, ...result }, { headers: JSON_HEADERS })
    } catch (error) {
      console.error(`[payments] the ${job} run failed: ${describeError(error)}`)
      return plain(500, `the ${job} run failed; the cause is in the process log`)
    } finally {
      running = false
    }
  }
}

export const paymentSweepsRoute = (options: CronOptions) => paymentJobRoute('sweep', options)
export const paymentReconcileRoute = (options: CronOptions) => paymentJobRoute('reconcile', options)
