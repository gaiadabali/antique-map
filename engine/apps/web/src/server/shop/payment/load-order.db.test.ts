/**
 * The order page's read, on a real, pushed Postgres (TASKS.md 6.5.a; SECURITY.md T1–T2): a wrong
 * token and a wrong number both answer `null`, the view carries no email, phone or address, and an
 * expired order a late payment reached shows the staff situation, not the staff's own wording.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../../packages/cms/src/collections/users/staff.test-support'
import { createOrder, type CreatedOrder } from '../../../../../../packages/cms/src/shop/orders'
import {
  BAG_KEY,
  PIN,
  bag,
  checkout,
  openShop,
  product,
  type Shop,
} from '../../../../../../packages/cms/src/shop/orders/orders-db.test-support'
import { loadOrderForBuyer, orderIdForBuyer } from './load-order'

describe.skipIf(!server)('the order page read, on a real database', () => {
  let stack: StaffStack
  let shop: Shop

  beforeAll(async () => {
    stack = await startStaffStack('web_payment_load_order_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
  }, 180_000)
  afterAll(async () => stack?.stop(), 60_000)

  async function placedOrder(qty = 1): Promise<CreatedOrder> {
    const item = await product(stack, { [shop.ubud]: 5 })
    const created = await createOrder(
      stack.payload,
      checkout(bag({ productId: item.id, variantSku: null, qty }), PIN.ubud),
      { bagKey: BAG_KEY },
    )
    if (!created.ok) throw new Error(`setup: order was refused (${created.refusal})`)
    return created
  }

  it('a wrong token is null', async () => {
    const order = await placedOrder()
    const view = await loadOrderForBuyer(stack.payload, order.number, 'not-the-right-token')
    expect(view).toBeNull()
  })

  it('a wrong number is null', async () => {
    const order = await placedOrder()
    const view = await loadOrderForBuyer(stack.payload, order.number + 999, order.trackingToken)
    expect(view).toBeNull()
  })

  it('the view carries no email, phone or address', async () => {
    const order = await placedOrder()
    const view = await loadOrderForBuyer(stack.payload, order.number, order.trackingToken)
    expect(view).not.toBeNull()
    const json = JSON.stringify(view)
    expect(json).not.toMatch(/made@example\.test/i)
    expect(json).not.toMatch(/0812/)
    expect(json).not.toMatch(/Bisma/)
  })

  it('the id a wrong token names is null, and the right one answers the order', async () => {
    const order = await placedOrder()
    expect(await orderIdForBuyer(stack.payload, order.number, 'wrong')).toBeNull()
    expect(await orderIdForBuyer(stack.payload, order.number, order.trackingToken)).toBe(
      order.orderId,
    )
  })

  it('an expired order with a late payment shows the staff text', async () => {
    const order = await placedOrder()
    await stack.pool.query(
      `UPDATE orders SET status = 'expired', needs_attention_flag = true,
                         needs_attention_reason = 'Paid after the order was expired.'
         WHERE id = ${order.orderId}`,
    )
    const view = await loadOrderForBuyer(stack.payload, order.number, order.trackingToken)
    expect(view?.status).toBe('expired')
    expect(view?.needsAttention).toEqual({ reason: 'late_payment' })
  })

  it('an ordinary expired order carries no needsAttention', async () => {
    const order = await placedOrder()
    await stack.pool.query(`UPDATE orders SET status = 'expired' WHERE id = ${order.orderId}`)
    const view = await loadOrderForBuyer(stack.payload, order.number, order.trackingToken)
    expect(view?.needsAttention).toBeNull()
  })
})
