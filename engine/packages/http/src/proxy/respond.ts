/**
 * A `ProxyDecision` as the answer Next's router reads from a proxy. A rewrite and a pass-on are
 * exactly what `NextResponse.rewrite(url, { status, request: { headers } })` and
 * `NextResponse.next({ request: { headers } })` build in `next/server` (16.3): a plain `Response`
 * whose `x-middleware-rewrite` names the destination (or `x-middleware-next` passes the request
 * on), and whose `x-middleware-override-headers` lists every request header the app receives, each
 * value in `x-middleware-request-<name>` — a header left off that list is removed. Its status is
 * the decision's — `PROXY_NOT_FOUND_STATUS` on the proxy's own not-found, which Next's router puts
 * on the answer and a normal render keeps — or 200, under which the render's own status stands.
 *
 * A `respond` decision is the proxy's own answer, which Next sends as it is: a plain, uncached 404
 * for a host the allow-list does not name (or Payload's REST off the admin host), or a permanent
 * redirect to a site's canonical host. `@engine/http` does not depend on `next`, so the proxy
 * writes the same protocol itself; its tests pin it against `next/server` and Next's own adapter.
 */
import type { ProxyDecision } from './decide'

export function toResponse(decision: ProxyDecision, request: Request): Response {
  if (decision.kind === 'respond') return ownAnswer(decision)
  const forwarded = new Headers(request.headers)
  for (const name of decision.removeRequest) forwarded.delete(name)
  for (const [name, value] of Object.entries(decision.setRequest)) forwarded.set(name, value)

  const headers = new Headers(decision.setResponse)
  if (decision.kind === 'rewrite' && decision.to !== null) {
    // On the request's own origin — Next's, from the address it binds — never a client's `Host`.
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
  return new Response(null, { status: decision.status ?? 200, headers })
}

function ownAnswer(decision: ProxyDecision): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...decision.setResponse,
  })
  if (decision.to !== null) {
    headers.set('Location', decision.to)
    return new Response(null, { status: decision.status ?? 301, headers })
  }
  headers.set('Content-Type', 'text/plain; charset=utf-8')
  return new Response('Not found', { status: decision.status ?? 404, headers })
}
