/**
 * The sitemap sources on a real, pushed database (9.3fix): published-only, both locales, a draft
 * never listed, a sold work listed. The shop's half is `sitemap-sources.shop.db.test.ts`: two Payload stacks in one process break the second's schema push.
 * Without `CMS_TEST_POSTGRES_URL` the file skips — a setup state, same as the other `*.db.test.ts`
 * files beside this one.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  startWorksStack,
  type WorksStack,
} from '../../../../../packages/cms/src/collections/works/works.test-support'
import { queryGallerySitemap } from './sitemap-sources'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'the gallery sitemap sources on a real database',
  () => {
    let stack: WorksStack

    const publish = (data: object) =>
      invalidationBatch().operation((context) =>
        stack.api.create({ collection: 'works', data: { ...data, _status: 'published' }, context }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('web_sitemap_test', (config, key) =>
        getPayload({ config, key }),
      )
      const recto = await stack.media('recto')
      const grade = await invalidationBatch().operation((context) =>
        stack.api.create({
          context,
          collection: 'terms',
          data: { kind: 'grade', label: 'VG+', definition: 'Very good.', equivalent: 'A' },
        }),
      )

      // A work publishes with a credited maker (or a primary place).
      const maker = await stack.api.create({
        collection: 'makers',
        data: { name: 'François Valentijn', sortName: 'VALENTIJN, François' },
      })

      const complete = (over: object) => ({
        objectType: 'map',
        makers: [{ maker: maker.id, role: 'cartographer', certainty: 'attributed' }],
        date: { precision: 'circa', from: 1700 },
        condition: { grade: grade.id },
        images: [{ media: recto }],
        dimensions: { image: { height: 280, width: 360 }, sheet: { height: 310, width: 400 } },
        ...over,
      })

      await publish(complete({ title: 'Kaart van Batavia', stockNumber: 'M.0601' }))
      await publish(complete({ title: 'Sold chart', stockNumber: 'M.0602', status: 'sold' }))
      await stack.api.create({
        collection: 'works',
        data: complete({ title: 'Draft map', stockNumber: 'M.0603' }),
      })
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    it('lists every published work in both locales with translated segments', async () => {
      const entries = await queryGallerySitemap(stack.payload)
      const batavia = entries.find((e) => e.paths.en.includes('kaart-van-batavia'))
      expect(batavia).toBeDefined()
      expect(batavia?.paths.id.startsWith('/id/produk/')).toBe(true)
      expect(batavia?.paths.id).toContain('kaart-van-batavia')
    }, 30_000)

    it('a draft work is not listed', async () => {
      const entries = await queryGallerySitemap(stack.payload)
      expect(entries.some((e) => e.paths.en.includes('draft-map'))).toBe(false)
    }, 30_000)

    it('a sold work is listed', async () => {
      const entries = await queryGallerySitemap(stack.payload)
      expect(entries.some((e) => e.paths.en.includes('sold-chart'))).toBe(true)
    }, 30_000)
  },
)
