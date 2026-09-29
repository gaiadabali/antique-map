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
 * asked for directly, a default-locale prefix, a surface whose module is off — rewrites to
 * the not-found route, which answers 404, so no page has two addresses.
 *
 * On every request it sets C13's `PROXY_REQUEST_HEADERS`, overwriting whatever a client sent;
 * on a `sensitive` surface's answer, `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`;
 * and, once 41.1.a's builder is passed in, the per-request CSP on the answer and the request.
 */
import { parsePublicPath, SURFACE_ROUTES, type ParseConfig } from '@engine/config/routes'
import type { BrandConfig, LocaleCode } from '@engine/config/schema'

import { PROXY_REQUEST_HEADERS, ROOT_REWRITES } from '../manifest'

/** What the proxy reads from a brand config. */
export type ProxyConfig = ParseConfig & { readonly assets: Pick<BrandConfig['assets'], 'favicon'> }

export type ProxyRequest = { readonly url: URL; readonly headers: Headers }

/** The one CSP builder (41.1.a), per request; `null` sets none. */
export type ContentSecurityPolicy = (context: {
  readonly config: ProxyConfig
  readonly locale: LocaleCode
  readonly pathname: string
}) => string | null

export type ProxyDecision = {
  /** `rewrite`: serve `to` (a path and query) at the public URL; `next`: serve the URL as is. */
  readonly kind: 'rewrite' | 'next'
  readonly to: string | null
  readonly why: 'root-file' | 'legacy' | 'surface' | 'app' | 'not-found' | 'next-internal'
  readonly locale: LocaleCode
  /** Headers set on the request passed on, overwriting a client's. */
  readonly setRequest: Readonly<Record<string, string>>
  /** Headers removed from the request passed on. */
  readonly removeRequest: readonly string[]
  /** Headers set on the answer. */
  readonly setResponse: Readonly<Record<string, string>>
}

/**
 * Next's not-found route: rewriting there renders the app's designed not-found page with a
 * 404, reading what was asked from `x-public-path` (C2 `Loaders.notFound`). The 4.1.e spike
 * confirms it against the app shells.
 */
export const NOT_FOUND_PATH = '/_not-found'

const SENSITIVE_HEADERS = { 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' } as const
/** Payload's own language choice (Account → Language), which the admin keeps once made. */
const ADMIN_LANGUAGE_COOKIE = 'payload-lng'

export function decideProxy(
  config: ProxyConfig,
  request: ProxyRequest,
  contentSecurityPolicy?: ContentSecurityPolicy,
): ProxyDecision {
  const { pathname, search, searchParams } = request.url
  const base = { kind: 'rewrite' as const, locale: config.locales.default }
  let decision: Omit<ProxyDecision, 'setRequest' | 'removeRequest' | 'setResponse'>
  let setResponse: Record<string, string> = {}
  let setRequest: Record<string, string> = {}

  const root = rootRewrite(config, pathname)
  if (pathname.startsWith('/_next/')) {
    decision = { ...base, kind: 'next', to: null, why: 'next-internal' }
  } else if (root !== null) {
    decision = { ...base, to: `${root}${search}`, why: 'root-file' }
  } else {
    const parsed = parsePublicPath(config, pathname, searchParams)
    switch (parsed.kind) {
      case 'legacy':
        // The old site's query is part of the mapping (`?s=sold`, MIGRATION.md §6): keep it.
        decision = { ...base, to: `${parsed.internal}${search}`, why: 'legacy' }
        break
      case 'app':
        decision = { ...base, kind: 'next', to: null, why: 'app' }
        if (isAdmin(pathname) && !hasCookie(request.headers, ADMIN_LANGUAGE_COOKIE)) {
          // The admin starts in English unless its user chose otherwise (KOI): Payload reads the
          // browser's Accept-Language, which on an Indonesian laptop is Indonesian.
          setRequest = { 'accept-language': 'en' }
        }
        break
      case 'surface':
        decision = { ...base, to: parsed.internal, why: 'surface', locale: parsed.locale }
        if ('sensitive' in SURFACE_ROUTES[parsed.surface]) setResponse = { ...SENSITIVE_HEADERS }
        break
      case 'notFound':
        decision = {
          ...base,
          to: NOT_FOUND_PATH,
          why: 'not-found',
          locale: localeOfPrefix(config, pathname),
        }
        break
    }
  }

  const csp = contentSecurityPolicy?.({ config, locale: decision.locale, pathname }) ?? null
  const headers = PROXY_REQUEST_HEADERS
  return {
    ...decision,
    setRequest: {
      ...setRequest,
      [headers.publicPath]: pathname,
      [headers.locale]: decision.locale,
      ...(csp === null ? {} : { [headers.contentSecurityPolicy]: csp }),
    },
    // No client's own CSP header survives to the page (C13 `PROXY_REQUEST_HEADERS`).
    removeRequest: csp === null ? [headers.contentSecurityPolicy] : [],
    setResponse: { ...setResponse, ...(csp === null ? {} : { 'Content-Security-Policy': csp }) },
  }
}

/** A `ROOT_REWRITES` target for the path, its `:params` filled; the favicon is the brand's. */
function rootRewrite(config: ProxyConfig, pathname: string): string | null {
  for (const { from, to } of ROOT_REWRITES) {
    const match = compile(from).exec(pathname)
    if (!match) continue
    const values: Record<string, string> = { ...match.groups, favicon: config.assets.favicon }
    return to.replace(/:(\w+)\*?/g, (whole, name: string) => values[name] ?? whole)
  }
  return null
}

const compiled = new Map<string, RegExp>()
/** `/sitemap-:name.xml` → `^/sitemap-(?<name>[^/]+?)\.xml$`; `:path*` takes the rest. */
function compile(pattern: string): RegExp {
  let regex = compiled.get(pattern)
  if (!regex) {
    const source = pattern
      .split(/(:\w+\*?)/)
      .map((part) => {
        const param = /^:(\w+)(\*)?$/.exec(part)
        if (!param) return part.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
        return param[2] ? `(?<${param[1]}>.*)` : `(?<${param[1]}>[^/]+?)`
      })
      .join('')
    regex = new RegExp(`^${source}$`)
    compiled.set(pattern, regex)
  }
  return regex
}

function isAdmin(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

function hasCookie(headers: Headers, name: string): boolean {
  return (headers.get('cookie') ?? '').split(';').some((pair) => pair.trim().startsWith(`${name}=`))
}

/** A not-found page speaks the locale its prefix asked for, when the brand serves it. */
function localeOfPrefix(config: ProxyConfig, pathname: string): LocaleCode {
  const first = pathname.split('/')[1]
  const supported = config.locales.supported.find((locale) => locale === first)
  return supported ?? config.locales.default
}
