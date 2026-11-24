/**
 * Where a request for a site goes once its host is known to be one the site answers on as itself
 * — its canonical host, or the admin's own (`./decide`, steps 4–6). Pure.
 */
import type { LocaleCode } from '@engine/config/constants'
import { isSensitive, parsePublicPath, SITES, type SiteKey } from '@engine/config/sites'

import { PROXY_NOT_FOUND_STATUS } from '../manifest'
import {
  hasCookie,
  isAdminPath,
  isApiPath,
  isSiteAsset,
  namesNotFoundRoute,
  rootRewrite,
  trackingImageToken,
} from './gates'
import { notFoundIn, type ResolvedHost } from './host'
import type { DecideOptions, ProxyRequest, ProxyWhy } from './types'

const SENSITIVE_HEADERS = { 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' } as const

export type Routed = {
  readonly kind: 'rewrite' | 'next'
  readonly to: string | null
  readonly why: ProxyWhy
  readonly locale: LocaleCode
  readonly status?: number
  readonly setRequest?: Record<string, string>
  readonly setResponse?: Record<string, string>
  /** The item route's own query, for its permanent redirect to carry on. */
  readonly publicSearch?: string
  /**
   * The token a tracking or order URL presents: a guess against the order's one credential,
   * budgeted per address by distinct tokens (`./tracking-rate-limit`).
   */
  readonly guessedToken?: string
}

/** `null`: the admin's own host asked for a page — a plain 404, which the caller answers. */
export function route(
  request: ProxyRequest,
  options: DecideOptions,
  host: ResolvedHost,
): Routed | null {
  const { pathname, search, searchParams } = request.url
  const site = SITES[host.site]
  const locale = site.locales.default
  const notFound = (): Routed => {
    const asked = localeOfPrefix(host.site, pathname)
    return {
      kind: 'rewrite',
      to: notFoundIn(host, asked),
      why: 'not-found',
      locale: asked,
      status: PROXY_NOT_FOUND_STATUS,
    }
  }
  if (isApiPath(pathname)) {
    // The tracking photo's route takes the same token as the page: one shared guess budget.
    const imageToken = trackingImageToken(pathname)
    return {
      kind: 'next',
      to: null,
      why: 'api',
      locale,
      ...(imageToken === null ? {} : { guessedToken: imageToken }),
    }
  }
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
  // The admin's own host serves its sign-in's icons and logo, and no page.
  if (host.adminOnly) return null
  if (namesNotFoundRoute(pathname)) return notFound()
  const parsed = parsePublicPath(site, pathname, searchParams)
  switch (parsed.kind) {
    case 'legacy':
      // The old site's query is part of the mapping (`?s=sold`, DATA.md §6): keep it.
      return { kind: 'rewrite', to: `${parsed.internal}${search}`, why: 'legacy', locale }
    case 'surface':
      return {
        kind: 'rewrite',
        to: `${host.tree}${parsed.internal}`,
        why: 'surface',
        locale: parsed.locale,
        ...(isSensitive(parsed.surface) ? { setResponse: { ...SENSITIVE_HEADERS } } : {}),
        ...(parsed.surface === 'item' ? { publicSearch: search } : {}),
        // The order page's token is the same kind of credential as tracking's: one shared budget.
        ...((parsed.surface === 'tracking' || parsed.surface === 'order') &&
        typeof parsed.params.token === 'string'
          ? { guessedToken: parsed.params.token }
          : {}),
      }
    case 'notFound':
      return notFound()
  }
}

/** A not-found page speaks the locale its prefix asked for, when the site serves it. */
function localeOfPrefix(site: SiteKey, pathname: string): LocaleCode {
  const { locales } = SITES[site]
  const first = pathname.split('/')[1]
  return locales.supported.find((locale) => locale === first) ?? locales.default
}
