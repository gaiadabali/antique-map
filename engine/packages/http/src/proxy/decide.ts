/**
 * What the proxy does with one request (ARCHITECTURE.md §2, §5) — decided purely, from the site
 * allow-list in the environment and the request's URL, method and headers, so it is tested without
 * Next and never touches a database. In order:
 *
 * 1. Next's own `/_next/…`, and the machine routes (`HOST_FREE_PATHS`: health, cron, revalidate,
 *    called on loopback by the host itself) pass on, whatever the `Host`.
 * 2. The `Host` header — never `X-Forwarded-Host` — picks the site (`./host`): today's app reads
 *    both sites' lists (`siteFromHost()`); a site's own app (`app`, PLAN-V2 §3) knows only its own
 *    `SITE_HOSTS` and `ADMIN_HOST` and picks nothing. A host on no list is a plain 404 from the
 *    proxy: it picks no site, reaches no page and builds no URL.
 * 3. A site's other hosts (an alias) answer a permanent redirect to its canonical host, the
 *    `Location` built from the allow-list alone.
 * 4. `/api/…`: an engine route (`/api/x/…`, `/api/health`) passes on; Payload's REST passes on
 *    only on `ADMIN_HOST`, and is a plain 404 elsewhere. `/admin` passes on only on `ADMIN_HOST`
 *    (in English unless its user chose otherwise) and is the site's designed 404 elsewhere — so
 *    staff cookies are only ever set and sent on the one host (SECURITY.md X2). The tracking
 *    photo's route (`/api/x/track/{token}/driver-image`) counts its token against the tracking
 *    guess budget, as the page does.
 * 5. The site's own files (`/<site>/logo.svg`, …) pass on; its root files (robots, sitemaps,
 *    `.well-known`, favicon, touch icon, manifest) are rewritten to their routes and files. An
 *    admin host of its own (`ADMIN_HOST` off the site's list) serves nothing more: any page there
 *    is a plain 404.
 * 6. The site's route map (`parsePublicPath()`): an old site's URL goes to `/api/x/legacy/…` with
 *    its query, a surface to the site's tree (`/<site>/<locale>/…` today, `/<locale>/…` in the
 *    site's own app), and anything else — an internal path asked for directly included — to the
 *    tree's not-found route with `PROXY_NOT_FOUND_STATUS` on the rewrite. Every public page path is
 *    rewritten, so nothing in a tree is ever served at its internal address.
 *
 * On every request it passes on it sets `PROXY_REQUEST_HEADERS`, overwriting whatever a client
 * sent, `PROXY_USER_AGENT` when the request has no `User-Agent` (Next renders in full per request
 * only for an agent `htmlLimitedBots` matches), drops any CSP header a client sent, and — once a
 * CSP builder is passed in — sets the per-request policy on the answer and the request. A surface
 * marked `sensitive` (a tracking token) answers with `Referrer-Policy: no-referrer` and
 * `X-Robots-Tag: noindex`. Given `securityHeaders`, every answer carries them (SECURITY.md B3).
 */
import { SITES } from '@engine/config/sites'

import { PROXY_REQUEST_HEADERS, PROXY_USER_AGENT } from '../manifest'
import { clientAddress, hasUserAgent, isApiPath, isEngineRoute, isHostFree } from './gates'
import { resolveHost, type ResolvedHost } from './host'
import { route, type Routed } from './routing'
import { trackingGuessAllowed } from './tracking-rate-limit'
import type { DecideOptions, ProxyDecision, ProxyRequest, ProxyWhy } from './types'

export { NOT_FOUND_SEGMENT, notFoundPath } from './gates'
export type {
  ContentSecurityPolicy,
  DecideOptions,
  ProxyDecision,
  ProxyRequest,
  ProxyWhy,
} from './types'

/** Both headers Next reads a nonce from: a client's never reaches the page. */
const CSP_REQUEST_HEADERS = [
  PROXY_REQUEST_HEADERS.contentSecurityPolicy,
  'content-security-policy-report-only',
] as const

export function decideProxy(request: ProxyRequest, options: DecideOptions = {}): ProxyDecision {
  const { pathname } = request.url
  const env = options.env ?? process.env
  const secure = options.securityHeaders ?? {}
  if (pathname.startsWith('/_next/')) return passOn(request, 'next-internal', secure)
  if (isHostFree(pathname)) return passOn(request, 'machine', secure)
  const host = resolveHost(request.headers, options, env)
  if (host === null) return respond('unknown-host', 404, null, secure)
  if (!host.canonical && !host.adminOnly) {
    // Built from the allow-list, never the request: the canonical host's origin.
    const location = `${host.origin}${pathname}${request.url.search}`
    const method = (request.method ?? 'GET').toUpperCase()
    return respond('alias', method === 'GET' || method === 'HEAD' ? 301 : 308, location, secure)
  }
  // A page of this site whose address changed (`movedPaths`): a permanent redirect, query kept.
  const moved = (SITES[host.site].routes as { movedPaths?: Record<string, string> }).movedPaths?.[
    pathname
  ]
  if (moved !== undefined) {
    return respond('alias', 301, `${host.origin}${moved}${request.url.search}`, secure)
  }
  if (isApiPath(pathname) && !isEngineRoute(pathname) && !host.admin) {
    return respond('not-admin-host', 404, null, secure)
  }
  const routed = route(request, options, host)
  if (routed === null) return respond('admin-host-only', 404, null, secure)
  if (routed.guessedToken !== undefined) {
    const wait = trackingGuessAllowed(
      clientAddress(request.headers) ?? 'unknown',
      routed.guessedToken,
    )
    if (wait > 0) {
      return respond('rate-limited', 429, null, { ...secure, 'Retry-After': String(wait) })
    }
  }
  return finish(request, options, host, routed)
}

/** A decision for a known site: the headers every page and engine route is handed. */
function finish(
  request: ProxyRequest,
  options: DecideOptions,
  host: ResolvedHost,
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
      ...options.securityHeaders,
      ...routed.setResponse,
      ...(csp === null ? {} : { 'Content-Security-Policy': csp }),
    },
  }
}

/** A request passed on with no site: Next's own, or a machine route. */
function passOn(
  request: ProxyRequest,
  why: ProxyWhy,
  setResponse: Readonly<Record<string, string>>,
): ProxyDecision {
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
    setResponse: { ...setResponse },
  }
}

/** The proxy's answer of its own: a plain 404, a redirect to `location`, or (`setResponse`) a 429. */
function respond(
  why: ProxyWhy,
  status: number,
  location: string | null,
  setResponse: Readonly<Record<string, string>> = {},
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
    setResponse: { ...setResponse },
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
