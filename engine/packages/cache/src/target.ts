/**
 * Where a flush posts (ARCHITECTURE.md §9, C13 `REVALIDATE_REQUEST`): the web process that holds
 * the cache, reached **on loopback** — `REVALIDATE_ORIGIN`, `http://127.0.0.1:<PORT>` on a host
 * (DEPLOYMENT.md §8). Never through the brand's public origin by default: that would send the
 * bearer through Cloudflare and nginx and back into the box, hang an internal call on DNS and a
 * WAF, and post to another environment from a mis-set `SITE_URL`. On loopback the proxy never
 * runs (its matcher skips `/api/`), the web process listens on 127.0.0.1 alone, and the route
 * authenticates by its bearer. The IP literal, not `localhost`: a worker's Node without
 * `--dns-result-order=ipv4first` would resolve `::1` and be refused.
 *
 * - `REVALIDATE_ORIGIN` — plain `http:` on a loopback host, or `https:` anywhere (a tool run
 *   off-box posts to the public origin only with a Cloudflare skip rule for the route);
 * - otherwise `SITE_URL`, only while it is itself a loopback origin — a workstation's dev server;
 * - and `REVALIDATE_SECRET`, the bearer.
 *
 * Every refusal names what is wrong, never a value: a worker that cannot post must fail, not skip
 * its invalidation.
 */
import { REVALIDATE_ROUTE, type RevalidateTarget } from './post'

type Env = Readonly<Record<string, string | undefined>>

/** A loopback host as WHATWG URL spells it: `localhost`, `*.localhost`, 127.0.0.0/8, `[::1]`. */
export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    hostname === '[::1]'
  )
}

const refuse = (why: string): never => {
  throw new Error(`invalidate(): cannot post to ${REVALIDATE_ROUTE.path}: ${why}`)
}

/** The origin `value` names, when a bearer may be sent to it. */
function originOf(name: string, value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return refuse(`${name} is not a URL`)
  }
  if (url.protocol === 'https:') return url
  if (url.protocol === 'http:' && isLoopbackHost(url.hostname)) return url
  if (url.protocol === 'http:') return refuse(`${name} is plain http off loopback: use https`)
  return refuse(`${name} is not an http(s) origin`)
}

export function revalidateTargetFrom(env: Env = process.env): RevalidateTarget {
  const explicit = env.REVALIDATE_ORIGIN?.trim()
  const site = env.SITE_URL?.trim()
  const secret = env.REVALIDATE_SECRET?.trim()
  let origin: URL
  if (explicit) {
    origin = originOf('REVALIDATE_ORIGIN', explicit)
  } else if (site) {
    origin = originOf('SITE_URL', site)
    if (!isLoopbackHost(origin.hostname)) {
      refuse(
        'REVALIDATE_ORIGIN unset, and SITE_URL is not loopback — on a host set REVALIDATE_ORIGIN=http://127.0.0.1:<PORT>',
      )
    }
  } else {
    return refuse('REVALIDATE_ORIGIN unset (and no loopback SITE_URL to fall back on)')
  }
  if (!secret) refuse('REVALIDATE_SECRET unset')
  return { origin: origin.origin, secret: secret! }
}
