/**
 * @contract C13 — the HTTP handler manifest: what the proxy sets and answers · owner: ARC · entry: `@engine/http/manifest`
 *
 * The proxy (PLT's `@engine/http/proxy`, ARCHITECTURE.md §11) rewrites a public URL to its app
 * route and never redirects or touches the database. This part is everything else it does: the
 * request headers a page reads (`PROXY_REQUEST_HEADERS`), the `User-Agent` it supplies when a
 * request has none (`PROXY_USER_AGENT`), the status of its own not-found
 * (`PROXY_NOT_FOUND_STATUS`) — and, on the answer, C10's `sensitive` headers and the per-request
 * `Content-Security-Policy`, which one builder makes (TASKS.md 41.1.a). And the matcher every app
 * declares (`PROXY_MATCHER`). v1.3 (TASKS.md 4.3.b) adds `publicSearch`, `PROXY_USER_AGENT` and
 * `PROXY_NOT_FOUND_STATUS`, each measured on Next 16.3.6.
 */

/**
 * The request headers the proxy sets on every request it passes on, overwriting whatever a
 * client sent. Only a page reads them: a handler under a path the matcher leaves out (`/api/…`,
 * `/brand-assets/…`) never does, because a client reaches it without the proxy and any such header
 * there is the client's own. Error reporting scrubs `x-public-search` and, on a C10 `sensitive`
 * page — whose path is a capability (a pay link's or a quote's token) — `x-public-path` beyond the
 * surface's own segment, exactly as it scrubs that page's URL (ARCHITECTURE.md §13):
 * - `publicPath`: the public path as the browser spelt it (`URL.pathname`). The item route's
 *   one-address rule compares it with `href()`'s spelling byte for byte (MIGRATION.md §6), since
 *   Next hands the route's own param in two spellings; and a page that gets no params
 *   (`not-found.tsx`, `error.tsx`) knows what was asked for, so the not-found loader tells a
 *   removed item (Gone) from a legacy slug to search for (C2 `Loaders.notFound`).
 * - `publicSearch`: the public query as the browser sent it (`URL.search`: `''` or `?…`), set on
 *   the item route's rewrite alone and `''` on every other request, where a client's copy is still
 *   dropped (4.3's senior-be review #6: set everywhere, it would copy any query — a capability's
 *   included — into a header every page could read). Next replaces a rewritten request's query
 *   with the destination's, and C10's internal URL carries a page's canonical state alone, so this
 *   is the one place an item request's own query survives the rewrite (a legacy URL's rides in the
 *   legacy handler's own URL). The item page never reads its state from it — that is its
 *   `searchParams`, C10's canonical query — and it has one use: the item's permanent redirect
 *   carries it on, so a stale slug's 308 keeps an old link's `utm_*` or an ad's click id (C2
 *   `Loaders.item`'s `asked`, TASKS.md 33.3). It never holds Next's own `_rsc`: Next strips its
 *   internal search params before the proxy runs (`stripInternalSearchParams`), which holds only
 *   while `skipProxyUrlNormalize` stays off, as it does. Like any query string it is never logged.
 * - `locale`: the locale the proxy routed to.
 * - `contentSecurityPolicy`: the answer's own `Content-Security-Policy`, copied onto the request,
 *   because Next takes the nonce for its scripts from the request's CSP header. The CSP uses a
 *   fresh nonce per request — hashes cannot hold, since Next's inline scripts carry each request's
 *   RSC payload (the 4.1.e spike §7, ARCHITECTURE.md §13) — and the proxy drops any CSP header a
 *   client sent, report-only included, so no client's nonce reaches a page.
 */
export const PROXY_REQUEST_HEADERS = {
  publicPath: 'x-public-path',
  publicSearch: 'x-public-search',
  locale: 'x-locale',
  contentSecurityPolicy: 'content-security-policy',
} as const

/**
 * The `User-Agent` the proxy sets on a request that has none, or an empty one — never over a
 * client's own. Next renders a page in full per request only for a user agent `htmlLimitedBots`
 * matches (`/.*\/` in both apps, ARCHITECTURE.md §9), and it counts a request without one as no
 * bot at all (`req.headers['user-agent'] || ''`): such a request is served the prerendered shell
 * under the build's 200, so a 404, a permanent redirect and `PROXY_NOT_FOUND_STATUS` are all lost,
 * and a stale slug's redirect exists only in the RSC payload (the 4.1.e spike §2; measured again:
 * a `notFound()` page answered 200 with no User-Agent and 404 once the proxy set this one).
 * Browsers and crawlers send one; a scanner, a probe or a hand-written client may not. The value
 * is an RFC 9110 product with a comment, names who set it and matches no real client, so a log,
 * a rate limit or analytics can tell it apart.
 */
export const PROXY_USER_AGENT = 'engine-proxy (no user-agent)'

/**
 * The status of the proxy's own not-found. Every public path that names no page — an internal
 * path asked for directly, a default-locale prefix, a segment in another spelling, a page whose
 * module is off, the not-found route itself — is rewritten to its locale's not-found route
 * (`/<locale>/not-found`) with this status on the rewrite, which Next keeps through a normal
 * render (measured on 16.3.6, TASKS.md 4.3.d). So that route's page renders the designed NotFound
 * surface in its own body — the brand's shell, `lang`, a search form, all without JavaScript — and
 * never calls `notFound()`, whose answer is Next's recovery document: an empty `<body>` without
 * `lang`, the designed page built in the browser from the RSC payload (DESIGN-SYSTEM.md §2). A miss
 * only the database can decide (an unknown or unpublished item, a removed one's Gone) still calls
 * `notFound()`. Every other rewrite keeps the status Next's render gives it.
 */
export const PROXY_NOT_FOUND_STATUS = 404

/**
 * The literal each app's `src/proxy.ts` declares — Next reads `config.matcher` statically,
 * so it is copied, never imported, and route parity compares the copy with this:
 *
 *   export { proxy } from '@engine/http/proxy'
 *   export const config = { matcher: ['/((?!api/|_next/|brand-assets/).*)'] }
 *
 * Everything but `/api/…` (Payload and the engine routes), Next's `/_next/…` and brand
 * assets reaches the proxy: pages, `/admin` (English by default), legacy prefixes (brand
 * config, so knowable only at runtime) and `ROOT_REWRITES`. The proxy rewrites and sets only what
 * this part names — `PROXY_REQUEST_HEADERS` and, when a request has none, `PROXY_USER_AGENT` on the
 * request; its not-found's `PROXY_NOT_FOUND_STATUS`; on the answer, C10's `sensitive` headers and
 * the `Content-Security-Policy`, built per request from the brand's config (its analytics, payment
 * and sister origins, ARCHITECTURE.md §13) by the one CSP builder, 41.1.a's, since one build
 * serves several brands and a CSP in `next.config` would bake one in. It never touches the
 * database.
 *
 * It writes a rewrite as an absolute URL on the request's own origin, the only form Next's adapter
 * takes. So a server never binds a loopback IP literal (`HOSTNAME=127.0.0.1`, or `-H 127.0.0.1`
 * for `next start`): Next renames `127.x` and `[::1]` to `localhost` when it re-reads the rewrite
 * but builds its own URL from the raw host, so every rewrite looks external and is proxied to
 * itself — and the proxy's own not-found, rewritten again, loops — so every page hangs, whatever
 * origin the proxy wrote (4.1's qa F1; measured again in 4.3). A host binds `localhost` pinned to
 * IPv4 (`--dns-result-order=ipv4first`), which listens on 127.0.0.1 alone and keeps both URLs'
 * host `localhost` (DEPLOYMENT.md §3); the boot check refuses a loopback literal (TASKS.md 5.3.d).
 */
export const PROXY_MATCHER = ['/((?!api/|_next/|brand-assets/).*)'] as const
