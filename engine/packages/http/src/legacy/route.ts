/**
 * `/api/x/legacy/[...path]` — `@engine/http/legacy` (C13; ARCHITECTURE.md §11, MIGRATION.md §6):
 * where the proxy rewrites an old site's URL — a legacy prefix or an exact legacy path — to be
 * answered 301, 404 or 410 from the `redirects` collection. That reader is TASKS.md 36.4's; until
 * it lands every legacy URL is a plain 404, never a guess and never the designed page's loader.
 */
import { atRequestTime, notFound } from '../shared/respond'

export async function GET(request: Request): Promise<Response> {
  atRequestTime(request) // 36.4's answers are per URL, at request time
  return notFound()
}
