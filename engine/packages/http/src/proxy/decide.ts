/**
 * What the proxy does with one request (ARCHITECTURE.md §2, §5) — decided purely, from the site
 * allow-list in the environment and the request's URL, method and headers, so it is tested without
 * Next and never touches a database. In order:
 *
 * 1. Next's own `/_next/…`, and the machine routes (`HOST_FREE_PATHS`: health, cron, revalidate,
 *    called on loopback by the host itself) pass on, whatever the `Host`.
 * 2. The `Host` header — never `X-Forwarded-Host` — picks the site (`siteFromHost()`). A host on
 *    no list is a plain 404 from the proxy: it picks no site, reaches no page and builds no URL.
 * 3. A site's other hosts (an alias) answer a permanent redirect to its canonical host, the
 *    `Location` built from the allow-list alone.
 * 4. `/api/…`: an engine route (`/api/x/…`, `/api/health`) passes on; Payload's REST passes on
 *    only on `ADMIN_HOST`, and is a plain 404 elsewhere. `/admin` passes on only on `ADMIN_HOST`
 *    (in English unless its user chose otherwise) and is the site's designed 404 elsewhere — so
 *    staff cookies are only ever set and sent on the one host (SECURITY.md X2).
 * 5. The site's own files (`/<site>/logo.svg`, …) pass on; its root files (robots, sitemaps,
 *    `.well-known`, favicon, touch icon, manifest) are rewritten to their routes and files.
 * 6. The site's route map (`parsePublicPath()`): an old site's URL goes to `/api/x/legacy/…` with
 *    its query, a surface to `/<site>/<locale>/…` in the site's tree, and anything else — an
 *    internal path asked for directly included — to the site's not-found route with
 *    `PROXY_NOT_FOUND_STATUS` on the rewrite. Every public page path is rewritten, so nothing under
 *    `/gallery/` or `/shop/` is ever served at its internal address.
 *
 * On every request it passes on it sets `PROXY_REQUEST_HEADERS`, overwriting whatever a client
 * sent, `PROXY_USER_AGENT` when the request has no `User-Agent` (Next renders in full per request
 * only for an agent `htmlLimitedBots` matches), drops any CSP header a client sent, and — once a
 * CSP builder is passed in — sets the per-request policy on the answer and the request. A surface
 * marked `sensitive` (a tracking token) answers with `Referrer-Policy: no-referrer` and
 * `X-Robots-Tag: noindex`.
 */
import type { LocaleCode } from '@engine/config/constants'
import {
  isSensitive,
  parsePublicPath,
  siteFromHost,
  siteOrigin,
  SITES,
  type HostMatch,
  type SiteKey,
} from '@engine/config/sites'

import { PROXY_NOT_FOUND_STATUS, PROXY_REQUEST_HEADERS, PROXY_USER_AGENT } from '../manifest'
import {
  clientAddress,
  hasCookie,
  hasUserAgent,
  isAdminPath,
  isApiPath,
  isEngineRoute,
  isHostFree,
  isSiteAsset,
  namesNotFoundRoute,
  notFoundPath,
  rootRewrite,
} from './gates'
import { trackingGuessAllowed } from './tracking-rate-limit'

export { NOT_FOUND_SEGMENT, notFoundPath } from './gates'

type Env = Readonly<Record<string, string | undefined>>

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
}

export type ProxyWhy =
  | 'next-internal'
  | 'machine'
  | 'unknown-host'
  | 'alias'
  | 'api'
  | 'not-admin-host'
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

const SENSITIVE_HEADERS = { 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' } as const
/** Both headers Next reads a nonce from: a client's never reaches the page. */
const CSP_REQUEST_HEADERS = [
  PROXY_REQUEST_HEADERS.contentSecurityPolicy,
  'content-security-policy-report-only',
] as const

type Routed = {
  readonly kind: 'rewrite' | 'next'
  readonly to: string | null
  readonly why: ProxyWhy
  readonly locale: LocaleCode
  readonly status?: number
  readonly setRequest?: Record<string, string>
  readonly setResponse?: Record<string, string>
  /** The item route's own query, for its permanent redirect to carry on. */
  readonly publicSearch?: string
  /** The tracking surface with a token: a guess against the order's one credential, budgeted. */
  readonly rateLimited?: boolean
}

export function decideProxy(request: ProxyRequest, options: DecideOptions = {}): ProxyDecision {
  const { pathname } = request.url
  const env = options.env ?? process.env
  if (pathname.startsWith('/_next/')) return passOn(request, 'next-internal')
  if (isHostFree(pathname)) return passOn(request, 'machine')
  const host = siteFromHost(request.headers.get('host'), env)
  if (host === null) return respond('unknown-host', 404, null)
  if (!host.canonical) {
    // Built from the allow-list, never the request: `siteOrigin()` is the canonical host's.
    const location = `${siteOrigin(host.site, env)}${pathname}${request.url.search}`
    const method = (request.method ?? 'GET').toUpperCase()
    return respond('alias', method === 'GET' || method === 'HEAD' ? 301 : 308, location)
  }
  if (isApiPath(pathname) && !isEngineRoute(pathname) && !host.admin) {
    return respond('not-admin-host', 404, null)
  }
  const routed = route(request, options, host)
  if (routed.rateLimited) {
    const wait = trackingGuessAllowed(clientAddress(request.headers) ?? 'unknown')
    if (wait > 0) {
      return respond('rate-limited', 429, null, { 'Retry-After': String(wait) })
    }
  }
  return finish(request, options, host, routed)
}

/** Where a request for a site goes, once its host is known to be the site's canonical one. */
function route(request: ProxyRequest, options: DecideOptions, host: HostMatch): Routed {
  const { pathname, search, searchParams } = request.url
  const site = SITES[host.site]
  const locale = site.locales.default
  const notFound = (): Routed => {
    const asked = localeOfPrefix(host.site, pathname)
    return {
      kind: 'rewrite',
      to: notFoundPath(host.site, asked),
      why: 'not-found',
      locale: asked,
      status: PROXY_NOT_FOUND_STATUS,
    }
  }
  if (isApiPath(pathname)) return { kind: 'next', to: null, why: 'api', locale }
  if (isAdminPath(pathname)) {
    if (!host.admin) return notFound()
    // The admin starts in English unless its user chose otherwise (KOI): Payload reads the
    // browser's Accept-Language, which on an Indonesian laptop is Indonesian.
    const chosen = hasCookie(request.headers, `${options.cookiePrefix ?? 'payload'}-lng`)
    return {
      kind: 'next',
      to: null,
      why: 'admin',
      locale,
      ...(chosen ? {} : { setRequest: { 'accept-language': 'en' } }),
    }
  }
  if (isSiteAsset(host.site, pathname)) return { kind: 'next', to: null, why: 'site-asset', locale }
  const root = rootRewrite(host.site, pathname)
  if (root !== null) return { kind: 'rewrite', to: `${root}${search}`, why: 'root-file', locale }
  if (namesNotFoundRoute(pathname)) return notFound()
  const parsed = parsePublicPath(site, pathname, searchParams)
  switch (parsed.kind) {
    case 'legacy':
      // The old site's query is part of the mapping (`?s=sold`, DATA.md §6): keep it.
      return { kind: 'rewrite', to: `${parsed.internal}${search}`, why: 'legacy', locale }
    case 'surface':
      return {
        kind: 'rewrite',
        to: `/${host.site}${parsed.internal}`,
        why: 'surface',
        locale: parsed.locale,
        ...(isSensitive(parsed.surface) ? { setResponse: { ...SENSITIVE_HEADERS } } : {}),
        ...(parsed.surface === 'item' ? { publicSearch: search } : {}),
        ...(parsed.surface === 'tracking' && typeof parsed.params.token === 'string'
          ? { rateLimited: true }
          : {}),
      }
    case 'notFound':
      return notFound()
  }
}

/** A decision for a known site: the headers every page and engine route is handed. */
function finish(
  request: ProxyRequest,
  options: DecideOptions,
  host: HostMatch,
  routed: Routed,
): ProxyDecision {
  const { pathname } = request.url
  const csp =
    options.contentSecurityPolicy?.({ site: host.site, locale: routed.locale, pathname }) ?? null
  const headers = PROXY_REQUEST_HEADERS
  return {
    kind: routed.kind,
    to: routed.to,
    why: routed.why,
    site: host.site,
    locale: routed.locale,
    status: routed.status ?? null,
    setRequest: {
      ...routed.setRequest,
      ...baseHeaders(request),
      [headers.site]: host.site,
      [headers.publicSearch]: routed.publicSearch ?? '',
      [headers.locale]: routed.locale,
      ...(csp === null ? {} : { [headers.contentSecurityPolicy]: csp }),
    },
    removeRequest: [...CSP_REQUEST_HEADERS],
    setResponse: {
      ...routed.setResponse,
      ...(csp === null ? {} : { 'Content-Security-Policy': csp }),
    },
  }
}

/** A request passed on with no site: Next's own, or a machine route. */
function passOn(request: ProxyRequest, why: ProxyWhy): ProxyDecision {
  return {
    kind: 'next',
    to: null,
    why,
    site: null,
    locale: null,
    status: null,
    // A client's `x-site` or `x-locale` never reaches a handler as though the proxy had set it.
    setRequest: {
      ...baseHeaders(request),
      [PROXY_REQUEST_HEADERS.site]: '',
      [PROXY_REQUEST_HEADERS.locale]: '',
    },
    removeRequest: [...CSP_REQUEST_HEADERS],
    setResponse: {},
  }
}

/** The proxy's answer of its own: a plain 404, a redirect to `location`, or (`setResponse`) a 429. */
function respond(
  why: ProxyWhy,
  status: number,
  location: string | null,
  setResponse: Record<string, string> = {},
): ProxyDecision {
  return {
    kind: 'respond',
    to: location,
    why,
    site: null,
    locale: null,
    status,
    setRequest: {},
    removeRequest: [],
    setResponse,
  }
}

/** What every request passed on carries: the public path, the true host, a User-Agent. */
function baseHeaders(request: ProxyRequest): Record<string, string> {
  return {
    ...(hasUserAgent(request.headers) ? {} : { 'user-agent': PROXY_USER_AGENT }),
    [PROXY_REQUEST_HEADERS.publicPath]: request.url.pathname,
    [PROXY_REQUEST_HEADERS.publicSearch]: '',
    // The `Host` the site was picked by, so Next's own origin checks see it, not a client's claim.
    [PROXY_REQUEST_HEADERS.forwardedHost]: request.headers.get('host') ?? '',
  }
}

/** A not-found page speaks the locale its prefix asked for, when the site serves it. */
function localeOfPrefix(site: SiteKey, pathname: string): LocaleCode {
  const { locales } = SITES[site]
  const first = pathname.split('/')[1]
  return locales.supported.find((locale) => locale === first) ?? locales.default
}
