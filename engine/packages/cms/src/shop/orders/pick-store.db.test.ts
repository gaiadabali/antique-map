/**
 * The assignment and the order's guarantees on a real, pushed Postgres (TASKS.md 6.3.b, 6.3.c;
 * COMMERCE.md §4, §8, §10): the nearer store wins and ties fall to the lower code, a basket no
 * single store can fill is refused before payment without touching stock, a pin outside Indonesia
 * is refused, a price from the request never reaches an order, the tracking token is stored only
 * as its SHA-256, and a used welcome code counts once.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { createOrder } from './create-order'
import type { Pin } from './geo'
import { trackingTokenHash } from './order-sql'
import { quoteCheckout } from './quote-checkout'
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

/** The two stores' pins are symmetric about it: the same 0.1 km, so the code decides. */
const MIDPOINT: Pin = { lat: -8.5991, lng: 115.2629 }

describe.skipIf(!server)('the assignment and the order, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let read: Readers

  beforeAll(async () => {
    stack = await startStaffStack('cms_orders_pick_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    read = readers(stack.pool)
  }, 180_000)
  afterAll(async () => stack?.stop(), 60_000)

  it('a pin in Ubud picks the nearer of two stores', async () => {
    const item = await product(stack, { [shop.ubud]: 5, [shop.sanur]: 5 })
    const pick = await quoteCheckout(
      stack.payload,
      { bagCookie: bag({ productId: item.id, variantSku: null, qty: 1 }), pin: PIN.ubud },
      { bagKey: BAG_KEY },
    )
    expect(pick.ok).toBe(true)
    if (!pick.ok) return
    expect(pick.sendingStore.area).toBe('Ubud')
    expect(pick.distanceKm).toBeLessThan(2)
    const order = await createOrder(
      stack.payload,
      checkout(bag({ productId: item.id, variantSku: null, qty: 1 }), PIN.ubud),
      { bagKey: BAG_KEY },
    )
    expect(order.ok).toBe(true)
  })

  it('ties are broken by store code', async () => {
    const item = await product(stack, { [shop.ubud]: 5, [shop.sanur]: 5 })
    const order = await createOrder(
      stack.payload,
      checkout(bag({ productId: item.id, variantSku: null, qty: 1 }), MIDPOINT),
      { bagKey: BAG_KEY },
    )
    expect(order.ok).toBe(true)
    const row = await read.order((order as { orderId: number }).orderId)
    // Equidistant to the tenth of a km, both holding the line: the lower code sends it ('S' < 'U').
    expect(row.store_snapshot_code).toBe('SNR-01')
  })

  it('a basket no single store can fill is refused before payment and changes no stock', async () => {
    const onlyUbud = await product(stack, { [shop.ubud]: 5 })
    const onlySanur = await product(stack, { [shop.sanur]: 5 })
    const cookie = bag(
      { productId: onlySanur.id, variantSku: null, qty: 1 },
      { productId: onlyUbud.id, variantSku: null, qty: 1 },
    )
    const result = await createOrder(stack.payload, checkout(cookie, PIN.sanur), {
      bagKey: BAG_KEY,
    })
    expect(result).toEqual({
      ok: false,
      refusal: 'no_single_store',
      missing: [{ productId: onlyUbud.id, variantSku: null }],
    })
    expect(await read.quantity(onlyUbud.stockRows[shop.ubud]!)).toBe(5)
    expect(await read.quantity(onlySanur.stockRows[shop.sanur]!)).toBe(5)
    expect(await read.ordersFor(onlyUbud.id)).toBe(0)
    expect(await read.ordersFor(onlySanur.id)).toBe(0)
  })

  it('a pin outside Indonesia is refused', async () => {
    const item = await product(stack, { [shop.ubud]: 5 })
    const result = await createOrder(
      stack.payload,
      checkout(bag({ productId: item.id, variantSku: null, qty: 1 }), PIN.darwin),
      { bagKey: BAG_KEY },
    )
    expect(result).toEqual({ ok: false, refusal: 'outside_indonesia' })
    expect(await read.ordersFor(item.id)).toBe(0)
  })

  it('a tampered price in the request is ignored', async () => {
    const item = await product(stack, { [shop.ubud]: 5 })
    const cookie = bag({ productId: item.id, variantSku: null, qty: 1 })
    // The review's figures, quoted by the server on the same assignment the order will use.
    const quoted = await quoteCheckout(
      stack.payload,
      { bagCookie: cookie, pin: PIN.ubud },
      { bagKey: BAG_KEY },
    )
    expect(quoted.ok).toBe(true)
    if (!quoted.ok) return

    // A buyer (or a script) sends a total that was never quoted: nothing is created.
    const tampered = await createOrder(
      stack.payload,
      checkout(cookie, PIN.ubud, {
        expectedTotalIdr: 1,
      }),
      { bagKey: BAG_KEY },
    )
    expect(tampered).toEqual({
      ok: false,
      refusal: 'price_changed',
      totals: {
        subtotalIdr: quoted.quote.subtotalIdr,
        discountIdr: quoted.quote.discountIdr,
        deliveryIdr: quoted.quote.deliveryIdr,
        totalIdr: quoted.quote.totalIdr,
      },
    })
    expect(await read.quantity(item.stockRows[shop.ubud]!)).toBe(5)
    expect(await read.ordersFor(item.id)).toBe(0)

    // The quoted total is accepted, and the order stores exactly the server's figures.
    const honest = await createOrder(
      stack.payload,
      checkout(cookie, PIN.ubud, { expectedTotalIdr: quoted.quote.totalIdr }),
      { bagKey: BAG_KEY },
    )
    expect(honest.ok).toBe(true)
    const row = await read.order((honest as { orderId: number }).orderId)
    expect(Number(row.totals_total)).toBe(quoted.quote.totalIdr)
    expect(Number(row.totals_subtotal)).toBe(quoted.quote.subtotalIdr)
  })

  it('the tracking token is never stored in clear', async () => {
    const item = await product(stack, { [shop.ubud]: 5 })
    const order = await createOrder(
      stack.payload,
      checkout(bag({ productId: item.id, variantSku: null, qty: 1 }), PIN.ubud, {
        welcomeCode: null,
      }),
      { bagKey: BAG_KEY },
    )
    expect(order.ok).toBe(true)
    if (!order.ok) return
    expect(order.trackingToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    const row = await read.order(order.orderId)
    // The database holds only the SHA-256, and it is the token's.
    expect(row.tracking_token_hash).toBe(trackingTokenHash(order.trackingToken))
    expect(row.tracking_token_hash).not.toContain(order.trackingToken)
    const everyCell = JSON.stringify([
      await read.order(order.orderId),
      await read.lines(order.orderId),
      await read.history(order.orderId),
    ])
    expect(everyCell.includes(order.trackingToken)).toBe(false)
  })

  it('a used welcome code increments used_count once', async () => {
    const item = await product(stack, { [shop.ubud]: 5 })
    const cookie = bag({ productId: item.id, variantSku: null, qty: 1 })
    const first = await createOrder(
      stack.payload,
      checkout(cookie, PIN.ubud, {
        welcomeCode: 'WELCOME10',
      }),
      { bagKey: BAG_KEY },
    )
    expect(first.ok).toBe(true)
    expect(await read.usedCount('WELCOME10')).toBe(1)
    if (first.ok) {
      const row = await read.order(first.orderId)
      expect(row.discount_code).toBe('WELCOME10')
      // 10% of the server's own subtotal, integer rupiah, taken off the total.
      expect(Number(row.totals_discount)).toBe(Math.round(Number(row.totals_subtotal) * 0.1))
      expect(Number(row.totals_total)).toBe(
        Number(row.totals_subtotal) - Number(row.totals_discount) + Number(row.totals_delivery_fee),
      )
    }
    // A second order without a code spends no extra use.
    const second = await createOrder(stack.payload, checkout(cookie, PIN.ubud), { bagKey: BAG_KEY })
    expect(second.ok).toBe(true)
    expect(await read.usedCount('WELCOME10')).toBe(1)
  })
})
