/**
 * The maker page's reads on a real database (5.4.a): published only, available works before sold
 * ones, a draft work never listed, no `askingPrice` anywhere in the answer.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startWorksStack,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'
import { loadMakerIndexWith, loadMakerWith } from './queries'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'the gallery maker page on a real database',
  () => {
    let stack: WorksStack
    let valentijnId: number

    const publish = (data: object) =>
      invalidationBatch().operation((context) =>
        stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('web_maker_test', (config, key) => getPayload({ config, key }))
      const recto = await stack.media('recto')

      const valentijn = await stack.api.create({
        collection: 'makers',
        data: {
          name: 'François Valentijn',
          sortName: 'VALENTIJN, François',
          roles: ['cartographer'],
          born: { precision: 'exact', from: 1666 },
          died: { precision: 'exact', from: 1727 },
          _status: 'published',
        },
      })
      valentijnId = Number(valentijn.id)

      const batavia = await stack.api.create({
        collection: 'places',
        data: { name: 'Batavia', slug: 'batavia', _status: 'published' },
      })
      const grade = await stack.api.create({
        collection: 'terms',
        data: { kind: 'grade', label: 'VG+', definition: 'Very good.', equivalent: 'A' },
      })

      const complete = (over: object) => ({
        objectType: 'map',
        date: { precision: 'circa', from: 1726 },
        makers: [{ maker: valentijn.id, role: 'cartographer', certainty: 'attributed' }],
        places: [{ place: batavia.id, role: 'depicts', primary: true }],
        condition: { grade: grade.id },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
        ...over,
      })

      await publish(complete({ title: 'Kaart van Java', stockNumber: 'M.0501' }))
      await publish(complete({ title: 'Sold chart', stockNumber: 'M.0502', status: 'sold' }))
      // One work crediting the maker twice: one card on the page, one in the index's count.
      await publish(
        complete({
          title: 'Twice credited view',
          stockNumber: 'M.0504',
          makers: [
            { maker: valentijn.id, role: 'cartographer', certainty: 'certain' },
            { maker: valentijn.id, role: 'engraver', certainty: 'certain' },
          ],
        }),
      )
      // A draft: never published, must never appear in the maker's lists.
      await stack.api.create({
        collection: 'works',
        data: complete({ title: 'Draft map', stockNumber: 'M.0503' }),
      })
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('loads a maker by slug with life dates, available works before sold ones', async () => {
      const found = await stack.payload.find({
        collection: 'makers',
        where: { id: { equals: valentijnId } },
        limit: 1,
      })
      const slug = String((found.docs[0] as { slug?: unknown })?.slug)

      const maker = await loadMakerWith(stack.payload, slug, 'en')
      expect(maker).not.toBeNull()
      expect(maker?.bornText).toBe('1666')
      expect(maker?.diedText).toBe('1727')
      expect(maker?.available.map((w) => w.title).sort()).toEqual([
        'Kaart van Java',
        'Twice credited view',
      ])
      expect(maker?.sold.map((w) => w.title)).toEqual(['Sold chart'])
      expect(maker?.available.map((w) => w.title)).not.toContain('Draft map')
      expect(maker?.sold.map((w) => w.title)).not.toContain('Draft map')

      const json = JSON.stringify(maker)
      expect(json.includes('askingPrice')).toBe(false)
    }, 30_000)

    it('answers null for a slug no published maker has', async () => {
      expect(await loadMakerWith(stack.payload, 'no-such-maker', 'en')).toBeNull()
    }, 30_000)

    it('the index lists every published maker with a count of its distinct published works', async () => {
      const index = await loadMakerIndexWith(stack.payload, 'en')
      const row = index.find((each) => each.name === 'François Valentijn')
      expect(row).toBeDefined()
      expect(row?.workCount).toBe(3)
      expect(JSON.stringify(index).includes('askingPrice')).toBe(false)
    }, 30_000)
  },
)
