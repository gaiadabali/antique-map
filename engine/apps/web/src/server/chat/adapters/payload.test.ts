/**
 * The Payload adapters against a recording double of the Local API: what each call asks for —
 * public reads with `overrideAccess: false` and the published filter, server writes selecting
 * exactly their fields, a transcript appended with its `lastMessageAt` (the collection's hook
 * derives `expiresAt` from it), a lead deduped within 24 hours.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import type { Payload } from '@engine/cms/instance'

import { mapSession, mapSettings } from './payload-maps'
import { payloadCatalogue } from './payload-catalogue'
import { payloadStore } from './payload-store'

type Call = Record<string, unknown>

function fakePayload(answers: Partial<Record<string, (args: Call) => unknown>> = {}) {
  const calls: Array<[string, Call]> = []
  const method = (name: string) => async (args: Call) => {
    calls.push([name, args])
    return answers[name]?.(args) ?? { docs: [] }
  }
  const payload = {
    find: method('find'),
    findByID: method('findByID'),
    findGlobal: method('findGlobal'),
    create: method('create'),
    update: method('update'),
    delete: method('delete'),
  } as unknown as Payload
  return { payload, calls }
}

const SESSION = {
  id: 7,
  site: 'gallery',
  locale: 'en',
  startedAt: '2026-10-03T03:00:00.000Z',
  lastMessageAt: '2026-10-03T03:00:00.000Z',
  transcript: [{ role: 'user', text: 'hi', at: '2026-10-03T03:00:00.000Z', id: 'x' }],
  labels: ['turnstile:pass@0'],
  usage: { inputTokens: 100, outputTokens: 10, costUsd: 0.01 },
  outcome: 'lead',
  lead: 3,
  items: [1],
}

describe('the catalogue reader', () => {
  it('reads as an anonymous visitor, published only', async () => {
    const { payload, calls } = fakePayload()
    const reader = payloadCatalogue(payload)
    await reader.find({
      collection: 'works',
      where: { and: [{ _status: { equals: 'published' } }] },
      select: { title: true },
      limit: 4,
      locale: 'id',
      depth: 1,
    })
    expect(calls[0]?.[1]).toMatchObject({
      collection: 'works',
      overrideAccess: false,
      pagination: false,
      locale: 'id',
      fallbackLocale: 'en',
      select: { title: true },
    })
    await expect(
      reader.find({
        collection: 'products',
        where: {},
        select: {},
        limit: 1,
        locale: 'en',
        depth: 0,
      }),
    ).rejects.toThrow('without the published filter')
    expect(calls).toHaveLength(1)
  })

  it('asks stock-levels only which products some active store can sell', async () => {
    const { payload, calls } = fakePayload({
      find: () => ({ docs: [{ product: 11 }, { product: 11 }] }),
    })
    const stocked = await payloadCatalogue(payload).productsInStock(['11', '12'])
    expect([...stocked]).toEqual(['11'])
    expect(calls[0]?.[1]).toMatchObject({
      collection: 'stock-levels',
      select: { product: true },
      where: {
        and: [
          { product: { in: [11, 12] } },
          { quantity: { greater_than: 0 } },
          { 'store.active': { equals: true } },
        ],
      },
    })
  })
})

describe('the chat store', () => {
  it('reads one site’s settings field by field, with the kill switch off unless set', async () => {
    const { payload, calls } = fakePayload({
      findGlobal: () => ({
        shop: {
          contact: { whatsapp: '+6281234567890' },
          ai: { dailyBudgetUsd: 3 },
          delivery: { bands: [{ upToKm: 5, feeIdr: 15000 }] },
        },
      }),
    })
    const settings = await payloadStore(payload).settings('shop', 'id')
    expect(calls[0]?.[1]).toMatchObject({
      slug: 'site-settings',
      select: {
        shop: {
          contact: { whatsapp: true, email: true },
          replyPromise: true,
          ai: { chatEnabled: true, dailyBudgetUsd: true, sessionTokenCap: true },
          delivery: { bands: true, freeOverIdr: true },
        },
      },
    })
    expect(settings).toMatchObject({
      contact: { whatsapp: '+6281234567890', email: null },
      ai: { chatEnabled: false, dailyBudgetUsd: 3, sessionTokenCap: 150_000 },
      delivery: { bands: [{ upToKm: 5, feeIdr: 15000 }], freeOverIdr: null },
    })
    expect(mapSettings('gallery', {}).ai.chatEnabled).toBe(false)
  })

  it('appends a turn: transcript, labels, usage totals and lastMessageAt; a lead stays a lead', async () => {
    const { payload, calls } = fakePayload({
      findByID: () => SESSION,
      find: () => ({ docs: [{ id: 2, publicId: 2098 }] }),
    })
    await payloadStore(payload).recordTurn('7', {
      entries: [
        { role: 'user', text: 'more', at: '2026-10-03T04:00:00.000Z' },
        { role: 'assistant', text: 'ok', at: '2026-10-03T04:00:00.000Z' },
      ],
      labels: ['label:browse'],
      usage: { inputTokens: 50, outputTokens: 5, costUsd: 0.002 },
      outcome: 'handoff',
      at: '2026-10-03T04:00:00.000Z',
      itemIds: ['2098'],
    })
    const update = calls.find(([name]) => name === 'update')?.[1]
    expect(update).toMatchObject({
      collection: 'chat-sessions',
      id: 7,
      overrideAccess: true,
      data: {
        lastMessageAt: '2026-10-03T04:00:00.000Z',
        labels: ['turnstile:pass@0', 'label:browse'],
        usage: { inputTokens: 150, outputTokens: 15, costUsd: 0.012 },
        outcome: 'lead',
        items: [1, 2],
      },
    })
    expect((update?.data as { transcript: unknown[] }).transcript).toHaveLength(3)
  })

  it('appends a repeat submission to the open lead within 24 hours instead of creating another', async () => {
    const { payload, calls } = fakePayload({
      find: () => ({ docs: [{ id: 42, items: [1], payload: { message: 'first' } }] }),
    })
    const lead = await payloadStore(payload).createLead({
      site: 'gallery',
      kind: 'ask',
      sessionId: '7',
      name: 'Ann',
      whatsapp: '+6281234567890',
      email: null,
      preferredChannel: 'whatsapp',
      message: 'second',
      locale: 'en',
      consentVersion: 'v',
      consentAt: '2026-10-03T04:00:00.000Z',
      workIds: ['1'],
    })
    expect(lead).toEqual({ id: '42', reference: 'L-42' })
    expect(calls.map(([name]) => name)).toEqual(['find', 'update'])
    expect(JSON.stringify(calls[0]?.[1])).toContain(
      '"payload.whatsapp":{"equals":"+6281234567890"}',
    )
    expect(JSON.stringify(calls[0]?.[1])).toContain(
      '"createdAt":{"greater_than":"2026-10-02T04:00:00.000Z"}',
    )
  })

  it('creates a new chat lead otherwise, linked to its session', async () => {
    const { payload, calls } = fakePayload({ create: () => ({ id: 43 }) })
    const lead = await payloadStore(payload).createLead({
      site: 'gallery',
      kind: 'sell',
      sessionId: '7',
      name: 'Ann',
      whatsapp: null,
      email: 'ann@example.org',
      preferredChannel: 'email',
      message: 'a map',
      locale: 'id',
      consentVersion: 'v',
      consentAt: '2026-10-03T04:00:00.000Z',
      workIds: [],
    })
    expect(lead.reference).toBe('L-43')
    expect(calls.find(([name]) => name === 'create')?.[1]).toMatchObject({
      collection: 'leads',
      overrideAccess: true,
      data: {
        kind: 'sell',
        site: 'gallery',
        source: 'chat',
        status: 'new',
        chatSession: 7,
        payload: { email: 'ann@example.org', consentVersion: 'v' },
      },
    })
  })

  it('sums the day’s spend across pages', async () => {
    let page = 0
    const { payload } = fakePayload({
      find: () => ({ docs: [{ usage: { costUsd: 1.5 } }, { usage: {} }], hasNextPage: ++page < 2 }),
    })
    expect(await payloadStore(payload).spentSince('gallery', new Date())).toBe(3)
  })
})

describe('mapping a session', () => {
  it('turns a lead relation into its reference and drops malformed rows', () => {
    const session = mapSession({
      ...SESSION,
      transcript: [...SESSION.transcript, { role: 'system', text: 'x' }],
    })
    expect(session).toMatchObject({
      id: '7',
      lead: 'L-3',
      outcome: 'lead',
      transcript: [{ role: 'user', text: 'hi' }],
    })
    expect(mapSession({ id: 1, site: 'other' })).toBeNull()
  })
})
