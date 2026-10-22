/**
 * The Midtrans webhook on a real, pushed Postgres (TASKS.md 6.4.b, 6.4.d): the route verifies the
 * signature before it writes anything; a settlement moves the order to `paid` and the ledger keeps
 * the amount paid; the same notification ten times in parallel changes the order once; an amount
 * other than the total is flagged and not paid; an unknown order is recorded. The ledger's
 * append-only trigger (the migration's, `PAYMENT_EVENTS_APPEND_ONLY_SQL`) is installed, so every
 * path here is proven never to update or delete a payment event.
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
import { midtransSignature } from './signature'
import { SANDBOX, SIMULATE } from './payments.test-support'
import { heldOrder, readers, stackWebhook, type HeldOrder } from './payments-db.test-support'
import { simulatorProvider } from './simulator'

describe.skipIf(!server)('the Midtrans webhook, on a real database', () => {
  let stack: StaffStack
  let read: ReturnType<typeof readers>
  let webhook: ReturnType<typeof stackWebhook>
  const simulator = simulatorProvider(SIMULATE)

  beforeAll(async () => {
    stack = await startStaffStack('cms_payments_webhook_test', (config, key) =>
      getPayload({ config, key }),
    )
    await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_SQL)
    read = readers(stack)
    webhook = stackWebhook(stack.payload)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  /** An unpaid order with its first payment attempt opened through the simulator. */
  async function orderWithAttempt(): Promise<HeldOrder & { attempt: string }> {
    const order = await heldOrder(stack.payload, { store: stack.stores[0].id })
    const opened = await openPaymentAttempt(stack.payload, simulator, { orderId: order.id })
    if (!opened.ok) throw new Error(`could not open a payment: ${opened.reason}`)
    return { ...order, attempt: opened.midtransOrderId }
  }

  it('rejects a bad signature with 401 and writes nothing', async () => {
    const order = await orderWithAttempt()
    const before = await read.allEvents()
    const { payload } = simulator.emit(order.attempt, 'settle')
    const forgeries = [
      // A changed amount under the original signature.
      { ...payload, gross_amount: '1000.00' },
      // Signed, but with another key (a sandbox server key is not this host's key).
      {
        ...payload,
        signature_key: midtransSignature(
          {
            orderId: payload.order_id!,
            statusCode: payload.status_code!,
            grossAmount: payload.gross_amount!,
          },
          SANDBOX.serverKey,
        ),
      },
      { ...payload, signature_key: 'f'.repeat(128) },
      { ...payload, signature_key: undefined },
    ]
    for (const forged of forgeries) {
      const response = await webhook(JSON.stringify(forged))
      expect(response.status).toBe(401)
    }
    expect(await read.allEvents()).toBe(before)
    expect(await read.order(order.id)).toMatchObject({
      status: 'pending_payment',
      payment_paid_at: null,
    })
    expect(await read.history(order.id)).toEqual([])
  })

  it('moves a settled order to paid and stores the amount paid', async () => {
    const order = await orderWithAttempt()
    const { body, payload } = simulator.emit(order.attempt, 'settle')
    const response = await webhook(body)
    expect(response.status).toBe(200)

    const row = await read.order(order.id)
    expect(row).toMatchObject({
      status: 'paid',
      payment_method: 'qris',
      payment_transaction_id: payload.transaction_id,
      needs_attention_flag: false,
    })
    expect(row.payment_paid_at).toBeInstanceOf(Date)
    const events = await read.events(order.id)
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      outcome: 'paid',
      source: 'simulate',
      transaction_status: 'settlement',
    })
    // The amount paid, in the ledger: whole rupiah, equal to the order's priced total.
    expect(Number(events[0]!.gross_amount)).toBe(205000)
    expect(Number(events[0]!.gross_amount)).toBe(Number(row.totals_total))
    expect(await read.history(order.id)).toEqual([
      {
        from: 'pending_payment',
        to: 'paid',
        actor: 'midtrans',
        note: expect.stringContaining(order.attempt),
      },
    ])
    expect(await read.attempts(order.id)).toMatchObject([
      { midtrans_order_id: order.attempt, state: 'settlement' },
    ])
    // The units stay held until a driver collects them.
    expect(await read.stock(order.stock)).toBe(3)
  })

  it('changes the order once for the same notification ten times in parallel', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle')
    const responses = await Promise.all(Array.from({ length: 10 }, () => webhook(body)))
    expect(responses.map((r) => r.status)).toEqual(Array(10).fill(200))
    expect(await read.events(order.id)).toHaveLength(1)
    expect((await read.history(order.id)).filter((h) => h.to === 'paid')).toHaveLength(1)
    expect((await read.order(order.id)).status).toBe('paid')
    // And a replay later is a 200 with no change.
    expect((await webhook(body)).status).toBe(200)
    expect(await read.events(order.id)).toHaveLength(1)
  })

  it('records pending, then settlement, as two events and pays the order once', async () => {
    const order = await orderWithAttempt()
    expect((await webhook(simulator.emit(order.attempt, 'pending').body)).status).toBe(200)
    expect((await read.order(order.id)).status).toBe('pending_payment')
    expect((await webhook(simulator.emit(order.attempt, 'settle').body)).status).toBe(200)
    expect((await read.events(order.id)).map((e) => e.outcome)).toEqual(['recorded', 'paid'])
    expect((await read.order(order.id)).status).toBe('paid')
  })

  it('flags an amount other than the order total and does not mark it paid', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle', { grossAmount: 1000 })
    expect((await webhook(body)).status).toBe(200)
    const row = await read.order(order.id)
    expect(row).toMatchObject({
      status: 'pending_payment',
      payment_paid_at: null,
      needs_attention_flag: true,
    })
    expect(row.needs_attention_reason).toMatch(/Rp 1\.000.*order total is Rp 205\.000/)
    expect((await read.events(order.id)).map((e) => e.outcome)).toEqual(['amount-mismatch'])
  })

  it('records a notification for an order it does not know, and answers 200', async () => {
    simulator.register('999999-1', 5000)
    const before = await read.allEvents()
    expect((await webhook(simulator.emit('999999-1', 'settle').body)).status).toBe(200)
    expect(await read.allEvents()).toBe(before + 1)
    const { rows } = await stack.pool.query(
      `SELECT outcome, order_id FROM payment_events WHERE midtrans_order_id = '999999-1'`,
    )
    expect(rows).toEqual([{ outcome: 'unknown-order', order_id: null }])
  })
})
