/**
 * Any internal route of the gallery not built yet — a surface the proxy rewrote to whose page arrives in a
 * later phase — answers the designed 404 inside the gallery's layout, never Next's unbranded one. A route
 * that exists always wins over this catch-all.
 */
import { notFound } from 'next/navigation'

export default function GalleryMissingRoute(): never {
  notFound()
}
