/**
 * The product hooks without a database (6-followup-2 B, mirroring `./work-hooks.test`): which tags
 * a change hands to the caller's collector. The database proof is the products collection's own
 * tests.
 */
import { invalidationBatch } from '@engine/cache'
import { describe, expect, it } from 'vitest'

import {
  invalidateProductOnChange,
  invalidateProductOnDelete,
  productListingTags,
} from './product-invalidate'

describe('after the commit: a product’s tags, to the caller’s collector', () => {
  const published = { id: 123, _status: 'published' }

  it('hands product:<id> and catalogue:shop to the collector — never revalidating on the spot', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateProductOnChange({ doc: published, previousDoc: {}, context } as never),
    )
    expect(batch.pending).toEqual(['product:123', 'catalogue:shop'])
  })

  it('a publish, an edit of a published product and an unpublish each expire the listings', async () => {
    const draft = { ...published, _status: 'draft' }
    for (const [doc, previousDoc, what] of [
      [published, draft, 'publish'],
      [{ ...published, name: 'Renamed' }, published, 'edit'],
      [draft, published, 'unpublish'],
    ] as const) {
      const batch = invalidationBatch()
      await batch.operation((context) =>
        invalidateProductOnChange({ doc, previousDoc, context } as never),
      )
      expect(batch.pending, what).toEqual(['product:123', 'catalogue:shop'])
    }
  })

  it('expires nothing for a draft saved over a draft, and a published product’s tags otherwise', async () => {
    const batch = invalidationBatch()
    const change = (doc: object, previousDoc: object) =>
      batch.operation((context) => invalidateProductOnChange({ doc, previousDoc, context } as never))
    await change({ ...published, _status: 'draft' }, {})
    await change({ ...published, _status: 'draft' }, { ...published, _status: 'draft' })
    expect(batch.pending).toEqual([])
    await change({ ...published, _status: 'draft' }, published) // a draft over the published one
    expect(batch.pending).toEqual(['product:123', 'catalogue:shop'])
  })

  it('expires a deleted published product, not a deleted draft', async () => {
    const batch = invalidationBatch()
    await batch.operation((context) =>
      invalidateProductOnDelete({ doc: { ...published, _status: 'draft' }, context } as never),
    )
    expect(batch.pending).toEqual([])
    await batch.operation((context) =>
      invalidateProductOnDelete({ doc: published, context } as never),
    )
    expect(batch.pending).toEqual(['product:123', 'catalogue:shop'])
  })

  it('outside a request with no collector, fails the save rather than leave a stale page', async () => {
    await expect(
      invalidateProductOnChange({ doc: published, previousDoc: {}, context: {} } as never),
    ).rejects.toThrow(/outside a request scope/)
  })

  it('names only ids @engine/cache can tag, and always the shop’s listings', () => {
    expect(productListingTags({})).toEqual(['catalogue:shop'])
    expect(productListingTags({ id: 7 })).toEqual(['product:7', 'catalogue:shop'])
  })
})
