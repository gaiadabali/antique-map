/**
 * `addToBagChecked` (TASKS.md 6.1.c, 6.2.a): the real bag's add, checked against the same live
 * availability `availabilityFor` gives the product loader ("any active store has stock") — a
 * forced add of a stock-less product refuses, leaving the bag untouched, and nothing beside
 * `productId`, `variantSku` and `qty` is ever read from the input. Without
 * `CMS_TEST_POSTGRES_URL` the file skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { BagLine } from '@engine/cms/shop/pricing'

import { addToBagChecked, type AddToBagResult } from './add-to-bag'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../../packages/cms/src/collections/users/staff.test-support'
import { makeProduct } from '../../../../../../packages/cms/src/collections/stock-levels/shop.test-support'

describe.skipIf(!server)('addToBagChecked, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('web_add_to_bag_test', (config, key) =>
      getPayload({ config, key }),
    )
    await stack.payload.update({
      collection: 'stores',
      id: stack.stores[0].id,
      data: { active: true, address: 'Jl. Raya Ubud 1', lat: -8.5069, lng: 115.262 } as never,
    })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const stock = (product: number, quantity: number) =>
    stack.payload.create({
      collection: 'stock-levels',
      data: { store: stack.stores[0].id, product, quantity } as never,
    })

  /** Narrows away `refused`, which carries no `lines` — fails the test loudly if it happened. */
  function added(result: AddToBagResult): readonly BagLine[] {
    if (result.outcome === 'refused') throw new Error('expected an edit, got refused')
    return result.lines
  }

  it('add merges the same product and variant', async () => {
    const product = await makeProduct(stack.payload, 'OEI-MERGE')
    await stock(product.id, 5)
    const first = await addToBagChecked(stack.payload, [], { productId: product.id, qty: 2 })
    expect(first.outcome).toBe('added')
    const second = await addToBagChecked(stack.payload, added(first), {
      productId: product.id,
      qty: 3,
    })
    expect(second.outcome).toBe('updated')
    expect(added(second)).toEqual([{ productId: product.id, variantSku: null, qty: 5 }])
  })

  it('a forced add of an out-of-stock product changes nothing', async () => {
    const product = await makeProduct(stack.payload, 'OEI-OOS')
    const result = await addToBagChecked(stack.payload, [], { productId: product.id, qty: 1 })
    expect(result.outcome).toBe('refused')
  })

  it('price fields in the form are ignored', async () => {
    const product = await makeProduct(stack.payload, 'OEI-PRICE')
    await stock(product.id, 3)
    const result = await addToBagChecked(stack.payload, [], {
      productId: product.id,
      qty: 1,
      price: 1,
      unitIdr: 999999999,
    })
    expect(result.outcome).toBe('added')
    expect(added(result)).toEqual([{ productId: product.id, variantSku: null, qty: 1 }])
  })
})
