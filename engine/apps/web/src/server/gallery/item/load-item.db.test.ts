/**
 * 5.2.b on a real database: the item loader never shows a draft, never carries a price or a
 * staff field, and answers `null` for an id that names nothing. The schema is pushed
 * (`works.test-support`); without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadItem, queryItem } from './load-item'
import {
  startWorksStack,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)('the gallery item loader', () => {
  let stack: WorksStack
  let publicId: number

  /** A create that carries the invalidation batch's context (`work-invalidate`). */
  const create = (args: { collection: string; data: object }) =>
    invalidationBatch().operation((context) =>
      stack.api.create({ ...args, context }),
    ) as ReturnType<typeof stack.api.create>

  beforeAll(async () => {
    stack = await startWorksStack('web_item_test', (config, key) => getPayload({ config, key }))
    const recto = await stack.media('recto')
    const maker = await create({
      collection: 'makers',
      data: { name: 'François Valentijn', sortName: 'VALENTIJN, François', _status: 'published' },
    })
    const place = await create({
      collection: 'places',
      data: { name: 'Bali', slug: 'bali', _status: 'published' },
    })
    const grade = await create({
      collection: 'terms',
      data: { kind: 'grade', label: 'VG+', definition: 'Very good, nearly fine.', equivalent: 'A', _status: 'published' },
    })
    const subject = await create({
      collection: 'terms',
      data: { kind: 'subject', label: 'VOC', _status: 'published' },
    })
    const published = await create({
      collection: 'works',
      data: {
        title: 'Bali by François Valentijn',
        objectType: 'map',
        technique: 'copperplate-engraving',
        status: 'available',
        stockNumber: 'M.0500',
        makers: [{ maker: maker.id, role: 'cartographer', certainty: 'certain' }],
        places: [{ place: place.id, role: 'depicts', primary: true }],
        date: { precision: 'exact', from: 1726 },
        condition: { grade: grade.id, notes: 'Old folds as issued.' },
        subjects: [subject.id],
        references: [{ citation: 'Tooley (Australia) 1268' }],
        provenance: [{ holder: 'A private collector, Singapore', period: '1990s' }],
        images: [{ media: recto }],
        _status: 'published',
      },
    })
    publicId = Number(published.publicId)
    // A draft twin: same shape, never published — the loader must not see it.
    await create({
      collection: 'works',
      data: {
        title: 'A draft the visitor never reads',
        objectType: 'map',
        makers: [{ maker: maker.id, role: 'cartographer', certainty: 'certain' }],
        places: [{ place: place.id, role: 'depicts', primary: true }],
        date: { precision: 'exact', from: 1726 },
        images: [{ media: recto }],
        _status: 'draft',
      },
    })
  })

  afterAll(async () => {
    await stack.stop()
  })

  it('a draft is null', async () => {
    // The draft's own public id is assigned on save; find it through the admin read.
    const drafts = await stack.payload.find({
      collection: 'works',
      where: { _status: { equals: 'draft' } },
      overrideAccess: true,
      limit: 1,
    })
    const draftPublicId = String((drafts.docs[0] as { publicId: number }).publicId)
    expect(await queryItem(stack.payload, Number(draftPublicId), 'en', 'Date unknown')).toBeNull()
  })

  it('the projection carries no askingPrice', async () => {
    const view = await queryItem(stack.payload, publicId, 'en', 'Date unknown')
    expect(view).not.toBeNull()
    const json = JSON.stringify(view)
    expect(json).not.toContain('askingPrice')
    expect(json).not.toContain('physical')
    expect(json).not.toContain('cataloguing')
    // The fields the page shows, it does show.
    expect(view?.title).toBe('Bali by François Valentijn')
    expect(view?.maker?.name).toBe('François Valentijn')
    expect(view?.stockNumber).toBe('M.0500')
    expect(view?.images.length).toBeGreaterThan(0)
    expect(view?.images[0]?.alt).not.toBe('')
  })

  it('an unknown id is null', async () => {
    expect(await queryItem(stack.payload, 999999999, 'en', 'Date unknown')).toBeNull()
  })

  it('a malformed id is null', async () => {
    expect(await loadItem('abc', 'en', 'Date unknown')).toBeNull()
    expect(await loadItem('', 'en', 'Date unknown')).toBeNull()
    expect(await loadItem('12; drop table works', 'en', 'Date unknown')).toBeNull()
  })
})
