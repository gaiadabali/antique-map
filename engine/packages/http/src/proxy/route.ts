/**
 * The engine's proxy (Next 16's `proxy` convention, formerly middleware) — `@engine/http/proxy`.
 * The app's `src/proxy.ts` re-exports it and declares the manifest's `PROXY_MATCHER` literally:
 *
 *   export { proxy } from '@engine/http/proxy'
 *   export const config = { matcher: ['/((?!_next/|__nextjs).*)'] }
 *
 * It picks the site from `Host`, rewrites, sets headers and answers its own 404s and alias
 * redirects, nothing else (`./decide`): no database, no file. The allow-list is read from the
 * environment on each request (parsed once per distinct value), so nothing runs at import.
 */
import { decideProxy, type DecideOptions, type ProxyDecision } from './decide'
import { toResponse } from './respond'

export { decideProxy, NOT_FOUND_SEGMENT, notFoundPath } from './decide'
export type {
  ContentSecurityPolicy,
  DecideOptions,
  ProxyDecision,
  ProxyRequest,
  ProxyWhy,
} from './decide'
export { toResponse } from './respond'

/** The CSP builder (until it lands, no CSP is set), Payload's cookie prefix and the env. */
export type ProxyOptions = DecideOptions

export function createProxy(options: ProxyOptions = {}): (request: Request) => Response {
  return (request) => {
    const decision: ProxyDecision = decideProxy(
      { url: new URL(request.url), headers: request.headers, method: request.method },
      options,
    )
    return toResponse(decision, request)
  }
}

export const proxy = createProxy()
