/**
 * 5.1.c on a real database: search matches titles, makers, subjects and places — a historical
 * place name finds a work catalogued under the modern name; a near-miss maker earns one
 * suggestion; a stock number jumps straight to its item; and search is published-only.
 * The schema is pushed (`works.test-support`); without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { searchWorkIds } from './search'
import {
  startWorksStack,
  type WorksStack,
} from '../../../../../../packages/cms/src/collections/works/works.test-support'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'gallery catalogue search on a real database',
  () => {
    let stack: WorksStack
    let bataviaWorkId: number
    let sulawesiWorkId: number
    let stockWorkPublicId: number

    const publish = (data: object) =>
      invalidationBatch().operation((context) =>
        stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('web_search_test', (config, key) => getPayload({ config, key }))
      // The search's SQL leans on trigram similarity and unaccented folding; the pushed test
      // database has neither until these run.
      await stack.pool.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')
      await stack.pool.query('CREATE EXTENSION IF NOT EXISTS unaccent')

      const recto = await stack.media('recto')
      const valentijn = await invalidationBatch().operation((context) =>
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
      const java = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'places',
          data: { name: 'Java', slug: 'java', _status: 'published' },
        }),
      )
      // The work is catalogued under the modern name; the visitor still asks for Batavia.
      const jakarta = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'places',
          data: {
            name: 'Jakarta',
            slug: 'jakarta',
            parent: java.id,
            historicalNames: [{ name: 'Batavia', language: 'nl' }],
            _status: 'published',
          },
        }),
      )
      const sulawesi = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'places',
          data: {
            name: 'Sulawesi',
            slug: 'sulawesi',
            historicalNames: [{ name: 'Celebes', language: 'en' }],
            _status: 'published',
          },
        }),
      )
      const voc = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'terms',
          data: { kind: 'subject', label: 'VOC', _status: 'published' },
        }),
      )
      const grade = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'terms',
          data: {
            kind: 'grade',
            label: 'VG+',
            definition: 'Very good, nearly fine.',
            equivalent: 'A',
          },
        }),
      )

      const complete = (over: object) => ({
        objectType: 'map',
        date: { precision: 'circa', from: 1726 },
        makers: [{ maker: valentijn.id, role: 'cartographer', certainty: 'attributed' }],
        subjects: [voc.id],
        condition: { grade: grade.id },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
        ...over,
      })

      const bataviaWork = await publish(
        complete({
          title: 'Kaart van Java',
          places: [{ place: jakarta.id, role: 'depicts', primary: true }],
        }),
      )
      const sulawesiWork = await publish(
        complete({
          title: 'Chart of the Moluccas',
          date: { precision: 'exact', from: 1850 },
          status: 'sold',
          places: [{ place: sulawesi.id, role: 'depicts', primary: true }],
        }),
      )
      const stockWork = await publish(
        complete({
          title: 'Portrait of a VOC governor',
          objectType: 'print',
          places: [{ place: jakarta.id, role: 'depicts', primary: true }],
          stockNumber: 'M.0500',
        }),
      )
      bataviaWorkId = Number(bataviaWork.id)
      sulawesiWorkId = Number(sulawesiWork.id)
      stockWorkPublicId = Number(stockWork.publicId)

      // The draft: never published, findable by nothing.
      await stack.api.create({
        collection: 'works',
        data: complete({ title: 'Zephyr Unpublished Map' }),
      })
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('a search for a historical place name finds the work catalogued under the modern name', async () => {
      const batavia = await searchWorkIds(stack.payload, {
        query: 'Batavia',
        locale: 'en',
        includeSold: false,
      })
      expect(batavia.ids).toContain(bataviaWorkId)

      // The sold chart still answers a historical-name query once sold works are included.
      const celebes = await searchWorkIds(stack.payload, {
        query: 'Celebes',
        locale: 'en',
        includeSold: true,
      })
      expect(celebes.ids).toContain(sulawesiWorkId)
    }, 30_000)

    it('a misspelled maker gets one suggestion', async () => {
      const answer = await searchWorkIds(stack.payload, {
        query: 'Valentjn',
        locale: 'en',
        includeSold: false,
      })
      expect(answer.ids).toEqual([])
      expect(answer.suggestion).toEqual({ kind: 'maker', label: 'François Valentijn' })
    }, 30_000)

    it('a stock number query jumps to its item', async () => {
      const answer = await searchWorkIds(stack.payload, {
        query: 'M.0500',
        locale: 'en',
        includeSold: false,
      })
      expect(answer.jumpTo).not.toBeNull()
      expect(answer.jumpTo?.publicId).toBe(stockWorkPublicId)
    }, 30_000)

    it('search is published-only', async () => {
      const draft = await searchWorkIds(stack.payload, {
        query: 'Zephyr Unpublished Map',
        locale: 'en',
        includeSold: false,
      })
      expect(draft.ids).toEqual([])
      expect(draft.jumpTo).toBeNull()

      // And the sold chart stays out until the visitor includes sold works.
      const sold = await searchWorkIds(stack.payload, {
        query: 'Moluccas',
        locale: 'en',
        includeSold: false,
      })
      expect(sold.ids).toEqual([])
      const withSold = await searchWorkIds(stack.payload, {
        query: 'Moluccas',
        locale: 'en',
        includeSold: true,
      })
      expect(withSold.ids).toContain(sulawesiWorkId)
    }, 30_000)
  },
)
