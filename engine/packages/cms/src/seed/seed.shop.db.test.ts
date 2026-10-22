/**
 * The shop seed layer on a real database: it loads twice and the purge deletes exactly what it seeded. Split out of `seed.db.test.ts` so the heavy seed runs go in parallel, each on a database
 * of its own. Without `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../collections/users/staff.test-support'
import { purgeSeed } from './purge'
import { sampleRows, seedLayer } from './run'

describe.skipIf(!server)('the shop seed layer, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_seed_shop_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('the shop layer loads twice and the purge deletes exactly what it seeded', async () => {
    // The gallery's works must survive the purge below: they have to be there first.
    await seedLayer('vocabulary', { payload: stack.payload })
    await seedLayer('gallery-sample', { payload: stack.payload })
    const first = await seedLayer('shop', { payload: stack.payload })
    expect(first.imports).toHaveLength(4)
    for (const report of first.imports) {
      expect(report.counts.rejected).toBe(0)
      expect(report.counts.held).toBe(0)
    }
    const second = await seedLayer('shop', { payload: stack.payload })
    for (const report of second.imports) {
      expect(report.rows.filter((row) => row.outcome === 'updated')).toEqual([])
      expect(report.counts.new).toBe(0)
      expect(report.counts.updated).toBe(0)
    }

    const purge = await purgeSeed(stack.payload)
    expect(purge.products).toBeGreaterThan(0)
    expect(purge.stores).toBeGreaterThan(0)
    expect(purge.stockLevels).toBeGreaterThan(0)

    // The second purge deletes nothing: the first was complete.
    const again = await purgeSeed(stack.payload)
    expect(again).toEqual({ products: 0, stockLevels: 0, stores: 0 })

    // And the gallery's works are untouched by a shop purge.
    const works = await stack.payload.find({
      collection: 'works',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: {
        stockNumber: {
          in: sampleRows({ withImages: false }).map((r) => r.cells.stock_number ?? ''),
        },
      },
    })
    expect(works.docs.length).toBe(1)
    // 7,227 stock rows written through the count hook, twice, then purged: ~215 s measured alone
    // on a local Docker Postgres (2026-10-05); the budget doubles that for a parallel worker.
  }, 600_000)
})
