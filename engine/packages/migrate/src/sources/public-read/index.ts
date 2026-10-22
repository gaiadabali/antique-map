/**
 * The public-read source (TASKS.md 7.1.c, D41): a polite, read-only reader of
 * an old store's public pages, and the raw product records built from its cache.
 */
export { buildRecords, type BuildCounts, type PublicProductRecord } from './build.ts'
export { ResponseCache, type CachedResponse } from './cache.ts'
export { MIN_INTERVAL_FLOOR_MS, parseReaderConfig, type ReaderConfig } from './config.ts'
export { crawl, type CrawlResult, type InventoryEntry } from './crawl.ts'
export { writeInventory, type InventorySummary } from './inventory.ts'
export { PoliteFetcher, ReadAborted, type FetchOutcome } from './polite-fetch.ts'
export { isAllowed, parseRobots, type RobotsPolicy } from './robots.ts'
