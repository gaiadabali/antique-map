/**
 * The fee-less order, the quote move and its expiries, on a real, pushed Postgres (TASKS.md 6.6):
 * an order is created `awaiting_quote` with no delivery fee and its stock taken; staff set the fee,
 * which prices the total from the stored row and opens the buyer's 60-minute payment window; a
 * store user of another store, and any attempt once the order has moved on, are refused; a bad fee
 * is refused before anything is locked; each of the two windows — unquoted, and quoted but unpaid —
 * expires the order and returns its stock exactly once; and the webhook can pay a quoted order but
 * never one still awaiting its price.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { actors } from '../fulfilment/fulfilment-db.test-support'
import { openPaymentAttempt } from '../payments/attempts'
import { runPaymentSweep } from '../payments/jobs'
import { SIMULATE } from '../payments/payments.test-support'
import { stackWebhook } from '../payments/payments-db.test-support'
import { simulatorProvider } from '../payments/simulator'
import { createOrder } from './create-order'
import {
  BAG_KEY,
  EXPIRY_MINUTES,
  PIN,
  bag,
  checkout,
  openShop,
  product,
  readers,
  type Shop,
} from './orders-db.test-support'
import { MAX_DELIVERY_FEE_IDR, quoteDeliveryFee } from './quote'

describe.skipIf(!server)('the quote move and its expiries, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let read: ReturnType<typeof readers>
  let as: ReturnType<typeof actors>
  const simulator = simulatorProvider(SIMULATE)
  const webhook = () => stackWebhook(stack.payload)

  beforeAll(async () => {
    stack = await startStaffStack('cms_orders_quote_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    read = readers(stack.pool)
    as = actors(stack)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  /** An `awaiting_quote` order for `qty` units at Ubud, whose stock started at `qty + 3`. */
  async function placeAwaitingQuote(qty = 1) {
    const made = await product(stack, { [shop.ubud]: qty + 3 })
    const cookie = bag({ productId: made.id, variantSku: null, qty })
    const created = await createOrder(stack.payload, checkout(cookie, PIN.ubud), {
      bagKey: BAG_KEY,
    })
    if (!created.ok) throw new Error(`could not place the order: ${created.refusal}`)
    return { ...created, stockRow: made.stockRows[shop.ubud]! }
  }

  it('is created awaiting_quote with no delivery fee, and its stock taken', async () => {
    const placed = await placeAwaitingQuote(1)
    const row = await read.order(placed.orderId)
    expect(row).toMatchObject({ status: 'awaiting_quote', totals_delivery_fee: null })
    expect(Number(row.totals_total)).toBe(Number(row.totals_subtotal) - Number(row.totals_discount))
    // Initial stock was 4 (qty 1 + 3): the order's one unit is taken.
    expect(await read.quantity(placed.stockRow)).toBe(3)
  })

  it('sets the fee and total from the stored row, opens the 60-minute window, and is refused twice', async () => {
    const placed = await placeAwaitingQuote(1)
    const before = await read.order(placed.orderId)
    const subtotal = Number(before.totals_subtotal)
    const discount = Number(before.totals_discount)

    const now = new Date()
    const result = await quoteDeliveryFee(stack.payload, {
      orderId: placed.orderId,
      feeIdr: 20000,
      actor: as.owner,
      now,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unreachable')
    expect(result.totalIdr).toBe(subtotal - discount + 20000)
    expect(result.expiresAt.getTime()).toBe(now.getTime() + EXPIRY_MINUTES * 60_000)

    const after = await read.order(placed.orderId)
    expect(after.status).toBe('pending_payment')
    expect(Number(after.totals_delivery_fee)).toBe(20000)
    expect(Number(after.totals_total)).toBe(subtotal - discount + 20000)

    // Refused twice: once more, now that the order has moved on ...
    const again = await quoteDeliveryFee(stack.payload, {
      orderId: placed.orderId,
      feeIdr: 5000,
      actor: as.owner,
    })
    expect(again).toMatchObject({ ok: false, refusal: 'not_awaiting_quote' })

    // ... and once the quote window itself has closed.
    const expiring = await placeAwaitingQuote(1)
    await stack.pool.query(
      `UPDATE orders SET expires_at = now() - interval '1 minute' WHERE id = ${expiring.orderId}`,
    )
    const closed = await quoteDeliveryFee(stack.payload, {
      orderId: expiring.orderId,
      feeIdr: 5000,
      actor: as.owner,
    })
    expect(closed).toMatchObject({ ok: false, refusal: 'expired' })
  })

  it('refuses a store user of another store', async () => {
    // Sent from Sanur; the staff stack's one store user belongs to Ubud (stores[0]).
    const made = await product(stack, { [shop.sanur]: 5 })
    const cookie = bag({ productId: made.id, variantSku: null, qty: 1 })
    const created = await createOrder(stack.payload, checkout(cookie, PIN.sanur), {
      bagKey: BAG_KEY,
    })
    if (!created.ok) throw new Error(`could not place the order: ${created.refusal}`)
    const result = await quoteDeliveryFee(stack.payload, {
      orderId: created.orderId,
      feeIdr: 10000,
      actor: as.store,
    })
    expect(result).toMatchObject({ ok: false, refusal: 'forbidden' })
  })

  it('refuses a negative, fractional or huge fee, and touches nothing', async () => {
    const placed = await placeAwaitingQuote(1)
    for (const feeIdr of [-1, 1000.5, MAX_DELIVERY_FEE_IDR + 1]) {
      const result = await quoteDeliveryFee(stack.payload, {
        orderId: placed.orderId,
        feeIdr,
        actor: as.owner,
      })
      expect(result).toMatchObject({ ok: false, refusal: 'invalid_fee' })
    }
    expect((await read.order(placed.orderId)).status).toBe('awaiting_quote')
  })

  it('expires an unquoted order after the quote window and returns its stock exactly once', async () => {
    const placed = await placeAwaitingQuote(1)
    await stack.pool.query(
      `UPDATE orders SET expires_at = now() - interval '1 minute' WHERE id = ${placed.orderId}`,
    )
    const runs = await Promise.all([
      runPaymentSweep(stack.payload, simulator),
      runPaymentSweep(stack.payload, simulator),
    ])
    expect(runs.reduce((sum, run) => sum + run.expired, 0)).toBe(1)
    const row = await read.order(placed.orderId)
    expect(row.status).toBe('expired')
    const moves = (await read.history(placed.orderId)).filter((h) => h.to === 'expired')
    expect(moves).toMatchObject([{ from: 'awaiting_quote', to: 'expired', actor: 'system' }])
    expect(await read.quantity(placed.stockRow)).toBe(4)
  })

  it('expires a quoted, unpaid order after the payment window and returns its stock exactly once', async () => {
    const placed = await placeAwaitingQuote(1)
    const quoted = await quoteDeliveryFee(stack.payload, {
      orderId: placed.orderId,
      feeIdr: 10000,
      actor: as.owner,
    })
    expect(quoted.ok).toBe(true)
    await stack.pool.query(
      `UPDATE orders SET expires_at = now() - interval '10 minutes' WHERE id = ${placed.orderId}`,
    )
    const runs = await Promise.all([
      runPaymentSweep(stack.payload, simulator),
      runPaymentSweep(stack.payload, simulator),
    ])
    expect(runs.reduce((sum, run) => sum + run.expired, 0)).toBe(1)
    const row = await read.order(placed.orderId)
    expect(row.status).toBe('expired')
    const moves = (await read.history(placed.orderId)).filter((h) => h.to === 'expired')
    expect(moves).toMatchObject([{ from: 'pending_payment', to: 'expired', actor: 'system' }])
    expect(await read.quantity(placed.stockRow)).toBe(4)
  })

  it('lets the webhook pay a quoted order, and refuses one still awaiting its price', async () => {
    const placed = await placeAwaitingQuote(1)
    const stillUnquoted = Number((await read.order(placed.orderId)).totals_total)
    const route = webhook()

    // A settlement notification for this order's number while it still awaits a price. A
    // high attempt suffix keeps this synthetic registration from colliding with the real
    // first attempt `openPaymentAttempt` opens below (the simulator's own attempt store is
    // keyed by `midtransOrderId` alone, not by the order's `orders_payment_attempts` rows).
    simulator.register(`${placed.number}-9`, stillUnquoted)
    expect((await route(simulator.emit(`${placed.number}-9`, 'settle').body)).status).toBe(200)
    expect((await read.order(placed.orderId)).status).toBe('awaiting_quote')

    const quoted = await quoteDeliveryFee(stack.payload, {
      orderId: placed.orderId,
      feeIdr: 10000,
      actor: as.owner,
    })
    expect(quoted.ok).toBe(true)
    const opened = await openPaymentAttempt(stack.payload, simulator, { orderId: placed.orderId })
    if (!opened.ok) throw new Error(`could not open a payment: ${opened.reason}`)
    expect((await route(simulator.emit(opened.midtransOrderId, 'settle').body)).status).toBe(200)
    expect((await read.order(placed.orderId)).status).toBe('paid')
  })
})
