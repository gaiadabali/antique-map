/**
 * What the proxy does with one request (ARCHITECTURE.md §11) — decided purely, from the brand
 * config and the request's URL and headers, so it is tested without Next and never touches a
 * database. It only rewrites or passes the request on; it never redirects, so the root is the
 * default locale whatever `Accept-Language` says, and crawlers see one answer.
 *
 * In order: C13's `ROOT_REWRITES` (robots, sitemaps, `.well-known`, the favicon); then C10's
 * `parsePublicPath()` — a legacy prefix goes to `/api/x/legacy/…` with its query, a surface to
 * its internal app route (default locale unprefixed, others under their prefix), the app's
 * own routes (`/admin`, `/style-guide`) pass through, and anything else — an internal path
 * asked for directly, a default-locale prefix, a page whose module is off (its surface, form
 * kind or account section), the not-found route itself — rewrites to the locale's not-found
 * route, which answers 404, so no page has two addresses.
 *
 * On every request it sets C13's `PROXY_REQUEST_HEADERS`, overwriting whatever a client sent,
 * and drops any CSP header a client sent — Next takes a nonce from either CSP request header,
 * report-only included; on a `sensitive` surface's answer, `Referrer-Policy: no-referrer` and
 * `X-Robots-Tag: noindex`; and, once 41.1.a's builder is passed in, the per-request CSP on the
 * answer and the request.
 */
import { parsePublicPath, SURFACE_ROUTES, type ParseConfig } from '@engine/config/routes'
import type { BrandConfig, LocaleCode, ModuleFlags } from '@engine/config/schema'

import { PROXY_REQUEST_HEADERS } from '../manifest'
import { closedModule, hasCookie, namesNotFoundRoute, notFoundPath, rootRewrite } from './gates'

export { NOT_FOUND_SEGMENT, notFoundPath } from './gates'

/** What the proxy reads from a brand config. */
export type ProxyConfig = ParseConfig & {
  readonly assets: Pick<BrandConfig['assets'], 'favicon'>
  readonly modules: ModuleFlags
}

export type ProxyRequest = { readonly url: URL; readonly headers: Headers }

/** The one CSP builder (41.1.a), per request; `null` sets none. */
export type ContentSecurityPolicy = (context: {
  readonly config: ProxyConfig
  readonly locale: LocaleCode
  readonly pathname: string
}) => string | null

export type DecideOptions = {
  readonly contentSecurityPolicy?: ContentSecurityPolicy | undefined
  /** Payload's `cookiePrefix` (3.2's config); its language cookie is `<prefix>-lng`. */
  readonly cookiePrefix?: string | undefined
}

export type ProxyDecision = {
  /** `rewrite`: serve `to` (a path and query) at the public URL; `next`: serve the URL as is. */
  readonly kind: 'rewrite' | 'next'
  readonly to: string | null
  readonly why: 'root-file' | 'legacy' | 'surface' | 'app' | 'not-found' | 'next-internal'
  readonly locale: LocaleCode
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

type Decided = Omit<ProxyDecision, 'setRequest' | 'removeRequest' | 'setResponse'>

export function decideProxy(
  config: ProxyConfig,
  request: ProxyRequest,
  options: DecideOptions = {},
): ProxyDecision {
  const { pathname, search, searchParams } = request.url
  const base = { kind: 'rewrite' as const, locale: config.locales.default }
  const notFound = (): Decided => {
    const locale = localeOfPrefix(config, pathname)
    return { ...base, to: notFoundPath(locale), why: 'not-found', locale }
  }
  let decision: Decided
  let setResponse: Record<string, string> = {}
  let setRequest: Record<string, string> = {}

  const root = rootRewrite(config.assets.favicon, pathname)
  if (pathname.startsWith('/_next/')) {
    decision = { ...base, kind: 'next', to: null, why: 'next-internal' }
  } else if (root !== null) {
    decision = { ...base, to: `${root}${search}`, why: 'root-file' }
  } else if (namesNotFoundRoute(pathname)) {
    decision = notFound()
  } else {
    const parsed = parsePublicPath(config, pathname, searchParams)
    switch (parsed.kind) {
      case 'legacy':
        // The old site's query is part of the mapping (`?s=sold`, MIGRATION.md §6): keep it.
        decision = { ...base, to: `${parsed.internal}${search}`, why: 'legacy' }
        break
      case 'app':
        decision = { ...base, kind: 'next', to: null, why: 'app' }
        if (
          isAdmin(pathname) &&
          !hasCookie(request.headers, `${options.cookiePrefix ?? 'payload'}-lng`)
        ) {
          // The admin starts in English unless its user chose otherwise (KOI): Payload reads the
          // browser's Accept-Language, which on an Indonesian laptop is Indonesian.
          setRequest = { 'accept-language': 'en' }
        }
        break
      case 'surface':
        if (closedModule(config, parsed)) {
          decision = notFound()
          break
        }
        decision = { ...base, to: parsed.internal, why: 'surface', locale: parsed.locale }
        if ('sensitive' in SURFACE_ROUTES[parsed.surface]) setResponse = { ...SENSITIVE_HEADERS }
        break
      case 'notFound':
        decision = notFound()
        break
    }
  }

  const csp = options.contentSecurityPolicy?.({ config, locale: decision.locale, pathname }) ?? null
  const headers = PROXY_REQUEST_HEADERS
  return {
    ...decision,
    setRequest: {
      ...setRequest,
      [headers.publicPath]: pathname,
      [headers.locale]: decision.locale,
      ...(csp === null ? {} : { [headers.contentSecurityPolicy]: csp }),
    },
    removeRequest: [...CSP_REQUEST_HEADERS],
    setResponse: { ...setResponse, ...(csp === null ? {} : { 'Content-Security-Policy': csp }) },
  }
}

function isAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/** A not-found page speaks the locale its prefix asked for, when the brand serves it. */
function localeOfPrefix(config: ProxyConfig, pathname: string): LocaleCode {
  const first = pathname.split('/')[1]
  const supported = config.locales.supported.find((locale) => locale === first)
  return supported ?? config.locales.default
}
