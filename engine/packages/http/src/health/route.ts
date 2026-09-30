/**
 * `/api/health` — `@engine/http/health` (C13, TASKS.md 4.1.b; DEPLOYMENT.md §3, §7). Each app
 * mounts it with one line, `export { GET } from '@engine/http/health'`, at `src/app/api/health`:
 * a static route there wins over Payload's REST catch-all, and no collection may be named
 * `health` (route parity). Never cached: every answer is this moment's.
 */
import { checkHealth } from './health'
import { atRequestTime } from '../legacy/respond'
import { defaultHealthPorts } from './ports'

export async function GET(request: Request): Promise<Response> {
  atRequestTime(request) // first: once wired, this reaches the database, which a build never does
  const { status, body } = await checkHealth(defaultHealthPorts())
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
