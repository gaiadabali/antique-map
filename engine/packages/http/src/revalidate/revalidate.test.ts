/**
 * `POST /api/x/revalidate` (C13 `REVALIDATE_REQUEST`, TASKS.md 4.6.f): the bearer (503 unset, 401
 * wrong) before the body; a body of one to `maxTags` tags within `maxBodyBytes`, each one
 * `@engine/cache` makes, or a 400 that expires nothing; each tag expired by `invalidate()` in its
 * in-request mode at its kind's profile; 204 `no-store`. The production-build proof of `after()` is
 * 4.6.c's.
 */
import { productStockTag, productTag, postTags, type CacheTag } from '@engine/cache'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { REVALIDATE_REQUEST } from '../manifest'
import { readBoundedText } from './body'
import { revalidateRoute } from './route'

const { invalidate } = vi.hoisted(() => ({ invalidate: vi.fn() }))
vi.mock('@engine/cache', async (original) => ({
  ...(await original<typeof import('@engine/cache')>()),
  invalidate,
}))

const ENV = { REVALIDATE_SECRET: 'r3validate-secret' }

const post = (
  body: string | ReadableStream<Uint8Array> | null,
  authorization: string | null = 'Bearer r3validate-secret',
) =>
  new Request('http://localhost/api/x/revalidate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authorization === null ? {} : { authorization }),
    },
    body,
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  } as RequestInit)

const json = (value: unknown) => JSON.stringify(value)

/** The route with a recorder in place of `invalidate`. */
function recorded(env: Record<string, string> = ENV) {
  const expired: (readonly CacheTag[])[] = []
  return { expired, POST: revalidateRoute((tags) => expired.push(tags), env) }
}

afterEach(() => {
  invalidate.mockReset()
  vi.restoreAllMocks()
})

describe('who may post', () => {
  it('answers 503 while REVALIDATE_SECRET is unset, and 401 to a wrong or missing bearer', async () => {
    const body = json({ tags: [productTag(1706)] })
    const unset = recorded({})
    expect((await unset.POST(post(body))).status).toBe(503)
    const { POST, expired } = recorded()
    for (const authorization of [
      null,
      'Bearer wrong',
      'bearer r3validate-secret',
      'r3validate-secret',
    ]) {
      const response = await POST(post(body, authorization))
      expect(response.status, String(authorization)).toBe(401)
      expect(response.headers.get('www-authenticate')).toBe('Bearer')
    }
    expect(expired).toEqual([])
  })

  it('refuses before it reads a byte of the body', async () => {
    const request = post(json({ tags: [productTag(1)] }), 'Bearer wrong')
    const { POST } = recorded()
    expect((await POST(request)).status).toBe(401)
    expect(request.bodyUsed).toBe(false)
  })
})

describe('what it expires', () => {
  it('expires every posted tag in one call, and answers 204 no-store with no body', async () => {
    const { POST, expired } = recorded()
    const response = await POST(post(json({ tags: [productTag(1706), productStockTag(1706)] })))
    expect(response.status).toBe(204)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.text()).toBe('')
    expect(expired).toEqual([['product:1706', 'product-stock:1706']])
  })

  it('never reads a profile from the body: a key besides `tags` is ignored', async () => {
    const { POST, expired } = recorded()
    const body = json({ tags: [productStockTag(9)], profile: 'max', expire: 31_536_000 })
    expect((await POST(post(body))).status).toBe(204)
    expect(expired).toEqual([['product-stock:9']])
  })

  it('is invalidate() in its in-request mode — no collector — by default', async () => {
    const POST = revalidateRoute(undefined, ENV)
    expect((await POST(post(json({ tags: [productTag(3)] })))).status).toBe(204)
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate.mock.calls[0]).toEqual([['product:3']])
  })

  it('answers a plain 500 when the expiry cannot be scheduled', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    invalidate.mockImplementation(() => {
      throw new Error('`after` was called outside a request scope')
    })
    const response = await revalidateRoute(undefined, ENV)(post(json({ tags: [productTag(3)] })))
    expect(response.status).toBe(500)
  })
})

describe('a body it refuses, expiring nothing (400)', () => {
  const many = Array.from({ length: REVALIDATE_REQUEST.maxTags + 1 }, (_, i) => productTag(i + 1))
  it.each([
    ['not JSON', '{tags:'],
    ['JSON but no object', json(['product:1'])],
    ['no tags', json({})],
    ['tags not a list', json({ tags: 'product:1' })],
    ['an empty list', json({ tags: [] })],
    ['an unknown kind', json({ tags: ['product:1', 'page:home'] })],
    ['a malformed id', json({ tags: ['product:01'] })],
    ['a tag that is no string', json({ tags: [1706] })],
    ['a tag Next would drop', json({ tags: [`product:${'9'.repeat(300)}`] })],
    ['more than maxTags', json({ tags: many })],
    ['no body at all', null],
  ])('%s', async (_, body) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { POST, expired } = recorded()
    const response = await POST(post(body))
    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(expired).toEqual([])
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('quotes nothing the caller sent in its answer', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const response = await recorded().POST(post(json({ tags: ['<script>x</script>'] })))
    expect(await response.text()).toBe('tags[0] is not a tag @engine/cache makes')
  })

  it('a body past maxBodyBytes, declared or not', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const padding = ' '.repeat(REVALIDATE_REQUEST.maxBodyBytes)
    const { POST, expired } = recorded()
    expect((await POST(post(`${json({ tags: ['product:1'] })}${padding}`))).status).toBe(400)
    expect(expired).toEqual([])
  })
})

describe('readBoundedText()', () => {
  const streamed = (chunks: string[]) =>
    new Request('http://localhost/', {
      method: 'POST',
      body: new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
          controller.close()
        },
      }),
      duplex: 'half',
    } as RequestInit)

  it('reads a body within the cap, and cuts one off past it without a Content-Length', async () => {
    expect(await readBoundedText(streamed(['ab', 'cd']), 4)).toBe('abcd')
    expect(await readBoundedText(streamed(['ab', 'cde']), 4)).toBeNull()
  })

  it('refuses a declared Content-Length past the cap, and bytes that are not UTF-8', async () => {
    const declared = new Request('http://localhost/', {
      method: 'POST',
      body: 'abcdef',
      headers: { 'content-length': '6' },
    })
    expect(await readBoundedText(declared, 4)).toBeNull()
    const bad = new Request('http://localhost/', { method: 'POST', body: new Uint8Array([0xff]) })
    expect(await readBoundedText(bad, 4)).toBeNull()
  })
})

describe('what @engine/cache posts is what the route accepts', () => {
  it('postTags() → the route → invalidate, every tag, one 204 per body', async () => {
    const { POST, expired } = recorded()
    const tags = Array.from({ length: REVALIDATE_REQUEST.maxTags + 3 }, (_, i) => productTag(i + 1))
    const accepted = await postTags(
      { origin: 'http://localhost', secret: ENV.REVALIDATE_SECRET },
      tags,
      {
        fetch: async (url, init) => POST(new Request(url, init)),
      },
    )
    expect(accepted).toBe(tags.length)
    expect(expired.flat()).toEqual(tags)
    expect(expired).toHaveLength(2)
  })
})
