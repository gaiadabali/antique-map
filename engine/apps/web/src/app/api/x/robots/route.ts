/**
 * `/robots.txt` — rewritten here from the root by `ROOT_REWRITES`: `@engine/site/seo/routes`, the
 * site by today's two-site allow-list. Built from the site's canonical origin, never the request's
 * `Host`; indexing is off unless `SEO_ALLOW_INDEXING=1`, so staging fails closed (`Disallow: /`).
 */
import { robotsRoute, twoSiteSeoSite } from '@engine/site/seo/routes'

export const GET = robotsRoute(twoSiteSeoSite)
