/**
 * `products` on a real, pushed Postgres (TASKS.md 3.3.a): one SKU names one thing across products
 * and variants; a price is whole rupiah above zero, in Payload and in the database; publishing
 * needs a price and an image; the public reads published products only and store staff read
 * drafts but no `/versions`; a product a stock row or an order points at is not deleted.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { makeOrder, makeProduct, sqlError } from '../stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'

describe.skipIf(!server)('products, on a real database', () => {
  let stack: StaffStack
  let print: { id: number }

  beforeAll(async () => {
    stack = await startStaffStack('cms_products_test', (config, key) => getPayload({ config, key }))
    print = await makeProduct(stack.payload, 'OEI-PRINT', ['OEI-PRINT-A3', 'OEI-PRINT-A4'])
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const create = (data: Record<string, unknown>) =>
    stack.payload.create({ collection: 'products', data: { name: 'X', ...data } as never })

  it('keeps one SKU to one thing, across products and their variants', async () => {
    expect(await refusedWith(() => create({ sku: 'OEI-PRINT-A3' }))).toEqual({
      sku: 'The SKU "OEI-PRINT-A3" is already a variant of "Product OEI-PRINT" (SKU OEI-PRINT).',
    })
    expect(
      await refusedWith(() =>
        create({ sku: 'OEI-MAP', variants: [{ sku: 'OEI-PRINT', label: 'A' }] }),
      ),
    ).toEqual({
      'variants.0.sku':
        'The SKU "OEI-PRINT" is already the SKU of "Product OEI-PRINT" (SKU OEI-PRINT).',
    })
    expect(
      await refusedWith(() =>
        create({ sku: 'OEI-MAP', variants: [{ sku: 'OEI-PRINT-A4', label: 'A' }] }),
      ),
    ).toEqual({
      'variants.0.sku':
        'The SKU "OEI-PRINT-A4" is already a variant of "Product OEI-PRINT" (SKU OEI-PRINT).',
    })
    const twins = await refusedWith(() =>
      create({
        sku: 'OEI-MAP',
        variants: [
          { sku: 'OEI-MAP-1', label: 'A' },
          { sku: 'OEI-MAP-1', label: 'B' },
        ],
      }),
    )
    expect(twins['variants.0.sku']).toMatch(/Two variants share/)
    expect(await refusedWith(() => create({ sku: 'has space' }))).toEqual({
      sku: 'Use letters, digits, dots, hyphens, underscores or slashes in a SKU, with no spaces.',
    })
    expect(Object.keys(await refusedWith(() => create({ sku: '' })))).toEqual(['sku'])
    // A trailing space is trimmed, so it is the same key — and refused as one, naming the product
    // that holds it (10.8.b), not Payload's bare "The following field is invalid: sku".
    expect(await refusedWith(() => create({ sku: 'OEI-PRINT ' }))).toEqual({
      sku: 'The SKU "OEI-PRINT" is already used by "Product OEI-PRINT" (SKU OEI-PRINT). Open that product, or give this one another SKU.',
    })
  })

  it('keeps a price to whole rupiah above zero, in Payload and in the database', async () => {
    for (const price of [95000.5, 0, -1]) {
      expect(Object.keys(await refusedWith(() => create({ sku: `P-${price}`, price })))).toEqual([
        'price',
      ])
    }
    for (const [table, column] of [
      ['products', 'products_price_whole_rupiah'],
      ['products_variants', 'products_variants_price_whole_rupiah'],
    ] as const) {
      for (const value of ['95000.5', '0', '-5']) {
        const error = await sqlError(stack.pool, `UPDATE ${table} SET price = ${value}`)
        expect(error?.constraint, `${table} ${value}`).toBe(column)
      }
    }
    expect(await sqlError(stack.pool, `UPDATE products_variants SET price = NULL`)).toBeNull()
  })

  it('needs a price, a category and an image to publish, not to save a draft', async () => {
    const errors = await refusedWith(() =>
      create({ sku: 'OEI-BAG', price: null, _status: 'published' }),
    )
    expect(Object.keys(errors).sort()).toEqual(['category', 'images', 'price'])
    expect(errors.images).toMatch(/at least one image/)
    await expect(create({ sku: 'OEI-BAG', _status: 'draft' })).resolves.toMatchObject({
      sku: 'OEI-BAG',
      site: 'shop',
    })
  })

  it('shows the public published products only, and store staff drafts but no versions', async () => {
    const anonymous = await stack.rest('GET', '/api/products?depth=0')
    expect(anonymous.status).toBe(200)
    expect(anonymous.body?.docs).toEqual([])
    const store = await stack.rest('GET', '/api/products?depth=0&limit=50', { as: 'store' })
    expect((store.body?.docs as Array<{ sku: string }>).map((d) => d.sku)).toContain('OEI-PRINT')
    expect((await stack.rest('GET', '/api/products/versions', { as: 'store' })).status).toBe(403)
    expect((await stack.rest('GET', '/api/products/versions', { as: 'editor' })).status).toBe(200)
    const write = await stack.rest('PATCH', `/api/products/${print.id}`, {
      as: 'store',
      json: { price: 1 },
    })
    expect(write.status).toBe(403)
  })

  it('refuses to delete a product a stock row or an order points at', async () => {
    const [store] = stack.stores
    await stack.payload.create({
      collection: 'stock-levels',
      data: { store: store.id, product: print.id, variantSku: 'OEI-PRINT-A3', quantity: 1 },
    })
    await makeOrder(stack.payload, { store: store.id, product: print.id, qty: 1 })
    const refused = await stack.rest('DELETE', `/api/products/${print.id}`, { as: 'owner' })
    expect(refused.status).toBe(409)
    expect(JSON.stringify(refused.body)).toMatch(/still has 1 stock row and 1 order\. Unpublish it/)
    expect((await sqlError(stack.pool, `DELETE FROM products WHERE id = ${print.id}`))?.code).toBe(
      '23502',
    )
  }, 60_000)
})
