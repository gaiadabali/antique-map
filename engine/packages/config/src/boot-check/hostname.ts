/**
 * `HOSTNAME`, the address a standalone `server.js` binds (`process.env.HOSTNAME || '0.0.0.0'`),
 * may not be a loopback IP, in any environment (TASKS.md 5.3.d; DEPLOYMENT.md §3, C13
 * `PROXY_MATCHER`). At one, Next renames the host to `localhost` when it re-reads the proxy's
 * rewrite but builds its own URL from the raw address, so every rewrite looks external, is proxied
 * to itself, and every storefront page hangs with nothing logged (4.1's qa F1, 4.4.g).
 *
 * The test is Next's own, on the host as Next reads it: WHATWG-normalised
 * (``new URL(`http://${host}`).hostname``, a bare IPv6 bracketed first), so `127.1`, `2130706433`
 * and `0x7f.0.0.1` are all `127.0.0.1`, and `::1` is `[::1]`; then `127.` and three octets, or
 * `[::1]` — the loopback half of `next/dist/server/web/next-url.js`'s `REGEX_LOCALHOST_HOSTNAME`,
 * whose `localhost` is the address a host binds, so it passes. `::ffff:127.0.0.1` normalises to
 * `[::ffff:7f00:1]`, which Next does not rename, and passes too.
 *
 * `next dev` and `next start` ignore `HOSTNAME` and bind `-H`, which this cannot see; a loopback
 * `-H` hangs the same way. Refusing the variable there refuses a value with no effect — fail-closed
 * and cheap to undo, so it is refused everywhere (4.3's senior-be review #7).
 */
import { read, type Findings } from './findings'

/** Next's loopback test (16.3.6), on a WHATWG-normalised host. */
const LOOPBACK_IP = /^(?:127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}|\[::1\])$/

/** The host as Next's URL parser reads it, or `null` when it is no host at all. */
export function normaliseHost(host: string): string | null {
  const bracketed = host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
  try {
    return new URL(`http://${bracketed}`).hostname
  } catch {
    return null
  }
}

export function isLoopbackIp(host: string): boolean {
  const normalised = normaliseHost(host)
  return normalised !== null && LOOPBACK_IP.test(normalised)
}

export function checkHostname(
  env: Readonly<Record<string, string | undefined>>,
  findings: Findings,
): void {
  const host = read(env, 'HOSTNAME')
  if (host === undefined || !isLoopbackIp(host)) return
  findings.refuse(
    'HOSTNAME',
    `is "${host}", a loopback IP (${normaliseHost(host) ?? host}): the standalone server.js binds HOSTNAME, and at a loopback IP every proxy rewrite looks external to Next and each storefront page hangs (C13 PROXY_MATCHER). A host binds localhost with --dns-result-order=ipv4first, CI 0.0.0.0 (DEPLOYMENT.md §3). next dev and next start ignore HOSTNAME and take -H, which hangs at a loopback address too`,
  )
}
