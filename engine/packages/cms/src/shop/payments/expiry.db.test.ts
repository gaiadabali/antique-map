/**
 * Expiry, release and reconciliation on a real, pushed Postgres (TASKS.md 6.4.c, 6.4.d): an unpaid
 * order past its window becomes `expired` and its stock returns exactly once — however many sweeps
 * run, one after another or at the same time; a settlement that arrives afterwards is flagged for
 * staff and changes nothing else; Midtrans's own `expire` inside the window closes only the
 * attempt; the reconciler applies a settlement whose notification never came; and opening a
 * payment numbers its attempts and reopens an open one.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PAYMENT_EVENTS_APPEND_ONLY_SQL } from '../../collections/payment-events/append-only'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { openPaymentAttempt } from './attempts'
import { runPaymentReconcile, runPaymentSweep } from './jobs'
import { SIMULATE } from './payments.test-support'
import { heldOrder, readers, stackWebhook } from './payments-db.test-support'
import { simulatorProvider } from './simulator'

describe.skipIf(!server)('payment expiry and reconciliation, on a real database', () => {
  let stack: StaffStack
  let read: ReturnType<typeof readers>
  let webhook: ReturnType<typeof stackWebhook>
  const simulator = simulatorProvider(SIMULATE)

  beforeAll(async () => {
    stack = await startStaffStack('cms_payments_expiry_test', (config, key) =>
      getPayload({ config, key }),
    )
    await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_SQL)
    read = readers(stack)
    webhook = stackWebhook(stack.payload)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const sweep = () => runPaymentSweep(stack.payload, simulator)
  const open = async (orderId: number) => {
    const opened = await openPaymentAttempt(stack.payload, simulator, { orderId })
    if (!opened.ok) throw new Error(`could not open a payment: ${opened.reason}`)
    return opened
  }

  let expired: { id: number; stock: number; attempt: string }

  it('expires an unpaid order and returns its stock exactly once — sweeps run twice, and concurrently', async () => {
    const store = stack.stores[0].id
    // One buyer opened a payment and left a VA pending; another never opened one at all.
    const paying = await heldOrder(stack.payload, { store, qty: 2, left: 3 })
    const { midtransOrderId } = await open(paying.id)
    expect((await webhook(simulator.emit(midtransOrderId, 'pending').body)).status).toBe(200)
    const silent = await heldOrder(stack.payload, { store, qty: 1, left: 0 })
    // Inside the window (and its 5-minute grace) nothing happens.
    expect((await sweep()).expired).toBe(0)
    await read.age(paying.id, { expiresAgo: 10 })
    await read.age(silent.id, { expiresAgo: 10 })

    const runs = await Promise.all([sweep(), sweep(), sweep()])
    const again = await sweep()
    expect([...runs, again].reduce((sum, run) => sum + run.expired, 0)).toBe(2)
    expect([...runs, again].every((run) => run.failed === 0)).toBe(true)

    expect(await read.stock(paying.stock)).toBe(5)
    expect(await read.stock(silent.stock)).toBe(1)
    for (const order of [paying, silent]) {
      expect((await read.order(order.id)).status).toBe('expired')
      const moves = (await read.history(order.id)).filter((h) => h.to === 'expired')
      expect(moves).toEqual([
        {
          from: 'pending_payment',
          to: 'expired',
          actor: 'system',
          note: 'The payment window passed unpaid.',
        },
      ])
    }
    expired = { id: paying.id, stock: paying.stock, attempt: midtransOrderId }
  }, 60_000)

  it('flags a settlement that lands after the order expired, and applies nothing', async () => {
    const { body } = simulator.emit(expired.attempt, 'settle')
    expect((await webhook(body)).status).toBe(200)
    const row = await read.order(expired.id)
    expect(row).toMatchObject({
      status: 'expired',
      payment_paid_at: null,
      needs_attention_flag: true,
    })
    expect(row.needs_attention_reason).toMatch(/after the order was expired/)
    expect((await read.events(expired.id)).at(-1)).toMatchObject({ outcome: 'late-payment' })
    // The stock it gave back stays given back; a sweep does not touch it again.
    await sweep()
    expect(await read.stock(expired.stock)).toBe(5)
  })

  it('closes only the attempt on Midtrans expire inside the window; the sweep expires it after', async () => {
    const order = await heldOrder(stack.payload, { store: stack.stores[1].id, qty: 1, left: 4 })
    const { midtransOrderId } = await open(order.id)
    expect((await webhook(simulator.emit(midtransOrderId, 'expire').body)).status).toBe(200)
    expect((await read.order(order.id)).status).toBe('pending_payment')
    expect(await read.stock(order.stock)).toBe(4)
    expect((await read.events(order.id)).map((e) => e.outcome)).toEqual(['attempt-closed'])

    await read.age(order.id, { expiresAgo: 6 })
    expect((await sweep()).expired).toBe(1)
    expect((await read.order(order.id)).status).toBe('expired')
    expect(await read.stock(order.stock)).toBe(5)
  })

  it('applies a settlement whose notification never arrived, on reconcile and in the sweep', async () => {
    const lost = await heldOrder(stack.payload, { store: stack.stores[0].id })
    const { midtransOrderId } = await open(lost.id)
    simulator.emit(midtransOrderId, 'settle') // Midtrans settled it; the webhook never came.
    // Not yet 10 minutes old: the reconciler leaves it.
    expect((await runPaymentReconcile(stack.payload, simulator)).checked).toBe(0)
    await read.age(lost.id, { createdAgo: 15 })
    const run = await runPaymentReconcile(stack.payload, simulator)
    expect(run).toMatchObject({ checked: 1, applied: 1, failed: 0 })
    expect((await read.order(lost.id)).status).toBe('paid')
    expect(await read.events(lost.id)).toMatchObject([{ outcome: 'paid', source: 'reconcile' }])

    // The sweep asks before it expires: a settled order past its window is paid, not expired.
    const late = await heldOrder(stack.payload, { store: stack.stores[0].id })
    const second = await open(late.id)
    simulator.emit(second.midtransOrderId, 'settle')
    await read.age(late.id, { expiresAgo: 10 })
    await sweep()
    expect((await read.order(late.id)).status).toBe('paid')
    expect(await read.stock(late.stock)).toBe(3)
  })

  it('numbers attempts, reopens an open one, and refuses an order it cannot pay', async () => {
    const order = await heldOrder(stack.payload, { store: stack.stores[0].id })
    const first = await open(order.id)
    expect(first).toMatchObject({ midtransOrderId: `${order.number}-1`, reopened: false })
    const again = await open(order.id)
    expect(again).toMatchObject({
      midtransOrderId: first.midtransOrderId,
      token: first.token,
      reopened: true,
    })
    // A denied card lets the buyer try again, as a new attempt.
    expect((await webhook(simulator.emit(first.midtransOrderId, 'deny').body)).status).toBe(200)
    const retry = await open(order.id)
    expect(retry).toMatchObject({ midtransOrderId: `${order.number}-2`, reopened: false })
    expect(await read.attempts(order.id)).toMatchObject([
      { midtrans_order_id: `${order.number}-1`, state: 'deny' },
      { midtrans_order_id: `${order.number}-2`, state: 'open' },
    ])
    expect(await openPaymentAttempt(stack.payload, simulator, { orderId: expired.id })).toEqual({
      ok: false,
      reason: 'not-payable',
    })
    expect(await openPaymentAttempt(stack.payload, simulator, { orderId: 987654 })).toEqual({
      ok: false,
      reason: 'not-found',
    })
    const closing = await heldOrder(stack.payload, {
      store: stack.stores[0].id,
      expiresInMinutes: 0.5,
    })
    expect(await openPaymentAttempt(stack.payload, simulator, { orderId: closing.id })).toEqual({
      ok: false,
      reason: 'window-closed',
    })
  })
})
