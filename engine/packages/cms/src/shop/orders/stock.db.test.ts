/**
 * The atomic stock on a real, pushed Postgres (TASKS.md 6.3.c, 6.3.d; SECURITY.md P5): twenty
 * buyers at once for the last unit — exactly one order, nineteen designed refusals (`out_of_stock`,
 * or `busy` for one whose wait outlasted `STOCK_LOCK_TIMEOUT`, TASKS.md 10.5.b), nothing thrown,
 * the stock at zero; and a line that loses its unit after the pick rolls back every decrement the
 * order had already made.
 *
 * The orders run on the Payload pool's own connections, one per transaction. Left alone, the first
 * order often commits before the others reach their decrement, and the race is never run. So a
 * side connection holds the stock row's lock while they start: each picks the store (it reads
 * quantity 1, as reads do not wait on a row lock) and queues on the row; once many are queued the
 * side connection lets go, and they hit `UPDATE … AND quantity >= 1` together.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
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

type Client = {
  query(text: string): Promise<{ rows: Array<Record<string, unknown>> }>
  release(): void
}
type SidePool = { connect(): Promise<Client>; end(): Promise<void> }

describe.skipIf(!server)('the atomic stock decrement, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let read: Readers
  let side: SidePool

  beforeAll(async () => {
    stack = await startStaffStack('cms_orders_stock_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    read = readers(stack.pool)
    // A pool of our own on the same database (pg's Pool, the adapter's), so holding a lock never
    // takes one of Payload's ten connections.
    const { rows } = await stack.pool.query('SELECT current_database() AS name')
    const url = new URL(server!)
    url.pathname = `/${String(rows[0]!.name)}`
    const Pool = stack.pool.constructor as unknown as new (options: object) => SidePool
    side = new Pool({ connectionString: url.toString(), max: 3 })
  }, 180_000)
  afterAll(async () => {
    await side?.end()
    await stack?.stop()
  }, 60_000)

  /** Sessions in the test database waiting on a lock now. */
  const lockWaits = async (client: Client) =>
    Number(
      (
        await client.query(
          `SELECT count(*) AS n FROM pg_stat_activity
            WHERE datname = current_database() AND wait_event_type = 'Lock'`,
        )
      ).rows[0]!.n,
    )

  it('20 concurrent orders for the last unit: exactly one succeeds', async () => {
    const last = await product(stack, { [shop.ubud]: 1 })
    const row = last.stockRows[shop.ubud]!
    const cookie = bag({ productId: last.id, variantSku: null, qty: 1 })

    const holder = await side.connect()
    const watcher = await side.connect()
    let peak = 0
    let settled: PromiseSettledResult<CreateOrderResult>[]
    try {
      await holder.query('BEGIN')
      await holder.query(`SELECT id FROM stock_levels WHERE id = ${row} FOR UPDATE`)
      const orders = Promise.allSettled(
        Array.from({ length: 20 }, () =>
          createOrder(stack.payload, checkout(cookie, PIN.ubud), { bagKey: BAG_KEY }),
        ),
      )
      // Wait until Payload's ten connections are all queued on the row, or the queue stops growing
      // (bounded inside the pool's 5 s connect wait; a wait past STOCK_LOCK_TIMEOUT is `busy`).
      const started = Date.now()
      let steadySince = Date.now()
      while (Date.now() - started < 3000 && peak < 10) {
        const waiting = await lockWaits(watcher)
        if (waiting > peak) {
          peak = waiting
          steadySince = Date.now()
        } else if (peak > 1 && Date.now() - steadySince > 400) break
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      await holder.query('COMMIT')
      settled = await orders
    } finally {
      holder.release()
      watcher.release()
    }
    // The race really ran: many orders had picked the store and queued on the same row at once.
    expect(peak).toBeGreaterThanOrEqual(5)

    // Every loser is a designed refusal, never a database error.
    const thrown = settled.filter((result) => result.status === 'rejected')
    expect(thrown.map((result) => String((result as PromiseRejectedResult).reason))).toEqual([])
    const results = settled.map((r) => (r as PromiseFulfilledResult<CreateOrderResult>).value)
    expect(results.filter((result) => result.ok)).toHaveLength(1)
    // Told before paying, "X just sold out" — by the decrement, or, once the winner committed, by
    // the re-price or the pick — or, had a wait outlasted the lock timeout, "busy, try again".
    const soldOut = {
      ok: false,
      refusal: 'out_of_stock',
      lines: [{ productId: last.id, variantSku: null }],
    }
    const refusals = results.filter((result) => !result.ok)
    expect(refusals).toHaveLength(19)
    for (const refusal of refusals) {
      expect([soldOut, { ok: false, refusal: 'busy' }]).toContainEqual(refusal)
    }
    expect(await read.quantity(row)).toBe(0)
    expect(await read.ordersFor(last.id)).toBe(1)
  }, 120_000)

  it('a failed line rolls back every earlier decrement', async () => {
    // Two lines at the Ubud store only: `first` sorts first in the lock order (lower product id).
    const first = await product(stack, { [shop.ubud]: 5 })
    const second = await product(stack, { [shop.ubud]: 1 })
    const cookie = bag(
      { productId: second.id, variantSku: null, qty: 1 },
      { productId: first.id, variantSku: null, qty: 2 },
    )
    // Another buyer's uncommitted order holds `second`'s row, about to take its last unit.
    const other = await side.connect()
    const watcher = await side.connect()
    try {
      await other.query('BEGIN')
      await other.query(
        `UPDATE stock_levels SET quantity = 0 WHERE id = ${second.stockRows[shop.ubud]}`,
      )
      const pending = createOrder(stack.payload, checkout(cookie, PIN.ubud), { bagKey: BAG_KEY })
      // Ours picks the store (the count still reads 1), takes `first`, then waits on `second`.
      const started = Date.now()
      while ((await lockWaits(watcher)) === 0) {
        if (Date.now() - started > 4000) throw new Error('the order never waited on the held row')
        await new Promise((resolve) => setTimeout(resolve, 20))
      }
      await other.query('COMMIT')
      expect(await pending).toEqual({
        ok: false,
        refusal: 'out_of_stock',
        lines: [{ productId: second.id, variantSku: null }],
      })
    } finally {
      other.release()
      watcher.release()
    }
    expect(await read.quantity(first.stockRows[shop.ubud]!)).toBe(5)
    expect(await read.quantity(second.stockRows[shop.ubud]!)).toBe(0)
    expect(await read.ordersFor(first.id)).toBe(0)
  }, 60_000)
})
