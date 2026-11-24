/**
 * Finding a stock row, and ordering the categories, on a real, pushed Postgres (TASKS.md 27.1.c):
 * a stock row reads as its product's name and is found by that name, the product's SKU or the
 * variant's — the admin list's search, over REST — and a new category is put after the others in
 * the dragged order (Payload's `orderable`).
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// A category save expires a cache tag after the response; outside a Next request there is no `after()`.
vi.mock('@engine/cache', async (original) => ({
  ...(await original<typeof import('@engine/cache')>()),
  invalidate: () => {},
}))

import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { makeProduct } from './shop.test-support'

describe.skipIf(!server)('stock search and category order, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_stock_search_test', (config, key) =>
      getPayload({ config, key }),
    )
    const own = stack.stores[0].id
    const tote = await makeProduct(stack.payload, 'OEI-TOTE')
    const print = await makeProduct(stack.payload, 'OEI-MAP', ['OEI-MAP-A3'])
    for (const data of [
      { store: own, product: tote.id, quantity: 3 },
      { store: own, product: print.id, variantSku: 'OEI-MAP-A3', quantity: 1 },
    ]) {
      await stack.payload.create({ collection: 'stock-levels', data: data as never })
    }
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  /** The admin list's search: a `like` on each searchable field, any of them. */
  const search = async (as: 'owner' | 'store', words: string) => {
    const or = ['productName', 'productSku', 'variantSku']
      .map((field, i) => `where[or][${i}][${field}][like]=${encodeURIComponent(words)}`)
      .join('&')
    const found = await stack.rest('GET', `/api/stock-levels?depth=0&${or}`, { as })
    expect(found.status).toBe(200)
    return (found.body as { docs: { productName?: string; variantSku?: string | null }[] }).docs
  }

  it('reads a stock row as its product’s name', async () => {
    const docs = await search('owner', 'OEI-TOTE')
    expect(docs.map((doc) => doc.productName)).toEqual(['Product OEI-TOTE'])
  })

  it('finds a row by the product’s name, its SKU or the variant’s', async () => {
    expect((await search('owner', 'Product OEI-MAP')).map((d) => d.variantSku)).toEqual([
      'OEI-MAP-A3',
    ])
    expect(await search('owner', 'OEI-TOTE')).toHaveLength(1)
    expect((await search('owner', 'MAP-A3')).map((d) => d.variantSku)).toEqual(['OEI-MAP-A3'])
    expect(await search('owner', 'NOTHING-LIKE-IT')).toHaveLength(0)
    // Store staff search their own store's rows the same way.
    expect(await search('store', 'OEI-TOTE')).toHaveLength(1)
  })

  it('puts a new category after the others in the dragged order', async () => {
    const make = (label: string) =>
      stack.payload.create({
        collection: 'categories',
        data: { label, _status: 'published' } as never,
      }) as unknown as Promise<{ id: number; _order?: string | null }>
    const first = await make('Maps')
    const second = await make('Animals')
    expect(typeof first._order).toBe('string')
    expect(String(second._order) > String(first._order)).toBe(true)
    const listed = (await stack.payload.find({
      collection: 'categories',
      depth: 0,
      overrideAccess: true,
    })) as unknown as { docs: { id: number }[] }
    expect(listed.docs.map((doc) => doc.id)).toEqual([first.id, second.id])
  })
})
