/**
 * The read side (TASKS.md 4.8.c; ARCHITECTURE.md §9): `cacheTags()` tags a scope with every tag
 * however many — Next keeps at most 128 of one `cacheTag()` call — and `AVAILABILITY_STATUS_LIFE`
 * is the one-minute backstop, a profile the installed Next accepts. Run against Next's own
 * `cacheTag()`, inside a `'use cache'` work unit as Next sets one up.
 */
import 'next/dist/server/node-environment-baseline.js'

import { createRequire } from 'node:module'

import { cacheTag } from 'next/cache'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AVAILABILITY_STATUS_LIFE,
  productStockTag,
  CACHE_TAG_BATCH,
  cacheTags,
  productTag,
  type CacheTag,
} from '../src/index'

const require = createRequire(import.meta.url)
const {
  workUnitAsyncStorage,
} = require('next/dist/server/app-render/work-unit-async-storage.external.js')
const {
  validateAndNormalizeCacheLifeProfile,
} = require('next/dist/server/use-cache/cache-life-profile.js')

/** The tags a `'use cache'` scope ends with, after `tagging` ran inside it. */
function tagsOfScope(tagging: () => void): string[] {
  const store: { type: 'cache'; tags: string[] | null } = { type: 'cache', tags: null }
  workUnitAsyncStorage.run(store, tagging)
  return store.tags ?? []
}

const cards = (count: number): CacheTag[] =>
  Array.from({ length: count }, (_, i) => productStockTag(10_000 + i))

describe('cacheTags()', () => {
  const useCache = process.env.__NEXT_USE_CACHE
  beforeEach(() => {
    // What `cacheComponents: true` sets in a build.
    process.env.__NEXT_USE_CACHE = 'true'
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterEach(() => {
    if (useCache === undefined) delete process.env.__NEXT_USE_CACHE
    else process.env.__NEXT_USE_CACHE = useCache
    vi.restoreAllMocks()
  })

  it('one cacheTag() call of 300 tags loses the rest — why batching exists', () => {
    const kept = tagsOfScope(() => cacheTag(...cards(300)))
    expect(kept.length).toBeLessThan(300)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/exceeded max tag count/),
      expect.anything(),
    )
  })

  it(`keeps every tag, in calls of at most ${CACHE_TAG_BATCH}`, () => {
    const tags = cards(300)
    expect(tagsOfScope(() => cacheTags(tags))).toEqual(tags)
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('calls cacheTag() once per 128 unique tags', async () => {
    const calls: number[] = []
    const spy = vi.fn((...tags: string[]) => calls.push(tags.length))
    vi.resetModules()
    vi.doMock('next/cache', async (original) => ({ ...(await original()), cacheTag: spy }))
    const fresh = await import('../src/index')
    fresh.cacheTags([...cards(257), ...cards(10)]) // duplicates count once
    vi.doUnmock('next/cache')
    expect(calls).toEqual([128, 128, 1])
    fresh.cacheTags([])
    expect(calls).toEqual([128, 128, 1])
  })

  it('refuses a tag no builder makes', () => {
    expect(() => tagsOfScope(() => cacheTags([productTag(1), 'product:1 ' as CacheTag]))).toThrow(
      /not a cache tag/,
    )
  })
})

describe('AVAILABILITY_STATUS_LIFE', () => {
  it('is the one-minute backstop, frozen', () => {
    expect(AVAILABILITY_STATUS_LIFE).toEqual({ stale: 30, revalidate: 30, expire: 60 })
    expect(Object.isFrozen(AVAILABILITY_STATUS_LIFE)).toBe(true)
  })

  it('is a cacheLife() profile the installed Next accepts as it is', () => {
    expect(
      validateAndNormalizeCacheLifeProfile(AVAILABILITY_STATUS_LIFE, { kind: 'inline' }),
    ).toEqual(AVAILABILITY_STATUS_LIFE)
  })
})
