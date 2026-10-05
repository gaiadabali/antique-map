/**
 * `POST /api/x/cron/driver-images` (daily) — the driver-image purge behind the crontab's bearer
 * (COMMERCE.md §9; TASKS.md 7.1.b), as a handler factory for `@engine/http` to mount, the way
 * `../payments/http` hands over the payment jobs:
 *
 *   cron/driver-images/route.ts   export const POST = driverImagePurgeRoute({ refuse: refuseCron })
 *
 * Importing this module loads no Payload and no storage SDK: the caller's bearer is checked first
 * (`refuse`, `@engine/http`'s `refuseCron`), and only then is the Payload-backed port loaded with
 * `import()`. One run at a time in the process; a tick that meets a run still going answers 409.
 * Correctness never rests on it — the purge clears a record by compare-and-set on its key.
 */
import { describeError } from '@engine/config/boot-check'

import { plain } from '../payments/http/respond'
import type { PurgeRun } from './types'

export type PurgePort = { run(now: Date): Promise<PurgeRun> }
export type PurgePortLoader = () => Promise<PurgePort>

const loadPort: PurgePortLoader = async () => (await import('./http-port')).purgePort()

export type PurgeRouteOptions = {
  /** The cron bearer check: `null` to proceed, else the answer to send. Required. */
  readonly refuse: (request: Request) => Response | null
  readonly load?: PurgePortLoader
  readonly now?: () => Date
}

const JSON_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }

export function driverImagePurgeRoute(options: PurgeRouteOptions) {
  const load = options.load ?? loadPort
  let running = false

  return async function POST(request: Request): Promise<Response> {
    const refused = options.refuse(request)
    if (refused) return refused
    if (running) {
      return Response.json(
        { busy: true },
        { status: 409, headers: { ...JSON_HEADERS, 'Retry-After': '300' } },
      )
    }
    running = true
    try {
      const port = await load()
      const run = await port.run(options.now?.() ?? new Date())
      return Response.json({ job: 'driver-images', ...run }, { headers: JSON_HEADERS })
    } catch (error) {
      console.error(`[fulfilment] the driver-image purge failed: ${describeError(error)}`)
      return plain(500, 'the driver-image purge failed; the cause is in the process log')
    } finally {
      running = false
    }
  }
}
