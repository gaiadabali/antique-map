/**
 * The chat's Payload adapters on a CMS that holds one site's records — the shop's own, with no
 * `site` field (TASKS.md 23.4) — against a recording double of the Local API, and the public image
 * URL the reader chooses.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { onlySiteOf } from './deps'
import { payloadCatalogue, scopedWhere } from './catalogue'
import { payloadStore } from './store'

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
  }
  return { payload, calls }
}

const UNSITED = {
  id: 7,
  locale: 'en',
  startedAt: '2026-10-03T03:00:00.000Z',
  lastMessageAt: '2026-10-03T03:00:00.000Z',
  transcript: [],
  labels: [],
  usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  outcome: null,
  lead: null,
}

describe('a CMS that holds one site’s records — the shop’s own (23.4)', () => {
  it('drops the projection’s clause for that site and refuses one for another', async () => {
    const { payload, calls } = fakePayload()
    const reader = payloadCatalogue(payload, { only: 'shop' })
    await reader.find({
      collection: 'products',
      where: { and: [{ _status: { equals: 'published' } }, { site: { equals: 'shop' } }] },
      select: { name: true },
      limit: 4,
      locale: 'en',
      depth: 1,
    })
    expect(calls[0]?.[1]).toMatchObject({
      where: { and: [{ _status: { equals: 'published' } }] },
      overrideAccess: false,
    })
    expect(() => scopedWhere({ and: [{ site: { equals: 'gallery' } }] }, 'shop')).toThrow('refused')
    // Today's one CMS keeps the clause: its records carry `site`.
    const kept = { and: [{ site: { equals: 'shop' } }] }
    expect(scopedWhere(kept, undefined)).toBe(kept)
  })

  it('writes and filters no site, and reads each session as that site’s', async () => {
    const { payload, calls } = fakePayload({
      create: () => UNSITED,
      findByID: () => UNSITED,
      find: () => ({ docs: [] }),
    })
    const store = payloadStore(payload, { only: 'shop' })
    const created = await store.createSession({
      site: 'shop',
      locale: 'en',
      startedAt: '2026-10-03T03:00:00.000Z',
      ipHash: 'h',
      labels: [],
    })
    expect(created.site).toBe('shop')
    expect(calls[0]?.[1]).not.toHaveProperty('data.site')
    expect((await store.getSession('7'))?.site).toBe('shop')
    await store.spentSince('shop', new Date('2026-10-03T00:00:00.000Z'))
    await store.createLead({
      site: 'shop',
      kind: 'ask',
      sessionId: '7',
      name: 'Ann',
      whatsapp: '+6281234567890',
      email: null,
      preferredChannel: 'whatsapp',
      message: 'a tote',
      locale: 'en',
      consentVersion: 'v',
      consentAt: '2026-10-03T04:00:00.000Z',
      workIds: [],
    })
    expect(JSON.stringify(calls.map(([, args]) => args))).not.toContain('"site"')
  })

  it('serves exactly one site’s chat when its records carry no site', () => {
    expect(onlySiteOf(true, { gallery: {} as never, shop: {} as never })).toBeUndefined()
    expect(onlySiteOf(false, { shop: {} as never })).toBe('shop')
    expect(() => onlySiteOf(false, { gallery: {} as never, shop: {} as never })).toThrow()
  })

  it('gives an image its public derivative once published, else its own file', () => {
    const reader = payloadCatalogue(fakePayload().payload)
    vi.stubEnv('MEDIA_PUBLIC_URL', 'https://media.example.org')
    const own = { url: '/api/media/file/a.jpg', filename: 'a.jpg' }
    expect(reader.imageUrl?.(own)).toBe('/api/media/file/a.jpg')
    const published = {
      ...own,
      width: 800,
      assetId: 'a'.repeat(32),
      derivatives: { status: 'ready' },
    }
    expect(reader.imageUrl?.(published)).toMatch(/^https:\/\/media\.example\.org\/.+\.webp$/)
    vi.unstubAllEnvs()
  })
})
