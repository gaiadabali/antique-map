/**
 * The engine's proxy (Next 16's `proxy` convention, formerly middleware) — `@engine/http/proxy`.
 * Each app's `src/proxy.ts` re-exports it and declares C13's `PROXY_MATCHER` literally:
 *
 *   export { proxy } from '@engine/http/proxy'
 *   export const config = { matcher: ['/((?!api/|_next/|brand-assets/).*)'] }
 *
 * It rewrites and sets headers, nothing else (`./decide`): no redirect, no database — the
 * brand config it reads is the file, loaded once per process. Nothing runs at import: the
 * build has no brand, and the config is read on the first request.
 */
import { loadBrandConfig } from '@engine/config/loader'
import {
  decideProxy,
  type ContentSecurityPolicy,
  type ProxyConfig,
  type ProxyDecision,
} from './decide'
import { toResponse } from './respond'

export { decideProxy, NOT_FOUND_PATH } from './decide'
export type { ContentSecurityPolicy, ProxyConfig, ProxyDecision, ProxyRequest } from './decide'
export { toResponse } from './respond'

export type ProxyOptions = {
  /** Where the brand config comes from; the process's own file by default. */
  readonly config?: () => ProxyConfig
  /** The per-request CSP builder (TASKS.md 41.1.a); until it lands, no CSP is set. */
  readonly contentSecurityPolicy?: ContentSecurityPolicy
}

export function createProxy(options: ProxyOptions = {}): (request: Request) => Response {
  // Read on the first request, then kept: the proxy's hot path touches no disk either.
  let loaded: ProxyConfig | undefined
  const config = options.config ?? (() => (loaded ??= loadBrandConfig()))
  return (request) => {
    const decision: ProxyDecision = decideProxy(
      config(),
      { url: new URL(request.url), headers: request.headers },
      options.contentSecurityPolicy,
    )
    return toResponse(decision, request)
  }
}

export const proxy = createProxy()
