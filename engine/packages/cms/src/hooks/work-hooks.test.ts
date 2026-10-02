/**
 * The works hooks without a database (TASKS.md 8.2.d, 8.2.e): which writes the synced-field guard
 * refuses, what the uid and cataloguing hooks allow, and which tags a change hands to the
 * caller's collector. Their database proofs are `collections/works/works.db.test.ts`.
 */
import { invalidationBatch } from '@engine/cache'
import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { stampCataloguing } from './work-cataloguing'
import { mergeOver } from './work-facts'
import { invalidateWorkOnChange, invalidateWorkOnDelete, worksListingTags } from './work-invalidate'
import { stillUsedMessage } from './work-references'
import { isSisterSync, keepSyncedFields, SISTER_SYNC_CONTEXT } from './work-synced'
import { assignWorkUid } from './work-uid'

type Hook = (args: never) => unknown
const run = (hook: Hook, args: Record<string, unknown>) =>
  Promise.resolve().then(() => hook(args as never))
const req = (over: Record<string, unknown> = {}) => ({
  payloadAPI: 'REST',
  user: { collection: 'users', roles: ['cataloguer'] },
  context: {},
  t: ((key: string) => key) as never,
  ...over,
})
const errorsOf = async (outcome: Promise<unknown>) => {
  try {
    await outcome
  } catch (error) {
    if (error instanceof ValidationError) return error.data.errors.map((e) => e.path)
    throw error
  }
  return []
}

const copy = {
  id: 7,
  workUid: 'TE-000007',
  title: 'Bali, 1726',
  objectType: 'map',
  origin: { brand: 'origin-brand', workUid: 'TG-000123', syncedAt: '2026-09-30T00:00:00.000Z' },
}

describe('a provenance copy’s synced fields reject edits (8.2.d)', () => {
  const update = (data: object, over: Record<string, unknown> = {}) =>
    run(keepSyncedFields, { data, operation: 'update', originalDoc: copy, req: req(over) })

  it('refuses a person’s edit of a synced field, by any API, path by path', async () => {
    expect(await errorsOf(update({ title: 'Bali, c. 1726', objectType: 'print' }))).toEqual([
      'title',
      'objectType',
    ])
    expect(await errorsOf(update({ title: 'x' }, { payloadAPI: 'local' }))).toEqual(['title'])
  })

  it('lets the copy’s own fields change, and a re-sent synced value stand', async () => {
    expect(
      await errorsOf(update({ title: 'Bali, 1726', seo: { title: 'Ours' }, images: [] })),
    ).toEqual([])
  })

  it('lets the sister importer — the Local API, no user, its context — write them', async () => {
    const sync = { payloadAPI: 'local', user: null, context: { [SISTER_SYNC_CONTEXT]: true } }
    expect(isSisterSync(sync as never)).toBe(true)
    expect(await errorsOf(update({ title: 'Bali, c. 1726' }, sync))).toEqual([])
    expect(isSisterSync({ ...sync, payloadAPI: 'REST' } as never)).toBe(false)
    expect(isSisterSync({ ...sync, user: { collection: 'users' } } as never)).toBe(false)
  })

  it('refuses making a copy, or changing its origin, by hand — and a physical record on one', async () => {
    const create = run(keepSyncedFields, {
      data: { origin: { workUid: 'TG-000001' } },
      operation: 'create',
      req: req(),
    })
    expect(await errorsOf(create)).toEqual(['origin'])
    expect(await errorsOf(update({ origin: { ...copy.origin, workUid: 'TG-000999' } }))).toEqual([
      'origin',
    ])
    expect(await errorsOf(update({ physical: { exportStatus: 'cleared' } }))).toEqual(['physical'])
    expect(await errorsOf(update({ physical: { location: null, coaIssued: false } }))).toEqual([])
  })

  it('leaves a work that is no copy alone', async () => {
    const own = { ...copy, origin: { brand: null, workUid: null, syncedAt: null } }
    const outcome = run(keepSyncedFields, {
      data: { title: 'Anything' },
      operation: 'update',
      originalDoc: own,
      req: req(),
    })
    expect(await errorsOf(outcome)).toEqual([])
  })
})

describe('the work uid is never changed (CONTENT-MODEL.md §1)', () => {
  it('refuses an update that changes it, and lets one that re-sends it through', async () => {
    const update = (workUid: unknown) =>
      run(assignWorkUid, { data: { workUid }, operation: 'update', originalDoc: copy, req: req() })
    expect(await errorsOf(update('TE-000008'))).toEqual(['workUid'])
    expect(await errorsOf(update('TE-000007'))).toEqual([])
    const local = req({ payloadAPI: 'local', user: null })
    expect(
      await errorsOf(
        run(assignWorkUid, {
          data: { workUid: null },
          operation: 'update',
          originalDoc: copy,
          req: local,
        }),
      ),
    ).toEqual(['workUid'])
  })
})

describe('cataloguing: verifying is a cataloguer’s claim', () => {
  const save = (cataloguing: object, roles = ['cataloguer'], before: object = {}) =>
    run(stampCataloguing, {
      data: { cataloguing },
      operation: 'update',
      originalDoc: { cataloguing: before },
      req: req({ user: { collection: 'users', roles } }),
    })

  it('stamps the moment of verification, and clears it when the record is no longer verified', async () => {
    const verified = (await save({ status: 'verified' })) as { cataloguing: { verifiedAt: string } }
    expect(Date.parse(verified.cataloguing.verifiedAt)).not.toBeNaN()
    const kept = (await save({ status: 'verified' }, ['cataloguer'], {
      status: 'verified',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    })) as { cataloguing: { verifiedAt: string } }
    expect(kept.cataloguing.verifiedAt).toBe('2026-01-01T00:00:00.000Z')
    const back = (await save({ status: 'catalogued' }, ['cataloguer'], { status: 'verified' })) as {
      cataloguing: { verifiedAt: unknown }
    }
    expect(back.cataloguing.verifiedAt).toBeNull()
  })

  it('refuses a contributor’s verification, and any while an AI draft is unchecked', async () => {
    expect(await errorsOf(save({ status: 'verified' }, ['contributor']))).toEqual([
      'cataloguing.status',
    ])
    expect(await errorsOf(save({ status: 'verified', aiDraft: ['title'] }))).toEqual([
      'cataloguing.status',
    ])
  })
})

describe('after the commit: the work’s tags, to the caller’s collector (8.2.e)', () => {
  const published = { workUid: 'TG-000123', _status: 'published' }

  it('hands work:<uid> to the collector — never revalidating on the spot', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateWorkOnChange({ doc: published, previousDoc: {}, context } as never),
    )
    expect(batch.pending).toEqual(['work:TG-000123'])
  })

  it('expires nothing for a draft saved over a draft, and a published work’s tags otherwise', async () => {
    const batch = invalidationBatch()
    const change = (doc: object, previousDoc: object) =>
      batch.operation((context) => invalidateWorkOnChange({ doc, previousDoc, context } as never))
    await change({ ...published, _status: 'draft' }, {})
    await change({ ...published, _status: 'draft' }, { ...published, _status: 'draft' })
    expect(batch.pending).toEqual([])
    await change({ ...published, _status: 'draft' }, published) // a draft over the published one
    expect(batch.pending).toEqual(['work:TG-000123'])
  })

  it('expires a deleted published work, not a deleted draft', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateWorkOnDelete({ doc: { ...published, _status: 'draft' }, context } as never),
    )
    expect(batch.pending).toEqual([])
    await batch.operation((context) => invalidateWorkOnDelete({ doc: published, context } as never))
    expect(batch.pending).toEqual(['work:TG-000123'])
  })

  it('outside a request with no collector, fails the save rather than leave a stale page', () => {
    expect(() =>
      invalidateWorkOnChange({ doc: published, previousDoc: {}, context: {} } as never),
    ).toThrow(/outside a request scope/)
  })

  it('names only uids @engine/cache can tag', () => {
    expect(worksListingTags({ workUid: 'not a uid' })).toEqual([])
    expect(worksListingTags({ workUid: 'TG-000001' }, { workUid: 'TG-000001' })).toEqual([
      'work:TG-000001',
    ])
  })
})

describe('helpers', () => {
  it('merge a partial save over what is stored, group by group', () => {
    expect(
      mergeOver(
        { title: 'a', condition: { grade: 3, notes: 'n' }, images: [{ media: 1 }] },
        { condition: { notes: 'm' }, images: [] },
      ),
    ).toEqual({ title: 'a', condition: { grade: 3, notes: 'm' }, images: [] })
  })

  it('say "still used by N works"', () => {
    expect(stillUsedMessage('makers', 1)).toMatch(/^This maker is still used by 1 work /)
    expect(stillUsedMessage('terms', 3)).toMatch(/^This term is still used by 3 works /)
  })
})
