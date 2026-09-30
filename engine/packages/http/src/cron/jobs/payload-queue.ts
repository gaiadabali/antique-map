/**
 * The jobs route's Payload-backed port (TASKS.md 4.6.a, ARCHITECTURE.md §15): the one module of
 * `cron/jobs/` that reaches `@engine/cms`, loaded by `./route` with `import()` once the caller has
 * authenticated — so `next build`, route parity's runner and the route's tests never evaluate the
 * Payload config.
 *
 * `payload.jobs.run` runs only the `default` queue unless told otherwise (`localAPI.d.ts`); a task
 * registered on another queue would never run, so every run takes `allQueues: true` (4.1
 * senior-be #4). The Local API runs with `overrideAccess` — the route's own bearer is the access.
 */
import { cms } from '@engine/cms/instance'

import { summariseRun, type QueuePort } from './queue'

export const runQueue: QueuePort = async ({ limit }) => {
  const payload = await cms()
  // No task or workflow registered yet: Payload has no jobs collection, so there is nothing to run.
  if (payload.config.jobs.enabled !== true) {
    return { ran: 0, remaining: 0, drained: true, detail: 'no-tasks' }
  }
  return summariseRun(await payload.jobs.run({ limit, allQueues: true }))
}
