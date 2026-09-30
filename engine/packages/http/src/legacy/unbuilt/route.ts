/**
 * `@engine/http/legacy/unbuilt` — a placeholder mount target, not a C13 route. Every app mounts
 * every C13 route (route parity), but a route whose handler belongs to another lane (DOM's
 * commerce, SEO's sitemaps …) has no module until that lane builds it, and TASKS.md 4.1 may not
 * create files in other lanes' folders. Its mount file re-exports this meanwhile and says which
 * handler replaces it; the answer is the legacy stub's plain 404 — what C13 prescribes for a
 * mounted route with nothing behind it (a handler whose module is off answers 404).
 *
 * Remove this, and repoint each mount at `handlerOf(path)`, as each lane lands its handler.
 */
import { atRequestTime, notFound } from '../respond'

export async function GET(request: Request): Promise<Response> {
  atRequestTime(request) // no mount of this is prerendered, no 404 baked into the build
  return notFound()
}

export async function POST(): Promise<Response> {
  return notFound()
}
