/**
 * `POST /api/x/revalidate` — `@engine/http/revalidate` (C13 `REVALIDATE_REQUEST`, TASKS.md 4.6.f;
 * ARCHITECTURE.md §9): how `@engine/cache`'s `invalidate(tags)` expires tags from outside a Next
 * request — a `payload jobs:run` worker, a seed or an import on the host posts its collector's
 * tags here, and the process that holds the cache expires them.
 *
 * - **Who**: `Authorization: Bearer <REVALIDATE_SECRET>`, compared in constant time as the cron
 *   routes compare theirs (`../shared/bearer`): 503 while it is unset, 401 when it is wrong — both
 *   before a byte of the body is read. No cookie authenticates it, so no same-origin check applies,
 *   and the proxy never sees it (`/api/` is outside its matcher).
 * - **What**: `./body` — JSON `{ "tags": [...] }`, one to `maxTags` tags within `maxBodyBytes`, each
 *   one `@engine/cache` makes; anything else a 400, and then nothing is expired.
 * - **How**: `invalidate(tags)` in its in-request mode — no collector — so each tag expires at its
 *   kind's profile (`tagExpiry`: editorial `'max'`, stale-while-revalidate; availability and price
 *   `{ expire: 0 }`, gone at once), never one the body asks for, through `after()`, once this
 *   response has been sent. So the 204 means **scheduled**, not yet expired (the independent 4.8
 *   review, N5): exact while the `'use cache'` store is the process's own memory, which a crash
 *   loses together with the callbacks; a persistent cache handler would need the route to expire
 *   before it answers.
 *
 * A caller retries a failure (an outbox, `RevalidatePostError.accepted`); a 400 is a caller's bug
 * — a tag kind this process does not know yet, mid-deploy — and is logged here by its reason alone.
 */
import { invalidate, type CacheTag } from '@engine/cache'
import { describeError } from '@engine/config/boot-check'

import { refuseBearer } from '../shared/bearer'
import { plain } from '../shared/respond'
import { judgeBody, readBoundedText } from './body'

type Env = Readonly<Record<string, string | undefined>>

/** Expires checked tags: `invalidate` in the process, a recorder in a test. */
export type Expire = (tags: readonly CacheTag[]) => void

const inRequest: Expire = (tags) => invalidate(tags)

export function revalidateRoute(
  expire: Expire = inRequest,
  env: Env = process.env,
): (request: Request) => Promise<Response> {
  return async function POST(request: Request): Promise<Response> {
    const refused = refuseBearer(request, 'REVALIDATE_SECRET', 'revalidation', env)
    if (refused) return refused
    const verdict = judgeBody(await readBoundedText(request))
    if (!verdict.ok) {
      console.warn(`[revalidate] refused a body: ${verdict.reason}`)
      return plain(400, verdict.reason)
    }
    try {
      expire(verdict.tags)
    } catch (error) {
      console.error(`[revalidate] could not schedule the expiry: ${describeError(error)}`)
      return plain(500, 'the tags could not be expired; the cause is in the process log')
    }
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
  }
}

export const POST = revalidateRoute()
