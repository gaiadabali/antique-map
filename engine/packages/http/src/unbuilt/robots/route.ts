/**
 * `@engine/http/unbuilt/robots` — the placeholder for `/api/x/robots` (`/robots.txt`, C13
 * `ROOT_REWRITES`; `UNBUILT_HANDLER.byPath`) until SEO builds the per-environment robots at
 * `@engine/http/robots`. It fails closed: `Disallow: /` for every crawler, because a crawler reads a
 * 404 as "allow everything" and staging, serving fixture shells under the brands' names, is on the
 * public internet (4.1 senior-be #2). SEO's handler replaces it, and both mounts are repointed at
 * `handlerOf(path)` in the same change.
 */
import { atRequestTime, plain } from '../../shared/respond'

export const DISALLOW_ALL = 'User-agent: *\nDisallow: /\n'

export async function GET(request: Request): Promise<Response> {
  atRequestTime(request) // never baked into the build: SEO's answer will depend on the host
  return plain(200, DISALLOW_ALL)
}
