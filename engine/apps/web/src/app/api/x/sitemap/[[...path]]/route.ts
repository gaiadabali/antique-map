/**
 * `/sitemap.xml` (and `/sitemap-:name.xml`) — rewritten here from the root by `ROOT_REWRITES`.
 *
 * The sitemap origin comes from the host allow-list, never from a request header. The actual path
 * list is a stub (`loadSitemapPaths`) for phases 5/6 to replace.
 */
import { SITES, type SiteKey } from '@engine/config/sites'

import { NOT_FOUND, seoSiteFor } from '../../../../../server/seo/request-site'
import { buildSitemap, type SitemapEntry } from '../../../../../server/seo/sitemap'

function loadSitemapPaths(site: SiteKey): readonly SitemapEntry[] {
  const routes = SITES[site].routes.en
  const home: SitemapEntry = { path: '/' }
  const browse: SitemapEntry = { path: `/${routes.browse}` }
  const contact: SitemapEntry = { path: '/contact' }
  const aboutPath =
    'about' in routes && typeof routes.about === 'string' ? `/${routes.about}` : undefined
  const paths: SitemapEntry[] = [home, browse, contact]
  if (aboutPath) paths.push({ path: aboutPath })
  return paths
}

export async function GET(request: Request): Promise<Response> {
  const found = seoSiteFor(request)
  if (found === null) return NOT_FOUND()
  const body = buildSitemap(loadSitemapPaths(found.site), found.origin)
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
