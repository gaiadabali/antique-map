/**
 * The site and canonical origin for a robots or sitemap request. The site comes from the host
 * allow-list (`siteFromHost`), the origin from `SITES` (`siteOrigin`) — never from the request's
 * own `Host` or forwarded headers. An unlisted host, or a site with no configured origin, is `null`
 * and the caller answers 404.
 */
import { siteFromHost, siteOrigin, type SiteKey } from '@engine/config/sites'

export function seoSiteFor(request: Request): { site: SiteKey; origin: string } | null {
  const match = siteFromHost(request.headers.get('host'))
  if (match === null) return null
  const origin = siteOrigin(match.site)
  return origin === null ? null : { site: match.site, origin }
}

export const NOT_FOUND = () => new Response('Not found', { status: 404 })
