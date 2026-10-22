/**
 * The gallery's lead route refuses what is not a visitor's form post (TASKS.md 5.3.d; SECURITY.md
 * §2.7, §2.10): a bot-like post with no Turnstile answer (403), an oversize body (413), a renamed
 * `.exe` posted as a multipart file (415), and the post past the hourly limit from one address
 * (429 with `Retry-After`). The limit is 5 posts an hour per address (`server/leads/rate`, SECURITY.md §2.10), no longer 10 a minute: the cases below read it from there.. No fixture is needed: nothing here reaches the store.
 */
import { expect, request as newRequest, test, type APIRequestContext } from '@playwright/test'

import {
  LEAD_POSTS_PER_HOUR,
  LEAD_WINDOW_SECONDS,
} from '../../../engine/apps/web/src/server/leads/rate'
import { BASE_URL, GALLERY_ORIGIN } from './support/env'

/** The gallery's own host: the forms post from it. */
const HOST_HEADER = { Host: new URL(GALLERY_ORIGIN).host }

let api: APIRequestContext

test.beforeAll(async () => {
  api = await newRequest.newContext({ baseURL: BASE_URL })
})

test.afterAll(async () => {
  await api?.dispose()
})

test('the route refuses a bot-like post, an oversize body, a renamed .exe and the post past the hourly limit', async () => {
  const leads = `${BASE_URL}/api/x/leads`
  const json = { ...HOST_HEADER, 'content-type': 'application/json' }
  const input = {
    name: 'Bot',
    email: 'bot@example.test',
    message: 'x',
    locale: 'en',
    consent: true,
  }
  // A bot-like post: no Turnstile answer at all.
  const bot = await api.post(leads, { headers: json, data: { kind: 'sell', input } })
  expect(bot.status(), 'no Turnstile token').toBe(403)
  // An oversize body: 20 KB of JSON.
  const big = await api.post(leads, {
    headers: json,
    data: { kind: 'sell', turnstileToken: 't', input: { ...input, message: 'x'.repeat(20_000) } },
  })
  expect(big.status(), 'a 20 KB body').toBe(413)
  // A renamed .exe (a PE header named chart.jpg), posted as a file in multipart.
  const exe = await api.post(leads, {
    headers: HOST_HEADER,
    multipart: {
      kind: 'sell',
      photo: {
        name: 'chart.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x50, 0x45]),
      },
    },
  })
  expect(exe.status(), 'multipart with a renamed .exe').toBe(415)
  // One more post than the hourly limit, from an address of its own (no other test shares the window).
  // Each passes the token's shape, so each is counted; the first ones up to the limit are refused as invalid.
  const from = { ...json, 'x-forwarded-for': `198.51.100.${(Date.now() % 200) + 20}` }
  const statuses: number[] = []
  let retryAfter: string | undefined
  for (let n = 0; n <= LEAD_POSTS_PER_HOUR; n += 1) {
    const res = await api.post(leads, {
      headers: from,
      data: { kind: 'sell', turnstileToken: 't', input: { ...input, name: '' } },
    })
    statuses.push(res.status())
    retryAfter = res.headers()['retry-after']
  }
  expect(statuses).toEqual([...Array<number>(LEAD_POSTS_PER_HOUR).fill(422), 429])
  expect(retryAfter, 'the 429 says when to come back').toBe(String(LEAD_WINDOW_SECONDS))
})
