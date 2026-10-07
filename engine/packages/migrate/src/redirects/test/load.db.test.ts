/**
 * The redirect loader on a real, pushed Postgres (9.4load): rows for published works and gone rows
 * for retired addresses, an idempotent second run, a dry run that writes nothing, a prune that
 * touches only its own site's stale rows, and an unpublished work's old URL left unresolved. Works
 * are seeded through the Local API (`works.test-support`); without `CMS_TEST_POSTGRES_URL` it
 * skips. Written for the staging-less machine and not run there (ticket 9.4load, "Database").
 */
import { collectingWrites } from '../../../../cms/src/collections/places/pushed-database.test-support'
import {
  startWorksStack,
  type WorksStack,
} from '../../../../cms/src/collections/works/works.test-support'
import { getPayload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { loadRedirects } from '../load'
import { slugOf, worksFromDb } from '../works-from-db'

describe.skipIf(!process.env.CMS_TEST_POSTGRES_URL)(
  'the redirect loader, on a real database',
  () => {
    let stack: WorksStack
    let published: Array<{ legacyId: number; publicId: number; title: string }>

    const stored = async (site: 'gallery' | 'shop' = 'gallery') =>
      (
        await stack.api.find({
          collection: 'redirects',
          where: { site: { equals: site } },
          sort: 'from',
          limit: 100,
          pagination: false,
        })
      ).docs as Array<{
        from: string
        to?: string | null
        code: string
        source: string
        updatedAt: string
      }>

    const urls = [
      '/product/101-old-bali',
      '/product/102-old-java',
      '/product/103-old-draft',
      '/account/orders',
    ]
    const run = (extra: { dryRun?: boolean; prune?: boolean } = {}) =>
      worksFromDb(stack.payload).then((works) =>
        loadRedirects(stack.payload, { site: 'gallery', urls, works, ...extra }),
      )

    beforeAll(async () => {
      stack = await startWorksStack('migrate_redirects_load', (config, key) =>
        getPayload({ config, key }),
      )
      // Works' publish hooks need a cache collector outside a request (`collectingWrites`).
      const api = collectingWrites(stack.payload) as unknown as WorksStack['api']
      const recto = await stack.media('recto')
      const maker = await api.create({
        collection: 'makers',
        data: { name: 'François Valentijn', sortName: 'VALENTIJN, François', _status: 'published' },
      })
      const place = await api.create({
        collection: 'places',
        data: { name: 'Bali', slug: 'bali', _status: 'published' },
      })
      const base = {
        objectType: 'map',
        makers: [{ maker: maker.id, role: 'cartographer', certainty: 'certain' }],
        places: [{ place: place.id, role: 'depicts', primary: true }],
        date: { precision: 'exact', from: 1726 },
        images: [{ media: recto }],
      }
      published = []
      for (const [legacyId, title] of [
        [101, 'Bali by François Valentijn'],
        [102, 'Java, a Chart'],
      ] as const) {
        const work = await api.create({
          collection: 'works',
          data: { ...base, title, legacy: { productId: legacyId }, _status: 'published' },
        })
        published.push({ legacyId, publicId: Number(work.publicId), title })
      }
      // Not published: its old address must be listed unresolved, never a row.
      await api.create({
        collection: 'works',
        data: { ...base, title: 'Still a draft', legacy: { productId: 103 }, _status: 'draft' },
      })
    }, 180_000)

    beforeEach(async () => {
      await stack.api.delete({ collection: 'redirects', where: { id: { greater_than: 0 } } })
    })

    afterAll(() => stack?.stop(), 60_000)

    it('loads rows for published works and gone rows for retired addresses', async () => {
      const result = await run()
      expect(result).toMatchObject({ rows: 3, gone: 1, created: 3, updated: 0, unchanged: 0 })
      const rows = await stored()
      expect(rows.map((row) => [row.from, row.to || '', row.code, row.source])).toEqual([
        ['/account/orders', '', '410', 'legacy'],
        [
          '/product/101-old-bali',
          `/product/${published[0]!.publicId}-${slugOf(published[0]!.title)}`,
          '301',
          'legacy',
        ],
        [
          '/product/102-old-java',
          `/product/${published[1]!.publicId}-${slugOf(published[1]!.title)}`,
          '301',
          'legacy',
        ],
      ])
    })

    it("an unpublished work's old URL is unresolved, not a row", async () => {
      const result = await run()
      expect(result.unresolved).toEqual([
        { from: '/product/103-old-draft', reason: 'work 103 is not published' },
      ])
      expect((await stored()).some((row) => row.from === '/product/103-old-draft')).toBe(false)
    })

    it('a second run changes nothing', async () => {
      await run()
      const before = await stored()
      const again = await run()
      expect(again).toMatchObject({ created: 0, updated: 0, unchanged: 3, pruned: 0 })
      // Untouched rows keep their `updatedAt`: nothing was rewritten.
      expect(await stored()).toEqual(before)
    })

    it('a dry run writes nothing', async () => {
      await stack.api.create({
        collection: 'redirects',
        data: { site: 'gallery', from: '/stale', to: '/gone-away', code: '301', source: 'legacy' },
      })
      const result = await run({ dryRun: true, prune: true })
      expect(result).toMatchObject({ created: 3, pruned: 1 })
      expect((await stored()).map((row) => row.from)).toEqual(['/stale'])
    })

    it('prune removes only rows of that site that are no longer produced', async () => {
      for (const [site, from] of [
        ['gallery', '/stale'],
        ['shop', '/shop-row'],
      ] as const) {
        await stack.api.create({
          collection: 'redirects',
          data: { site, from, to: '/somewhere', code: '301', source: 'legacy' },
        })
      }
      const kept = await run()
      expect(kept.pruned).toBe(0)
      expect((await stored()).map((row) => row.from)).toContain('/stale')

      const pruned = await run({ prune: true })
      expect(pruned).toMatchObject({ created: 0, updated: 0, unchanged: 3, pruned: 1 })
      expect((await stored()).map((row) => row.from)).toEqual([
        '/account/orders',
        '/product/101-old-bali',
        '/product/102-old-java',
      ])
      expect((await stored('shop')).map((row) => row.from)).toEqual(['/shop-row'])
    })
  },
)
