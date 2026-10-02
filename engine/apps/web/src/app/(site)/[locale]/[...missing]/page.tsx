/**
 * Any internal route this app has not built yet — a surface the proxy rewrote to (C10) whose page
 * arrives in a later phase — answers the designed 404 inside the storefront's layout, never Next's
 * unbranded one. A route that exists always wins over this catch-all.
 */
import { notFound } from 'next/navigation'

export default function MissingRoute(): never {
  notFound()
}
