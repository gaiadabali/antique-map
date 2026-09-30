/**
 * `POST /api/x/cron/jobs` — `@engine/http/cron/jobs` (C13, TASKS.md 4.1.b): runs the Payload jobs
 * queue with a per-run limit, behind `CRON_SECRET` (503 while it is unset).
 *
 * The queue itself is **not wired**: running it needs `getPayload()`, and `@engine/http` does not
 * yet depend on `payload` and `@engine/cms` — a package.json change outside TASKS.md 4.1's paths,
 * reported as blocked. Until it lands an authorised call answers 503 `not-wired`, never a false
 * success; the port is `QueuePort` (`payload.jobs.run({ limit })`).
 */
import { plain } from '../../legacy/respond'
import { refuseCron } from '../auth'
import { perRunLimit, type QueuePort } from './queue'

/** `payload.jobs.run` once `@engine/http` may reach Payload; `null` until then. */
function wiredQueue(): QueuePort | null {
  return null
}

export async function POST(request: Request): Promise<Response> {
  const refused = refuseCron(request)
  if (refused) return refused
  const queue = wiredQueue()
  if (queue === null) return plain(503, 'the jobs queue is not wired (TASKS.md 4.1 follow-up)')
  const limit = perRunLimit(new URL(request.url), process.env)
  const { ran } = await queue({ limit })
  return Response.json(
    { ran, limit },
    { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } },
  )
}
