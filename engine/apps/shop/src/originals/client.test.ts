/**
 * The shop's client of the gallery's originals API (TASKS.md 23.5.b, 23.5.d): found, not found, a
 * draft (which the gallery answers as not found), a timeout — and every other failure is no answer,
 * never a throw.
 */
import { describe, expect, it, vi } from 'vitest'

import { fetchFeatured, fetchOriginal, type ClientOptions } from './client'

const ORIGIN = 'http://gallery.localhost:4880'
const MEDIA = 'http://localhost:9000'
const work = {
  stockNumber: 'M.1044',
  title: 'Insulae Iavae',
  url: `${ORIGIN}/product/12-insulae-iavae`,
  image: { url: `${MEDIA}/test-media/d/640.webp`, alt: 'Java', width: 640, height: 480 },
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const options = (fetchImpl: typeof fetch, over: Partial<ClientOptions> = {}): ClientOptions => ({
  origin: ORIGIN,
  mediaOrigin: MEDIA,
  timeoutMs: 50,
  fetch: fetchImpl,
  ...over,
})

describe('fetchOriginal()', () => {
  it('found: the gallery’s published work, asked by stock number in the locale', async () => {
    const get = vi.fn(async () => json(200, { work: { ...work, askingPrice: 1 } }))
    const answer = await fetchOriginal('M.1044', 'id', options(get as typeof fetch))
    expect(answer).toEqual({ kind: 'found', value: work })
    expect(get).toHaveBeenCalledWith(
      `${ORIGIN}/api/x/originals/M.1044?locale=id`,
      expect.objectContaining({ redirect: 'error' }),
    )
  })

  it('not found: the gallery’s 404 is absent', async () => {
    const answer = await fetchOriginal(
      'M.9',
      'en',
      options((async () => json(404, { error: 'not-found' })) as typeof fetch),
    )
    expect(answer).toEqual({ kind: 'absent' })
  })

  it('draft: a work the gallery has not published answers 404 there, so absent here', async () => {
    // The gallery's read filters `_status: 'published'` (apps/web server/gallery/originals/find.db.test.ts);
    // whatever it holds in draft, the shop sees what it sees for an unknown number.
    const published = new Set(['M.1044'])
    const gallery = (async (url: string | URL | Request) =>
      published.has(decodeURIComponent(String(url).split('/').at(-1)!.split('?')[0]!))
        ? json(200, { work })
        : json(404, { error: 'not-found' })) as typeof fetch
    expect((await fetchOriginal('M.2000', 'en', options(gallery))).kind).toBe('absent')
    expect((await fetchOriginal('M.1044', 'en', options(gallery))).kind).toBe('found')
  })

  it('timeout: a gallery that does not answer in time is unavailable, promptly', async () => {
    const hang = ((_url: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })) as typeof fetch
    const started = Date.now()
    const answer = await fetchOriginal('M.1044', 'en', options(hang, { timeoutMs: 80 }))
    expect(answer).toEqual({ kind: 'unavailable' })
    expect(Date.now() - started).toBeLessThan(1_000)
  })

  it('is unavailable, never a throw, for a refused connection, a 5xx or a bad body', async () => {
    const refused = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch
    const failing = (async () => json(503, { error: 'unavailable' })) as typeof fetch
    const garbage = (async () => new Response('<html>', { status: 200 })) as typeof fetch
    const wrongWork = (async () =>
      json(200, { work: { ...work, stockNumber: 'M.1' } })) as typeof fetch
    for (const get of [refused, failing, garbage, wrongWork]) {
      expect(await fetchOriginal('M.1044', 'en', options(get))).toEqual({ kind: 'unavailable' })
    }
    const none = await fetchOriginal('M.1044', 'en', options(refused, { origin: null }))
    expect(none).toEqual({ kind: 'unavailable' })
  })

  it('refuses a page off the gallery’s origin and drops a picture the shop may not load', async () => {
    const elsewhere = (async () =>
      json(200, { work: { ...work, url: 'https://evil.example/x' } })) as typeof fetch
    expect((await fetchOriginal('M.1044', 'en', options(elsewhere))).kind).toBe('unavailable')
    const foreignPicture = (async () =>
      json(200, {
        work: { ...work, image: { ...work.image, url: 'https://cdn.example/x.webp' } },
      })) as typeof fetch
    const answer = await fetchOriginal('M.1044', 'en', options(foreignPicture))
    expect(answer).toEqual({ kind: 'found', value: { ...work, image: null } })
  })
})

describe('fetchFeatured()', () => {
  it('keeps the featured works the shop may link and show', async () => {
    const featured = { title: 'Java', date: '1598', maker: null, url: work.url, image: work.image }
    const get = (async () =>
      json(200, {
        works: [featured, { ...featured, image: { ...work.image, url: 'https://cdn.example/y' } }],
      })) as typeof fetch
    expect(await fetchFeatured('en', options(get))).toEqual({ kind: 'found', value: [featured] })
  })
})
