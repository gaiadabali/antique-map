/**
 * TASKS.md 8.1.e, the limits half, plus 8.1.a's gates: the 31st message in a session and a breach
 * of the day's cap are refused before any model call; flipping the kill switch stops the next
 * reply; Turnstile, the rate limits, the input length and the origin check hold.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { postMessage } from './http/message'
import { deleteSession, startSession } from './http/session'
import {
  chatRequest,
  cookieOf,
  eventsOf,
  harness,
  stubSiteEnv,
  type Harness,
} from './test-support/harness'
import type { ChatSessionRecord } from './types'

beforeEach(stubSiteEnv)
afterEach(() => vi.unstubAllEnvs())

const answers = () => ({ text: 'Here is what the catalogue holds.' })

async function open(h: Harness, ip?: string, cookie?: string): Promise<Response> {
  return startSession(
    chatRequest('gallery', '/api/x/chat/session', {
      body: { turnstileToken: 'tok', locale: 'en' },
      ...(ip ? { ip } : {}),
      ...(cookie ? { cookie } : {}),
    }),
    h.deps,
  )
}

async function send(
  h: Harness,
  cookie: string,
  text = 'What maps of Bali do you have?',
  tick = 3000,
) {
  h.tick(tick)
  const response = await postMessage(
    chatRequest('gallery', '/api/x/chat/message', { cookie, body: { text, locale: 'en' } }),
    h.deps,
  )
  return { response, events: await eventsOf(response) }
}

function onlySession(h: Harness): ChatSessionRecord {
  const [session] = [...h.store.sessions.values()]
  if (!session) throw new Error('no session')
  return session
}

describe('the session message cap', () => {
  it('answers 30 messages and refuses the 31st, with the handoff and no model call', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    for (let i = 1; i <= 30; i++) {
      // Every 15 messages the visitor passes Turnstile again (AI.md §3.2).
      if (i === 16) expect((await open(h, undefined, cookie)).status).toBe(200)
      const { response } = await send(h, cookie)
      expect(response.status, `message ${i}`).toBe(200)
    }
    expect(onlySession(h).transcript.filter((e) => e.role === 'user')).toHaveLength(30)
    const calls = h.model.answerCalls.length
    const classified = h.model.classifyCalls.length

    const { response, events } = await send(h, cookie)
    expect(response.status).toBe(403)
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'session_limit' })
    expect(events.filter((e) => e.type === 'handoff')).toHaveLength(2)
    expect(h.model.answerCalls).toHaveLength(calls)
    expect(h.model.classifyCalls).toHaveLength(classified)
  })

  it('asks for Turnstile again after 15 messages', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    for (let i = 0; i < 15; i++) await send(h, cookie)
    const { response, events } = await send(h, cookie)
    expect(response.status).toBe(403)
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'challenge_required' })
    const rechallenge = await open(h, undefined, cookie)
    expect(rechallenge.status).toBe(200)
    expect(await rechallenge.json()).toMatchObject({ ok: true, resumed: true })
    expect(h.store.sessions.size).toBe(1)
    expect((await send(h, cookie)).response.status).toBe(200)
  })
})

describe('the daily cost cap', () => {
  it('refuses a turn once the day’s budget is spent, until midnight WIB', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    h.store.spentToday = 5 // the default ai.dailyBudgetUsd
    const { response, events } = await send(h, cookie)
    expect(response.status).toBe(503)
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'budget_exhausted' })
    // 03:00Z + 3 s is 10:00 WIB: 14 hours to midnight.
    expect(Number(response.headers.get('retry-after'))).toBe(14 * 3600 - 3)
    expect(h.model.answerCalls).toHaveLength(0)
    expect(h.model.classifyCalls).toHaveLength(0)
  })

  it('stops mid-turn when a call would cross the cap, and still records what was spent', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    h.store.spentToday = 4.999 // the classifier's call (~USD 0.002) crosses it
    const { response, events } = await send(h, cookie)
    expect(response.status).toBe(200)
    expect(h.model.classifyCalls).toHaveLength(1)
    expect(h.model.answerCalls).toHaveLength(0)
    expect(events.filter((e) => e.type === 'handoff')).toHaveLength(2)
    expect(onlySession(h).labels).toContain('capped:budget_exhausted')
    expect(onlySession(h).usage.costUsd).toBeGreaterThan(0)
    // The ledger now holds today's spend over the cap: the next turn is refused at the gate.
    expect((await send(h, cookie)).response.status).toBe(503)
  })

  it('refuses a turn once the session’s token cap is reached', async () => {
    const h = harness(answers)
    h.store.settingsBySite.gallery = {
      ...h.store.settingsBySite.gallery!,
      ai: { ...h.store.settingsBySite.gallery!.ai, sessionTokenCap: 1000 },
    }
    const cookie = cookieOf(await open(h))
    expect((await send(h, cookie)).response.status).toBe(200)
    const { response, events } = await send(h, cookie)
    expect(response.status).toBe(403)
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'session_limit' })
  })
})

describe('the kill switch', () => {
  it('stops the next reply as soon as it is flipped', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    expect((await send(h, cookie)).response.status).toBe(200)
    const calls = h.model.answerCalls.length

    const gallery = h.store.settingsBySite.gallery!
    h.store.settingsBySite.gallery = { ...gallery, ai: { ...gallery.ai, chatEnabled: false } }
    const { response, events } = await send(h, cookie)
    expect(response.status).toBe(503)
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'disabled' })
    expect(events.filter((e) => e.type === 'handoff')).toHaveLength(2)
    expect(h.model.answerCalls).toHaveLength(calls)
    expect((await open(h)).status).toBe(503)
  })
})

describe('starting a session', () => {
  it('needs a Turnstile pass, verified on the server, before any session exists', async () => {
    const h = harness(answers)
    h.turnstile.pass = false
    const refused = await open(h)
    expect(refused.status).toBe(403)
    expect(refused.headers.get('set-cookie')).toBeNull()
    expect(h.store.sessions.size).toBe(0)

    h.turnstile.pass = true
    const opened = await open(h)
    expect(opened.status).toBe(200)
    const cookie = opened.headers.get('set-cookie') ?? ''
    expect(cookie).toMatch(
      /^chat_sid=\d+\.[\w-]+; Path=\/api\/x\/chat; HttpOnly; SameSite=Lax; Secure$/,
    )
    expect(onlySession(h).labels).toContain('turnstile:verified')
  })

  it('allows 6 new sessions per hour per address', async () => {
    const h = harness(answers)
    for (let i = 0; i < 6; i++) expect((await open(h, '192.0.2.1')).status).toBe(200)
    const seventh = await open(h, '192.0.2.1')
    expect(seventh.status).toBe(429)
    expect(Number(seventh.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await open(h, '192.0.2.2')).status).toBe(200)
  })

  it('is deleted with its transcript when the visitor asks', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    await send(h, cookie)
    const response = await deleteSession(
      chatRequest('gallery', '/api/x/chat/session', { method: 'DELETE', cookie }),
      h.deps,
    )
    expect(response.status).toBe(204)
    expect(h.store.sessions.size).toBe(0)
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0')
  })
})

describe('a message', () => {
  it('is paced at one per 2 seconds per session', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    expect((await send(h, cookie)).response.status).toBe(200)
    const { response, events } = await send(h, cookie, 'again', 500)
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('2')
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'rate_limited' })
  })

  it('over 1,000 characters is refused as too long, never truncated', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    const { response, events } = await send(h, cookie, 'a'.repeat(1001))
    expect(response.status).toBe(413)
    expect(events.at(-1)).toMatchObject({ type: 'error', code: 'too_long' })
    expect(h.model.classifyCalls).toHaveLength(0)
    expect((await send(h, cookie, 'a'.repeat(1000))).response.status).toBe(200)
  })

  it('from another origin, or without a session, is refused', async () => {
    const h = harness(answers)
    const cookie = cookieOf(await open(h))
    const forged = await postMessage(
      chatRequest('gallery', '/api/x/chat/message', {
        cookie,
        origin: 'https://evil.example',
        body: { text: 'hi', locale: 'en' },
      }),
      h.deps,
    )
    expect(forged.status).toBe(403)
    const anonymous = await send(h, 'chat_sid=100.forged')
    expect(anonymous.response.status).toBe(401)
    // A gallery cookie is not a shop session.
    const shop = await postMessage(
      chatRequest('shop', '/api/x/chat/message', { cookie, body: { text: 'hi', locale: 'en' } }),
      h.deps,
    )
    expect(shop.status).toBe(401)
    expect(h.model.classifyCalls).toHaveLength(0)
  })
})
