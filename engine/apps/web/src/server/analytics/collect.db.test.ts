/**
 * The collect pipeline against a real Postgres (TASKS.md 9.2.a): a valid batch lands in the
 * `events` table through Payload's Local API in one transaction, stamped as §2–§7 say, and the
 * collection stays append-only over REST (3.4's test proves the rest of the access).
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startWorksStack,
  server,
} from '../../../../../packages/cms/src/collections/works/works.test-support'

import { collect } from './collect'
import { readDropped, resetDropped } from './dropped'
import { rateLimiter } from './rate'

const ENV = {
  GALLERY_HOSTS: 'gallery.test',
  SHOP_HOSTS: 'shop.test',
  ADMIN_HOST: 'shop.test',
  PAYLOAD_DEV_PUSH: '1',
}

describe.skipIf(!server)('collect on a real database', () => {
  let stack: Awaited<ReturnType<typeof startWorksStack>>

  beforeAll(async () => {
    stack = await startWorksStack('web_collect_test', (config, key) => getPayload({ config, key }))
    resetDropped()
    rateLimiter.reset()
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('a valid batch inserts every event with the stamped fields', async () => {
    const body = JSON.stringify({
      events: [
        {
          name: 'page.viewed',
          at: '2026-10-03T01:00:00.000Z',
          locale: 'en',
          props: { pageType: 'home' },
          url: 'https://gallery.test/?utm_source=newsletter&utm_medium=email',
          referrer: 'https://www.google.com/search?q=x',
          utm: { utm_source: 'newsletter', utm_medium: 'email' },
        },
        {
          name: 'search.submitted',
          at: '2026-10-03T01:00:01.000Z',
          locale: 'id',
          props: { query: 'peta jawa', resultCount: 3, zeroResults: false },
          url: 'https://gallery.test/search?q=peta%20jawa',
          referrer: null,
          utm: {},
        },
      ],
    })
    const response = await collect(
      {
        method: 'POST',
        origin: 'https://gallery.test',
        contentType: 'application/json',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36',
        address: '203.0.113.9',
        body,
        referer: null,
      },
      { getPayload: async () => stack.payload, env: ENV },
    )
    expect(response.status).toBe(204)
    expect(readDropped().insert).toBe(0)

    const { docs } = await stack.payload.find({ collection: 'events', limit: 10, sort: 'at' })
    expect(docs).toHaveLength(2)
    const pageView = docs[0]!
    const search = docs[1]!
    expect(pageView).toMatchObject({
      site: 'gallery',
      name: 'page.viewed',
      source: 'beacon',
      locale: 'en',
      deviceClass: 'desktop',
      referrerHost: 'www.google.com',
      utm: { source: 'newsletter', medium: 'email', campaign: null },
      props: { pageType: 'home' },
      path: '/?utm_source=newsletter&utm_medium=email',
    })
    expect(search).toMatchObject({
      name: 'search.submitted',
      props: { query: 'peta jawa', resultCount: 3, zeroResults: false },
    })
    expect(pageView.sessionId).toMatch(/^[0-9a-f]{64}$/)
    // One session for both events: the same site, address and user agent.
    expect(search.sessionId).toBe(pageView.sessionId)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('a dropped event leaves no row', async () => {
    const { totalDocs } = await stack.payload.count({ collection: 'events' })
    const response = await collect(
      {
        method: 'POST',
        origin: 'https://gallery.test',
        contentType: 'application/json',
        userAgent: 'curl/8.4.0',
        address: '203.0.113.10',
        body: JSON.stringify({
          events: [
            {
              name: 'page.viewed',
              props: { pageType: 'home' },
              url: 'https://gallery.test/',
              utm: {},
            },
          ],
        }),
        referer: null,
      },
      { getPayload: async () => stack.payload, env: ENV },
    )
    expect(response.status).toBe(204)
    const after = await stack.payload.count({ collection: 'events' })
    expect(after.totalDocs).toBe(totalDocs)
  })
})
