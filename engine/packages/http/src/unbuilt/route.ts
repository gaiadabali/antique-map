/**
 * `@engine/http/unbuilt` — the placeholder a mount names while its route's handler is unbuilt (C13
 * v1.3 `UNBUILT_HANDLER`, TASKS.md 4.3.b, 4.6.d). Every app mounts every C13 route (route parity),
 * but a handler belongs to its route's owning lane (DOM's commerce, SEO's sitemaps …) and has no
 * module until that lane builds it. Meanwhile its mount re-exports this, with a comment naming the
 * handler that replaces it, and answers what C13 prescribes for a mounted route with nothing behind
 * it: a plain, uncached 404 to every method, as a handler whose module is off answers.
 *
 * It is WEB's module, never a C13 route and never another route's handler, so route parity can
 * tell a placeholder from a handler. The `GET` reads its request, so no mount of it is prerendered
 * and no 404 is baked into a build; the `POST` never reads its body, so a write reaches nothing.
 * `unbuiltHandlerOf(path)` names this for every route but robots (`./robots`).
 */
import { atRequestTime, notFound } from '../shared/respond'

export async function GET(request: Request): Promise<Response> {
  atRequestTime(request) // no mount of this is prerendered, no 404 baked into the build
  return notFound()
}

export async function POST(): Promise<Response> {
  return notFound()
}
