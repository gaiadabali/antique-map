/**
 * `/<locale>/not-found`: where the proxy rewrites every path that names no page — an internal
 * path asked for directly, a module that is off, a misspelt segment (C10, `@engine/http/proxy`).
 * A page answers 200, so this one calls `notFound()`: the answer is a 404 with the designed page.
 */
import { notFound } from 'next/navigation'

export default function NotFoundRoute(): never {
  notFound()
}
