/**
 * The vocabulary's publish step (`./publish`) over a fake Local API: it publishes the named
 * drafts only, in the order given, sends `_status` alone (plus a blank-only fill), passes the
 * caller's request — and so its cache collector — on every write, and holds what Payload refuses.
 */
import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { fillKey, publishVocabulary } from './publish'

type Row = Record<string, unknown> & { id: number; _status: 'draft' | 'published' }
type Update = { collection: string; id: number; data: Record<string, unknown>; req: unknown }

function fakePayload(rows: Record<string, Row[]>, refuse: ReadonlySet<string> = new Set()) {
  const updates: Update[] = []
  const payload = {
    find: async (args: { collection: string; where: unknown }) => {
      const where = args.where as { and: [{ id: { in: number[] } }, unknown] }
      const ids = where.and[0].id.in
      // Newest first, as Payload's default sort answers: the step must not depend on it.
      const docs = (rows[args.collection] ?? [])
        .filter((row) => ids.includes(row.id) && row._status !== 'published')
        .reverse()
      return { docs }
    },
    update: async (args: Update) => {
      if (refuse.has(`${args.collection}:${args.id}`)) throw new Error('The field is invalid.')
      updates.push(args)
      const row = rows[args.collection]!.find((each) => each.id === args.id)!
      Object.assign(row, args.data)
      return row
    },
  } as unknown as Payload
  return { payload, updates }
}

const req = { context: { collector: 'cli' } } as unknown as PayloadRequest

describe('publishVocabulary', () => {
  it('publishes the named drafts only, in order, sending _status alone', async () => {
    const { payload, updates } = fakePayload({
      places: [
        { id: 1, _status: 'draft', name: 'Java' },
        { id: 2, _status: 'published', name: 'Bali' },
        { id: 3, _status: 'draft', name: 'Jakarta' },
        { id: 9, _status: 'draft', name: 'Not seeded' },
      ],
      makers: [{ id: 5, _status: 'draft', name: 'Blaeu' }],
      terms: [],
    })
    const report = await publishVocabulary(payload, req, {
      places: [1, 2, 3],
      terms: [],
      makers: [5],
    })
    expect(report).toEqual({ places: 2, terms: 0, makers: 1, held: [] })
    expect(updates.map((u) => `${u.collection}:${u.id}`)).toEqual([
      'places:1',
      'places:3',
      'makers:5',
    ])
    for (const update of updates) {
      expect(update.data).toEqual({ _status: 'published' })
      expect(update.req).toBe(req)
    }
  })

  it('publishes nothing on a second run', async () => {
    const { payload, updates } = fakePayload({
      places: [{ id: 1, _status: 'draft' }],
      terms: [],
      makers: [],
    })
    await publishVocabulary(payload, req, { places: [1], terms: [], makers: [] })
    const again = await publishVocabulary(payload, req, { places: [1], terms: [], makers: [] })
    expect(again).toEqual({ places: 0, terms: 0, makers: 0, held: [] })
    expect(updates).toHaveLength(1)
  })

  it('fills a publish-only field the row left blank, and never one it holds', async () => {
    const { payload, updates } = fakePayload({
      places: [],
      makers: [],
      terms: [
        { id: 10, _status: 'draft', kind: 'grade', equivalent: null },
        { id: 11, _status: 'draft', kind: 'grade', equivalent: 'B/C' },
      ],
    })
    const fill = new Map([
      [fillKey('terms', 10), { equivalent: 'A' }],
      [fillKey('terms', 11), { equivalent: 'B+' }],
    ])
    await publishVocabulary(payload, req, { places: [], terms: [10, 11], makers: [], fill })
    expect(updates.map((u) => u.data)).toEqual([
      { _status: 'published', equivalent: 'A' },
      { _status: 'published' },
    ])
  })

  it('holds a row Payload refuses and goes on', async () => {
    const { payload } = fakePayload(
      {
        places: [
          { id: 1, _status: 'draft' },
          { id: 2, _status: 'draft' },
        ],
        terms: [],
        makers: [],
      },
      new Set(['places:1']),
    )
    const report = await publishVocabulary(payload, req, { places: [1, 2], terms: [], makers: [] })
    expect(report.places).toBe(1)
    expect(report.held).toEqual(['places #1: The field is invalid.'])
  })
})
