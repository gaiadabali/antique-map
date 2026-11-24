/**
 * `/robots.txt` and `/sitemap.xml` (and its `-n` parts) as route handlers both apps mount (9.3fix;
 * moved from today's app, TASKS.md 23.5): the proxy rewrites the root files to `/api/x/robots` and
 * `/api/x/sitemap/…`. The site and its canonical origin come from the app's host allow-list, never
 * from a request's `Host` or forwarded headers: today's app picks the site by host (`twoSiteSeoSite`),
 * a one-site app answers its own hosts alone (`appSeoSite`). Anything else is a plain 404.
 *
 * Robots fails closed: indexing is off unless `SEO_ALLOW_INDEXING=1`, so staging and every
 * workstation answer `Disallow: /`.
 */
import { appHostOf, appOrigin, siteFromHost, siteOrigin, type SiteKey } from '@engine/config/sites'

import { buildRobots } from './robots'
import {
  buildSitemap,
  buildSitemapIndex,
  chunkEntries,
  MAX_URLS_PER_SITEMAP,
  type SitemapEntry,
} from './sitemap'

export type SeoSite = { readonly site: SiteKey; readonly origin: string }
export type SeoSiteOf = (request: Request) => SeoSite | null

/** Today's app: the host's site, by the two-site allow-list. */
export const twoSiteSeoSite: SeoSiteOf = (request) => {
  const match = siteFromHost(request.headers.get('host'))
  if (match === null) return null
  const origin = siteOrigin(match.site)
  return origin === null ? null : { site: match.site, origin }
}

/** A one-site app: its own page hosts (not an admin-only host), its canonical origin. */
export function appSeoSite(site: SiteKey): SeoSiteOf {
  return (request) => {
    const match = appHostOf(site, request.headers.get('host'))
    if (match === null || match.adminOnly) return null
    const origin = appOrigin(site)
    return origin === null ? null : { site, origin }
  }
}

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  })

function answer(body: string, type: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': `${type}; charset=utf-8`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function robotsRoute(siteOf: SeoSiteOf) {
  return async function GET(request: Request): Promise<Response> {
    const found = siteOf(request)
    if (found === null) return notFound()
    const allowIndexing = process.env.SEO_ALLOW_INDEXING === '1'
    return answer(buildRobots(found.origin, { allowIndexing }), 'text/plain')
  }
}

type SitemapContext = { readonly params: Promise<{ path?: string[] }> }

export function sitemapRoute(
  siteOf: SeoSiteOf,
  entriesOf: (site: SiteKey) => Promise<readonly SitemapEntry[]>,
) {
  return async function GET(request: Request, { params }: SitemapContext): Promise<Response> {
    const found = siteOf(request)
    if (found === null) return notFound()
    const requested = (await params).path?.[0]
    const entries = await entriesOf(found.site)
    if (entries.length * 2 <= MAX_URLS_PER_SITEMAP) {
      if (requested !== undefined) return notFound()
      return answer(buildSitemap(entries, found.origin), 'application/xml')
    }
    const chunks = chunkEntries(entries)
    if (requested === undefined) {
      const names = chunks.map((_, index) => `sitemap-${index + 1}.xml`)
      return answer(buildSitemapIndex(names, found.origin), 'application/xml')
    }
    const match = /^sitemap-(\d+)\.xml$/.exec(requested)
    const chunk = chunks[match ? Number(match[1]) - 1 : -1]
    return chunk === undefined
      ? notFound()
      : answer(buildSitemap(chunk, found.origin), 'application/xml')
  }
}
