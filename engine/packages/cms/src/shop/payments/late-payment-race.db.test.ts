/**
 * A payment after expiry under concurrency, on a real, pushed Postgres (TASKS.md 10.7.c, with the
 * 10.5 rules: never a 500, the dedupe key, 503 with `Retry-After`):
 * - ten identical late settlements, queued behind an order lock the test holds, then let go at
 *   once: no 500, and once Midtrans retries the 503s, the units are re-taken exactly once;
 * - a late settlement racing a new checkout for the last unit, both queued on the unit's stock row
 *   behind a lock the test holds, each side first in turn: the unit sells once — to the checkout
 *   (the late order paid, flagged "stock gone") or to the late payer (the checkout told it sold
 *   out) — and the shelf never goes below zero.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server } from '../../collections/users/staff.test-support'
import { createOrder } from '../orders/create-order'
import { BAG_KEY, PIN, bag, checkout, product } from '../orders/orders-db.test-support'
import { BUSY_RETRY_AFTER_SECONDS } from './http/webhook'
import { startLateStack, type LateStack } from './late-payment-db.test-support'
import { lockWaits, openSidePool, waitUntil, type SidePool } from './side-pool.test-support'

describe.skipIf(!server)('a payment after expiry, under concurrency, on a real database', () => {
  let s: LateStack
  let side: SidePool

  beforeAll(async () => {
    s = await startLateStack('cms_late_payment_race_test')
    side = await openSidePool(s.stack)
  }, 180_000)
  afterAll(async () => {
    await side?.end()
    await s?.stack.stop()
  }, 60_000)

  /** Delivers `body` until every answer is 200 (Midtrans retrying each 503); no 500 ever. */
  async function deliverUntilAccepted(responses: Response[], body: string) {
    let pending = responses
    for (let round = 0; round < 5 && pending.length > 0; round += 1) {
      for (const r of pending) {
        expect([200, 503]).toContain(r.status)
        if (r.status === 503) {
          expect(r.headers.get('Retry-After')).toBe(String(BUSY_RETRY_AFTER_SECONDS))
        }
      }
      const busy = pending.filter((r) => r.status === 503)
      pending = await Promise.all(busy.map(() => s.webhook(body)))
    }
    expect(pending.every((r) => r.status === 200)).toBe(true)
  }

  it('ten concurrent replays of one late payment re-take its units once', async () => {
    const order = await s.expiredOrder({ store: s.stack.stores[0].id, qty: 1, left: 0 })
    expect(await s.read.stock(order.stock)).toBe(1)
    const body = s.settleBody(order)

    const holder = await side.connect()
    const watcher = await side.connect()
    let first: Response[]
    try {
      await holder.query('BEGIN')
      await holder.query(`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`)
      const deliveries = Promise.all(Array.from({ length: 10 }, () => s.webhook(body)))
      await waitUntil(async () => (await lockWaits(watcher)) >= 5, 10_000, 'deliveries queue')
      await holder.query('COMMIT') // let go: the queued deliveries race for the order
      first = await deliveries
    } finally {
      holder.release()
      watcher.release()
    }
    await deliverUntilAccepted(first, body)

    expect(await s.read.stock(order.stock)).toBe(0)
    expect(await s.read.order(order.id)).toMatchObject({
      status: 'paid',
      needs_attention_flag: true,
    })
    const late = (await s.read.events(order.id)).filter((e) => e.outcome === 'late-payment')
    expect(late).toHaveLength(1)
    expect((await s.read.history(order.id)).filter((h) => h.to === 'paid')).toHaveLength(1)
  }, 120_000)

  it('a late payment racing a new checkout for the last unit sells it once', async () => {
    const ubud = s.shop.ubud
    const outcomes: string[] = []
    for (let round = 0; round < 4; round += 1) {
      // A checkout-buyable product; the late order held its one unit, which the expiry gave back.
      const made = await product(s.stack, { [ubud]: 0 })
      const order = await s.expiredOrder({
        store: ubud,
        qty: 1,
        product: { id: made.id, stock: made.stockRows[ubud]! },
      })
      expect(await s.read.stock(order.stock)).toBe(1)
      const body = s.settleBody(order)

      // Both meet at the unit's stock row: the test holds its lock until both queue on it — the
      // checkout first in even rounds, the late payment first in odd ones — then lets go.
      const buy = () =>
        createOrder(
          s.stack.payload,
          checkout(bag({ productId: made.id, variantSku: null, qty: 1 }), PIN.ubud),
          { bagKey: BAG_KEY },
        )
      const holder = await side.connect()
      const watcher = await side.connect()
      const stuck = '%UPDATE stock_levels%'
      let paid: Response
      let placed: Awaited<ReturnType<typeof buy>>
      try {
        await holder.query('BEGIN')
        await holder.query(`SELECT id FROM stock_levels WHERE id = ${order.stock} FOR UPDATE`)
        const queued = async (n: number) =>
          waitUntil(async () => (await lockWaits(watcher, stuck)) >= n, 10_000, `${n} queued`)
        const [firstUp, secondUp] =
          round % 2 === 0
            ? [buy as () => Promise<unknown>, () => s.webhook(body)]
            : [() => s.webhook(body), buy as () => Promise<unknown>]
        const first = firstUp()
        await queued(1)
        const second = secondUp()
        await queued(2)
        await holder.query('COMMIT')
        const both = await Promise.all([first, second])
        const [a, b] = round % 2 === 0 ? [both[1], both[0]] : [both[0], both[1]]
        paid = a as Response
        placed = b as Awaited<ReturnType<typeof buy>>
      } finally {
        holder.release()
        watcher.release()
      }
      await deliverUntilAccepted([paid], body)

      const late = await s.read.order(order.id)
      expect(late.status).toBe('paid')
      const retook = /stock re-taken/.test(String(late.needs_attention_reason))
      if (!placed.ok) expect(['out_of_stock', 'busy']).toContain(placed.refusal)
      if (!retook) expect(late.needs_attention_reason).toMatch(/stock gone/)
      // The one unit went to exactly one of them — a checkout that waited on the late payment's
      // row lock and gave up (`busy`) lost to it too — and the shelf is empty, never below zero.
      expect((placed.ok ? 1 : 0) + (retook ? 1 : 0)).toBe(1)
      expect(await s.read.stock(order.stock)).toBe(0)
      outcomes.push(placed.ok ? 'checkout' : 'late payer')
    }
    // The lock queue decides: whoever queued first on the row took the unit.
    expect(outcomes).toEqual(['checkout', 'late payer', 'checkout', 'late payer'])
  }, 240_000)
})
