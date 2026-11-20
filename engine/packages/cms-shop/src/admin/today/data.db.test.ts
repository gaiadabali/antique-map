/**
 * The "Today" home's numbers on a real Postgres (TASKS.md 27.6.a): each is the person's own read —
 * the owner sees every store's orders, the leads and the week's sales; an editor every store's
 * orders and the drafts, but no leads or money; a store user only their store's orders and stock.
 * Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeOrder, makeProduct } from '../../collections/stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { loadToday } from './data'

describe.skipIf(!server)('the Today home, on a real database', { timeout: 30_000 }, () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_today_test', (config, key) => getPayload({ config, key }))
    const [a, b] = stack.stores
    const product = await makeProduct(stack.payload, 'TODAY-1')
    await makeOrder(stack.payload, { store: a.id, product: product.id, qty: 1, status: 'paid' })
    const packed = await makeOrder(stack.payload, {
      store: b.id,
      product: product.id,
      qty: 2,
      status: 'processing',
    })
    // Paid an hour ago: in the week's sales (95,000 × 2 + 15,000 delivery).
    await stack.pool.query(
      `UPDATE orders SET payment_paid_at = now() - interval '1 hour' WHERE id = ${Number(packed.id)}`,
    )
    await stack.payload.create({
      collection: 'stock-levels',
      data: { store: a.id, product: product.id, quantity: 1 } as never,
    })
    await stack.payload.create({
      collection: 'stock-levels',
      data: { store: b.id, product: product.id, quantity: 40 } as never,
    })
    await stack.payload
      .create({
        collection: 'leads',
        data: {
          name: 'Ketut',
          email: 'ketut@example.test',
          site: 'shop',
          kind: 'partner',
        } as never,
      })
      .catch(() => null)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const as = (role: 'owner' | 'editor' | 'store') =>
    loadToday({ payload: stack.payload, user: { ...stack.users[role], collection: 'users' } })

  it('gives the owner every store’s orders, the drafts and the week’s paid sales', async () => {
    const today = await as('owner')
    expect(today.orders).toMatchObject({ needs_action: 1, processing: 1, waiting_driver: 0 })
    expect(today.lowStock?.rows).toBe(1)
    expect(today.drafts?.products).toBe(1)
    expect(today.sales).toEqual({ orders: 1, revenue: 205000 })
    expect(today.leads).not.toBeNull()
  })

  it('gives an editor the orders and drafts, but no leads and no money', async () => {
    const today = await as('editor')
    expect(today.orders).toMatchObject({ needs_action: 1, processing: 1 })
    expect(today.drafts?.products).toBe(1)
    expect(today.leads).toBeNull()
    expect(today.sales).toBeNull()
  })

  it('gives a store user their own store’s orders and stock alone', async () => {
    const today = await as('store')
    expect(today.orders).toMatchObject({ needs_action: 1, processing: 0 })
    expect(today.lowStock?.rows).toBe(1)
    expect(today.drafts).toBeNull()
    expect(today.leads).toBeNull()
    expect(today.sales).toBeNull()
  })
})
