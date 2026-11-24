/**
 * One app's hosts (PLAN-V2 §3, §4.5; DR-17): each app serves one site, from `SITE_HOSTS` — its
 * hostnames, comma-separated, the first canonical — and `ADMIN_HOST`, the one host its `/admin` and
 * Payload's REST answer on. The app knows its own site (`site`, from the code, never from a
 * request): nothing here picks one, and a host off the app's list is a plain 404.
 *
 * `ADMIN_HOST` is either the site's canonical host (the default, as today: the admin's cookies and
 * the page preview share one origin) or a host of its own that serves no page (an `admin.` name):
 * an alias never, since an alias answers a 301 before anything else.
 *
 * In transition (phases 23–26) an app also runs on today's two-site environment: with no
 * `SITE_HOSTS`, its list is its site's own variable (`SHOP_HOSTS`, `GALLERY_HOSTS`, `./hosts`), and
 * an `ADMIN_HOST` naming the other site's host is refused — that admin is not this app's.
 *
 * The sister site (the shop's link to the gallery of originals, and back) is another process with
 * its own hosts, so its origin is configuration too: `GALLERY_ORIGIN` / `SHOP_ORIGIN` (an origin,
 * https off a workstation), else the other site's canonical host from the two-site lists, else
 * `null` — no link, never one built from a request. Pure, apart from reading `env`.
 */
import { isHostname, originOf, readSiteHosts, requestHostname, SITE_HOST_VARIABLES } from './hosts'
import { SITE_KEYS, type SiteKey } from './table'

type Env = Readonly<Record<string, string | undefined>>

export const APP_HOST_VARIABLES = {
  site: 'SITE_HOSTS',
  admin: 'ADMIN_HOST',
  /** The sister site's origin, by the sister's key. */
  sister: { gallery: 'GALLERY_ORIGIN', shop: 'SHOP_ORIGIN' },
} as const

/** One app's hostnames, the canonical first, and its admin host — lower case, no port. */
export type AppHosts = {
  readonly site: SiteKey
  readonly hosts: readonly [string, ...string[]]
  readonly admin: string
  /** The admin host serves no page: it is not one of `hosts`. */
  readonly adminOnly: boolean
}

export type AppHostProblem = { readonly subject: string; readonly message: string }
export type AppHostsResult =
  | { readonly ok: true; readonly hosts: AppHosts }
  | { readonly ok: false; readonly problems: readonly AppHostProblem[] }

/** What a request's host is to the app: canonical, an alias, or its admin host. */
export type AppHostMatch = {
  readonly site: SiteKey
  readonly hostname: string
  /** The site's first host. A page host that is not answers a 301 to it. */
  readonly canonical: boolean
  /** `ADMIN_HOST`: the one host that serves `/admin` and Payload's REST. */
  readonly admin: boolean
  /** The admin's own host, serving no page. */
  readonly adminOnly: boolean
}

const memo = new Map<string, AppHostsResult>()

/** The app's hosts as this environment names them, or why they cannot be used. */
export function readAppHosts(site: SiteKey, env: Env = process.env): AppHostsResult {
  const legacy = SITE_HOST_VARIABLES[site]
  const raw = [site, env.SITE_HOSTS, env[legacy], env.ADMIN_HOST, env.GALLERY_HOSTS, env.SHOP_HOSTS]
  const key = raw.map((v) => v ?? '').join('\n')
  let result = memo.get(key)
  if (!result) {
    result = parseAppHosts(site, env)
    memo.set(key, result)
  }
  return result
}

function parseAppHosts(site: SiteKey, env: Env): AppHostsResult {
  const own = env.SITE_HOSTS?.trim() ? APP_HOST_VARIABLES.site : SITE_HOST_VARIABLES[site]
  const problems: AppHostProblem[] = []
  const entries = (env[own] ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry !== '')
  if (entries.length === 0) {
    problems.push({
      subject: APP_HOST_VARIABLES.site,
      message: `is not set: the ${site}'s hostnames, comma-separated, the first canonical`,
    })
  }
  const seen = new Set<string>()
  for (const entry of entries) {
    if (!isHostname(entry)) {
      problems.push({
        subject: own,
        message: `"${entry}" is not a bare hostname (no scheme, port or path)`,
      })
    } else if (seen.has(entry)) {
      problems.push({ subject: own, message: `"${entry}" is listed twice` })
    }
    seen.add(entry)
  }
  const [canonical, ...aliases] = entries
  if (problems.length > 0 || canonical === undefined) return { ok: false, problems }
  const named = (env.ADMIN_HOST ?? '').trim().toLowerCase()
  // Today's single admin may name the other site's host: that admin is not this app's.
  const othersHost = listOf(env[SITE_HOST_VARIABLES[otherSite(site)]]).includes(named)
  const admin = named === '' || (own !== APP_HOST_VARIABLES.site && othersHost) ? canonical : named
  const subject = APP_HOST_VARIABLES.admin
  if (!isHostname(admin)) {
    return { ok: false, problems: [{ subject, message: `"${admin}" is not a bare hostname` }] }
  }
  if (aliases.includes(admin)) {
    const message = `"${admin}" is an alias, which answers a 301: name ${canonical} or a host of its own`
    return { ok: false, problems: [{ subject, message }] }
  }
  return {
    ok: true,
    hosts: { site, hosts: [canonical, ...aliases], admin, adminOnly: admin !== canonical },
  }
}

/** Why the app's hosts are unusable, for a boot check; `[]` when they are sound. */
export function appHostProblems(site: SiteKey, env: Env = process.env): readonly AppHostProblem[] {
  const result = readAppHosts(site, env)
  return result.ok ? [] : result.problems
}

/**
 * What a request's `Host` header is to the app, or `null`: a host off its list, a malformed one,
 * or unusable hosts. Only `Host` is read, never `X-Forwarded-Host`; the port decides nothing.
 */
export function appHostOf(
  site: SiteKey,
  host: string | null | undefined,
  env: Env = process.env,
): AppHostMatch | null {
  const result = readAppHosts(site, env)
  const hostname = requestHostname(host)
  if (!result.ok || hostname === null) return null
  const { hosts, admin, adminOnly } = result.hosts
  if (hostname === admin) {
    return { site, hostname, canonical: !adminOnly, admin: true, adminOnly }
  }
  if (!hosts.includes(hostname)) return null
  return { site, hostname, canonical: hosts[0] === hostname, admin: false, adminOnly: false }
}

/** The app's canonical origin — the only base its absolute URLs are built on — or `null`. */
export function appOrigin(site: SiteKey, env: Env = process.env): string | null {
  const result = readAppHosts(site, env)
  return result.ok ? originOf(result.hosts.hosts[0], env) : null
}

/** The app's admin origin (Payload's `serverURL`), or `null` while its hosts are unusable. */
export function appAdminOrigin(site: SiteKey, env: Env = process.env): string | null {
  const result = readAppHosts(site, env)
  return result.ok ? originOf(result.hosts.admin, env) : null
}

/**
 * The sister site's origin, for an absolute link to it: `GALLERY_ORIGIN` / `SHOP_ORIGIN` when it
 * is a bare origin (https, or http for a `*.localhost` one), else the other site's canonical host
 * from the two-site lists, else `null` — the caller then draws no link.
 */
export function sisterOrigin(site: SiteKey, env: Env = process.env): string | null {
  const sister = otherSite(site)
  const named = env[APP_HOST_VARIABLES.sister[sister]]?.trim()
  if (named) return bareOrigin(named)
  const twoSite = readSiteHosts(env)
  return twoSite.ok ? originOf(twoSite.hosts[sister][0], env) : null
}

/** `value` when it is exactly an origin a link may name; `null` otherwise. */
function bareOrigin(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.origin !== value.replace(/\/$/, '') || url.username || url.password) return null
  const local = url.hostname === 'localhost' || url.hostname.endsWith('.localhost')
  if (url.protocol === 'https:' || (url.protocol === 'http:' && local)) return url.origin
  return null
}

function otherSite(site: SiteKey): SiteKey {
  return SITE_KEYS.find((key) => key !== site) ?? site
}

function listOf(value: string | undefined): string[] {
  return (value ?? '').split(',').map((entry) => entry.trim().toLowerCase())
}
