/**
 * `loadStoreQueue` (TASKS.md 6.6, 7.2), on a real, pushed Postgres: `ACTIVE_STATUSES` now carries
 * `awaiting_quote` and `pending_payment` (6-followup-3) so a store user's own queue shows an order
 * it must quote or is waiting on the buyer to pay — scoped to its own store by the collection's
 * access rule (`collections/orders/access.ts` `ownStoreOrders`), the same as every other status
 * already in the list.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { createOrder } from '../../shop/orders/create-order'
import {
  BAG_KEY,
  PIN,
  bag,
  checkout,
  openShop,
  product,
  type Shop,
} from '../../shop/orders/orders-db.test-support'
import { loadStoreQueue } from './data'

describe.skipIf(!server)("a store user's queue, scoped to its own store (6-followup-3)", () => {
  let stack: StaffStack
  let shop: Shop

  beforeAll(async () => {
    stack = await startStaffStack('cms_store_queue_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  it("sees its own store's awaiting_quote order, never another store's", async () => {
    // The staff stack's one store user belongs to Ubud (`stores[0]`); this order is placed at Sanur.
    const mine = await product(stack, { [shop.ubud]: 5 })
    const theirs = await product(stack, { [shop.sanur]: 5 })
    const myOrder = await createOrder(
      stack.payload,
      checkout(bag({ productId: mine.id, variantSku: null, qty: 1 }), PIN.ubud),
      { bagKey: BAG_KEY },
    )
    const theirOrder = await createOrder(
      stack.payload,
      checkout(bag({ productId: theirs.id, variantSku: null, qty: 1 }), PIN.sanur),
      { bagKey: BAG_KEY },
    )
    if (!myOrder.ok) throw new Error(`could not place my order: ${myOrder.refusal}`)
    if (!theirOrder.ok) throw new Error(`could not place their order: ${theirOrder.refusal}`)

    const req = { user: { ...stack.users.store, collection: 'users' }, payload: stack.payload }
    const rows = await loadStoreQueue(stack.payload, req as never)
    const ids = rows.map((row) => row.id)

    expect(ids).toContain(myOrder.orderId)
    expect(ids).not.toContain(theirOrder.orderId)
    expect(rows.find((row) => row.id === myOrder.orderId)?.status).toBe('awaiting_quote')
  })
})
