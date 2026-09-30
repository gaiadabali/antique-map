/**
 * The post a flush makes, over a real socket (C13 `REVALIDATE_REQUEST`): the path, the bearer,
 * the JSON body, no redirect followed; and where it posts, from `SITE_URL` and
 * `REVALIDATE_SECRET`, refusing — without naming a value — when either is missing.
 */
import { createServer, type IncomingMessage, type Server } from 'node:http'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  invalidate,
  invalidationBatch,
  itemTag,
  postTags,
  revalidateBodies,
  revalidateTargetFrom,
  REVALIDATE_ROUTE,
  workTag,
} from '../src/index'

type Seen = { method?: string; url?: string; headers: IncomingMessage['headers']; body: string }

describe('a flush over HTTP', () => {
  const seen: Seen[] = []
  let answer = 204
  let server: Server
  let origin = ''

  beforeAll(async () => {
    server = createServer((request, response) => {
      let body = ''
      request.on('data', (chunk) => (body += chunk))
      request.on('end', () => {
        seen.push({ method: request.method, url: request.url, headers: request.headers, body })
        if (answer === 308) response.writeHead(308, { location: 'https://elsewhere.example/' })
        else response.writeHead(answer, { 'content-type': 'text/plain' })
        response.end(answer === 204 ? undefined : 'unknown tag')
      })
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  })

  afterAll(() => new Promise((resolve) => server.close(resolve)))

  it('POSTs the tags as JSON with the bearer, and resolves on 204', async () => {
    answer = 204
    expect(await postTags({ origin, secret: 'a-secret' }, [itemTag(1706), workTag('FX-9')])).toBe(2)
    const post = seen.at(-1)!
    expect(post.method).toBe('POST')
    expect(post.url).toBe('/api/x/revalidate')
    expect(post.headers.authorization).toBe('Bearer a-secret')
    expect(post.headers['content-type']).toBe('application/json')
    expect(JSON.parse(post.body)).toEqual({ tags: ['item:1706', 'work:FX-9'] })
  })

  it('a batch flushed to it posts the same', async () => {
    answer = 204
    const batch = invalidationBatch({ target: { origin, secret: 'a-secret' } })
    await batch.operation(async (context) => invalidate([itemTag(1)], context))
    expect(seen.length).toBe(1)
    expect(await batch.flush()).toBe(1)
    expect(JSON.parse(seen.at(-1)!.body)).toEqual({ tags: ['item:1'] })
  })

  it('rejects any other answer, quoting it', async () => {
    answer = 400
    await expect(postTags({ origin, secret: 's' }, [itemTag(1)])).rejects.toThrow(
      'POST /api/x/revalidate answered 400: unknown tag',
    )
  })

  it('never follows a redirect: the bearer stays on this origin', async () => {
    answer = 308
    const before = seen.length
    await expect(postTags({ origin, secret: 's' }, [itemTag(1)])).rejects.toThrow(/failed/)
    expect(seen.length).toBe(before + 1)
  })
})

describe('bodies', () => {
  it('stay within maxBodyBytes as well as maxTags', () => {
    const tags = Array.from({ length: 5000 }, (_, i) =>
      workTag(`ABCDEFGH-${String(i).padStart(16, '0')}`),
    )
    const bodies = revalidateBodies(tags)
    expect(bodies.flat()).toEqual(tags)
    for (const body of bodies) {
      expect(body.length).toBeLessThanOrEqual(REVALIDATE_ROUTE.maxTags)
      expect(Buffer.byteLength(JSON.stringify({ tags: body }))).toBeLessThanOrEqual(
        REVALIDATE_ROUTE.maxBodyBytes,
      )
    }
    expect(revalidateBodies([])).toEqual([])
  })
})

describe('revalidateTargetFrom()', () => {
  it('posts to SITE_URL’s origin with REVALIDATE_SECRET, both trimmed', () => {
    expect(
      revalidateTargetFrom({
        SITE_URL: ' https://shop.example/some/path ',
        REVALIDATE_SECRET: ' s ',
      }),
    ).toEqual({ origin: 'https://shop.example', secret: 's' })
    expect(
      revalidateTargetFrom({ SITE_URL: 'http://localhost:4199', REVALIDATE_SECRET: 'dev' }),
    ).toEqual({ origin: 'http://localhost:4199', secret: 'dev' })
  })

  it('refuses when either is missing, naming the variable and never a value', () => {
    expect(() => revalidateTargetFrom({ REVALIDATE_SECRET: 'hunter2' })).toThrow(/SITE_URL unset$/)
    expect(() => revalidateTargetFrom({ SITE_URL: 'https://shop.example' })).toThrow(
      /REVALIDATE_SECRET unset$/,
    )
    expect(() => revalidateTargetFrom({ SITE_URL: ' ', REVALIDATE_SECRET: ' ' })).toThrow(
      /SITE_URL, REVALIDATE_SECRET unset$/,
    )
    for (const SITE_URL of ['not a url', 'ftp://shop.example', 'file:///etc/passwd']) {
      let message = ''
      try {
        revalidateTargetFrom({ SITE_URL, REVALIDATE_SECRET: 'hunter2' })
      } catch (error) {
        message = String(error)
      }
      expect(message, SITE_URL).toMatch(/SITE_URL is not/)
      expect(message).not.toContain('hunter2')
    }
  })

  it('a batch with no target reads them only when it has tags to post', async () => {
    const batch = invalidationBatch()
    expect(await batch.flush()).toBe(0)
  })
})
