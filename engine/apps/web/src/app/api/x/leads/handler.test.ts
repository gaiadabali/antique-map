/**
 * The leads route's tests (5.3.c): every status it answers, on a fake `LeadDeps` — the happy 201
 * that never echoes the id, the service's field refusals as 422 lexicon keys, the shapes the
 * route itself owns (415 for a non-JSON body — a renamed `.exe` posted as multipart included —
 * and 413 for an oversize one, each without calling the service), a repeated idempotency key
 * answered once, and the eleventh post in a minute refused with `Retry-After`.
 */
import { describe, expect, it, vi } from 'vitest'

// The handler pulls `clientAddress` (server-only) and the test pulls the real `PostLimiter`
// beside the service's types; in a plain Node test the guard is a no-op, as in the
// partnership-lead db test.
vi.mock('server-only', () => ({}))

import type { LeadDeps, NewLeadRecord } from '../../../../server/leads'
import { PostLimiter } from '../../../../server/leads'
import { handleLeadPost, LEAD_CONSENT_VERSION, MAX_BODY_BYTES } from './handler'
import { LeadIdempotency } from './idempotency'

function fakeDeps(overrides: Partial<LeadDeps> = {}): LeadDeps & { created: NewLeadRecord[] } {
  const created: NewLeadRecord[] = []
  return {
    created,
    now: () => new Date(),
    verifyTurnstile: vi.fn(async () => true),
    allow: () => true,
    store: {
      create: vi.fn(async (lead: NewLeadRecord) => {
        created.push(lead)
        return { id: 4042 }
      }),
    },
    notify: vi.fn(async () => undefined),
    log: vi.fn(() => undefined),
    ...overrides,
  } as LeadDeps & { created: NewLeadRecord[] }
}

const run = (deps: LeadDeps, init: RequestInit, map = new LeadIdempotency()) =>
  handleLeadPost(new Request('http://localhost/api/x/leads', init), deps, map)

const post = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
})

const SELL = {
  kind: 'sell',
  input: {
    name: 'A collector',
    whatsapp: '0812 3456 7890',
    message: 'I have a chart of Java.',
    locale: 'en',
    consent: true,
  },
  turnstileToken: 'tok',
}

describe('the route’s own shapes', () => {
  it('refuses a non-JSON content type — a file posted as multipart included — with 415', async () => {
    const deps = fakeDeps()
    const res = await run(deps, {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data' },
      body: 'file.bin',
    })
    expect(res.status).toBe(415)
    expect(deps.store.create).not.toHaveBeenCalled()
  })

  it('refuses an oversize body with 413, before parsing', async () => {
    const deps = fakeDeps()
    const res = await run(deps, post({ kind: 'sell', input: { message: 'x'.repeat(MAX_BODY_BYTES + 1) } }))
    expect(res.status).toBe(413)
    expect(deps.store.create).not.toHaveBeenCalled()
    const declared = await run(deps, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) },
      body: '{}',
    })
    expect(declared.status).toBe(413)
  })

  it('answers a repeated idempotency key with the first result, calling the service once', async () => {
    const deps = fakeDeps()
    const map = new LeadIdempotency()
    const first = await run(deps, post(SELL, { 'idempotency-key': 'double-tap-1' }), map)
    expect(first.status).toBe(201)
    const again = await run(deps, post(SELL, { 'idempotency-key': 'double-tap-1' }), map)
    expect(again.status).toBe(201)
    expect(await again.json()).toEqual(await first.clone().json())
    expect(deps.store.create).toHaveBeenCalledTimes(1)
  })

  it('an over-long idempotency key is refused, and a missing one is simply not remembered', async () => {
    const deps = fakeDeps()
    const long = await run(deps, post(SELL, { 'idempotency-key': 'k'.repeat(65) }))
    expect(long.status).toBe(422)
    const plain = await run(deps, post(SELL))
    expect(plain.status).toBe(201)
  })
})

describe('the service’s answers, mapped', () => {
  it('a good post is 201 { ok: true } and never echoes the id or any stored field', async () => {
    const deps = fakeDeps()
    const res = await run(deps, post(SELL))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true })
    expect(JSON.stringify(Object.fromEntries(res.headers))).not.toContain('4042')
    expect(deps.created[0]?.kind).toBe('sell')
    expect(deps.created[0]?.site).toBe('gallery')
    expect(deps.created[0]?.source).toBe('form')
    expect(deps.created[0]?.consentVersion).toBe(LEAD_CONSENT_VERSION)
    expect(deps.created[0]?.whatsapp).toBe('+6281234567890')
  })

  it('a bad Turnstile answer is 403, and a store failure is 503', async () => {
    const failing = fakeDeps({ verifyTurnstile: vi.fn(async () => false) })
    expect((await run(failing, post(SELL))).status).toBe(403)
    const broken = fakeDeps({ store: { create: vi.fn(async () => { throw new Error('down') }) } })
    expect((await run(broken, post(SELL))).status).toBe(503)
  })

  it('the service’s field refusals are 422 with their lexicon keys, and unknown fields refuse the whole input', async () => {
    const deps = fakeDeps()
    const missingName = await run(deps, post({ kind: 'sell', input: { ...SELL.input, name: '' }, turnstileToken: 'tok' }))
    expect(missingName.status).toBe(422)
    expect((await missingName.json() as { errors: Record<string, string> }).errors.name).toBe('lead.error.name')
    const unknownField = await run(deps, post({ kind: 'sell', input: { ...SELL.input, askingPrice: 100 }, turnstileToken: 'tok' }))
    expect(unknownField.status).toBe(422)
    expect((await unknownField.json() as { errors: Record<string, string> }).errors.form).toBe('lead.error.invalid')
  })

  it('the kind comes from a closed allow-list, and `items` belongs to ask alone', async () => {
    const deps = fakeDeps()
    expect((await run(deps, post({ ...SELL, kind: 'partnership' }))).status).toBe(422)
    expect((await run(deps, post({ ...SELL, kind: undefined }))).status).toBe(422)
    expect((await run(deps, post({ kind: 'contact', input: { ...SELL.input, items: [1, 2] }, turnstileToken: 'tok' }))).status).toBe(422)
    const ask = await run(deps, post({ kind: 'ask', input: { ...SELL.input, items: [1, 2] }, turnstileToken: 'tok' }))
    expect(ask.status).toBe(201)
    expect(deps.created.at(-1)?.items).toEqual([1, 2])
  })

  it('the eleventh post in a minute from one address is 429 with Retry-After', async () => {
    const limiter = new PostLimiter()
    const deps = fakeDeps({ allow: (ipKey) => limiter.allow(ipKey) })
    let last: Response | null = null
    for (let n = 0; n < 11; n += 1) {
      last = await run(deps, post({ ...SELL, input: { ...SELL.input, name: `Visitor ${n}` } }))
      if (n < 10) expect(last.status).toBe(201)
    }
    expect(last?.status).toBe(429)
    expect(last?.headers.get('retry-after')).toBe('60')
  })
})
