/**
 * Any internal route of the shop not built yet — a surface the proxy rewrote to whose page arrives in a
 * later phase — answers the designed 404 inside the shop's layout, never Next's unbranded one. A route
 * that exists always wins over this catch-all.
 */
import { notFound } from 'next/navigation'

export default function ShopMissingRoute(): never {
  notFound()
}
