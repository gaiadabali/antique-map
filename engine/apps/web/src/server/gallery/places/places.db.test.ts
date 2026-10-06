/**
 * The place page's reads on a real database (5.4.a): a historical name under the modern one, a
 * child place, published works only, no `askingPrice` anywhere in the answer.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startWorksStack,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'
import { loadPlaceIndexWith, loadPlaceWith } from './queries'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'the gallery place page on a real database',
  () => {
    let stack: WorksStack

    const publish = (data: object) =>
      invalidationBatch().operation((context) =>
        stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('web_place_test', (config, key) => getPayload({ config, key }))
      const recto = await stack.media('recto')

      const java = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'places',
          data: { name: 'Java', slug: 'java', _status: 'published' },
        }),
      )
      const batavia = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'places',
          data: {
            name: 'Jakarta',
            slug: 'batavia',
            parent: java.id,
            historicalNames: [{ name: 'Batavia', language: 'nl', period: '1619–1942' }],
            _status: 'published',
          },
        }),
      )
      const maker = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'makers',
          data: {
            name: 'François Valentijn',
            sortName: 'VALENTIJN, François',
            _status: 'published',
          },
        }),
      )
      const grade = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'terms',
          data: { kind: 'grade', label: 'VG+', definition: 'Very good.', equivalent: 'A' },
        }),
      )

      const complete = (over: object) => ({
        objectType: 'map',
        date: { precision: 'circa', from: 1726 },
        makers: [{ maker: maker.id, role: 'cartographer', certainty: 'attributed' }],
        places: [{ place: batavia.id, role: 'depicts', primary: true }],
        condition: { grade: grade.id },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
        ...over,
      })

      await publish(complete({ title: 'View of Batavia', stockNumber: 'M.0601' }))
      await stack.api.create({
        collection: 'works',
        data: complete({ title: 'Draft view', stockNumber: 'M.0602' }),
      })
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('loads a place by its path with its historical name and child, a draft work excluded', async () => {
      const java = await loadPlaceWith(stack.payload, ['java'], 'en')
      expect(java).not.toBeNull()
      expect(java?.children.map((c) => c.slug)).toEqual(['batavia'])

      const batavia = await loadPlaceWith(stack.payload, ['java', 'batavia'], 'en')
      expect(batavia).not.toBeNull()
      expect(batavia?.name).toBe('Jakarta')
      expect(batavia?.historicalNames).toEqual([
        { name: 'Batavia', language: 'nl', period: '1619–1942' },
      ])
      expect(batavia?.available.map((w) => w.title)).toEqual(['View of Batavia'])
      expect(batavia?.available.map((w) => w.title)).not.toContain('Draft view')

      const json = JSON.stringify(batavia)
      expect(json.includes('askingPrice')).toBe(false)
    }, 30_000)

    it('answers null for a path that does not name every ancestor in order', async () => {
      expect(await loadPlaceWith(stack.payload, ['batavia'], 'en')).toBeNull()
      expect(await loadPlaceWith(stack.payload, ['no-such-place'], 'en')).toBeNull()
    }, 30_000)

    it('the index lists the gazetteer top level only', async () => {
      const index = await loadPlaceIndexWith(stack.payload, 'en')
      expect(index.map((node) => node.slug)).toContain('java')
      expect(index.map((node) => node.slug)).not.toContain('batavia')
    }, 30_000)
  },
)
