/**
 * TASKS.md 3.5.c, on a **migrated** database (`./migrated-stack.test-support`): a store user moves
 * their order one step forward and no further, refused with a plain field message over REST and
 * through the Local API alike (the 8.6 finding); the editor's wider reach; the server's own moves
 * (payment and expiry) left alone. Who may make which move is proved without a database in
 * `../collections/orders/status-moves.test.ts`; the store's scoping is 3.5.e
 * (`./role-scoping.db.test.ts`).
 */
import { getPayload, ValidationError } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asUser } from '../access/as-user'
import { makeOrder, makeProduct } from '../collections/stock-levels/shop.test-support'
import {
  fieldError,
  server,
  startMigratedStack,
  type MigratedStack,
} from './migrated-stack.test-support'

describe.skipIf(!server)('order status moves on the migrated database (3.5.c)', () => {
  let stack: MigratedStack
  let product: number

  beforeAll(async () => {
    stack = await startMigratedStack('cms_status_moves_test', (config, key) =>
      getPayload({ config, key, disableOnInit: true }),
    )
    product = (await makeProduct(stack.payload, 'OEI-MOVES')).id
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const order = async (status = 'paid') =>
    (await makeOrder(stack.payload, { store: stack.stores[0].id, product, qty: 1, status })).id
  const stored = (id: number) =>
    stack.payload.findByID({ collection: 'orders', id, depth: 0 }) as unknown as Promise<{
      status: string
      history?: Array<{ from: string; to: string; by: number; actor: string }>
    }>

  it('a store user moves one step forward, and records who moved it', async () => {
    const id = await order('paid')
    const moved = await stack.rest('PATCH', `/api/orders/${id}`, {
      as: 'store',
      json: { status: 'processing' },
    })
    expect(moved.status).toBe(200)
    const after = await stored(id)
    expect(after.status).toBe('processing')
    expect(after.history?.at(-1)).toMatchObject({
      from: 'paid',
      to: 'processing',
      actor: 'user',
      by: stack.users.store.id,
    })
  })

  it('refuses a store user two steps, a step back and a cancel, with a plain message on status', async () => {
    const id = await order('processing')
    for (const status of ['on_the_way', 'paid', 'cancelled']) {
      const refused = await stack.rest('PATCH', `/api/orders/${id}`, {
        as: 'store',
        json: { status },
      })
      expect(refused.status, status).toBe(400)
      expect(fieldError(refused), status).toMatchObject({
        path: 'status',
        message: expect.stringMatching(
          /^Store staff (move an order one step forward only|cannot move)/,
        ),
      })
    }
    expect((await stored(id)).status).toBe('processing')
  })

  it('answers the Local API with the same ValidationError and the same words', async () => {
    const id = await order('paid')
    const attempt = stack.payload.update({
      collection: 'orders',
      id,
      data: { status: 'delivered' } as never,
      ...asUser({ user: stack.users.store, payload: stack.payload } as never),
    })
    await expect(attempt).rejects.toBeInstanceOf(ValidationError)
    await attempt.catch((error: ValidationError) => {
      expect(error.data.errors[0]).toMatchObject({
        path: 'status',
        message:
          'Store staff move an order one step forward only: from “Paid” the next step is “Processing”. Hand it back with a reason if something is wrong.',
      })
    })
  })

  it('refuses “on the way” until the driver’s details are uploaded', async () => {
    const id = await order('waiting_driver')
    const refused = await stack.rest('PATCH', `/api/orders/${id}`, {
      as: 'store',
      json: { status: 'on_the_way' },
    })
    expect(fieldError(refused)?.message).toMatch(/^Upload the driver’s details/)
    // The server's upload route records them (with access overridden); then the step is theirs.
    await stack.payload.update({
      collection: 'orders',
      id,
      data: { driverImage: { key: `orders/${id}/driver.webp` } } as never,
    })
    const moved = await stack.rest('PATCH', `/api/orders/${id}`, {
      as: 'store',
      json: { status: 'on_the_way' },
    })
    expect(moved.status).toBe(200)
  })

  it('lets an editor cancel, step back once, and never reopen a cancelled order', async () => {
    const id = await order('waiting_driver')
    const back = await stack.rest('PATCH', `/api/orders/${id}`, {
      as: 'editor',
      json: { status: 'processing' },
    })
    expect(back.status).toBe(200)
    expect(
      (
        await stack.rest('PATCH', `/api/orders/${id}`, {
          as: 'editor',
          json: { status: 'cancelled' },
        })
      ).status,
    ).toBe(200)
    const reopened = await stack.rest('PATCH', `/api/orders/${id}`, {
      as: 'owner',
      json: { status: 'paid' },
    })
    expect(fieldError(reopened)?.message).toMatch(/^An order cannot move from “Cancelled”/)
  })

  it('leaves the server’s own moves alone (no signed-in user): payment and expiry', async () => {
    const id = await order('pending_payment')
    await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
    expect((await stored(id)).status).toBe('paid')
  })
})
