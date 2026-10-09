/**
 * The card projection on a real database: a card names its maker and place only while those
 * records are published. The populated relations are read under the visitor's access
 * (`overrideAccess: false`), so a maker or place pulled back to draft is dropped from the card —
 * never shown, never leaked. A change to how a card populates its relations must keep this.
 * Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { projectCards } from './projection'
import {
  startWorksStack,
  vocabulary,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)('card projection and drafts', () => {
  let stack: WorksStack
  let liveId: number
  let draftedId: number

  const create = (collection: string, data: object) =>
    invalidationBatch().operation((context) =>
      stack.api.create({ collection, data, context, overrideAccess: true }),
    )

  const draftOut = (collection: string, id: number) =>
    invalidationBatch().operation((context) =>
      stack.api.update({
        collection,
        id,
        data: { _status: 'draft' }, // unpublish: the published row goes back to draft
        overrideAccess: true,
        context,
      }),
    )

  beforeAll(async () => {
    stack = await startWorksStack('web_card_test', (config, key) => getPayload({ config, key }))
    const base = await vocabulary(stack.api)
    const recto = await stack.media('recto')
    const maker = (name: string) =>
      create('makers', { name, sortName: name.toUpperCase(), _status: 'published' })
    const place = (name: string, slug: string) =>
      create('places', { name, slug, _status: 'published' })
    const live = { maker: await maker('Live Maker'), place: await place('Live Place', 'live') }
    const gone = {
      maker: await maker('Drafted Maker'),
      place: await place('Drafted Place', 'gone'),
    }

    const work = (title: string, who: typeof live) =>
      create('works', {
        title,
        objectType: 'map',
        date: { precision: 'circa', from: 1726 },
        makers: [{ maker: who.maker.id, role: 'cartographer', certainty: 'attributed' }],
        places: [{ place: who.place.id, role: 'depicts', primary: true }],
        subjects: [base.subject],
        condition: { grade: base.grade },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 } },
        _status: 'published',
      })
    liveId = Number((await work('Map with live relations', live)).id)
    draftedId = Number((await work('Map with drafted relations', gone)).id)

    // Pull the second work's maker and place back to draft: the work stays published.
    await draftOut('makers', gone.maker.id)
    await draftOut('places', gone.place.id)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('names a published maker and place, and an image from the work', async () => {
    const [card] = await projectCards(stack.payload, [liveId], 'en', 'Date unknown')
    expect(card?.maker?.name).toBe('Live Maker')
    expect(card?.place?.name).toBe('Live Place')
    expect(card?.image).not.toBeNull()
  }, 30_000)

  it('never shows a maker or place that is not published', async () => {
    const cards = await projectCards(stack.payload, [liveId, draftedId], 'en', 'Date unknown')
    expect(cards).toHaveLength(2)
    expect(cards[1]?.title).toBe('Map with drafted relations')
    expect(cards[1]?.maker).toBeNull()
    expect(cards[1]?.place).toBeNull()
    expect(JSON.stringify(cards)).not.toContain('Drafted')
  }, 30_000)
})
