/**
 * The vocabulary's invalidation hooks on a real Payload (5.1 stale browse): which saves of a place,
 * maker or term hand `catalogue:gallery` to the caller's collector — Payload's own `doc` and
 * `previousDoc` on a create, a publish, an edit, a draft revision, an unpublish and a delete — and
 * that a write outside a request with no collector fails rather than leave a listing stale. A
 * pushed throwaway database (`../collections/places/pushed-database.test-support`); without
 * `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch, type RequestContext } from '@engine/cache'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createPushedDatabase, type Pool } from '../collections/places/pushed-database.test-support'

const server = process.env.CMS_TEST_POSTGRES_URL
const CATALOGUE = ['catalogue:gallery']

describe.skipIf(!server)('the vocabulary’s cache tags on a real database', () => {
  const db = {} as { payload: Payload; pool: Pool }
  let drop: () => Promise<void> = async () => {}

  beforeAll(async () => {
    const pushed = await createPushedDatabase(server!, 'cms_vocab_invalidate_test')
    drop = pushed.drop
    db.payload = await getPayload({ config: pushed.config, key: pushed.database })
    db.pool = (db.payload.db as unknown as { pool: Pool }).pool
  }, 180_000)

  afterAll(async () => {
    if (!db.payload) return
    db.pool.on?.('error', () => {})
    await db.payload.destroy()
    await drop()
  }, 60_000)

  /** One write under a fresh batch, and the tags its hooks handed over. */
  async function tagsOf<T>(write: (context: RequestContext) => Promise<T>) {
    const batch = invalidationBatch()
    const doc = await batch.operation(write)
    return { doc, tags: batch.pending }
  }

  it('a place: drafts never published → nothing; published, edited, revised, unpublished → the catalogue', async () => {
    const created = await tagsOf((context) =>
      db.payload.create({ collection: 'places', data: { name: 'Java', slug: 'java' }, context }),
    )
    expect(created.doc._status).toBe('draft')
    expect(created.tags).toEqual([])
    const id = created.doc.id

    const update = (data: object, draft = false) =>
      tagsOf((context) =>
        db.payload.update({ collection: 'places', id, data, draft, context }),
      ).then(({ tags }) => tags)

    expect(await update({ name: 'Jawa' }), 'a draft over a draft').toEqual([])
    expect(await update({ _status: 'published' }), 'publish').toEqual(CATALOGUE)
    expect(await update({ historicalNames: [{ name: 'Iava', language: 'la' }] }), 'edit').toEqual(
      CATALOGUE,
    )
    expect(await update({ name: 'Java' }, true), 'a draft revision').toEqual(CATALOGUE)
    // Payload's previousDoc is the draft revision, so this unpublish reads draft → draft: the hook
    // asks whether the place was ever published (`./published-state`).
    expect(await update({ _status: 'draft' }), 'unpublish after a revision').toEqual(CATALOGUE)
    // A draft edit of a once-published place over-invalidates by the same rule: one recompute.
    expect(await update({ name: 'Java again' }), 'a draft once published').toEqual(CATALOGUE)
  })

  it('a delete: a published maker expires the catalogue, a draft term nothing', async () => {
    const maker = await tagsOf((context) =>
      db.payload.create({
        collection: 'makers',
        data: { name: 'Jan Luyken', sortName: 'LUYKEN, Jan', _status: 'published' },
        context,
      }),
    )
    expect(maker.tags).toEqual(CATALOGUE)
    const deleted = await tagsOf((context) =>
      db.payload.delete({ collection: 'makers', id: maker.doc.id, context }),
    )
    expect(deleted.tags).toEqual(CATALOGUE)

    const term = await tagsOf((context) =>
      db.payload.create({ collection: 'terms', data: { kind: 'subject', label: 'VOC' }, context }),
    )
    expect(term.tags).toEqual([])
    const gone = await tagsOf((context) =>
      db.payload.delete({ collection: 'terms', id: term.doc.id, context }),
    )
    expect(gone.tags).toEqual([])
  })

  it('outside a request with no collector, a published save fails — nothing stale', async () => {
    await expect(
      db.payload.create({
        collection: 'terms',
        data: { kind: 'subject', label: 'Batik', _status: 'published' },
      }),
    ).rejects.toThrow(/outside a request scope/)
  })
})
