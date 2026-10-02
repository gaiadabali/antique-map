/**
 * Which host serves which site (ARCHITECTURE.md §2, DEPLOYMENT.md §8): an allow-list in the
 * environment — `GALLERY_HOSTS` and `SHOP_HOSTS`, comma-separated hostnames, the first of each
 * canonical — and `ADMIN_HOST`, the one host Payload's admin and REST answer on (the shop's
 * canonical host unless named, Q1).
 *
 * Host trust (CARRY-OVER.md §6.5): a request's `Host` picks a site only when it is on a list, and
 * a host on none picks nothing — the proxy answers it a plain 404. Nothing builds a URL from a
 * request: every absolute URL (canonical, Open Graph, emails, Payload's `serverURL`, CSRF and CORS)
 * is `siteOrigin()` of a site's canonical host, from this allow-list alone. Only `Host` is read,
 * never `X-Forwarded-Host`, which any client may send: nginx passes `Host` through as it came.
 *
 * A malformed allow-list fails closed: no host matches (every request is a 404) and the boot check
 * refuses the start with the reason (`siteHostProblems()`). Pure, apart from reading `env`.
 */
import { SITE_KEYS, type SiteKey } from './table'

type Env = Readonly<Record<string, string | undefined>>

export const SITE_HOST_VARIABLES = {
  gallery: 'GALLERY_HOSTS',
  shop: 'SHOP_HOSTS',
  admin: 'ADMIN_HOST',
} as const

/** Each site's hostnames, the canonical first, and the admin host — all lower case, no port. */
export type SiteHosts = {
  readonly gallery: readonly [string, ...string[]]
  readonly shop: readonly [string, ...string[]]
  readonly admin: string
}

export type HostProblem = { readonly subject: string; readonly message: string }
export type SiteHostsResult =
  | { readonly ok: true; readonly hosts: SiteHosts }
  | { readonly ok: false; readonly problems: readonly HostProblem[] }

/** What a request's host is to this process: a site, and whether it is canonical or the admin's. */
export type HostMatch = {
  readonly site: SiteKey
  /** The host as matched: lower case, no port, no trailing dot. */
  readonly hostname: string
  /** The site's first host. Any other answers a 301 to it. */
  readonly canonical: boolean
  /** `ADMIN_HOST`: the one host that serves `/admin` and Payload's REST. */
  readonly admin: boolean
}

/** One DNS name, lower case: labels of letters, digits and inner hyphens. No port, no scheme. */
const HOSTNAME =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/
/** A `Host` header: a hostname, an optional trailing dot (the root), an optional port. */
const HOST_HEADER = /^([^:]+?)\.?(?::(\d{1,5}))?$/

const memo = new Map<string, SiteHostsResult>()

/** The allow-list this environment names, or why it cannot be used. */
export function readSiteHosts(env: Env = process.env): SiteHostsResult {
  const raw = [env.GALLERY_HOSTS, env.SHOP_HOSTS, env.ADMIN_HOST].map((v) => v ?? '').join('\n')
  let result = memo.get(raw)
  if (!result) {
    result = parseSiteHosts(env)
    memo.set(raw, result)
  }
  return result
}

function parseSiteHosts(env: Env): SiteHostsResult {
  const problems: HostProblem[] = []
  const lists: Partial<Record<SiteKey, string[]>> = {}
  const seen = new Map<string, SiteKey>()
  for (const site of SITE_KEYS) {
    const subject = SITE_HOST_VARIABLES[site]
    const entries = (env[subject] ?? '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry !== '')
    if (entries.length === 0) {
      problems.push({
        subject,
        message: `is not set: the ${site}'s hostnames, comma-separated, the first canonical`,
      })
      continue
    }
    for (const entry of entries) {
      if (!HOSTNAME.test(entry)) {
        problems.push({
          subject,
          message: `"${entry}" is not a bare hostname (no scheme, port or path)`,
        })
      } else if (seen.has(entry)) {
        const other = seen.get(entry)
        problems.push({
          subject,
          message: `"${entry}" is listed twice${other === site ? '' : `, for the ${other} too`}: a host picks one site`,
        })
      }
      seen.set(entry, site)
    }
    lists[site] = entries
  }
  const { gallery, shop } = lists
  if (problems.length > 0 || !gallery?.[0] || !shop?.[0]) return { ok: false, problems }
  const admin = (env.ADMIN_HOST ?? '').trim().toLowerCase() || shop[0]
  if (admin !== gallery[0] && admin !== shop[0]) {
    return {
      ok: false,
      problems: [
        {
          subject: SITE_HOST_VARIABLES.admin,
          message: `"${admin}" is neither site's canonical host (${shop[0]}, ${gallery[0]}): the admin answers on one of them, where its cookies stay`,
        },
      ],
    }
  }
  return {
    ok: true,
    hosts: {
      gallery: gallery as [string, ...string[]],
      shop: shop as [string, ...string[]],
      admin,
    },
  }
}

/** Why the allow-list is unusable, for the boot check; `[]` when it is sound. */
export function siteHostProblems(env: Env = process.env): readonly HostProblem[] {
  const result = readSiteHosts(env)
  return result.ok ? [] : result.problems
}

/** A `Host` header's hostname: lower case, its port and a trailing dot dropped; `null` if none. */
export function requestHostname(host: string | null | undefined): string | null {
  const match = HOST_HEADER.exec((host ?? '').trim().toLowerCase())
  const hostname = match?.[1]
  return hostname !== undefined && HOSTNAME.test(hostname) ? hostname : null
}

/**
 * The site a request's `Host` names, or `null`: an unlisted host, a malformed one, or an
 * unusable allow-list. The port is not part of the match — a process binds loopback, so the port
 * a client names decides nothing.
 */
export function siteFromHost(
  host: string | null | undefined,
  env: Env = process.env,
): HostMatch | null {
  const result = readSiteHosts(env)
  const hostname = requestHostname(host)
  if (!result.ok || hostname === null) return null
  for (const site of SITE_KEYS) {
    const hosts: readonly string[] = result.hosts[site]
    if (!hosts.includes(hostname)) continue
    return {
      site,
      hostname,
      canonical: hosts[0] === hostname,
      admin: result.hosts.admin === hostname,
    }
  }
  return null
}

/** `localhost` and `*.localhost`: a workstation's or CI's, served over plain http. */
export function isLocalHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost')
}

/**
 * A hostname's origin: `https://` for every real host; `http://` and the process's `PORT` for a
 * local one, which is what a browser on the workstation sends as `Origin`.
 */
export function originOf(hostname: string, env: Env = process.env): string {
  if (!isLocalHostname(hostname)) return `https://${hostname}`
  const port = env.PORT?.trim()
  const suffix = port && /^\d{1,5}$/.test(port) && port !== '80' ? `:${port}` : ''
  return `http://${hostname}${suffix}`
}

/** A site's canonical host, or `null` while the allow-list is unusable. */
export function canonicalHost(site: SiteKey, env: Env = process.env): string | null {
  const result = readSiteHosts(env)
  return result.ok ? result.hosts[site][0] : null
}

/** A site's canonical origin — the only base an absolute URL is built on — or `null`. */
export function siteOrigin(site: SiteKey, env: Env = process.env): string | null {
  const host = canonicalHost(site, env)
  return host === null ? null : originOf(host, env)
}

/** The admin host's origin (Payload's `serverURL`), or `null` while the allow-list is unusable. */
export function adminOrigin(env: Env = process.env): string | null {
  const result = readSiteHosts(env)
  return result.ok ? originOf(result.hosts.admin, env) : null
}

/** Every site's canonical origin: what Payload's CSRF and CORS lists hold. `[]` when unusable. */
export function siteOrigins(env: Env = process.env): string[] {
  return SITE_KEYS.map((site) => siteOrigin(site, env)).filter((o): o is string => o !== null)
}
