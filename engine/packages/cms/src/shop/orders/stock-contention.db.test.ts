/**
 * `createOrder` under stock-lock contention, on a real, pushed Postgres (TASKS.md 10.5.b, 10.5.c).
 * Each test holds the stock row's lock itself, on a side connection, past `STOCK_LOCK_TIMEOUT`, so
 * what it proves does not depend on the host's speed:
 * - twenty orders for the last unit while its row is held: one order, nineteen designed refusals
 *   (at least one `busy` — the lock really was lost), nothing thrown;
 * - an order whose row is held and still stocked is refused `busy`, and takes nothing;
 * - an order whose row is held after another buyer took the last unit is refused `out_of_stock`.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import {
  lockWaits,
  openSidePool,
  settleCounter,
  waitUntil,
  type SidePool,
} from '../payments/side-pool.test-support'
import { createOrder, type CreateOrderResult } from './create-order'
import {
  BAG_KEY,
  PIN,
  bag,
  checkout,
  openShop,
  product,
  readers,
  type Readers,
  type Shop,
} from './orders-db.test-support'

describe.skipIf(!server)('createOrder under a held stock lock, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let read: Readers
  let side: SidePool

  beforeAll(async () => {
    stack = await startStaffStack('cms_orders_contention_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    read = readers(stack.pool)
    side = await openSidePool(stack, 4)
  }, 180_000)
  afterAll(async () => {
    await side?.end()
    await stack?.stop()
  }, 60_000)

  const order = (cookie: string) =>
    createOrder(stack.payload, checkout(cookie, PIN.ubud), { bagKey: BAG_KEY })
  const lockRow = (id: number) => `SELECT id FROM stock_levels WHERE id = ${id} FOR UPDATE`

  it('20 orders for the last unit, its row held past the lock timeout: one order, 19 designed refusals', async () => {
    const last = await product(stack, { [shop.ubud]: 1 })
    const row = last.stockRows[shop.ubud]!
    const cookie = bag({ productId: last.id, variantSku: null, qty: 1 })
    const holder = await side.connect()
    const watcher = await side.connect()
    let settled: PromiseSettledResult<CreateOrderResult>[]
    try {
      await holder.query('BEGIN')
      await holder.query(lockRow(row))
      const orders = settleCounter(Array.from({ length: 20 }, () => order(cookie)))
      await waitUntil(
        async () => (await lockWaits(watcher)) >= 5,
        10_000,
        'orders queue on the row',
      )
      // Held until the queued orders have lost the lock (STOCK_LOCK_TIMEOUT), then let go.
      await waitUntil(() => orders.settled() >= 1, 15_000, 'an order gives up the lock')
      await holder.query('COMMIT')
      settled = await orders.all
    } finally {
      holder.release()
      watcher.release()
    }
    // Nothing thrown: every loser is a designed refusal, never a database error.
    const thrown = settled.filter((result) => result.status === 'rejected')
    expect(thrown.map((result) => String((result as PromiseRejectedResult).reason))).toEqual([])
    const results = settled.map((r) => (r as PromiseFulfilledResult<CreateOrderResult>).value)
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    const soldOut = {
      ok: false,
      refusal: 'out_of_stock',
      lines: [{ productId: last.id, variantSku: null }],
    }
    const busy = { ok: false, refusal: 'busy' }
    const refusals = results.filter((result) => !result.ok)
    expect(refusals).toHaveLength(19)
    for (const refusal of refusals) expect([soldOut, busy]).toContainEqual(refusal)
    // The lock really was lost, and said so plainly.
    expect(refusals.filter((refusal) => refusal.refusal === 'busy').length).toBeGreaterThanOrEqual(
      1,
    )
    expect(await read.quantity(row)).toBe(0)
    expect(await read.ordersFor(last.id)).toBe(1)
  }, 120_000)

  it('a held row that still holds the units: busy, and nothing taken', async () => {
    // Two lines: `first` sorts first in the lock order and is taken before `second` is waited on.
    const first = await product(stack, { [shop.ubud]: 5 })
    const second = await product(stack, { [shop.ubud]: 2 })
    const cookie = bag(
      { productId: second.id, variantSku: null, qty: 1 },
      { productId: first.id, variantSku: null, qty: 2 },
    )
    const holder = await side.connect()
    const watcher = await side.connect()
    try {
      await holder.query('BEGIN')
      await holder.query(lockRow(second.stockRows[shop.ubud]!))
      const pending = order(cookie)
      await waitUntil(async () => (await lockWaits(watcher)) >= 1, 10_000, 'the order queues')
      // Answered while the holder still holds the row.
      expect(await pending).toEqual({ ok: false, refusal: 'busy' })
      await holder.query('COMMIT')
    } finally {
      holder.release()
      watcher.release()
    }
    expect(await read.quantity(first.stockRows[shop.ubud]!)).toBe(5)
    expect(await read.quantity(second.stockRows[shop.ubud]!)).toBe(2)
    expect(await read.ordersFor(first.id)).toBe(0)
  }, 60_000)

  it('a held row whose last unit another buyer took: out_of_stock, not busy', async () => {
    const last = await product(stack, { [shop.ubud]: 1 })
    const row = last.stockRows[shop.ubud]!
    const cookie = bag({ productId: last.id, variantSku: null, qty: 1 })
    const seller = await side.connect()
    const keeper = await side.connect()
    const watcher = await side.connect()
    try {
      // Another buyer is taking the last unit (uncommitted); a third session queues behind it.
      await seller.query('BEGIN')
      await seller.query(`UPDATE stock_levels SET quantity = 0 WHERE id = ${row}`)
      await keeper.query('BEGIN')
      const kept = keeper.query(lockRow(row))
      await waitUntil(async () => (await lockWaits(watcher)) >= 1, 10_000, 'the keeper queues')
      // Ours picks the store (the committed count still reads 1) and queues behind both.
      const pending = order(cookie)
      await waitUntil(async () => (await lockWaits(watcher)) >= 2, 10_000, 'the order queues')
      // The sale commits; the keeper takes the row and holds it past the order's lock timeout.
      await seller.query('COMMIT')
      await kept
      expect(await pending).toEqual({
        ok: false,
        refusal: 'out_of_stock',
        lines: [{ productId: last.id, variantSku: null }],
      })
      await keeper.query('COMMIT')
    } finally {
      seller.release()
      keeper.release()
      watcher.release()
    }
    expect(await read.quantity(row)).toBe(0)
    expect(await read.ordersFor(last.id)).toBe(0)
  }, 60_000)
})
