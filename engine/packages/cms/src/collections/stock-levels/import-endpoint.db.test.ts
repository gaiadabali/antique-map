/**
 * The stock import endpoint on a real Postgres (TASKS.md 10.8.a): owner only; Preview reports the
 * real outcome and writes nothing; Apply writes it; a rejected row is listed with its reason and
 * the rest still lands; a non-CSV and a wrong header are refused whole.
 */
import { getPayload, type PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'
import { stockImportEndpoint } from './import-endpoint'
import { makeProduct } from './shop.test-support'

describe.skipIf(!server)('stock import endpoint, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_stock_import_ep', (config, key) =>
      getPayload({ config, key }),
    )
    await makeProduct(stack.payload, 'IMP-MUG')
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const call = async (
    as: 'owner' | 'editor' | 'store',
    file: { name: string; text: string; type?: string },
    mode: string,
  ) => {
    const form = new FormData()
    form.set('file', new File([file.text], file.name, { type: file.type ?? 'text/csv' }))
    form.set('mode', mode)
    const req = {
      user: { ...stack.users[as], collection: 'users' },
      payload: stack.payload,
      headers: new Headers(),
      formData: async () => form,
    } as unknown as PayloadRequest
    const response = await stockImportEndpoint.handler(req)
    return { status: response.status, body: (await response.json()) as Record<string, any> }
  }

  const rowsIn = () =>
    stack.payload
      .count({ collection: 'stock-levels', overrideAccess: true })
      .then((c) => c.totalDocs)

  const sheet = 'store_code,sku,variant_sku,quantity\nUBD-01,IMP-MUG,,7\nUBD-01,NOPE,,3\n'

  it('refuses anyone but the owner', async () => {
    for (const as of ['editor', 'store'] as const) {
      const result = await call(as, { name: 'stock.csv', text: sheet }, 'preview')
      expect(result.status).toBe(403)
    }
  })

  it('Preview reports the outcome and writes nothing; Apply writes it', async () => {
    const before = await rowsIn()
    const preview = await call('owner', { name: 'stock.csv', text: sheet }, 'preview')
    expect(preview.status).toBe(200)
    expect(preview.body.report.dryRun).toBe(true)
    // An unknown SKU is held (valid, waiting on a person), listed with its reason.
    expect(preview.body.report.counts).toMatchObject({ new: 1, held: 1 })
    const held = preview.body.report.rows.find((r: { outcome: string }) => r.outcome === 'held')
    expect(held.key).toContain('NOPE')
    expect(held.problem).toBeTruthy()
    expect(await rowsIn()).toBe(before)

    const applied = await call('owner', { name: 'stock.csv', text: sheet }, 'apply')
    expect(applied.body.report.dryRun).toBe(false)
    expect(applied.body.report.counts).toMatchObject({ new: 1, held: 1 })
    expect(await rowsIn()).toBe(before + 1)

    const again = await call('owner', { name: 'stock.csv', text: sheet }, 'preview')
    expect(again.body.report.counts).toMatchObject({ new: 0, unchanged: 1, held: 1 })
  })

  it('refuses a workbook and a wrong header, whole', async () => {
    const xlsx = await call(
      'owner',
      { name: 'stock.xlsx', text: 'PK', type: 'application/zip' },
      'preview',
    )
    expect(xlsx.status).toBe(415)
    const header = await call('owner', { name: 'stock.csv', text: 'a,b\n1,2\n' }, 'apply')
    expect(header.status).toBe(422)
    expect(header.body.error).toBeTruthy()
  })
})
