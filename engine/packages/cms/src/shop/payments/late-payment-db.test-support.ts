/**
 * Test support only — the late-payment `*.db.test.ts` (TASKS.md 10.7.c): one stack with the shop
 * opened (active stores with pins, so a checkout and a reassign can run), the webhook, and an
 * order that expired the real way — a payment opened and left pending, its window aged past, the
 * real sweep expiring it and giving its units back — ready for a settlement to land late.
 */
import { getPayload } from 'payload'
import { expect } from 'vitest'

import { PAYMENT_EVENTS_APPEND_ONLY_SQL } from '../../collections/payment-events/append-only'
import { startStaffStack, type StaffStack } from '../../collections/users/staff.test-support'
import { actors } from '../fulfilment/fulfilment-db.test-support'
import { openShop, type Shop } from '../orders/orders-db.test-support'
import { openPaymentAttempt } from './attempts'
import { runPaymentSweep } from './jobs'
import { SIMULATE } from './payments.test-support'
import { heldOrder, readers, stackWebhook } from './payments-db.test-support'
import { simulatorProvider } from './simulator'

export type LateStack = {
  stack: StaffStack
  shop: Shop
  read: ReturnType<typeof readers>
  webhook: ReturnType<typeof stackWebhook>
  simulator: ReturnType<typeof simulatorProvider>
  as: ReturnType<typeof actors>
  /** A pending order whose units the sweep has expired and returned; `stock` holds `left + qty`. */
  expiredOrder(
    input: Parameters<typeof heldOrder>[1],
    /** Runs on the pending order before its payment opens (e.g. to add a line). */
    before?: (order: Awaited<ReturnType<typeof heldOrder>>) => Promise<void>,
  ): Promise<ExpiredOrder>
  /** The settlement of `order`'s attempt, as Midtrans would send it after the window. */
  settleBody(order: ExpiredOrder): string
}

export type ExpiredOrder = Awaited<ReturnType<typeof heldOrder>> & { attempt: string }

export async function startLateStack(prefix: string): Promise<LateStack> {
  const stack = await startStaffStack(prefix, (config, key) => getPayload({ config, key }))
  await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_SQL)
  const shop = await openShop(stack)
  const read = readers(stack)
  const webhook = stackWebhook(stack.payload)
  const simulator = simulatorProvider(SIMULATE)

  const expiredOrder: LateStack['expiredOrder'] = async (input, before) => {
    const order = await heldOrder(stack.payload, input)
    await before?.(order)
    const opened = await openPaymentAttempt(stack.payload, simulator, { orderId: order.id })
    if (!opened.ok) throw new Error(`could not open a payment: ${opened.reason}`)
    const attempt = opened.midtransOrderId
    expect((await webhook(simulator.emit(attempt, 'pending').body)).status).toBe(200)
    await read.age(order.id, { expiresAgo: 10 })
    await runPaymentSweep(stack.payload, simulator)
    expect((await read.order(order.id)).status).toBe('expired')
    return { ...order, attempt }
  }

  return {
    stack,
    shop,
    read,
    webhook,
    simulator,
    as: actors(stack),
    expiredOrder,
    settleBody: (order) => simulator.emit(order.attempt, 'settle').body,
  }
}
