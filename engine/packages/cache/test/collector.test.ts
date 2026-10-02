/**
 * The out-of-request collector (TASKS.md 4.8.c, 4.8.d; ARCHITECTURE.md §9): it flushes only when
 * told, keeps an operation's tags only once the operation has returned, drops them when it
 * throws, and keeps what a failed post did not deliver.
 */
import { describe, expect, it } from 'vitest'

import {
  productStockTag,
  invalidate,
  invalidationBatch,
  productTag,
  productPriceTag,
  REVALIDATE_ROUTE,
  RevalidatePostError,
  workTag,
  type RequestContext,
} from '../src/index'

type Post = { url: string; init: RequestInit; tags: string[] }

/** A recording `fetch` answering each post with the next status of `statuses` (then 204). */
function recorder(statuses: number[] = []) {
  const posts: Post[] = []
  const fetch = (async (url: URL | string, init: RequestInit = {}) => {
    posts.push({ url: String(url), init, tags: JSON.parse(String(init.body)).tags })
    return new Response(null, { status: statuses.shift() ?? 204 })
  }) as typeof globalThis.fetch
  return { posts, fetch }
}

const target = { origin: 'https://shop.example', secret: 'revalidate-secret' }

/** A Local API call standing in for Payload: its hook invalidates with `context`. */
async function save(context: RequestContext, ...tags: Parameters<typeof invalidate>[0]) {
  await Promise.resolve() // Payload awaits before its afterChange hooks run
  invalidate(tags, context)
  return { saved: true }
}

describe('a batch flushes only when told', () => {
  it('posts nothing when an operation returns, and everything once flushed', async () => {
    const { posts, fetch } = recorder()
    const batch = invalidationBatch({ target, fetch })
    const result = await batch.operation((context) =>
      save(context, productTag(1), productPriceTag(1)),
    )
    expect(result).toEqual({ saved: true })
    await batch.operation((context) => save(context, workTag('FX-1'), productTag(1)))
    expect(posts).toEqual([])
    expect(batch.pending).toEqual(['product-price:1', 'work:FX-1', 'product:1'])

    expect(await batch.flush()).toBe(3)
    expect(posts).toHaveLength(1)
    expect(posts[0]!.url).toBe('https://shop.example/api/x/revalidate')
    expect(posts[0]!.init).toMatchObject({
      method: 'POST',
      headers: { authorization: 'Bearer revalidate-secret', 'content-type': 'application/json' },
      redirect: 'error',
    })
    expect(posts[0]!.tags).toEqual(['product-price:1', 'work:FX-1', 'product:1'])
    expect(batch.pending).toEqual([])
  })

  it('an empty flush posts nothing and needs no target', async () => {
    const batch = invalidationBatch({ fetch: () => Promise.reject(new Error('never called')) })
    expect(await batch.flush()).toBe(0)
  })

  it('drop() forgets what was kept, posting none', async () => {
    const { posts, fetch } = recorder()
    const batch = invalidationBatch({ target, fetch })
    await batch.operation((context) => save(context, productTag(9)))
    batch.drop()
    expect(await batch.flush()).toBe(0)
    expect(posts).toEqual([])
  })
})

describe('an operation that throws', () => {
  it('keeps its tags and rethrows: a throw does not prove nothing committed', async () => {
    const { posts, fetch } = recorder()
    const batch = invalidationBatch({ target, fetch })
    await batch.operation((context) => save(context, productTag(1)))
    const failure = new Error('a later hook failed')
    await expect(
      batch.operation(async (context) => {
        await save(context, productTag(2), productStockTag(2))
        throw failure
      }),
    ).rejects.toBe(failure)
    expect(batch.pending).toEqual(['product:1', 'product:2', 'product-stock:2'])
    await batch.flush()
    expect(posts.map((post) => post.tags)).toEqual([['product:1', 'product:2', 'product-stock:2']])
  })

  it('a synchronous throw keeps them the same way', async () => {
    const batch = invalidationBatch({ target, fetch: recorder().fetch })
    await expect(
      batch.operation((context) => {
        invalidate([productTag(3)], context)
        throw new Error('no')
      }),
    ).rejects.toThrow('no')
    expect(batch.pending).toEqual(['product:3'])
  })

  it('keeps nothing before the operation has returned or thrown', async () => {
    const batch = invalidationBatch({ target, fetch: recorder().fetch })
    let during: readonly string[] = ['unread']
    await batch.operation(async (context) => {
      await save(context, productTag(4))
      during = batch.pending // a concurrent flush now would post nothing of this one
    })
    expect(during).toEqual([])
    expect(batch.pending).toEqual(['product:4'])
  })
})

describe('a hook after its operation returned', () => {
  it('throws, rather than adding a tag no flush would post', async () => {
    const batch = invalidationBatch({ target, fetch: recorder().fetch })
    let leaked: RequestContext = {}
    await batch.operation((context) => {
      leaked = context
    })
    expect(() => invalidate([productTag(5)], leaked)).toThrow(/operation has already returned/)
  })
})

describe('operations and Payload contexts', () => {
  it('carries its collector through a context Payload spreads into req.context', async () => {
    const batch = invalidationBatch({ target, fetch: recorder().fetch })
    // `createLocalReq()` merges an existing req.context with the one passed: `{ ...a, ...b }`.
    await batch.operation((context) => save({ locale: 'en', ...context }, productTag(5)))
    expect(batch.pending).toEqual(['product:5'])
  })

  it('runs concurrent operations apart, each kept as it ends', async () => {
    const batch = invalidationBatch({ target, fetch: recorder().fetch })
    const results = await Promise.allSettled([
      batch.operation((context) => save(context, productTag(6))),
      batch.operation(async (context) => {
        await save(context, productTag(7))
        throw new Error('rolled back')
      }),
      batch.operation((context) => save(context, productTag(8))),
    ])
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected', 'fulfilled'])
    expect([...batch.pending].sort()).toEqual(['product:6', 'product:7', 'product:8'])
  })
})

describe('posting', () => {
  it(`posts at most ${REVALIDATE_ROUTE.maxTags} tags a body, in order`, async () => {
    const { posts, fetch } = recorder()
    const batch = invalidationBatch({ target, fetch })
    const tags = Array.from({ length: 600 }, (_, i) => productTag(i + 1))
    await batch.operation((context) => save(context, ...tags))
    expect(await batch.flush()).toBe(600)
    expect(posts.map((post) => post.tags.length)).toEqual([256, 256, 88])
    expect(posts.flatMap((post) => post.tags)).toEqual(tags)
    for (const post of posts) {
      expect(new TextEncoder().encode(String(post.init.body)).byteLength).toBeLessThanOrEqual(
        REVALIDATE_ROUTE.maxBodyBytes,
      )
    }
  })

  it('a refused post rejects, keeping every tag the route had not accepted', async () => {
    const { posts, fetch } = recorder([204, 503])
    const batch = invalidationBatch({ target, fetch })
    const tags = Array.from({ length: 300 }, (_, i) => productPriceTag(i + 1))
    await batch.operation((context) => save(context, ...tags))
    const failure = batch.flush()
    await expect(failure).rejects.toBeInstanceOf(RevalidatePostError)
    await expect(failure).rejects.toMatchObject({ accepted: 256 })
    await expect(failure).rejects.toThrow('POST /api/x/revalidate answered 503')
    expect(batch.pending).toEqual(tags.slice(256))
    // The retry — an outbox's — posts the rest.
    expect(await batch.flush()).toBe(44)
    expect(posts.map((post) => post.tags.length)).toEqual([256, 44, 44])
    expect(batch.pending).toEqual([])
  })

  it('a network failure rejects and keeps everything', async () => {
    const batch = invalidationBatch({
      target,
      fetch: () => Promise.reject(new TypeError('fetch failed')),
    })
    await batch.operation((context) => save(context, productTag(1)))
    await expect(batch.flush()).rejects.toThrow(
      /POST \/api\/x\/revalidate failed: TypeError: fetch failed/,
    )
    expect(batch.pending).toEqual(['product:1'])
  })

  it('a tag kept again while a post holding it is in flight stays for the next flush', async () => {
    let release = () => {}
    const posts: string[][] = []
    const fetch = (async (_url: URL | string, init: RequestInit = {}) => {
      posts.push(JSON.parse(String(init.body)).tags)
      if (posts.length === 1) await new Promise<void>((resolve) => (release = resolve))
      return new Response(null, { status: 204 })
    }) as typeof globalThis.fetch
    const batch = invalidationBatch({ target, fetch })
    await batch.operation((context) => save(context, productTag(1)))
    const first = batch.flush()
    await new Promise((resolve) => setTimeout(resolve, 0))
    // Committed after that post may already have been served: its tag must go again.
    await batch.operation((context) => save(context, productTag(1)))
    release()
    expect(await first).toBe(1)
    expect(batch.pending).toEqual(['product:1'])
    expect(await batch.flush()).toBe(1)
    expect(posts).toEqual([['product:1'], ['product:1']])
  })

  it('flushes run one after another', async () => {
    const order: string[] = []
    const fetch = (async (_url: URL | string, init: RequestInit = {}) => {
      const tags = JSON.parse(String(init.body)).tags.join()
      order.push(`start ${tags}`)
      await new Promise((resolve) => setTimeout(resolve, 5))
      order.push(`end ${tags}`)
      return new Response(null, { status: 204 })
    }) as typeof globalThis.fetch
    const batch = invalidationBatch({ target, fetch })
    await batch.operation((context) => save(context, productTag(1)))
    const first = batch.flush()
    await batch.operation((context) => save(context, productTag(2)))
    const second = batch.flush()
    expect([await first, await second]).toEqual([1, 1])
    expect(order).toEqual(['start product:1', 'end product:1', 'start product:2', 'end product:2'])
  })
})
