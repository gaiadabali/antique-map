/**
 * `/api/health` — `@engine/http/health` (C13, TASKS.md 4.1.b; DEPLOYMENT.md §3, §7). Each app
 * mounts it with one line, `export { GET } from '@engine/http/health'`, at `src/app/api/health`:
 * a static route there wins over Payload's REST catch-all, and no collection may be named
 * `health` (route parity). Never cached: every answer is this moment's.
 */
import { checkHealth } from './health'
import { defaultHealthPorts } from './ports'

/**
 * Reads the request before anything else: under Cache Components a `GET` that never reads its
 * request is prerendered — run once by `next build` and its answer baked in — and this one reaches
 * the database (the 4.1.e spike saw the boot check run at build before this line existed).
 */
function requestTime(request: Request): void {
  void request.headers.get('host')
}

export async function GET(request: Request): Promise<Response> {
  requestTime(request)
  const { status, body } = await checkHealth(defaultHealthPorts())
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}
