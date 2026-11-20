/** The proxy's public types (`./decide`'s own header documents the decision this builds). */
import type { LocaleCode } from '@engine/config/constants'
import type { SiteKey } from '@engine/config/sites'

export type Env = Readonly<Record<string, string | undefined>>

export type ProxyRequest = {
  readonly url: URL
  readonly headers: Headers
  /** The request's method; `GET` when absent. */
  readonly method?: string
}

/** The one CSP builder, per request; `null` sets none. */
export type ContentSecurityPolicy = (context: {
  readonly site: SiteKey
  readonly locale: LocaleCode
  readonly pathname: string
}) => string | null

export type DecideOptions = {
  /** Where the allow-list is read from: the process's own environment by default. */
  readonly env?: Env | undefined
  readonly contentSecurityPolicy?: ContentSecurityPolicy | undefined
  /** Payload's `cookiePrefix`; its language cookie is `<prefix>-lng`. */
  readonly cookiePrefix?: string | undefined
  /**
   * The one site this app serves (PLAN-V2 §3): its own `SITE_HOSTS` and `ADMIN_HOST` alone, its
   * pages at `/<locale>/…`. Unset, today's app: both sites by `Host`, each in `/<site>/<locale>/…`.
   */
  readonly app?: SiteKey | undefined
  /**
   * Headers set on every answer the proxy gives or passes on (SECURITY.md B3), under any the
   * decision sets itself. Today's app sets its static ones in `next.config.ts` instead.
   */
  readonly securityHeaders?: Readonly<Record<string, string>> | undefined
}

export type ProxyWhy =
  | 'next-internal'
  | 'machine'
  | 'unknown-host'
  | 'alias'
  | 'api'
  | 'not-admin-host'
  | 'admin-host-only'
  | 'admin'
  | 'site-asset'
  | 'root-file'
  | 'legacy'
  | 'surface'
  | 'not-found'
  | 'rate-limited'

export type ProxyDecision = {
  /**
   * `rewrite`: serve `to` (a path and query) at the public URL; `next`: serve the URL as is;
   * `respond`: answer at once with `status` — a plain 404, or a redirect to `to`.
   */
  readonly kind: 'rewrite' | 'next' | 'respond'
  readonly to: string | null
  readonly why: ProxyWhy
  /** The site the `Host` picked; `null` for a machine route or an unknown host. */
  readonly site: SiteKey | null
  readonly locale: LocaleCode | null
  /**
   * The status on a rewrite — `PROXY_NOT_FOUND_STATUS` for the proxy's own not-found, which Next
   * keeps through a normal render, `null` to keep the render's own — or a `respond`'s status.
   */
  readonly status: number | null
  /** Headers set on the request passed on, overwriting a client's. */
  readonly setRequest: Readonly<Record<string, string>>
  /** Headers removed from the request passed on (before `setRequest` is applied). */
  readonly removeRequest: readonly string[]
  /** Headers set on the answer. */
  readonly setResponse: Readonly<Record<string, string>>
}
