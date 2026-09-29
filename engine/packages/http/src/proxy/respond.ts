/**
 * A `ProxyDecision` as the answer Next's router reads from a proxy. This is exactly what
 * `NextResponse.rewrite(url, { request: { headers } })` and `NextResponse.next({ request:
 * { headers } })` build in `next/server` (16.3): a plain `Response` whose `x-middleware-rewrite`
 * names the destination (or `x-middleware-next` passes the request on), and whose
 * `x-middleware-override-headers` lists every request header the app receives, each value in
 * `x-middleware-request-<name>` — a header left off that list is removed. `@engine/http` does
 * not depend on `next` (its routes are Web `Request` → `Response`), so the proxy writes the
 * same protocol itself; its tests pin it, and the 4.1.e spike runs it under a real build.
 */
import type { ProxyDecision } from './decide'

export function toResponse(decision: ProxyDecision, request: Request): Response {
  const forwarded = new Headers(request.headers)
  for (const name of decision.removeRequest) forwarded.delete(name)
  for (const [name, value] of Object.entries(decision.setRequest)) forwarded.set(name, value)

  const headers = new Headers(decision.setResponse)
  if (decision.kind === 'rewrite' && decision.to !== null) {
    headers.set('x-middleware-rewrite', new URL(decision.to, request.url).toString())
  } else {
    headers.set('x-middleware-next', '1')
  }
  const names: string[] = []
  for (const [name, value] of forwarded) {
    headers.set(`x-middleware-request-${name}`, value)
    names.push(name)
  }
  headers.set('x-middleware-override-headers', names.join(','))
  return new Response(null, { headers })
}
