/**
 * `/sitemap.xml` on the shop's hosts (`ROOT_REWRITES`): `@engine/site/seo/routes` with the shop's
 * published products and collections (`@engine/storefront`'s sources, read from `indies_shop`).
 */
import { shopSitemapEntries } from '@engine/storefront/server/seo/sitemap-sources'
import { appSeoSite, sitemapRoute } from '@engine/site/seo/routes'

export const GET = sitemapRoute(appSeoSite('shop'), () => shopSitemapEntries())
