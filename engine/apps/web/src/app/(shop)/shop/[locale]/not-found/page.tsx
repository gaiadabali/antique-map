/**
 * `/shop/<locale>/not-found`: where the proxy rewrites every path of the shop's hosts that names no
 * page, with a 404 on the rewrite. A page answers 200, so this one calls `notFound()`: the answer
 * is a 404 with the designed page.
 */
import { notFound } from 'next/navigation'

export default function ShopNotFoundRoute(): never {
  notFound()
}
