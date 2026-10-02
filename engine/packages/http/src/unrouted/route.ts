/**
 * `@engine/http/unrouted` — what answers an `/api/x/…` path no engine route serves, mounted at the
 * app's `src/app/api/x/[...rest]` (`UNROUTED_HANDLER`, `../manifest`). Every engine route is a more
 * specific mount and wins over it; without it, such a path would fall through to Payload's REST
 * catch-all (`app/(payload)/api/[...slug]`) on any host — off the admin host, and for a host on no
 * list too, since the proxy lets `/api/x/` through — and Payload would answer it: a JSON 404, or an
 * `OPTIONS` with its CORS headers (2.2's second review). So Payload never sees `/api/x/`: every
 * method is a plain, uncached 404 that reads no body, no cookie and nothing else.
 */
import { atRequestTime, notFound } from '../shared/respond'

async function answer(request: Request): Promise<Response> {
  atRequestTime(request) // never prerendered, no 404 baked into the build
  return notFound()
}

export const GET = answer
export const HEAD = answer
export const POST = answer
export const PUT = answer
export const PATCH = answer
export const DELETE = answer
export const OPTIONS = answer
