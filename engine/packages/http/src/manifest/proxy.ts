/**
 * What the proxy sets and answers (`@engine/http/proxy`, ARCHITECTURE.md §2) — entry
 * `@engine/http/manifest`. The proxy picks the site from `Host`, rewrites a public URL into that
 * site's tree and never touches the database. This part is everything else it does: the request
 * headers a page reads (`PROXY_REQUEST_HEADERS`), the `User-Agent` it supplies when a request has
 * none (`PROXY_USER_AGENT`), the status of its own not-found (`PROXY_NOT_FOUND_STATUS`), the
 * machine routes it lets through on any host (`HOST_FREE_PATHS`) — and the matcher the app
 * declares (`PROXY_MATCHER`).
 */

/**
 * The request headers the proxy sets on every request it passes on, overwriting whatever a client
 * sent. Only the app reads them, and only on a request the proxy passed:
 * - `site`: the site the request's `Host` picked (`gallery` | `shop`). A page knows its site from
 *   its tree already; an engine route resolves it with `siteFromHost()` itself, never trusting
 *   this header, which a request the proxy did not see would carry as the client sent it.
 * - `publicPath`: the public path as the browser spelt it (`URL.pathname`). The item route's
 *   one-address rule compares it with `href()`'s spelling byte for byte (DATA.md §6), since Next
 *   hands the route's own param in two spellings; and a page that gets no params (`not-found.tsx`)
 *   knows what was asked for.
 * - `publicSearch`: the public query as the browser sent it (`''` or `?…`), set on the item route's
 *   rewrite alone and `''` on every other request, where a client's copy is still dropped: set
 *   everywhere, it would copy any query — a tracking token's included — into a header every page
 *   could read. Next replaces a rewritten request's query with the destination's, so this is the one
 *   place an item request's own query survives: the item's permanent redirect carries it on. It
 *   never holds Next's own `_rsc`: Next strips its internal search params before the proxy runs,
 *   which holds only while `skipProxyUrlNormalize` stays off. Like any query string it is never
 *   logged.
 * - `locale`: the locale the proxy routed to.
 * - `forwardedHost`: `X-Forwarded-Host`, set to the request's own `Host`. Next compares a Server
 *   Action's `Origin` with `X-Forwarded-Host` before `Host`, and a client may send any value: the
 *   proxy overwrites it, so a spoofed one changes nothing downstream either.
 * - `contentSecurityPolicy`: the answer's own `Content-Security-Policy`, copied onto the request,
 *   because Next takes the nonce for its scripts from the request's CSP header; the proxy drops any
 *   CSP header a client sent, report-only included, so no client's nonce reaches a page.
 */
export const PROXY_REQUEST_HEADERS = {
  site: 'x-site',
  publicPath: 'x-public-path',
  publicSearch: 'x-public-search',
  locale: 'x-locale',
  forwardedHost: 'x-forwarded-host',
  contentSecurityPolicy: 'content-security-policy',
} as const

/**
 * The `User-Agent` the proxy sets on a request that has none, or an empty one — never over a
 * client's own. Next renders a page in full per request only for a user agent `htmlLimitedBots`
 * matches (`/.*\/`, ARCHITECTURE.md §6), and it counts a request without one as no bot at all: such
 * a request is served the prerendered shell under the build's 200, so a 404, a permanent redirect
 * and `PROXY_NOT_FOUND_STATUS` are all lost (the Cache Components spike §2). The value is an RFC
 * 9110 product with a comment, names who set it and matches no real client.
 */
export const PROXY_USER_AGENT = 'engine-proxy (no user-agent)'

/**
 * The status of the proxy's own not-found. Every public path of a site that names no page — an
 * internal path asked for directly, a default-locale prefix, a segment in another spelling, a
 * surface the site does not have, `/admin` off the admin host, the not-found route itself — is
 * rewritten to the site's not-found route (`/<site>/<locale>/not-found`) with this status on the
 * rewrite, which Next keeps through a normal render, so the designed page answers 404 in its own
 * body. A request whose host picks no site gets a plain 404 instead, from the proxy itself.
 */
export const PROXY_NOT_FOUND_STATUS = 404

/**
 * The machine routes the proxy passes on whatever the `Host`: each is called on loopback by the
 * host itself — the deploy's and monitors' health check, the site user's crontab, a job's cache
 * invalidation — at `127.0.0.1:<port>`, a host no allow-list names. None builds a URL or reads a
 * site, `/api/health` answers no secret, and cron and revalidate take a bearer. Every other path on
 * an unknown host is a plain 404. A prefix ends in `/`; any other entry is an exact path.
 */
export const HOST_FREE_PATHS = ['/api/health', '/api/x/cron/', '/api/x/revalidate'] as const

/**
 * The literal the app's `src/proxy.ts` declares — Next reads `config.matcher` statically, so it is
 * copied, never imported, and a test compares the copy with this:
 *
 *   export { proxy } from '@engine/http/proxy'
 *   export const config = { matcher: ['/((?!_next/|__nextjs).*)'] }
 *
 * Everything but Next's own `/_next/…` and its development endpoints reaches the proxy — `/api/…`
 * included, since a host must be checked before Payload's REST answers it (ARCHITECTURE.md §2).
 *
 * It writes a rewrite as an absolute URL on the request's own origin (Next's, never the client's
 * `Host`: Next builds the proxy's request URL from the address it binds), the only form Next's
 * adapter takes. So a server never binds a loopback IP literal (`HOSTNAME=127.0.0.1`): Next renames
 * `127.x` and `[::1]` to `localhost` when it re-reads the rewrite but builds its own URL from the
 * raw host, so every rewrite looks external and every page hangs; the boot check refuses one.
 */
export const PROXY_MATCHER = ['/((?!_next/|__nextjs).*)'] as const
