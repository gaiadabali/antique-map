/**
 * The orders door on a real, pushed Postgres (TASKS.md 27.3.e): a store user's inbox — tabs,
 * counts and search — holds their own store's orders only, and another store's order is not even
 * found by its exact number or opened by its id; the store user takes a paid order through every
 * tab to Delivered with the same core calls the order page's one button makes; and the reassign
 * sheet's stores say, from live stock, which hold every item, nearest the pin first.
 *
 * The staff stack's one store user belongs to Ubud (`stores[0]`). Supersedes the 6-followup-3
 * `store-queue.db.test.ts`: the queue is now the inbox's "Needs action" tab.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { attachDriverImage } from '../../shop/fulfilment/driver-image'
import { actors, memoryStore } from '../../shop/fulfilment/fulfilment-db.test-support'
import { reencodeImage } from '../../shop/fulfilment/image'
import { EXIF_JPEG } from '../../shop/fulfilment/image.test-support'
import { moveOrder } from '../../shop/fulfilment/move'
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
import type { OrderStatus } from '../../collections/orders/statuses'
import { loadOrder } from './data'
import { INBOX_TABS, tabForStatus, type InboxTab } from './inbox'
import { loadInbox, loadReassignOptions } from './inbox-data'

describe.skipIf(!server)('the orders door, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let as: ReturnType<typeof actors>

  beforeAll(async () => {
    stack = await startStaffStack('cms_order_door_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    as = actors(stack)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const reqOf = (who: 'store' | 'owner') =>
    ({ user: { ...stack.users[who], collection: 'users' }, payload: stack.payload }) as never

  const inbox = (who: 'store' | 'owner', tab: InboxTab, q = '') =>
    loadInbox(stack.payload, reqOf(who), { tab, q, store: null, page: 1 })

  /** A placed order, then marked paid as the webhook would (the move itself is the payments core's). */
  async function paidOrder(
    stock: Record<number, number>,
    pin: { lat: number; lng: number },
    qty = 1,
  ) {
    const made = await product(stack, stock)
    const created = await createOrder(
      stack.payload,
      checkout(bag({ productId: made.id, variantSku: null, qty }), pin),
      { bagKey: BAG_KEY },
    )
    if (!created.ok) throw new Error(`could not place the order: ${created.refusal}`)
    await stack.pool.query(`UPDATE orders SET status = 'paid' WHERE id = ${created.orderId}`)
    return { ...created, productId: made.id, stockRows: made.stockRows }
  }

  it('a store user’s tabs, counts and search hold their own store’s orders only', async () => {
    const mine = await paidOrder({ [shop.ubud]: 5 }, PIN.ubud)
    const theirs = await paidOrder({ [shop.sanur]: 5 }, PIN.sanur)

    const needs = await inbox('store', 'needs_action')
    const ids = needs.rows.map((row) => row.id)
    expect(ids).toContain(mine.orderId)
    expect(ids).not.toContain(theirs.orderId)

    // Every tab's count is the store's own orders in that tab, as the database counts them.
    const { rows } = await stack.pool.query(
      `SELECT status::text AS status, count(*) AS n FROM orders WHERE store_id = ${shop.ubud} GROUP BY 1`,
    )
    const expected = Object.fromEntries(INBOX_TABS.map((tab) => [tab, 0])) as Record<
      InboxTab,
      number
    >
    for (const row of rows) expected[tabForStatus(row.status as OrderStatus)] += Number(row.n)
    expect(needs.counts).toEqual(expected)

    // Another store's order is not found by its exact number, in any tab, nor opened by its id.
    const search = await inbox('store', 'needs_action', `#${theirs.number}`)
    expect(search.rows).toHaveLength(0)
    expect(Object.values(search.counts).reduce((a, b) => a + b, 0)).toBe(0)
    expect(await loadOrder(stack.payload, reqOf('store'), theirs.orderId)).toBeNull()
    // Its own, by number or by the buyer's phone typed the local way.
    expect(
      (await inbox('store', 'needs_action', String(mine.number))).rows.map((r) => r.id),
    ).toEqual([mine.orderId])
    const byPhone = await inbox('store', 'needs_action', '0812 3456 7890')
    expect(byPhone.rows.map((r) => r.id)).toContain(mine.orderId)
    expect(byPhone.rows.map((r) => r.id)).not.toContain(theirs.orderId)
    // The owner sees both.
    const owner = (await inbox('owner', 'needs_action')).rows.map((r) => r.id)
    expect(owner).toEqual(expect.arrayContaining([mine.orderId, theirs.orderId]))
  })

  it('a store user takes a paid order to Delivered, tab by tab, as the one button does', async () => {
    const order = await paidOrder({ [shop.ubud]: 3 }, PIN.ubud)
    const memory = memoryStore()
    const started = Date.now()
    const tabOfOrder = async () => {
      for (const tab of INBOX_TABS) {
        const { rows } = await inbox('store', tab)
        if (rows.some((row) => row.id === order.orderId)) return tab
      }
      return null
    }
    expect(await tabOfOrder()).toBe('needs_action')
    for (const to of ['processing', 'waiting_driver'] as const) {
      expect(
        await moveOrder(stack.payload, { orderId: order.orderId, to, actor: as.store }),
      ).toMatchObject({
        ok: true,
      })
      expect(await tabOfOrder()).toBe(to)
    }
    // "On the way" waits for the driver's photo, as the page says.
    expect(
      await moveOrder(stack.payload, { orderId: order.orderId, to: 'on_the_way', actor: as.store }),
    ).toMatchObject({ ok: false, refusal: 'driver_image_required' })
    const attached = await attachDriverImage(
      stack.payload,
      { orderId: order.orderId, file: { buffer: EXIF_JPEG }, actor: as.store },
      { ...memory.deps, reencode: reencodeImage },
    )
    expect(attached.ok).toBe(true)
    for (const to of ['on_the_way', 'delivered'] as const) {
      expect(
        await moveOrder(stack.payload, { orderId: order.orderId, to, actor: as.store }),
      ).toMatchObject({
        ok: true,
      })
      expect(await tabOfOrder()).toBe(to)
    }
    // The system's own time for the whole walk; the person's pace is measured by the e2e.
    expect(Date.now() - started).toBeLessThan(45_000)
    const opened = await loadOrder(stack.payload, reqOf('store'), order.orderId)
    expect(opened?.status).toBe('delivered')
    const moves = (opened?.history ?? []).filter((entry) => entry.from !== entry.to)
    expect(moves.map((entry) => entry.to)).toEqual([
      'pending_payment', // placed, priced from the bands (K2); paid by the test in SQL
      'processing',
      'waiting_driver',
      'on_the_way',
      'delivered',
    ])
  })

  it('the reassign sheet lists the other stores that hold every item, with their distance', async () => {
    const order = await paidOrder({ [shop.ubud]: 4, [shop.sanur]: 2 }, PIN.ubud, 2)
    const options = await loadReassignOptions(
      stack.payload,
      reqOf('owner'),
      (await loadOrder(stack.payload, reqOf('owner'), order.orderId))!,
    )
    // Only Sanur: the order's own store is never offered. Ubud's store to the Ubud pin is 1.4 km,
    // Sanur's 19.4 km — the straight line from Sanur, to 0.1 km.
    expect(options).toEqual([
      {
        id: shop.sanur,
        name: expect.any(String),
        area: 'Sanur',
        distanceKm: expect.any(Number),
        holdsAll: true,
      },
    ])
    expect(options[0]!.distanceKm).toBeGreaterThan(18)
    expect(options[0]!.distanceKm).toBeLessThan(21)

    // One unit short at Sanur: still listed, no longer one that holds every item.
    await stack.pool.query(
      `UPDATE stock_levels SET quantity = 1 WHERE id = ${order.stockRows[shop.sanur]}`,
    )
    const short = await loadReassignOptions(
      stack.payload,
      reqOf('owner'),
      (await loadOrder(stack.payload, reqOf('owner'), order.orderId))!,
    )
    expect(short.map((option) => option.holdsAll)).toEqual([false])
  })
})
