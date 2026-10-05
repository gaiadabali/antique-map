/**
 * `/api/x/legacy/[...path]` — `@engine/http/legacy` (C13; ARCHITECTURE.md §11, MIGRATION.md §6,
 * DATA.md §6): where the proxy rewrites an old site's URL — a legacy prefix or an exact legacy
 * path. The answer is read from the site's `redirects` rows: a 301 or 302 to the new address (an
 * absolute URL on the site's canonical origin when the row's `to` is a path), a 410 for a page that
 * is gone, and a plain uncached 404 for everything else, a map that did not load included. One hop
 * only: a row's `to` is never looked up again.
 *
 * The site is the proxy's `x-site` (it overwrites a client's); the public path is `x-public-path`
 * and the query is the rewrite's own — the proxy appends the visitor's query to the internal URL
 * (`proxy/decide.ts`), so `?s=sold` reaches the row that keeps it and `?page=2` is ignored. No site
 * header is a 404, never a guess. A 301 and a 410 may be cached by a browser for an hour; a 302 and a
 * 404 never are. `HEAD` answers as `GET` does, with no body.
 *
 * The map is read by `./payload-redirects`, loaded with `import()` on the first request — so the
 * route is a factory taking that loader, and a test hands it a fake and never loads Payload.
 */
import { isSiteKey, siteOrigin, type SiteKey } from '@engine/config/sites'

import { PROXY_REQUEST_HEADERS } from '../manifest'
import { atRequestTime, notFound, plain } from '../shared/respond'
import { redirectKey } from './key'
import { redirectMapCache, type RedirectMapSource } from './map-cache'

/** Loads the Payload-backed port: `./payload-redirects` in the process, a fake in a test. */
export type RedirectSourceLoader = () => Promise<{ loadRedirectMap: RedirectMapSource }>

const loadSource: RedirectSourceLoader = () => import('./payload-redirects')

const CACHEABLE = { 'Cache-Control': 'public, max-age=3600' }
const ABSOLUTE = /^https?:\/\//i

/** Where a row's `to` points: an absolute URL stays; a path joins the site's canonical origin. */
function location(site: SiteKey, to: string): string {
  if (ABSOLUTE.test(to)) return to
  const path = to.startsWith('/') ? to : `/${to}`
  return `${siteOrigin(site) ?? ''}${path}`
}

export function legacyRoute(
  load: RedirectSourceLoader = loadSource,
  now: () => number = Date.now,
): (request: Request) => Promise<Response> {
  const mapOf = redirectMapCache(async () => (await load()).loadRedirectMap, now)

  async function respond(request: Request): Promise<Response> {
    const site = request.headers.get(PROXY_REQUEST_HEADERS.site)
    const path = request.headers.get(PROXY_REQUEST_HEADERS.publicPath)
    if (!isSiteKey(site) || path === null || !path.startsWith('/')) return notFound()

    const map = await mapOf(site)
    const hit = map?.get(redirectKey(site, path, new URL(request.url).search))
    if (hit === undefined) return notFound()
    if (hit.code === 410) return plain(410, 'Gone', CACHEABLE)
    return new Response(null, {
      status: hit.code,
      // A 302 is temporary: the browser asks again next time.
      headers: {
        Location: location(site, hit.to),
        ...(hit.code === 301 ? CACHEABLE : { 'Cache-Control': 'no-store' }),
      },
    })
  }

  return async function handle(request: Request): Promise<Response> {
    atRequestTime(request) // the answer is per URL, at request time
    const answer = await respond(request)
    return request.method === 'HEAD'
      ? new Response(null, { status: answer.status, headers: answer.headers })
      : answer
  }
}

export const GET = legacyRoute()
export const HEAD = GET
