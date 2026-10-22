/**
 * `/shop/<locale>/not-found`: where the proxy rewrites every path of the shop's hosts that names
 * no page, with `PROXY_NOT_FOUND_STATUS` (404) on the rewrite — the status the render keeps (Next's
 * router never lowers a status the proxy already set below 400). So this page renders the designed
 * 404 inside the shop's layout and must NOT call `notFound()`: a `notFound()` thrown here aborts
 * the render into Next's recovery document (`<html id="__next_error__">`), which has no shell, no
 * `lang` and a body built only in the browser — the one thing this route exists to prevent (the
 * Cache Components spike §8).
 */
import { ShopNotFoundView } from './not-found-view'

export default function ShopNotFoundRoute() {
  return <ShopNotFoundView />
}
