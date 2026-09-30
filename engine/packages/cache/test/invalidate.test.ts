/**
 * `invalidate()`'s two explicit modes (TASKS.md 4.8.c, 4.8.d; ARCHITECTURE.md §9), against the
 * installed Next's own `after()` and `revalidateTag()`:
 *
 * - inside a request, nothing is revalidated while the request is open — so a hook that runs
 *   before Payload commits expires nothing yet — and once the response has closed, each tag is
 *   expired at its kind's profile;
 * - outside a request, with no collector, it throws `after()`'s error rather than doing nothing;
 * - with a collector it only collects, wherever it runs.
 *
 * The request is Next's own machinery — its work stores and `AfterContext` — wired as a route
 * handler's are, with a recording incremental cache. That is a test's view of Next's internals;
 * `invalidate()` itself never probes them. The production-build proof is 4.6.f's.
 */
// What Next's server loads first: `AsyncLocalStorage` on the global, which its request stores need.
import 'next/dist/server/node-environment-baseline.js'

import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import {
  availabilityTag,
  invalidate,
  invalidationBatch,
  itemTag,
  priceTag,
  workTag,
  type CacheTag,
} from '../src/index'

const require = createRequire(import.meta.url)
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external.js')
const {
  workUnitAsyncStorage,
} = require('next/dist/server/app-render/work-unit-async-storage.external.js')
const { AfterContext } = require('next/dist/server/after/after-context.js')

/** What Next's incremental cache was asked to expire, and whether the write had committed. */
type Expired = { tags: string[]; durations: unknown; committed: boolean }

/** A route handler's request, as Next's app route module sets it up. */
function request() {
  const onClose: Array<() => void> = []
  const waiting: Array<Promise<unknown>> = []
  const errors: unknown[] = []
  const expired: Expired[] = []
  const state = { committed: false }
  const afterContext = new AfterContext({
    waitUntil: (promise: Promise<unknown>) => waiting.push(promise),
    onClose: (listener: () => void) => onClose.push(listener),
    onTaskError: (error: unknown) => errors.push(error),
  })
  const workStore: Record<string, unknown> = {
    route: '/api/x/probe',
    page: '/api/x/probe/route',
    afterContext,
    // `'max'` as Next's defaults define it.
    cacheLifeProfiles: { max: { stale: 300, revalidate: 2_592_000, expire: 31_536_000 } },
    incrementalCache: {
      revalidateTag: async (tags: string[], durations: unknown) => {
        expired.push({ tags: [...tags], durations, committed: state.committed })
      },
    },
  }
  return {
    state,
    expired,
    errors,
    workStore,
    run<T>(handler: () => T): T {
      return workAsyncStorage.run(workStore, () =>
        workUnitAsyncStorage.run({ type: 'request', phase: 'action' }, handler),
      )
    },
    /** The response has been sent: Next runs the `after()` callbacks and their revalidation. */
    async close() {
      for (const listener of onClose) listener()
      await Promise.all(waiting)
    },
  }
}

const TAGS: CacheTag[] = [
  itemTag(1706),
  availabilityTag(1706),
  priceTag(1706),
  workTag('FX-000123'),
]

describe('inside a request, with no collector', () => {
  it('expires nothing while the request is open, then each tag at its profile', async () => {
    const req = request()
    req.run(() => {
      // An `afterChange` hook: Payload has not committed yet.
      invalidate(TAGS)
      invalidate([itemTag(1706)]) // a second hook naming the same tag
      req.state.committed = true // the operation commits, the handler answers
    })
    expect(req.expired).toEqual([])
    expect(req.workStore.pendingRevalidatedTags ?? []).toEqual([])

    await req.close()
    expect(req.errors).toEqual([])
    expect(req.expired).toEqual([
      { tags: ['item:1706', 'work:FX-000123'], durations: { expire: 31_536_000 }, committed: true },
      { tags: ['availability:1706', 'price:1706'], durations: { expire: 0 }, committed: true },
    ])
  })

  it('takes each profile from the tag kind: nothing a caller passes can change it', async () => {
    const req = request()
    req.run(() => invalidate([availabilityTag(7)]))
    await req.close()
    expect(req.expired).toEqual([
      { tags: ['availability:7'], durations: { expire: 0 }, committed: false },
    ])
  })

  it('refuses, before scheduling anything, a tag no builder makes', async () => {
    const req = request()
    expect(() => req.run(() => invalidate([itemTag(1), 'item:01' as CacheTag]))).toThrow(
      'not a cache tag @engine/cache makes: "item:01"',
    )
    await req.close()
    expect(req.expired).toEqual([])
  })
})

describe('outside a request', () => {
  it('with no collector, throws after()`s error rather than doing nothing', () => {
    expect(() => invalidate([itemTag(1706)])).toThrow(/`after` was called outside a request scope/)
    expect(() => invalidate([itemTag(1706)], {})).toThrow(/outside a request scope/)
    expect(() => invalidate([itemTag(1706)], null)).toThrow(/outside a request scope/)
    // A forgotten collector is an error even when there is nothing to expire.
    expect(() => invalidate([])).toThrow(/outside a request scope/)
  })

  it('with a collector, collects and posts nothing', async () => {
    const posts: unknown[] = []
    const batch = invalidationBatch({
      target: { origin: 'http://localhost:1', secret: 's' },
      fetch: async (...args) => {
        posts.push(args)
        return new Response(null, { status: 204 })
      },
    })
    await batch.operation((context) => invalidate(TAGS, context))
    expect(batch.pending).toEqual(TAGS)
    expect(posts).toEqual([])
  })

  it('refuses a context whose collector key holds anything but a collector', () => {
    expect(() => invalidate([itemTag(1)], { '@engine/cache:collector': { add() {} } })).toThrow(
      /is not an invalidation collector/,
    )
  })
})

describe('inside a request, with a collector', () => {
  it('collects: the explicit mode wins, and after() is never asked', async () => {
    const req = request()
    const batch = invalidationBatch({ target: { origin: 'http://localhost:1', secret: 's' } })
    await req.run(() => batch.operation((context) => invalidate([priceTag(3)], context)))
    await req.close()
    expect(req.expired).toEqual([])
    expect(batch.pending).toEqual(['price:3'])
  })
})
