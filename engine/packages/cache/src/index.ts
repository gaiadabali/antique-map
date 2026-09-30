/**
 * `@engine/cache` (TASKS.md 4.8; ARCHITECTURE.md §9, §15): the cache tags and their one
 * invalidation. A leaf every lane imports alike — cms's hooks, the loaders, the handlers, a job —
 * so it imports `next` and no engine package but C1's types, and no cycle can form through it.
 */
export {
  availabilityTag,
  EDITORIAL_EXPIRY,
  IMMEDIATE_EXPIRY,
  itemTag,
  MAX_TAG_LENGTH,
  parseCacheTag,
  priceTag,
  requireCacheTag,
  TAG_KINDS,
  tagExpiry,
  tagKind,
  workTag,
  type CacheTag,
  type TagExpiry,
  type TagKind,
} from './tags'
export { AVAILABILITY_STATUS_LIFE, CACHE_TAG_BATCH, cacheTags } from './read'
export { invalidate } from './invalidate'
export {
  COLLECTOR_KEY,
  invalidationBatch,
  type BatchOptions,
  type InvalidationBatch,
  type RequestContext,
} from './collector'
export {
  postTags,
  REVALIDATE_ROUTE,
  REVALIDATE_TIMEOUT_MS,
  RevalidatePostError,
  revalidateBodies,
  revalidateTargetFrom,
  type PostOptions,
  type RevalidateTarget,
} from './post'
