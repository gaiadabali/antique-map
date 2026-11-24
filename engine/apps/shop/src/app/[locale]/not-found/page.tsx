/**
 * `/<locale>/not-found`: where the proxy rewrites every path of the shop's hosts that names no
 * page, with a 404 on the rewrite — the status the render keeps. So this page renders the designed
 * 404 inside the shop's layout and must NOT call `notFound()`, which would abort the render into
 * Next's recovery document (no shell, no `lang`).
 */
import { ShopNotFoundView } from '@engine/storefront/pages/not-found'

export default function ShopNotFoundRoute() {
  return <ShopNotFoundView />
}
