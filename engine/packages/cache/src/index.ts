/**
 * `@engine/cache` (TASKS.md 4.8; ARCHITECTURE.md §9, §15): the cache tags and their one
 * invalidation. A leaf every lane imports alike — cms's hooks, the loaders, the handlers, a job —
 * so it imports `next` and no engine package, and no cycle can form through it.
 */
export {
  catalogueTag,
  EDITORIAL_EXPIRY,
  IMMEDIATE_EXPIRY,
  MAX_TAG_LENGTH,
  parseCacheTag,
  productPriceTag,
  productStockTag,
  productTag,
  redirectsTag,
  requireCacheTag,
  settingsTag,
  TAG_KINDS,
  TAG_SITES,
  tagExpiry,
  tagKind,
  workTag,
  type CacheTag,
  type TagExpiry,
  type TagKind,
  type TagSite,
} from './tags'
export { AVAILABILITY_STATUS_LIFE, CACHE_TAG_BATCH, cacheTags } from './read'
export { invalidate, type InvalidateOptions } from './invalidate'
export { COLLECTOR_KEY, type RequestContext, type TaggedEntry } from './collector'
export {
  invalidationBatch,
  type BatchOptions,
  type CollectingRequest,
  type InvalidationBatch,
  type OperationOptions,
} from './batch'
export {
  postTags,
  REVALIDATE_ROUTE,
  REVALIDATE_TIMEOUT_MS,
  RevalidatePostError,
  revalidateBodies,
  type PostOptions,
  type RevalidateTarget,
} from './post'
export { isLoopbackHost, revalidateTargetFrom } from './target'
