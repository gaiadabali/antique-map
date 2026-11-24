/**
 * The admin import endpoint on a real Postgres (TASKS.md 10.8.a, 27.4.c): owner only; Preview
 * reports the real outcome and writes nothing; Apply writes it; a rejected row is listed — first,
 * with its reason — and the rest still lands; an Excel workbook imports stock, products and stores
 * the way its CSV would, by SKU and store code, and a second run changes nothing; a file that is
 * neither a CSV nor a workbook, and a wrong header, are refused whole.
 */
import { getPayload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PRODUCT_COLUMNS, STOCK_COLUMNS, STORE_COLUMNS } from '@engine/cms-core/import/kinds'
import { makeXlsx, type TestCell } from '@engine/cms-core/import/xlsx.test-support'
import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { stockImportEndpoint } from './import-endpoint'
import { makeProduct } from './shop.test-support'

type Body = {
  error?: string
  code?: string
  report: {
    dryRun: boolean
    counts: Record<string, number>
    rows: Array<{ outcome: string; key: string; row: number; problem: string }>
  }
}

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** A products row with the four required cells; the rest left empty. */
const productRow = (sku: string, name: string, price: number): TestCell[] => {
  const cells: Record<string, TestCell> = {
    sku,
    name_en: name,
    category: 'Souvenirs',
    price_idr: price,
  }
  return PRODUCT_COLUMNS.map((column) => cells[column] ?? null)
}

describe.skipIf(!server)('the admin import endpoint, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_stock_import_ep', (config, key) =>
      getPayload({ config, key }),
    )
    await makeProduct(stack.payload, 'IMP-MUG')
    await stack.payload.create({
      collection: 'categories',
      data: { label: 'Souvenirs', slug: 'souvenirs' } as never,
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const call = async (
    as: 'owner' | 'editor' | 'store',
    file: { name: string; body: string | Uint8Array; type?: string },
    mode: string,
    kind?: string,
  ) => {
    const form = new FormData()
    const type = file.type ?? (file.name.endsWith('.xlsx') ? XLSX : 'text/csv')
    form.set('file', new File([file.body as string], file.name, { type }))
    form.set('mode', mode)
    if (kind) form.set('kind', kind)
    const req = {
      user: { ...stack.users[as], collection: 'users' },
      payload: stack.payload,
      headers: new Headers(),
      formData: async () => form,
    } as unknown as PayloadRequest
    const response = await stockImportEndpoint.handler(req)
    return { status: response.status, body: (await response.json()) as Body }
  }

  const rowsIn = () =>
    stack.payload
      .count({ collection: 'stock-levels', overrideAccess: true })
      .then((c) => c.totalDocs)

  const sheet = 'store_code,sku,variant_sku,quantity\nUBD-01,IMP-MUG,,7\nUBD-01,NOPE,,3\n'

  it('refuses anyone but the owner', async () => {
    for (const as of ['editor', 'store'] as const) {
      const result = await call(as, { name: 'stock.csv', body: sheet }, 'preview')
      expect(result.status).toBe(403)
    }
  })

  it('Preview reports the outcome and writes nothing; Apply writes it', async () => {
    const before = await rowsIn()
    const preview = await call('owner', { name: 'stock.csv', body: sheet }, 'preview')
    expect(preview.status).toBe(200)
    expect(preview.body.report.dryRun).toBe(true)
    // An unknown SKU is held (valid, waiting on a person), listed with its reason.
    expect(preview.body.report.counts).toMatchObject({ new: 1, held: 1 })
    const held = preview.body.report.rows.find((r: { outcome: string }) => r.outcome === 'held')
    expect(held!.key).toContain('NOPE')
    expect(held!.problem).toBeTruthy()
    expect(await rowsIn()).toBe(before)

    const applied = await call('owner', { name: 'stock.csv', body: sheet }, 'apply')
    expect(applied.body.report.dryRun).toBe(false)
    expect(applied.body.report.counts).toMatchObject({ new: 1, held: 1 })
    expect(await rowsIn()).toBe(before + 1)

    const again = await call('owner', { name: 'stock.csv', body: sheet }, 'preview')
    expect(again.body.report.counts).toMatchObject({ new: 0, unchanged: 1, held: 1 })
  })

  it('imports an Excel stock file end to end, the refused rows listed first', async () => {
    const workbook = makeXlsx([
      [...STOCK_COLUMNS],
      ['UBD-01', 'IMP-MUG', null, 9],
      ['SNR-01', 'IMP-MUG', null, { f: '2+2', v: 4 }],
      ['SNR-01', 'NOPE', null, 'four'],
    ])
    const file = { name: 'stock.xlsx', body: workbook }
    const preview = await call('owner', file, 'preview')
    expect(preview.status).toBe(200)
    // Row 4's count is not a number: refused with its reason, and listed before the changes.
    expect(preview.body.report.rows.map((r) => [r.row, r.outcome])).toEqual([
      [4, 'rejected'],
      [2, 'updated'],
      [3, 'new'],
    ])
    expect(preview.body.report.rows[0]!.problem).toMatch(/quantity/i)

    const applied = await call('owner', file, 'apply')
    expect(applied.body.report.counts).toMatchObject({ new: 1, updated: 1, rejected: 1 })
    const quantities = async (store: number | string) => {
      const { docs } = await stack.payload.find({
        collection: 'stock-levels',
        overrideAccess: true,
        where: { store: { equals: store } },
      })
      return docs.map((d) => (d as unknown as { quantity: number }).quantity)
    }
    expect(await quantities(stack.stores[0].id as number)).toEqual([9])
    // The formula counted by the result stored with it.
    expect(await quantities(stack.stores[1].id as number)).toEqual([4])

    const again = await call('owner', file, 'apply')
    expect(again.body.report.counts).toMatchObject({ new: 0, updated: 0, unchanged: 2 })
  })

  it('imports stores and products from Excel by store code and SKU, idempotently', async () => {
    const stores = makeXlsx([
      [...STORE_COLUMNS],
      ['DPS-09', 'Denpasar 9', 'Jl. Teuku Umar 9', 'Denpasar', -8.67, 115.21],
      ['BAD-01', 'Nowhere', 'Jl. Laut', null, 12.5, 115.2, null, null, null, true],
    ])
    const storeRun = await call('owner', { name: 'stores.xlsx', body: stores }, 'apply', 'stores')
    expect(storeRun.status).toBe(200)
    expect(storeRun.body.report.counts).toMatchObject({ new: 1, rejected: 1 })
    expect(storeRun.body.report.rows[0]).toMatchObject({ outcome: 'rejected', row: 3 })

    const products = makeXlsx([[...PRODUCT_COLUMNS], productRow('XL-POSTER', 'Poster', 125000)])
    const first = await call('owner', { name: 'p.xlsx', body: products }, 'apply', 'products')
    expect(first.body.report.counts).toMatchObject({ new: 1, rejected: 0 })
    const second = await call('owner', { name: 'p.xlsx', body: products }, 'apply', 'products')
    expect(second.body.report.counts).toMatchObject({ new: 0, unchanged: 1 })
    const { docs } = await stack.payload.find({
      collection: 'products',
      overrideAccess: true,
      draft: true,
      where: { sku: { equals: 'XL-POSTER' } },
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ price: 125000, _status: 'draft' })
  })

  it('refuses another file type, a damaged workbook, an unknown kind and a wrong header', async () => {
    const pdf = { name: 'stock.pdf', body: '%PDF', type: 'application/pdf' }
    expect((await call('owner', pdf, 'preview')).status).toBe(415)
    const damaged = await call('owner', { name: 'stock.xlsx', body: 'PK' }, 'preview')
    expect(damaged.status).toBe(422)
    expect(damaged.body.error).toBeTruthy()
    const kind = await call('owner', { name: 'stock.csv', body: sheet }, 'preview', 'antiques')
    expect(kind.status).toBe(400)
    const header = await call('owner', { name: 'stock.csv', body: 'a,b\n1,2\n' }, 'apply')
    expect(header.status).toBe(422)
    expect(header.body.error).toBeTruthy()
  })
})
