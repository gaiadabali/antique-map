/**
 * `@engine/http/legacy/unbuilt/robots` — the placeholder for `/api/x/robots` (`/robots.txt`, C13
 * `ROOT_REWRITES`) until SEO builds the per-environment robots (TASKS.md 39.x). It fails closed:
 * `Disallow: /` for every crawler, because a 404 reads as "allow everything" and 5.1 puts the
 * staging hosts, serving fixture shells under the brands' names, on the public internet
 * (senior-be #2). SEO's handler replaces this, and the mount is repointed at `handlerOf(path)`.
 */
import { atRequestTime, plain } from '../../respond'

export const DISALLOW_ALL = 'User-agent: *\nDisallow: /\n'

export async function GET(request: Request): Promise<Response> {
  atRequestTime(request) // never baked into the build: SEO's answer will depend on the host
  return plain(200, DISALLOW_ALL)
}
