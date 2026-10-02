/**
 * `/robots.txt` — rewritten here from the root by `ROOT_REWRITES`. Built from the site's canonical
 * origin (`SITES`), never the request's `Host`. Indexing is off unless `SEO_ALLOW_INDEXING=1`, so
 * staging fails closed (`Disallow: /`).
 */
import { NOT_FOUND, seoSiteFor } from '../../../../server/seo/request-site'
import { buildRobots } from '../../../../server/seo/robots'

export async function GET(request: Request): Promise<Response> {
  const found = seoSiteFor(request)
  if (found === null) return NOT_FOUND()
  const body = buildRobots(found.origin, { allowIndexing: process.env.SEO_ALLOW_INDEXING === '1' })
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
