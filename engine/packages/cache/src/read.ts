/**
 * The read side (ARCHITECTURE.md §9, CONVENTIONS.md §12): how a `'use cache'` scope tags itself,
 * and the lifetime a scope that shows an availability status declares.
 */
import { cacheLife, cacheTag } from 'next/cache'

import { requireCacheTag, type CacheTag } from './tags'

/**
 * The backstop every cached scope that shows an availability status declares as **its own**
 * `cacheLife` (`cacheLife(AVAILABILITY_STATUS_LIFE)`), beside its `availability:<id>` tags: an
 * explicit outer `cacheLife` wins over an inner one, so a status read nested in a `'max'` listing
 * would otherwise keep the listing's lifetime. A missed invalidation, or a hold or checkout lock
 * lapsing at its `expiresAt` with no write to announce it, then heals within a minute. No
 * purchase control acts on a cached status: the purchase panel reads availability live.
 */
export const AVAILABILITY_STATUS_LIFE = Object.freeze({
  stale: 30,
  revalidate: 30,
  expire: 60,
}) satisfies Parameters<typeof cacheLife>[0]

/** Next keeps at most 128 tags of one `cacheTag()` call and drops the rest with a warning. */
export const CACHE_TAG_BATCH = 128

/**
 * Tags the enclosing `'use cache'` scope with every tag in `tags` — a long page's many cards
 * included — in `cacheTag()` calls of at most `CACHE_TAG_BATCH` tags each, so none is dropped.
 * Called where `cacheTag()` may be: inside the cached function itself.
 */
export function cacheTags(tags: readonly CacheTag[]): void {
  const unique = [...new Set(tags.map(requireCacheTag))]
  for (let at = 0; at < unique.length; at += CACHE_TAG_BATCH) {
    cacheTag(...unique.slice(at, at + CACHE_TAG_BATCH))
  }
}
