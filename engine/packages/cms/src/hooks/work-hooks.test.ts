/**
 * The works hooks without a database (TASKS.md 8.2.d, 8.2.e): what the uid and cataloguing hooks
 * allow, and which tags a change hands to the
 * caller's collector. Their database proofs are `collections/works/works.db.test.ts`.
 */
import { invalidationBatch } from '@engine/cache'
import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { stampCataloguing } from './work-cataloguing'
import { mergeOver } from './work-facts'
import {
  invalidateWorkOnChange,
  invalidateWorkOnDelete,
  isStatusTransition,
  worksListingTags,
} from './work-invalidate'
import { stillUsedMessage } from './work-references'
import { assignWorkUid } from './work-uid'

type Hook = (args: never) => unknown
const run = (hook: Hook, args: Record<string, unknown>) =>
  Promise.resolve().then(() => hook(args as never))
const req = (over: Record<string, unknown> = {}) => ({
  payloadAPI: 'REST',
  user: { collection: 'users', role: 'editor' },
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

const work = { id: 7, workUid: 'IG-000007', title: 'Bali, 1726', objectType: 'map' }

describe('the work uid is never changed (CONTENT-MODEL.md §1)', () => {
  it('refuses an update that changes it, and lets one that re-sends it through', async () => {
    const update = (workUid: unknown) =>
      run(assignWorkUid, { data: { workUid }, operation: 'update', originalDoc: work, req: req() })
    expect(await errorsOf(update('IG-000008'))).toEqual(['workUid'])
    expect(await errorsOf(update('IG-000007'))).toEqual([])
    const local = req({ payloadAPI: 'local', user: null })
    expect(
      await errorsOf(
        run(assignWorkUid, {
          data: { workUid: null },
          operation: 'update',
          originalDoc: work,
          req: local,
        }),
      ),
    ).toEqual(['workUid'])
  })
})

describe('cataloguing: verifying is the owner’s or an editor’s claim', () => {
  const save = (cataloguing: object, role = 'editor', before: object = {}) =>
    run(stampCataloguing, {
      data: { cataloguing },
      operation: 'update',
      originalDoc: { cataloguing: before },
      req: req({ user: { collection: 'users', role, store: 1 } }),
    })

  it('stamps the moment of verification, and clears it when the record is no longer verified', async () => {
    const verified = (await save({ status: 'verified' })) as { cataloguing: { verifiedAt: string } }
    expect(Date.parse(verified.cataloguing.verifiedAt)).not.toBeNaN()
    const kept = (await save({ status: 'verified' }, 'owner', {
      status: 'verified',
      verifiedAt: '2026-01-01T00:00:00.000Z',
    })) as { cataloguing: { verifiedAt: string } }
    expect(kept.cataloguing.verifiedAt).toBe('2026-01-01T00:00:00.000Z')
    const back = (await save({ status: 'catalogued' }, 'editor', { status: 'verified' })) as {
      cataloguing: { verifiedAt: unknown }
    }
    expect(back.cataloguing.verifiedAt).toBeNull()
  })

  it('refuses a store user’s verification, and any while an AI draft is unchecked', async () => {
    expect(await errorsOf(save({ status: 'verified' }, 'store'))).toEqual(['cataloguing.status'])
    expect(
      await errorsOf(save({ status: 'verified', aiDraft: { title: { drafted: true } } })),
    ).toEqual(['cataloguing.status'])
  })
})

describe('after the commit: the work’s tags, to the caller’s collector (8.2.e)', () => {
  const published = { workUid: 'TG-000123', _status: 'published' }

  it('hands work:<uid> and catalogue:gallery to the collector — never revalidating on the spot', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateWorkOnChange({ doc: published, previousDoc: {}, context } as never),
    )
    expect(batch.pending).toEqual(['work:TG-000123', 'catalogue:gallery'])
  })

  it('a publish, an edit of a published work and an unpublish each expire the listings', async () => {
    const draft = { ...published, _status: 'draft' }
    for (const [doc, previousDoc, what] of [
      [published, draft, 'publish'],
      [{ ...published, title: 'Renamed' }, published, 'edit'],
      [draft, published, 'unpublish'],
    ] as const) {
      const batch = invalidationBatch()
      await batch.operation((context) =>
        invalidateWorkOnChange({ doc, previousDoc, context } as never),
      )
      expect(batch.pending, what).toEqual(['work:TG-000123', 'catalogue:gallery'])
    }
  })

  it('expires nothing for a draft saved over a draft, and a published work’s tags otherwise', async () => {
    const batch = invalidationBatch()
    const change = (doc: object, previousDoc: object) =>
      batch.operation((context) => invalidateWorkOnChange({ doc, previousDoc, context } as never))
    await change({ ...published, _status: 'draft' }, {})
    await change({ ...published, _status: 'draft' }, { ...published, _status: 'draft' })
    expect(batch.pending).toEqual([])
    await change({ ...published, _status: 'draft' }, published) // a draft over the published one
    expect(batch.pending).toEqual(['work:TG-000123', 'catalogue:gallery'])
  })

  it('expires a deleted published work, not a deleted draft', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateWorkOnDelete({ doc: { ...published, _status: 'draft' }, context } as never),
    )
    expect(batch.pending).toEqual([])
    await batch.operation((context) => invalidateWorkOnDelete({ doc: published, context } as never))
    expect(batch.pending).toEqual(['work:TG-000123', 'catalogue:gallery'])
  })

  it('outside a request with no collector, fails the save rather than leave a stale page', async () => {
    await expect(
      invalidateWorkOnChange({ doc: published, previousDoc: {}, context: {} } as never),
    ).rejects.toThrow(/outside a request scope/)
  })

  it('names only uids @engine/cache can tag, and always the gallery’s listings', () => {
    expect(worksListingTags({ workUid: 'not a uid' })).toEqual(['catalogue:gallery'])
    expect(worksListingTags({ workUid: 'TG-000001' }, { workUid: 'TG-000001' })).toEqual([
      'work:TG-000001',
      'catalogue:gallery',
    ])
  })
})

describe('a status move expires at once; a plain edit does not (5.3sold, EXPERIENCE-GALLERY.md §9)', () => {
  const available = { workUid: 'TG-000123', _status: 'published', status: 'available' }
  const target = { origin: 'https://shop.example', secret: 's' }

  /** A recording `fetch`, standing in for the web process `/api/x/revalidate` posts to. */
  function recorder() {
    const posts: string[] = []
    const fetch = (async (_url: URL | string, init: RequestInit = {}) => {
      posts.push(String(init.body))
      return new Response(null, { status: 204 })
    }) as typeof globalThis.fetch
    return { posts, fetch }
  }

  it('isStatusTransition: a status move, or a publish or unpublish — never a plain edit', () => {
    expect(isStatusTransition({ ...available, status: 'sold' }, available)).toBe(true)
    expect(isStatusTransition({ ...available, status: 'on-hold' }, available)).toBe(true)
    expect(isStatusTransition({ ...available }, available)).toBe(false)
    expect(isStatusTransition(available, { ...available, _status: 'draft' })).toBe(true) // a publish
    expect(isStatusTransition({ ...available, _status: 'draft' }, available)).toBe(true) // an unpublish
  })

  it('marking a work sold flushes with "now": true — gone at once, not stale-while-revalidate', async () => {
    const { posts, fetch } = recorder()
    const batch = invalidationBatch({ target, fetch })
    await batch.operation((context) =>
      invalidateWorkOnChange({
        doc: { ...available, status: 'sold' },
        previousDoc: available,
        context,
      } as never),
    )
    await batch.flush()
    expect(JSON.parse(posts[0]!)).toEqual({
      tags: ['work:TG-000123', 'catalogue:gallery'],
      now: true,
    })
  })

  it('a title edit of a published work flushes the default body: no "now" key at all', async () => {
    const { posts, fetch } = recorder()
    const batch = invalidationBatch({ target, fetch })
    await batch.operation((context) =>
      invalidateWorkOnChange({
        doc: { ...available, title: 'Renamed' },
        previousDoc: available,
        context,
      } as never),
    )
    await batch.flush()
    expect(JSON.parse(posts[0]!)).toEqual({ tags: ['work:TG-000123', 'catalogue:gallery'] })
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
