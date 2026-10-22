/**
 * The proxy's small readers (`./decide`): which paths are Payload's, which are machine routes,
 * which are a site's own files, the root-file rewrites, the reserved not-found segment, and a
 * request's User-Agent and cookies. Pure.
 */
import { LOCALE_CODES, type LocaleCode } from '@engine/config/constants'
import type { SiteKey } from '@engine/config/sites'

import { HOST_FREE_PATHS, ROOT_REWRITES, SITE_ASSETS } from '../manifest'

/**
 * The internal not-found route's segment, under each site and locale:
 * `/<site>/<locale>/not-found`. The proxy rewrites every path that names no page there with
 * `PROXY_NOT_FOUND_STATUS`, which Next keeps through a normal render, so the route's page renders
 * the designed page in its own body, without JavaScript. No public URL reaches it except as a
 * rewrite: asked for directly, in any locale, it is itself not found.
 */
export const NOT_FOUND_SEGMENT = 'not-found'

export function notFoundPath(site: SiteKey, locale: LocaleCode): string {
  return `/${site}/${locale}/${NOT_FOUND_SEGMENT}`
}

/** The public path names the not-found route itself: `/not-found`, `/id/not-found`, …. */
export function namesNotFoundRoute(pathname: string): boolean {
  const parts = pathname.split('/').filter((part) => part !== '')
  const first = parts[0] ?? ''
  const head = (LOCALE_CODES as readonly string[]).includes(first) ? parts[1] : first
  try {
    return head !== undefined && decodeURIComponent(head).toLowerCase() === NOT_FOUND_SEGMENT
  } catch {
    return false
  }
}

/** `/admin` and below: Payload's admin. */
export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/')
}

/** `/api` and below: Payload's REST, or an engine route under `/api/x/` or `/api/health`. */
export function isApiPath(pathname: string): boolean {
  return pathname === '/api' || pathname.startsWith('/api/')
}

/** An engine route: never Payload's, answered on either site's host. */
export function isEngineRoute(pathname: string): boolean {
  return pathname.startsWith('/api/x/') || pathname === '/api/health'
}

const TRACKING_IMAGE_PATH = /^\/api\/x\/track\/([^/]+)\/driver-image$/

/**
 * The token a tracking photo's URL (`/api/x/track/{token}/driver-image`) presents, decoded as the
 * `/track/{token}` page's own is, so both count as one token against the guess budget; `null` for
 * any other path.
 */
export function trackingImageToken(pathname: string): string | null {
  const raw = TRACKING_IMAGE_PATH.exec(pathname)?.[1]
  if (raw === undefined) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** A machine route (`HOST_FREE_PATHS`), answered whatever the `Host`. */
export function isHostFree(pathname: string): boolean {
  return (HOST_FREE_PATHS as readonly string[]).includes(pathname)
}

const ASSET_NAMES: readonly string[] = Object.values(SITE_ASSETS)

/**
 * `/<site>/<file>` for one of the request host's own site files (`SITE_ASSETS`): the one path
 * under a site's internal prefix a client may ask for directly, so a page can link its logo and
 * Open Graph image. Any other `/<site>/…` is an internal path, and not found.
 */
export function isSiteAsset(site: SiteKey, pathname: string): boolean {
  const prefix = `/${site}/`
  return pathname.startsWith(prefix) && ASSET_NAMES.includes(pathname.slice(prefix.length))
}

/** A `ROOT_REWRITES` target for the path on `site`, its `:params` filled; `null` for none. */
export function rootRewrite(site: SiteKey, pathname: string): string | null {
  for (const { from, to } of ROOT_REWRITES) {
    const match = compile(from).exec(pathname)
    if (!match) continue
    const values: Record<string, string> = { ...match.groups, site }
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

/**
 * The request carries a `User-Agent` of its own. Missing and empty are one to Next
 * (`req.headers['user-agent'] || ''`), and a value of blanks is empty once HTTP trims it.
 */
export function hasUserAgent(headers: Headers): boolean {
  return (headers.get('user-agent') ?? '').trim() !== ''
}

export function hasCookie(headers: Headers, name: string): boolean {
  return (headers.get('cookie') ?? '').split(';').some((pair) => pair.trim().startsWith(`${name}=`))
}

/**
 * The address nginx appended to `X-Forwarded-For` (the last entry; the app binds loopback, so the
 * header cannot be forged by a direct hit) — `null` off that reverse proxy (a workstation, CI). The
 * one place the proxy reads it from, so anything counted per address (`./tracking-rate-limit`)
 * agrees with the app's own `clientAddress` (`apps/web/src/server/chat/identity.ts`) on what an
 * address is.
 */
export function clientAddress(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  const last = forwarded?.split(',').at(-1)?.trim()
  return last && /^[0-9a-f:.]{2,45}$/i.test(last) ? last : null
}
