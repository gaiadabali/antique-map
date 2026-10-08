/**
 * The seed layers on a real, pushed Postgres (DATA.md §2–4): the vocabulary seeds once (the
 * second run creates nothing); the gallery sample imports its committed 50 rows — every work
 * drafted, keyed on the old record's address, and carrying no asking price (DR-3, Q14) — and
 * imports the same file again as a no-op; a full-layer row carrying an old price loads it into
 * the owner-only asking price, which an editor and the public never read (owner decision
 * 2026-10-08); the review marks and old categories ride into
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
    // Every place, term and maker the first run created or found, the second finds present.
    const total = (count: { created: number; present: number }) => count.created + count.present
    expect(second.vocabulary!.places.present).toBe(total(first.vocabulary!.places))
    expect(second.vocabulary!.terms.present).toBe(total(first.vocabulary!.terms))
    expect(second.vocabulary!.makers.present).toBe(total(first.vocabulary!.makers))
  }, 180_000)

  it('--publish publishes the seeded drafts, changes nothing else, and publishes once', async () => {
    const payload = stack.payload
    const all = async (collection: 'places' | 'terms' | 'makers') =>
      (
        await payload.find({
          collection,
          overrideAccess: true,
          depth: 0,
          limit: 2000,
          locale: 'all',
        })
      ).docs as unknown as Record<string, unknown>[]
    const rest = ({ _status: _s, updatedAt: _u, ...fields }: Record<string, unknown>) => fields
    const collections = ['places', 'terms', 'makers'] as const
    const before = Object.fromEntries(
      await Promise.all(collections.map(async (c) => [c, await all(c)])),
    )
    // The seed without --publish leaves drafts: Batavia's search would find nothing published.
    expect(before.places.every((doc: Record<string, unknown>) => doc._status === 'draft')).toBe(
      true,
    )

    const run = await seedLayer('vocabulary', { payload, publish: true })
    expect(run.vocabulary!.places.created).toBe(0)
    expect(run.vocabulary!.published).toEqual({
      places: before.places.length,
      terms: before.terms.length,
      makers: before.makers.length,
      held: [],
    })
    for (const collection of collections) {
      const after = new Map((await all(collection)).map((doc) => [doc.id, doc]))
      for (const doc of before[collection] as Record<string, unknown>[]) {
        const now = after.get(doc.id)!
        expect(now._status, `${collection} #${String(doc.id)}`).toBe('published')
        // Nothing but _status changes — but a grade gains the equivalent publishing demands.
        const { equivalent, ...was } = rest(doc)
        const { equivalent: nowEquivalent, ...is } = rest(now)
        expect(is).toEqual(was)
        if (equivalent) expect(nowEquivalent).toBe(equivalent)
      }
    }
    // The public reads it: Jakarta, with Batavia among its historical names.
    const jakarta = await payload.find({
      collection: 'places',
      overrideAccess: false,
      depth: 0,
      where: { and: [{ slug: { equals: 'batavia' } }, { _status: { equals: 'published' } }] },
    })
    const names = (jakarta.docs[0] as { historicalNames?: { name: string }[] } | undefined)
      ?.historicalNames
    expect(names?.map((entry) => entry.name)).toContain('Batavia')

    // A re-run publishes nothing; a row the seed creates on a --publish run is published at once.
    const maker = before.makers[0] as { id: number; name: string }
    await payload.delete({ collection: 'makers', id: maker.id, overrideAccess: true })
    const again = await seedLayer('vocabulary', { payload, publish: true })
    expect(again.vocabulary!.makers.created).toBe(1)
    expect(again.vocabulary!.published).toEqual({ places: 0, terms: 0, makers: 1, held: [] })
    const recreated = await payload.find({
      collection: 'makers',
      overrideAccess: false,
      depth: 0,
      where: { name: { equals: maker.name } },
    })
    expect((recreated.docs[0] as { _status?: string } | undefined)?._status).toBe('published')
    const third = await seedLayer('vocabulary', { payload, publish: true })
    expect(third.vocabulary!.published).toEqual({ places: 0, terms: 0, makers: 0, held: [] })
  }, 300_000)

  it('the gallery sample imports its 50 rows: drafted, addressed, no price', async () => {
    const rows = sampleRows({ withImages: false })
    // The file carries no price: every asking_price cell is empty (DR-3, Q14).
    expect(rows.filter((row) => (row.cells.asking_price ?? '') !== '')).toEqual([])
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
      // The gallery never carries a price (DR-3, Q14): the column is empty — Postgres answers an
      // empty number column as `null` on an overrideAccess read, never a figure.
      expect(doc.askingPrice ?? null).toBeNull()
    }

    // Idempotent: the same file again changes nothing — nothing new, nothing updated (3.7.d).
    const again = await runImportFile('antiques', 'gallery-sample.csv', utf8(antiqueCsv(rows)), {
      payload: stack.payload,
      runner: 'seed',
    })
    expect(again.rows.filter((row) => row.outcome === 'updated')).toEqual([])
    expect(again.counts.new).toBe(0)
    expect(again.counts.updated).toBe(0)
    expect(again.counts.rejected).toBe(0)
    expect(again.counts.unchanged).toBe(50)
  }, 300_000)

  it('a full-layer row carries the old price into the owner-only asking price', async () => {
    const stockNumber = 'M.PRICE1'
    const [template] = sampleRows({ withImages: false })
    const row = {
      ...template!,
      cells: {
        ...template!.cells,
        stock_number: stockNumber,
        legacy_id: '990001',
        legacy_url: '',
        asking_price: '1850',
        asking_currency: 'USD',
      },
    }
    const report = await runImportFile('antiques', 'gallery-full.csv', utf8(antiqueCsv([row])), {
      payload: stack.payload,
      runner: 'seed',
    })
    expect(report.counts.new).toBe(1)
    expect(report.counts.rejected).toBe(0)
    const found = await stack.payload.find({
      collection: 'works',
      overrideAccess: true,
      depth: 0,
      limit: 1,
      where: { stockNumber: { equals: stockNumber } },
    })
    const id = (found.docs[0] as unknown as Work).id
    const read = (as?: 'owner' | 'editor') =>
      stack.rest('GET', `/api/works/${id}?depth=0&draft=true`, as ? { as } : {})
    const owner = await read('owner')
    expect(owner.status).toBe(200)
    expect(owner.body).toMatchObject({ askingPrice: 1850 })
    const editor = await read('editor')
    expect(editor.status).toBe(200)
    expect(editor.body).not.toHaveProperty('askingPrice')
    // An anonymous read never gets a draft; whatever it answers carries no price.
    const anonymous = await read()
    expect(JSON.stringify(anonymous.body ?? {})).not.toContain('askingPrice')
    const published = await stack.payload.find({
      collection: 'works',
      overrideAccess: false,
      depth: 0,
      limit: 100,
      where: { _status: { equals: 'published' } },
    })
    expect(JSON.stringify(published.docs)).not.toContain('askingPrice')
  }, 180_000)

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

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}
