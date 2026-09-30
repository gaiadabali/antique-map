/**
 * `invalidate(tags)`: the one way a write expires cached reads (ARCHITECTURE.md §9, §15;
 * CONVENTIONS.md §12). It never revalidates on the spot: Payload runs `afterChange` before it
 * commits (`collections/operations/create.js` runs the hooks, then `commitTransaction`), so a
 * regeneration started there could read the old row and cache it as fresh. Which of its two
 * modes runs is the caller's explicit choice, never a probe of Next's internals:
 *
 * - **A collector on the context** (`./collector`) — outside a Next request: the tags join the
 *   caller's batch (`./batch`), posted by its `flush()` once the caller's writes have returned.
 * - **None** — inside a Next request (a Payload REST or admin call, a route handler, a Server
 *   Action): `after()` schedules `revalidateTag(tag, <its kind's expiry>)` for once the response
 *   has been sent, after the write has committed; Next runs `after()` callbacks under its own
 *   revalidation flush. Outside a request `after()` throws, so a caller that forgot its collector
 *   gets an error — a failed save — and never a silently stale page. In a Server Action the
 *   action's own response, and its re-render, go out before `after()` runs, so a cached status in
 *   that render can be one render stale; the availability that decides a purchase is read live.
 */
import { revalidateTag } from 'next/cache'
import { after } from 'next/server'

import { collectorOf, type RequestContext } from './collector'
import { requireCacheTag, tagExpiry, type CacheTag } from './tags'

/**
 * Expires `tags` once the write has committed: through the collector `context` carries (a hook
 * passes its `context`, Payload's `req.context`), or with `after()` when it carries none. Every
 * tag must be one `@engine/cache` makes, and expires at its kind's profile.
 */
export function invalidate(
  tags: readonly CacheTag[],
  context?: Readonly<RequestContext> | null,
): void {
  const checked = [...new Set(tags.map(requireCacheTag))]
  const collector = collectorOf(context)
  if (collector) {
    collector.add(checked)
    return
  }
  after(() => {
    for (const tag of checked) revalidateTag(tag, tagExpiry(tag))
  })
}
