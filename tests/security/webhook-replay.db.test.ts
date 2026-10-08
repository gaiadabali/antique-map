/**
 * A replayed payment webhook (TASKS.md 10.1.e, class 2; SECURITY.md W1, W3, W4, W5): Midtrans, or
 * an attacker holding one captured notification, delivers the same body twice, ten times, in
 * parallel, and after the order has moved on. The order is paid once, the ledger holds one row,
 * stock is released once, the history shows one `paid` — and a forged or tampered body is a 401
 * that writes nothing and logs a hash, never the body.
 *
 * The route is the real one (`midtransWebhookRoute`), wired to a real pushed Postgres exactly as
 * the process wires it, in simulate mode: the simulator signs with its fixed local key and plays
 * the status API, so verify → confirm → apply all run.
 *
 * Planted violation (tests/security/plants/run-plants.mjs, class "replay"): `dedupeKeyOf` in
 * `engine/packages/cms/src/shop/payments/notification.ts` made to differ on every call, so the
 * ledger's unique key never recognises a repeat.
 */
import { createHash } from 'node:crypto'

import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { PAYMENT_EVENTS_APPEND_ONLY_SQL } from '../../engine/packages/cms/src/collections/payment-events/append-only'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../engine/packages/cms/src/collections/users/staff.test-support'
import { applyPaymentStatus } from '../../engine/packages/cms/src/shop/payments/apply'
import { openPaymentAttempt } from '../../engine/packages/cms/src/shop/payments/attempts'
import { createPaymentProvider } from '../../engine/packages/cms/src/shop/payments/create-provider'
import { midtransWebhookRoute } from '../../engine/packages/cms/src/shop/payments/http/webhook'
import {
  heldOrder,
  readers,
  WEBHOOK_ENV,
  type HeldOrder,
} from '../../engine/packages/cms/src/shop/payments/payments-db.test-support'
import { SIMULATE } from '../../engine/packages/cms/src/shop/payments/payments.test-support'
import { simulatorProvider } from '../../engine/packages/cms/src/shop/payments/simulator'

describe.skipIf(!server)('a replayed payment webhook, on a real database', () => {
  let stack: StaffStack
  let read: ReturnType<typeof readers>
  const log: string[] = []
  const simulator = simulatorProvider(SIMULATE)

  /** The webhook route on the stack's Payload, its log kept so what it writes can be read. */
  const route = () =>
    midtransWebhookRoute({
      env: WEBHOOK_ENV,
      log: (line) => log.push(line),
      load: async (config) => {
        const provider = createPaymentProvider(config)
        return {
          confirm: (id) => provider.getStatus(id),
          apply: (status, source, hash) =>
            applyPaymentStatus(stack.payload, { status, source, payloadHash: hash }),
        }
      },
    })
  const deliver = (body: string) =>
    route()(new Request('http://shop.localhost/api/x/webhooks/midtrans', { method: 'POST', body }))

  beforeAll(async () => {
    stack = await startStaffStack('security_webhook', (config, key) => getPayload({ config, key }))
    await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_SQL)
    read = readers(stack)
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  async function orderWithAttempt(): Promise<HeldOrder & { attempt: string }> {
    const order = await heldOrder(stack.payload, { store: stack.stores[0].id })
    const opened = await openPaymentAttempt(stack.payload, simulator, { orderId: order.id })
    if (!opened.ok) throw new Error(`could not open a payment: ${opened.reason}`)
    return { ...order, attempt: opened.midtransOrderId }
  }
  const paidRows = async (id: number) =>
    (await read.history(id)).filter((row) => row.to === 'paid').length

  it('pays the order once however many times the same settlement is delivered (W3)', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle')
    // Once, then again one after the other, then ten at once.
    expect((await deliver(body)).status).toBe(200)
    expect((await deliver(body)).status).toBe(200)
    expect((await deliver(body)).status).toBe(200)
    const burst = await Promise.all(Array.from({ length: 10 }, () => deliver(body)))
    expect(burst.map((response) => response.status)).toEqual(Array(10).fill(200))

    expect(await read.events(order.id), 'one ledger row').toHaveLength(1)
    expect(await paidRows(order.id), 'one paid history row').toBe(1)
    expect((await read.order(order.id)).status).toBe('paid')
    expect(await read.stock(order.stock), 'the held units stay held').toBe(3)
  })

  it('a replay after the order moved on does not drag it back to paid (W4)', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle')
    expect((await deliver(body)).status).toBe(200)
    await stack.pool.query(`UPDATE orders SET status = 'processing' WHERE id = ${order.id}`)
    const historyBefore = (await read.history(order.id)).length
    expect((await deliver(body)).status).toBe(200)
    expect((await read.order(order.id)).status).toBe('processing')
    expect(await read.history(order.id)).toHaveLength(historyBefore)
    expect(await read.events(order.id)).toHaveLength(1)
  })

  it('releases the stock of an expired attempt once, however often "expire" is delivered (W3, P6)', async () => {
    const order = await orderWithAttempt()
    await read.age(order.id, { expiresAgo: 5 }) // the payment window has run out
    const { body } = simulator.emit(order.attempt, 'expire')
    const first = await deliver(body)
    expect(first.status).toBe(200)
    const after = await read.stock(order.stock)
    expect(after, 'the two held units went back once').toBe(5)
    await Promise.all(Array.from({ length: 5 }, () => deliver(body)))
    expect(await read.stock(order.stock)).toBe(after)
    expect((await read.order(order.id)).status).toBe('expired')
    expect(await read.events(order.id)).toHaveLength(1)
  })

  it('a late success on an expired order is flagged for staff, never silently re-sold (W4)', async () => {
    const order = await orderWithAttempt()
    await read.age(order.id, { expiresAgo: 5 })
    await deliver(simulator.emit(order.attempt, 'expire').body)
    expect((await read.order(order.id)).status).toBe('expired')
    const stockAfterExpiry = await read.stock(order.stock)
    const late = simulator.emit(order.attempt, 'settle')
    expect((await deliver(late.body)).status).toBe(200)
    const row = await read.order(order.id)
    expect(row.status).toBe('expired')
    expect(row.needs_attention_flag).toBe(true)
    expect(await read.stock(order.stock), 'no stock was taken again').toBe(stockAfterExpiry)
  })

  it('a forged, re-signed or tampered notification is a 401 that writes nothing (W1)', async () => {
    const order = await orderWithAttempt()
    const { payload } = simulator.emit(order.attempt, 'settle')
    const before = await read.allEvents()
    const forgeries = [
      { ...payload, gross_amount: '1000.00' },
      { ...payload, order_id: '1-1' },
      { ...payload, status_code: '201' },
      { ...payload, signature_key: 'f'.repeat(128) },
      { ...payload, signature_key: '' },
      { ...payload, signature_key: undefined },
    ]
    for (const forged of forgeries) {
      expect((await deliver(JSON.stringify(forged))).status).toBe(401)
    }
    expect(await read.allEvents()).toBe(before)
    expect((await read.order(order.id)).status).toBe('pending_payment')
    expect(await paidRows(order.id)).toBe(0)
  })

  it('logs the body’s hash on a refusal and never the body itself (W5)', async () => {
    const order = await orderWithAttempt()
    const { payload } = simulator.emit(order.attempt, 'settle')
    const body = JSON.stringify({ ...payload, signature_key: 'e'.repeat(128), gross_amount: '1.00' })
    log.length = 0
    expect((await deliver(body)).status).toBe(401)
    const hash = createHash('sha256').update(body).digest('hex')
    expect(log.join('\n')).toContain(`sha256:${hash}`)
    for (const secretish of [payload.order_id!, payload.transaction_id!, payload.signature_key!, 'e'.repeat(40)]) {
      expect(log.join('\n')).not.toContain(secretish)
    }
  })

  it('answers 413 to a body that is not a notification’s size, and 400 to one that is not JSON', async () => {
    expect((await deliver('x'.repeat(40_000))).status).toBe(413)
    expect((await deliver('not json at all')).status).toBe(400)
  })
})
