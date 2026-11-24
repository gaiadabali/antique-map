/**
 * `/sitemap.xml` (and, past `MAX_URLS_PER_SITEMAP`, `/sitemap-:name.xml`) — rewritten here from the
 * root by the proxy: `@engine/site/seo/routes`, the site by today's two-site allow-list. The path
 * list is each site's published catalogue (`server/seo/sitemap-sources`), cached by tag.
 */
import { sitemapRoute, twoSiteSeoSite } from '@engine/site/seo/routes'

import {
  gallerySitemapEntries,
  shopSitemapEntries,
} from '../../../../../server/seo/sitemap-sources'

export const GET = sitemapRoute(twoSiteSeoSite, (site) =>
  site === 'gallery' ? gallerySitemapEntries() : shopSitemapEntries(),
)
