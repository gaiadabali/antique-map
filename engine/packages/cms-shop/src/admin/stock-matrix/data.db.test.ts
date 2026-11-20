/**
 * The stock matrix's reads on a real Postgres (TASKS.md 27.4.b): the owner and an editor get every
 * open store as a column; store staff get their own store's column and rows alone — by the
 * collections' access, whatever the address asks for (another store picked by id finds nothing);
 * a search by name, product SKU or variant SKU; the low filter at the global threshold; 25 a page.
 */
import { getPayload, type TypedUser } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeProduct } from '../../collections/stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { matrixData } from './data'
import { PAGE_SIZE, type MatrixQuery } from './grid'

const ALL: MatrixQuery = { q: '', page: 1, low: false, store: '', cols: 1 }

describe.skipIf(!server)('the stock matrix, on a real database', () => {
  let stack: StaffStack
  const as = (role: 'owner' | 'editor' | 'store') =>
    ({ ...stack.users[role], collection: 'users' }) as unknown as TypedUser

  beforeAll(async () => {
    stack = await startStaffStack('cms_stock_matrix', (config, key) => getPayload({ config, key }))
    const { payload } = stack
    for (const [i, store] of stack.stores.entries()) {
      await payload.update({
        collection: 'stores',
        id: store.id,
        data: { active: true, address: `Jl. Test ${i}`, lat: -8.5, lng: 115.2 + i / 10 } as never,
      })
    }
    const mug = await makeProduct(payload, 'MX-MUG')
    const print = await makeProduct(payload, 'MX-PRINT', ['MX-PRINT-A3', 'MX-PRINT-A4'])
    for (let i = 0; i < PAGE_SIZE + 2; i += 1) await makeProduct(payload, `MX-FILL-${i}`)
    const count = (store: number | string, product: number | string, n: number, variant?: string) =>
      payload.create({
        collection: 'stock-levels',
        data: {
          store,
          product,
          physicalCount: n,
          ...(variant ? { variantSku: variant } : {}),
        } as never,
      })
    const [ubud, sanur] = stack.stores.map((store) => store.id as number)
    await count(ubud!, mug.id as number, 5)
    await count(sanur!, mug.id as number, 1)
    await count(ubud!, print.id as number, 2, 'MX-PRINT-A3')
    await count(ubud!, print.id as number, 8, 'MX-PRINT-A4')
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it('the owner and an editor see every open store; store staff their own alone', async () => {
    for (const role of ['owner', 'editor'] as const) {
      const data = await matrixData(stack.payload, as(role), ALL, 'en')
      expect(data.stores.map((store) => store.code).sort()).toEqual(['SNR-01', 'UBD-01'])
    }
    const mine = await matrixData(stack.payload, as('store'), { ...ALL, q: 'MX-MUG' }, 'en')
    expect(mine.stores.map((store) => store.code)).toEqual(['UBD-01'])
    expect(mine.rows.map((row) => row.quantity)).toEqual([5])
    // Asking for the other store by id shows the store's own column still, never Sanur's rows.
    const sanur = String(stack.stores[1].id)
    const asked = await matrixData(stack.payload, as('store'), { ...ALL, store: sanur }, 'en')
    expect(asked.stores.map((store) => store.code)).toEqual(['UBD-01'])
    expect(asked.rows.every((row) => String(row.store) === String(stack.stores[0].id))).toBe(true)
  })

  it('finds by name, product SKU or variant SKU', async () => {
    const owner = as('owner')
    const byVariant = await matrixData(stack.payload, owner, { ...ALL, q: 'MX-PRINT-A4' }, 'en')
    expect(byVariant.lines.map((line) => line.sku)).toEqual(['MX-PRINT-A4'])
    const bySku = await matrixData(stack.payload, owner, { ...ALL, q: 'mx-print' }, 'en')
    expect(bySku.lines).toHaveLength(2)
    const byName = await matrixData(stack.payload, owner, { ...ALL, q: 'Product MX-MUG' }, 'en')
    expect(byName.lines.map((line) => line.sku)).toEqual(['MX-MUG'])
  })

  it('the low filter keeps the lines at or below the threshold in the shown stores', async () => {
    const low = await matrixData(stack.payload, as('owner'), { ...ALL, low: true }, 'en')
    expect(low.threshold).toBe(2)
    expect(low.lines.map((line) => line.sku).sort()).toEqual(['MX-MUG', 'MX-PRINT-A3'])
    // At Ubud alone the mug holds 5: not low there.
    const ubud = String(stack.stores[0].id)
    const atUbud = await matrixData(
      stack.payload,
      as('owner'),
      { ...ALL, low: true, store: ubud },
      'en',
    )
    expect(atUbud.lines.map((line) => line.sku)).toEqual(['MX-PRINT-A3'])
    // Store staff's low list is their own store's.
    const mine = await matrixData(stack.payload, as('store'), { ...ALL, low: true }, 'en')
    expect(mine.lines.map((line) => line.sku)).toEqual(['MX-PRINT-A3'])
  })

  it('pages 25 products at a time', async () => {
    const first = await matrixData(stack.payload, as('owner'), ALL, 'en')
    expect(first.totalProducts).toBe(PAGE_SIZE + 4)
    expect(first.totalPages).toBe(2)
    const second = await matrixData(stack.payload, as('owner'), { ...ALL, page: 2 }, 'en')
    expect(second.page).toBe(2)
    expect(second.lines.length).toBeGreaterThan(0)
  })
})
