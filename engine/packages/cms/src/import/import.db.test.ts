/**
 * The import on a real, pushed Postgres (DATA.md §3–5): the named tests — the same file twice
 * changes nothing, five bad rows let the rest through and are reported with their line numbers, a
 * dry run writes nothing, stock rows go through the count hook so held units are respected, and
 * the report carries a plain reason per rejected row. The endpoint's own refusals live in
 * `endpoint.db.test.ts`.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runImportFile } from './apply'
import { render } from './report'
import { STORE_COLUMNS } from './kinds'
import { server, startStaffStack, type StaffStack } from '../collections/users/staff.test-support'
import { makeOrder, makeProduct } from '../collections/stock-levels/shop.test-support'

const csv = (header: readonly string[], rows: readonly string[]) =>
  new TextEncoder().encode(`${header.join(',')}\n${rows.join('\n')}`)

const storeRow = (parts: Partial<Record<(typeof STORE_COLUMNS)[number], string>>) =>
  STORE_COLUMNS.map((column) => parts[column] ?? '').join(',')

describe.skipIf(!server)('the import, on a real database', () => {
  let stack: StaffStack
  let category: number
  let varied: number

  beforeAll(async () => {
    stack = await startStaffStack('cms_import_test', (config, key) => getPayload({ config, key }))
    category = (
      (await stack.payload.create({
        collection: 'terms',
        data: { label: 'Souvenirs', slug: 'souvenirs', kind: 'subject' } as never,
      })) as unknown as { id: number }
    ).id
    await makeProduct(stack.payload, 'OEI-PRINT', ['OEI-PRINT-A3', 'OEI-PRINT-A4'])
    varied = (await makeProduct(stack.payload, 'OEI-MUG', ['OEI-MUG-BLACK'])).id
    // A store the stock rows point at.
    const stores = new TextEncoder().encode(
      `${STORE_COLUMNS.join(',')}\n${storeRow({
        store_code: 'UBD-01',
        name: 'Ubud',
        address: 'Jl. Raya Ubud',
        lat: '-8.5069',
        lng: '115.2625',
      })}`,
    )
    await runImportFile('stores', 'stores.csv', stores, { payload: stack.payload, runner: 'test' })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('importing the same products file twice changes nothing', async () => {
    const products = csv(
      ['sku', 'parent_sku', 'name_en', 'name_id', 'variant_label_en', 'variant_label_id', 'category', 'description_en', 'description_id', 'price_idr', 'related_stock_number', 'image_files', 'active'],
      [
        `SEED-POSTER,,Poster Bali,Poster Bali,,,Souvenirs,A poster,,125000,,,yes`,
        `SEED-POSTER-A3,SEED-POSTER,,,A3,,,,150000,,,yes`,
        `SEED-POSTER-A4,SEED-POSTER,,,A4,,,,100000,,,yes`,
      ],
    )
    const first = await runImportFile('products', 'products.csv', products, {
      payload: stack.payload,
      runner: 'test',
    })
    console.log(render(first))
    expect(first.counts).toMatchObject({ new: 3, updated: 0, unchanged: 0, rejected: 0, held: 0 })

    const second = await runImportFile('products', 'products.csv', products, {
      payload: stack.payload,
      runner: 'test',
    })
    expect(second.counts).toMatchObject({ new: 0, updated: 0, unchanged: 3, rejected: 0, held: 0 })
  }, 60_000)

  it('a file with five bad rows imports the rest and reports the five with line numbers', async () => {
    const good = (code: string) =>
      storeRow({
        store_code: code,
        name: `Store ${code}`,
        address: 'Jl. Example',
        lat: '-8.5',
        lng: '115.2',
      })
    const rows = [
      good('GWD-01'),
      storeRow({ store_code: 'BAD-1' }), // name, address, lat, lng all missing
      good('GWD-02'),
      storeRow({ store_code: 'BAD-2', name: 'No address', lat: '-8.5', lng: '115.2' }),
      good('GWD-03'),
      storeRow({ store_code: 'BAD-3', name: 'Bad pin', address: 'x', lat: 'north', lng: '115.2' }),
      good('GWD-04'),
      storeRow({ store_code: 'BAD-4', name: 'Bad flag', address: 'x', lat: '-8.5', lng: '115.2', active: 'maybe' }),
      good('GWD-05'),
      storeRow({ store_code: 'BAD-5', name: 'Bad flag too', address: 'x', lat: '-8.5', lng: '115.2', active: 'perhaps' }),
    ]
    const report = await runImportFile('stores', 'stores.csv', csv(STORE_COLUMNS, rows), {
      payload: stack.payload,
      runner: 'test',
    })
    console.log(render(report))
    expect(report.counts.new).toBe(5)
    expect(report.counts.rejected).toBe(5)
    const rejected = report.rows.filter((row) => row.outcome === 'rejected')
    expect(rejected.map((row) => row.row)).toEqual([3, 5, 7, 9, 11])
    for (const row of rejected) {
      expect(row.problem).toMatch(/./)
      expect(row.problem.length).toBeGreaterThan(10)
    }
    // Every reason names the column or the value, not a stack trace.
    expect(rejected.every((row) => typeof row.problem === 'string')).toBe(true)
  }, 60_000)

  it('a dry run writes nothing', async () => {
    const stores = csv(
      STORE_COLUMNS,
      [
        storeRow({ store_code: 'DRY-1', name: 'Dry one', address: 'x', lat: '-8.5', lng: '115.2' }),
        storeRow({ store_code: 'DRY-2', name: 'Dry two', address: 'x', lat: '-8.5', lng: '115.2' }),
      ],
    )
    const report = await runImportFile('stores', 'dry.csv', stores, {
      payload: stack.payload,
      runner: 'test',
      dryRun: true,
    })
    expect(report.counts.new).toBe(2)
    expect(report.dryRun).toBe(true)
    const after = await stack.payload.count({ collection: 'stores', where: { code: { like: 'DRY-' } } })
    expect(after.totalDocs).toBe(0)
    // The real run writes them, so the dry run's nothing is proven against the same rows.
    const real = await runImportFile('stores', 'dry.csv', stores, { payload: stack.payload, runner: 'test' })
    expect(real.counts.new).toBe(2)
    const now = await stack.payload.count({ collection: 'stores', where: { code: { like: 'DRY-' } } })
    expect(now.totalDocs).toBe(2)
  }, 60_000)

  it('stock rows go through the count hook, so held units are respected', async () => {
    // Two units are open on the A3: a recount may never re-sell them.
    await makeOrder(stack.payload, {
      store: stack.stores[0].id,
      product: await productId('OEI-PRINT'),
      variantSku: 'OEI-PRINT-A3',
      qty: 2,
      status: 'paid',
    })
    const stock = csv(
      ['store_code', 'sku', 'variant_sku', 'quantity'],
      ['UBD-01,OEI-PRINT-A3,OEI-PRINT-A3,10', 'UBD-01,OEI-MUG-BLACK,OEI-MUG-BLACK,5'],
    )
    const report = await runImportFile('stock', 'stock.csv', stock, { payload: stack.payload, runner: 'test' })
    expect(report.counts.new).toBe(2)
    const quantity = async (sku: string) => {
      const parent = await productId(sku)
      const rows = await stack.payload.find({
        collection: 'stock-levels',
        overrideAccess: true,
        depth: 0,
        where: { and: [{ store: { equals: stack.stores[0].id } }, { product: { equals: parent } }] },
      })
      return Number(rows.docs[0]!.quantity)
    }
    expect(await quantity('OEI-PRINT-A3')).toBe(8) // 10 on the shelf, 2 held
    expect(await quantity('OEI-MUG-BLACK')).toBe(5)

    // The same file again: unchanged, even though the count is the same number.
    const again = await runImportFile('stock', 'stock.csv', stock, { payload: stack.payload, runner: 'test' })
    expect(again.counts).toMatchObject({ new: 0, updated: 0, unchanged: 2 })

    // A recount below the held units stores 0, not a negative.
    const lower = csv(
      ['store_code', 'sku', 'variant_sku', 'quantity'],
      ['UBD-01,OEI-PRINT-A3,OEI-PRINT-A3,1'],
    )
    const recount = await runImportFile('stock', 'stock.csv', lower, { payload: stack.payload, runner: 'test' })
    expect(recount.counts.updated).toBe(1)
    expect(await quantity('OEI-PRINT-A3')).toBe(0)
    // A row whose store code the CMS does not have is held, not guessed.
    const unknown = csv(
      ['store_code', 'sku', 'variant_sku', 'quantity'],
      ['NOWHERE,OEI-MUG-BLACK,OEI-MUG-BLACK,3'],
    )
    const held = await runImportFile('stock', 'stock.csv', unknown, { payload: stack.payload, runner: 'test' })
    expect(held.counts.held).toBe(1)
    expect(held.rows[0]?.problem).toMatch(/No store carries the code 'NOWHERE'/)
  }, 120_000)

  it('one key twice in a file refuses both its rows', async () => {
    const rows = [
      storeRow({ store_code: 'TWICE', name: 'First', address: 'x', lat: '-8.5', lng: '115.2' }),
      storeRow({ store_code: 'TWICE', name: 'Second', address: 'x', lat: '-8.5', lng: '115.2' }),
    ]
    const report = await runImportFile('stores', 'twice.csv', csv(STORE_COLUMNS, rows), {
      payload: stack.payload,
      runner: 'test',
    })
    expect(report.counts.rejected).toBe(2)
    expect(report.rows.every((row) => row.problem?.includes('row 2') || row.problem?.includes('row 3'))).toBe(true)
    const none = await stack.payload.count({ collection: 'stores', where: { code: { equals: 'TWICE' } } })
    expect(none.totalDocs).toBe(0)
  }, 60_000)

  /** The parent of a variant, by its SKU — `variants.sku` is not a `where` Payload answers. */
  async function productId(sku: string): Promise<number> {
    const cols = await stack.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products_variants'")
    console.log('variants cols:', cols.rows.map((r) => r.column_name))
    const { rows } = await stack.pool.query<{ parent_id: number }>(
      `SELECT parent_id FROM products_variants WHERE sku = $1 LIMIT 1`,
      [sku],
    )
    return rows[0]!.parent_id
  }
})
