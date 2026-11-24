/**
 * What the request's `Host` is to this process (`./decide`), in either shape:
 *
 * - **Today's one app** (no `app` option): `siteFromHost()` against both sites' lists picks the
 *   site, and each site's pages live in its own tree, `/<site>/<locale>/…`.
 * - **One app per site** (PLAN-V2 §3, `app: 'shop'`): the app is its site and picks none.
 *   `appHostOf()` knows only its own hosts (`SITE_HOSTS`, `ADMIN_HOST`) — any other is the plain
 *   404 an unknown host always was — and its pages live at the root of its tree, `/<locale>/…`.
 *   Its `ADMIN_HOST` may be a host of its own that serves no page (`adminOnly`).
 *
 * Either way the redirect origin comes from the allow-list, never the request. Pure.
 */
import type { LocaleCode } from '@engine/config/constants'
import { appHostOf, appOrigin, siteFromHost, siteOrigin, type SiteKey } from '@engine/config/sites'

import { NOT_FOUND_SEGMENT } from './gates'
import type { DecideOptions, Env } from './types'

export type ResolvedHost = {
  readonly site: SiteKey
  /** The site's first host: any other page host answers a 301 to `origin`. */
  readonly canonical: boolean
  /** `ADMIN_HOST`: `/admin` and Payload's REST answer here alone. */
  readonly admin: boolean
  /** The admin's own host: it serves the admin, the engine routes and the site's files, no page. */
  readonly adminOnly: boolean
  /** The canonical origin, from the allow-list; `null` while it is unusable. */
  readonly origin: string | null
  /** Where the site's pages live in the app's tree: `/<site>` today, `''` in the site's own app. */
  readonly tree: string
}

export function resolveHost(
  headers: Headers,
  options: DecideOptions,
  env: Env,
): ResolvedHost | null {
  const host = headers.get('host')
  if (options.app !== undefined) {
    const match = appHostOf(options.app, host, env)
    if (match === null) return null
    return { ...match, origin: appOrigin(options.app, env), tree: '' }
  }
  const match = siteFromHost(host, env)
  if (match === null) return null
  return { ...match, adminOnly: false, origin: siteOrigin(match.site, env), tree: `/${match.site}` }
}

/** The not-found route in the host's tree: `/<site>/<locale>/not-found`, or `/<locale>/not-found`. */
export function notFoundIn(host: ResolvedHost, locale: LocaleCode): string {
  return `${host.tree}/${locale}/${NOT_FOUND_SEGMENT}`
}
