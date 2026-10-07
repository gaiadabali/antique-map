/**
 * `/sitemap.xml` (and, past `MAX_URLS_PER_SITEMAP`, `/sitemap-:name.xml`) — rewritten here from the
 * root by the proxy. The origin comes from the host allow-list, never from a request header. The
 * path list is each site's published catalogue (9.3fix's `sitemap-sources.ts`), cached by tag.
 */
import type { SiteKey } from '@engine/config/sites'

import { NOT_FOUND, seoSiteFor } from '../../../../../server/seo/request-site'
import {
  gallerySitemapEntries,
  shopSitemapEntries,
} from '../../../../../server/seo/sitemap-sources'
import {
  buildSitemap,
  buildSitemapIndex,
  chunkEntries,
  MAX_URLS_PER_SITEMAP,
  type SitemapEntry,
} from '../../../../../server/seo/sitemap'

async function entriesFor(site: SiteKey): Promise<readonly SitemapEntry[]> {
  return site === 'gallery' ? gallerySitemapEntries() : shopSitemapEntries()
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function GET(
  request: Request,
  { params }: RouteContext<'/api/x/sitemap/[[...path]]'>,
): Promise<Response> {
  const found = seoSiteFor(request)
  if (found === null) return NOT_FOUND()
  const { path } = await params
  const requested = path?.[0]

  const entries = await entriesFor(found.site)
  if (entries.length * 2 <= MAX_URLS_PER_SITEMAP) {
    if (requested !== undefined) return NOT_FOUND()
    return xmlResponse(buildSitemap(entries, found.origin))
  }

  const chunks = chunkEntries(entries)
  const names = chunks.map((_, index) => `sitemap-${index + 1}.xml`)
  if (requested === undefined) {
    return xmlResponse(buildSitemapIndex(names, found.origin))
  }
  const match = /^sitemap-(\d+)\.xml$/.exec(requested)
  const chunkIndex = match ? Number(match[1]) - 1 : -1
  const chunk = chunks[chunkIndex]
  if (chunk === undefined) return NOT_FOUND()
  return xmlResponse(buildSitemap(chunk, found.origin))
}
