/**
 * The collect pipeline (TASKS.md 9.2.a) against a fake payload: the checks of §6 in order, the
 * drop counters, and the answer that is always `204` — including the one that sets no cookie.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { Payload } from 'payload'

import { collect, type CollectInput } from './collect'
import { readDropped, resetDropped } from './dropped'
import { rateLimiter } from './rate'

const ENV = {
  GALLERY_HOSTS: 'gallery.test,www.gallery.test',
  SHOP_HOSTS: 'shop.test,www.shop.test',
  ADMIN_HOST: 'shop.test',
}

type Created = Array<Record<string, unknown>>
/** The slice of Payload the pipeline uses, plus the `created` list the tests read back. */
type FakePayload = Payload & { created: Created }

function fakePayload(): { payload: FakePayload } {
  const created: Created = []
  const payload = {
    created,
    db: {
      beginTransaction: async () => 'tx1',
      commitTransaction: async () => undefined,
      rollbackTransaction: async () => undefined,
    },
    create: async ({ data }: { data: Record<string, unknown> }) => {
      created.push(data)
      return { id: created.length }
    },
  } as unknown as FakePayload
  return { payload }
}

function input(overrides: Partial<CollectInput> = {}): CollectInput {
  return {
    method: 'POST',
    origin: 'https://gallery.test',
    contentType: 'application/json',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    address: '203.0.113.7',
    body: JSON.stringify({
      events: [
        {
          name: 'page.viewed',
          at: '2026-10-03T01:00:00.000Z',
          locale: 'en',
          props: { pageType: 'home' },
          url: 'https://gallery.test/?utm_source=x',
          referrer: null,
          utm: {},
        },
      ],
    }),
    referer: null,
    ...overrides,
  }
}

beforeEach(() => {
  resetDropped()
  rateLimiter.reset()
})

describe('the checks of §6, in order', () => {
  it('a cross-origin post is refused', async () => {
    const { payload } = fakePayload()
    for (const origin of [
      null,
      'https://evil.example',
      'not a url',
      'https://www.shop.test.evil.example',
    ]) {
      resetDropped()
      const response = await collect(input({ origin }), {
        getPayload: async () => payload,
        env: ENV,
      })
      expect(response.status, String(origin)).toBe(204)
      expect(readDropped().origin, String(origin)).toBe(1)
    }
  })

  it('a body that is not JSON is dropped', async () => {
    const { payload } = fakePayload()
    const response = await collect(input({ contentType: 'text/plain' }), {
      getPayload: async () => payload,
      env: ENV,
    })
    expect(response.status).toBe(204)
    expect(readDropped().body).toBe(1)
    expect(
      (await collect(input({ body: 'not json' }), { getPayload: async () => payload, env: ENV }))
        .status,
    ).toBe(204)
    expect(readDropped().body).toBe(2)
  })

  it('a batch over 20 events or 8 KB is refused', async () => {
    const { payload } = fakePayload()
    const event = { name: 'page.viewed', props: { pageType: 'home' } }
    const tooMany = JSON.stringify({ events: Array.from({ length: 21 }, () => event) })
    await collect(input({ body: tooMany }), { getPayload: async () => payload, env: ENV })
    expect(readDropped()['batch-size']).toBe(21)

    const tooBig = JSON.stringify({ events: [event] })
    await collect(input({ body: 'x'.repeat(8192) + tooBig }), {
      getPayload: async () => payload,
      env: ENV,
    })
    expect(readDropped()['batch-size']).toBe(22)
    expect(payload.created).toHaveLength(0)
  })

  it('a bot user agent adds no event', async () => {
    const { payload } = fakePayload()
    const response = await collect(input({ userAgent: 'curl/8.4.0' }), {
      getPayload: async () => payload,
      env: ENV,
    })
    expect(response.status).toBe(204)
    expect(readDropped().bot).toBe(1)
    expect(payload.created).toHaveLength(0)
  })

  it('an empty user agent adds no event', async () => {
    const { payload } = fakePayload()
    await collect(input({ userAgent: null }), { getPayload: async () => payload, env: ENV })
    expect(readDropped().bot).toBe(1)
    expect(payload.created).toHaveLength(0)
  })

  it('the 121st event a minute from one session is dropped', async () => {
    const { payload } = fakePayload()
    const event = input().body as string
    let response: Response = new Response(null, { status: 204 })
    for (let i = 0; i < 121; i += 1) {
      response = await collect(input({ body: event, address: '198.51.100.1' }), {
        getPayload: async () => payload,
        env: ENV,
      })
    }
    expect(response.status).toBe(204)
    expect(readDropped()['rate-session']).toBe(1)
    expect(payload.created).toHaveLength(120)
  })

  it('an unknown event name is dropped, the known ones around it survive', async () => {
    const { payload } = fakePayload()
    const body = JSON.stringify({
      events: [
        { name: 'page.viewed', props: { pageType: 'home' } },
        { name: 'page.clicked', props: {} },
        { name: 'item.viewed', props: { workId: 5, objectType: 'map', status: 'published' } },
      ],
    })
    await collect(input({ body }), { getPayload: async () => payload, env: ENV })
    expect(readDropped()['unknown-name']).toBe(1)
    expect(payload.created).toHaveLength(2)
  })
})

describe('the stamp (§2, §3, §7)', () => {
  it('a valid batch inserts every event with the stamped fields', async () => {
    const { payload } = fakePayload()
    const response = await collect(input(), {
      getPayload: async () => payload,
      env: ENV,
      now: () => new Date('2026-10-03T01:00:00.000Z'),
    })
    expect(response.status).toBe(204)
    expect(payload.created).toHaveLength(1)
    const event = payload.created[0]!
    expect(event).toMatchObject({
      site: 'gallery',
      name: 'page.viewed',
      source: 'beacon',
      path: '/?utm_source=x',
      locale: 'en',
      deviceClass: 'desktop',
      referrerHost: null,
      utm: { source: 'x', medium: null, campaign: null },
      props: { pageType: 'home' },
    })
    expect(event.sessionId).toMatch(/^[0-9a-f]{64}$/)
    expect(event.day).toBe('2026-10-03') // 01:00 UTC + 8 h
    expect(event).not.toHaveProperty('userAgent')
    expect(event).not.toHaveProperty('address')
  })

  it('no cookie is set or read', async () => {
    const { payload } = fakePayload()
    const response = await collect(input(), { getPayload: async () => payload, env: ENV })
    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('a failed insert counts its drops, and the answer is still 204', async () => {
    const payload = {
      db: {
        beginTransaction: async () => 'tx1',
        commitTransaction: async () => undefined,
        rollbackTransaction: async () => undefined,
      },
      create: async () => {
        throw new Error('down')
      },
    } as unknown as Payload
    const response = await collect(input(), { getPayload: async () => payload, env: ENV })
    expect(response.status).toBe(204)
    expect(readDropped().insert).toBe(1)
  })
})
