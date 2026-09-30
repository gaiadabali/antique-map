/**
 * `/api/health` — `@engine/http/health` (C13, TASKS.md 4.1.b, 4.6.a; DEPLOYMENT.md §3, §7). Each
 * app mounts it with one line, `export { GET } from '@engine/http/health'`, at `src/app/api/health`:
 * a static route there wins over Payload's REST catch-all, and no collection may be named `health`
 * (route parity). Never cached by anyone downstream: every answer is at most `HEALTH_MEMO_MS` old.
 *
 * The request is read first, so `next build` never runs this; only then is `./payload-ports` loaded
 * with `import()`, the one module here that reaches Payload (ARCHITECTURE.md §15). The route is a
 * factory taking that loader, so a test hands it fakes and never loads Payload (4.3 senior-be #13).
 *
 * One check at a time, its answer kept for `HEALTH_MEMO_MS` (`./flight`): the route is public and
 * unauthenticated, and each check costs the pool the page loaders use a probe and the queue's
 * reads, so a burst of checks costs one (4.1 senior-be #5).
 */
import { atRequestTime } from '../shared/respond'
import { memoised } from './flight'
import { checkHealth } from './health'
import { healthPorts, unloadedPayloadPorts, type PayloadHealthPorts } from './ports'

type Env = Readonly<Record<string, string | undefined>>

/** How long one check's answer stands: a deploy's check or Alloy's scrape a few seconds late. */
export const HEALTH_MEMO_MS = 5_000

/** Loads the Payload-backed ports: `./payload-ports` in the process, a fake in a test. */
export type PayloadPortsLoader = () => Promise<{ payloadHealthPorts: () => PayloadHealthPorts }>

const loadPayloadPorts: PayloadPortsLoader = () => import('./payload-ports')

export function healthRoute(
  load: PayloadPortsLoader = loadPayloadPorts,
  env: Env = process.env,
): (request: Request) => Promise<Response> {
  const check = memoised(async () => {
    const payload = await load().then(
      (module) => module.payloadHealthPorts(),
      (error: unknown) => unloadedPayloadPorts(error),
    )
    return checkHealth(healthPorts(payload, env))
  }, HEALTH_MEMO_MS)

  return async function GET(request: Request): Promise<Response> {
    atRequestTime(request) // first: what follows reaches the database, which a build never does
    const { status, body } = await check()
    return Response.json(body, {
      status,
      headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  }
}

export const GET = healthRoute()
