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
    const res = await run(
      deps,
      post({ kind: 'sell', input: { message: 'x'.repeat(MAX_BODY_BYTES + 1) } }),
    )
    expect(res.status).toBe(413)
    expect(deps.store.create).not.toHaveBeenCalled()
    const declared = await run(deps, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(MAX_BODY_BYTES + 1) },
      body: '{}',
    })
    expect(declared.status).toBe(413)
  })

  it('refuses a body that declares nothing and streams past the cap, without buffering it', async () => {
    const deps = fakeDeps()
    const chunk = new TextEncoder().encode('x'.repeat(4096))
    let sent = 0
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += 1
        if (sent > 64) controller.close()
        else controller.enqueue(chunk)
      },
    })
    const res = await run(deps, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: stream,
      duplex: 'half',
    } as RequestInit)
    expect(res.status).toBe(413)
    // The reader stopped at the cap: five 4 KB chunks pass 16 KB, far short of the 64 offered.
    expect(sent).toBeLessThan(10)
    expect(deps.store.create).not.toHaveBeenCalled()
  })

  it('refuses a top-level field outside kind, input and turnstileToken', async () => {
    const deps = fakeDeps()
    const res = await run(deps, post({ ...SELL, site: 'shop' }))
    expect(res.status).toBe(422)
    expect(deps.store.create).not.toHaveBeenCalled()
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

  it('a double tap in flight is one lead: the second post waits for the first answer', async () => {
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => (release = resolve))
    const created: unknown[] = []
    const deps = fakeDeps({
      store: {
        create: vi.fn(async (lead: NewLeadRecord) => {
          await gate
          created.push(lead)
          return { id: 1 }
        }),
      },
    })
    const map = new LeadIdempotency()
    const one = run(deps, post(SELL, { 'idempotency-key': 'tap' }), map)
    const two = run(deps, post(SELL, { 'idempotency-key': 'tap' }), map)
    release()
    const [a, b] = await Promise.all([one, two])
    expect([a.status, b.status]).toEqual([201, 201])
    expect(created).toHaveLength(1)
  })

  it('scopes a key to its address and body: another visitor never gets the first answer', async () => {
    const deps = fakeDeps()
    const map = new LeadIdempotency()
    const from = (ip: string) => ({ 'idempotency-key': 'shared', 'x-forwarded-for': ip })
    expect((await run(deps, post(SELL, from('203.0.113.7')), map)).status).toBe(201)
    // The same key from another address is that visitor's own attempt, not a replay.
    const other = { ...SELL, input: { ...SELL.input, name: '' } }
    const refused = await run(deps, post(other, from('198.51.100.9')), map)
    expect(refused.status).toBe(422)
    // The same address and key with a corrected body is a new attempt, not the old answer.
    expect((await run(deps, post(SELL, from('198.51.100.9')), map)).status).toBe(201)
    expect(deps.store.create).toHaveBeenCalledTimes(2)
  })

  it('a transient refusal is not remembered: the retry is a real attempt', async () => {
    let pass = false
    const deps = fakeDeps({ verifyTurnstile: vi.fn(async () => pass) })
    const map = new LeadIdempotency()
    expect((await run(deps, post(SELL, { 'idempotency-key': 'k1' }), map)).status).toBe(403)
    pass = true
    expect((await run(deps, post(SELL, { 'idempotency-key': 'k1' }), map)).status).toBe(201)
  })

  it('the memory is bounded: past its size the oldest key is dropped', async () => {
    const map = new LeadIdempotency(3)
    const answer = async () => ({ status: 201, body: '{"ok":true}' })
    for (const scope of ['a', 'b', 'c', 'd']) await map.run(scope, answer, () => true)
    expect(map.size).toBe(3)
    let ran = false
    await map.run(
      'a',
      async () => ((ran = true), { status: 201, body: '{}' }),
      () => true,
    )
    expect(ran).toBe(true)
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
    const broken = fakeDeps({
      store: {
        create: vi.fn(async () => {
          throw new Error('down')
        }),
      },
    })
    expect((await run(broken, post(SELL))).status).toBe(503)
  })

  it('the service’s field refusals are 422 with their lexicon keys, and unknown fields refuse the whole input', async () => {
    const deps = fakeDeps()
    const missingName = await run(
      deps,
      post({ kind: 'sell', input: { ...SELL.input, name: '' }, turnstileToken: 'tok' }),
    )
    expect(missingName.status).toBe(422)
    expect(((await missingName.json()) as { errors: Record<string, string> }).errors.name).toBe(
      'lead.error.name',
    )
    const unknownField = await run(
      deps,
      post({ kind: 'sell', input: { ...SELL.input, askingPrice: 100 }, turnstileToken: 'tok' }),
    )
    expect(unknownField.status).toBe(422)
    expect(((await unknownField.json()) as { errors: Record<string, string> }).errors.form).toBe(
      'lead.error.invalid',
    )
  })

  it('the kind comes from a closed allow-list, and `items` belongs to ask alone', async () => {
    const deps = fakeDeps()
    expect((await run(deps, post({ ...SELL, kind: 'partnership' }))).status).toBe(422)
    expect((await run(deps, post({ ...SELL, kind: undefined }))).status).toBe(422)
    expect(
      (
        await run(
          deps,
          post({ kind: 'contact', input: { ...SELL.input, items: [1, 2] }, turnstileToken: 'tok' }),
        )
      ).status,
    ).toBe(422)
    const ask = await run(
      deps,
      post({ kind: 'ask', input: { ...SELL.input, items: [1, 2] }, turnstileToken: 'tok' }),
    )
    expect(ask.status).toBe(201)
    expect(deps.created.at(-1)?.items).toEqual([1, 2])
  })

  it('the eleventh post in a minute from one address is 429 with Retry-After', async () => {
    const limiter = new PostLimiter()
    const deps = fakeDeps({ allow: (ipKey) => limiter.allow(ipKey) })
    const statuses: number[] = []
    let last: Response | null = null
    for (let n = 0; n < 11; n += 1) {
      last = await run(deps, post({ ...SELL, input: { ...SELL.input, name: `Visitor ${n}` } }))
      statuses.push(last.status)
    }
    expect(statuses).toEqual([...Array<number>(10).fill(201), 429])
    expect(last?.headers.get('retry-after')).toBe('60')
  })
})
