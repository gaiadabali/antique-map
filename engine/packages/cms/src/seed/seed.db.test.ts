/**
 * The seed layers on a real, pushed Postgres (DATA.md §2–4): the vocabulary seeds once (the
 * second run creates nothing); the gallery sample imports its committed 50 rows — every work
 * drafted, keyed on the old record's address, and carrying no asking price (DR-3, Q14) — and
 * imports the same file again as a no-op; the review marks and old categories ride into
 * `works.legacy.categories` and a second carry changes nothing; the shop layer loads twice and
 * the purge then deletes exactly the rows it seeded, and a second purge deletes nothing.
 * Without `CMS_TEST_POSTGRES_URL` these skip — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../collections/users/staff.test-support'
import { runImportFile } from '../import/apply'
import { antiqueCsv } from './gallery/rows'
import { purgeSeed } from './purge'
import { carryMarks, sampleRows, seedLayer } from './run'

type Work = { id: number; stockNumber?: string; publicId?: number; askingPrice?: number }

describe.skipIf(!server)('the seed layers, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_seed_test', (config, key) => getPayload({ config, key }))
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('the vocabulary seeds once: the second run creates nothing', async () => {
    const first = await seedLayer('vocabulary', { payload: stack.payload })
    const second = await seedLayer('vocabulary', { payload: stack.payload })
    expect(first.vocabulary!.siteSettings).toBe('seeded')
    expect(second.vocabulary!.siteSettings).toBe('present')
    // The first run creates the vocabulary; the second creates nothing (seeded once).
    expect(first.vocabulary!.places.created).toBeGreaterThan(0)
    expect(first.vocabulary!.terms.created).toBeGreaterThan(0)
    expect(first.vocabulary!.makers.created).toBeGreaterThan(0)
    expect(second.vocabulary!.places.created).toBe(0)
    expect(second.vocabulary!.terms.created).toBe(0)
    expect(second.vocabulary!.makers.created).toBe(0)
    expect(second.vocabulary!.places.present).toBe(first.vocabulary!.places.present)
  }, 180_000)

  it('the gallery sample imports its 50 rows: drafted, addressed, no price', async () => {
    const rows = sampleRows({ withImages: false })
    const report = await runImportFile('antiques', 'gallery-sample.csv', utf8(antiqueCsv(rows)), {
      payload: stack.payload,
      runner: 'seed',
    })
    expect(report.counts.new).toBe(50)
    expect(report.counts.rejected).toBe(0)
    expect(report.counts.held).toBe(0)

    const works = await stack.payload.find({
      collection: 'works',
      overrideAccess: true,
      depth: 0,
      limit: 100,
      where: { stockNumber: { in: rows.map((row) => row.cells.stock_number ?? '') } },
    })
    expect(works.docs.length).toBe(50)
    for (const doc of works.docs as unknown as Work[]) {
      // All drafted: the seed never publishes.
      expect((doc as unknown as { _status?: string })._status).toBe('draft')
      // Keyed on the old record's address.
      expect(typeof doc.publicId).toBe('number')
      expect(Number.isInteger(doc.publicId)).toBe(true)
      // The gallery never carries a price (DR-3, Q14).
      expect(doc.askingPrice).toBeUndefined()
    }

    // Idempotent: the same file again changes nothing new.
    const again = await runImportFile('antiques', 'gallery-sample.csv', utf8(antiqueCsv(rows)), {
      payload: stack.payload,
      runner: 'seed',
    })
    expect(again.counts.new).toBe(0)
    expect(again.counts.rejected).toBe(0)
  }, 300_000)

  it('the review marks and old categories ride into legacy.categories, once', async () => {
    const rows = sampleRows({ withImages: false })
    const marked = await carryMarks(stack.payload, rows)
    // Every sample row arrives flagged or with old categories, so every work is marked.
    expect(marked).toBe(50)

    const withMarks = await stack.payload.find({
      collection: 'works',
      overrideAccess: true,
      depth: 0,
      limit: 100,
      where: { stockNumber: { in: rows.map((row) => row.cells.stock_number ?? '') } },
    })
    const byStock = new Map(
      (
        withMarks.docs as unknown as { stockNumber?: string; legacy?: { categories?: string[] } }[]
      ).map((doc) => [doc.stockNumber ?? '', doc]),
    )
    for (const row of rows) {
      const wanted = [...row.legacyCategories, ...row.reviewMarks]
      expect(byStock.get(row.cells.stock_number ?? '')!.legacy?.categories).toEqual(wanted)
    }

    // A second carry changes nothing: it is idempotent.
    expect(await carryMarks(stack.payload, rows)).toBe(0)
  }, 180_000)

  it('the shop layer loads twice and the purge deletes exactly what it seeded', async () => {
    const first = await seedLayer('shop', { payload: stack.payload })
    expect(first.imports).toHaveLength(4)
    for (const report of first.imports) {
      expect(report.counts.rejected).toBe(0)
      expect(report.counts.held).toBe(0)
    }
    const second = await seedLayer('shop', { payload: stack.payload })
    for (const report of second.imports) expect(report.counts.new).toBe(0)

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
  }, 300_000)
})

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}
