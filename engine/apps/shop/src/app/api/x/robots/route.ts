/**
 * `/robots.txt` on the shop's hosts (`ROOT_REWRITES`): `@engine/site/seo/routes` on the shop's own
 * allow-list. `Disallow: /` unless `SEO_ALLOW_INDEXING=1`, as today's app answers (TASKS.md 23.5).
 */
import { appSeoSite, robotsRoute } from '@engine/site/seo/routes'

export const GET = robotsRoute(appSeoSite('shop'))
