/**
 * The Midtrans webhook under lock contention, on a real, pushed Postgres (TASKS.md 10.5.a, 10.5.c).
 * Each test holds a lock itself, on a side connection (`./side-pool.test-support`), so what it
 * proves does not depend on the host's speed:
 * - ten identical deliveries while the order is locked past `ORDER_LOCK_TIMEOUT`: no 500 — each
 *   answers 200 or 503 with `Retry-After` — and, once Midtrans retries the 503s, exactly one paid;
 * - a delivery that loses the lock answers 200 when its event is already recorded, else 503 with
 *   nothing written;
 * - a process killed mid-apply (its connection terminated after the ledger row was written, before
 *   commit) leaves nothing recorded and nothing locked, and the retry applies the payment.
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
import { BUSY_RETRY_AFTER_SECONDS } from './http/webhook'
import { SIMULATE } from './payments.test-support'
import { heldOrder, readers, stackWebhook } from './payments-db.test-support'
import {
  absorbCheckedOutClientErrors,
  lockWaits,
  openSidePool,
  settleCounter,
  waitUntil,
  type SidePool,
} from './side-pool.test-support'
import { simulatorProvider } from './simulator'

describe.skipIf(!server)('the Midtrans webhook under a held lock, on a real database', () => {
  let stack: StaffStack
  let read: ReturnType<typeof readers>
  let webhook: ReturnType<typeof stackWebhook>
  let side: SidePool
  const simulator = simulatorProvider(SIMULATE)

  beforeAll(async () => {
    stack = await startStaffStack('cms_payments_contention_test', (config, key) =>
      getPayload({ config, key }),
    )
    await stack.pool.query(PAYMENT_EVENTS_APPEND_ONLY_SQL)
    read = readers(stack)
    webhook = stackWebhook(stack.payload)
    side = await openSidePool(stack)
  }, 180_000)
  afterAll(async () => {
    await side?.end()
    await stack?.stop()
  }, 60_000)

  async function orderWithAttempt() {
    const order = await heldOrder(stack.payload, { store: stack.stores[0].id })
    const opened = await openPaymentAttempt(stack.payload, simulator, { orderId: order.id })
    if (!opened.ok) throw new Error(`could not open a payment: ${opened.reason}`)
    return { ...order, attempt: opened.midtransOrderId }
  }

  const paidOnce = async (orderId: number) => {
    expect(await read.events(orderId)).toHaveLength(1)
    expect((await read.history(orderId)).filter((h) => h.to === 'paid')).toHaveLength(1)
    expect((await read.order(orderId)).status).toBe('paid')
  }

  it('ten identical deliveries under a held order lock: no 500, exactly one applied payment', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle')
    const holder = await side.connect()
    const watcher = await side.connect()
    let first: PromiseSettledResult<Response>[]
    try {
      await holder.query('BEGIN')
      await holder.query(`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`)
      const deliveries = settleCounter(Array.from({ length: 10 }, () => webhook(body)))
      await waitUntil(async () => (await lockWaits(watcher)) >= 5, 10_000, 'deliveries queue')
      // Held until the queued deliveries have lost the lock (ORDER_LOCK_TIMEOUT), then let go.
      await waitUntil(() => deliveries.settled() >= 1, 15_000, 'a delivery gives up the lock')
      await holder.query('COMMIT')
      first = await deliveries.all
    } finally {
      holder.release()
      watcher.release()
    }
    const answers = first.map((r) => (r.status === 'fulfilled' ? r.value : null))
    expect(answers.filter((r) => r === null)).toEqual([])
    const statuses = answers.map((r) => r!.status)
    expect(statuses.filter((s) => s !== 200 && s !== 503)).toEqual([])
    const busy = answers.filter((r) => r!.status === 503)
    // The lock really was lost: at least one delivery was asked to retry, and told when.
    expect(busy.length).toBeGreaterThanOrEqual(1)
    for (const r of busy)
      expect(r!.headers.get('Retry-After')).toBe(String(BUSY_RETRY_AFTER_SECONDS))
    expect((await read.events(order.id)).length).toBeLessThanOrEqual(1)

    // Midtrans retries each 503: every retry answers 200, and the order is paid exactly once.
    const retries = await Promise.all(busy.map(() => webhook(body)))
    expect(retries.map((r) => r.status)).toEqual(busy.map(() => 200))
    await paidOnce(order.id)
  }, 120_000)

  it('a delivery that loses the lock: 503 with nothing written, or 200 once it is recorded', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle')
    const holder = await side.connect()
    const watcher = await side.connect()
    try {
      await holder.query('BEGIN')
      await holder.query(`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`)
      // Not recorded yet: asked to retry, nothing written.
      const pending = webhook(body)
      await waitUntil(async () => (await lockWaits(watcher)) >= 1, 10_000, 'the delivery queues')
      const busy = await pending
      expect(busy.status).toBe(503)
      expect(busy.headers.get('Retry-After')).toBe(String(BUSY_RETRY_AFTER_SECONDS))
      expect(await read.events(order.id)).toEqual([])
      expect((await read.order(order.id)).status).toBe('pending_payment')
      await holder.query('COMMIT')

      // The retry applies it.
      expect((await webhook(body)).status).toBe(200)
      await paidOnce(order.id)

      // A replay while the order is locked again: it loses the lock, finds its event, answers 200.
      await holder.query('BEGIN')
      await holder.query(`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`)
      const replay = webhook(body)
      await waitUntil(async () => (await lockWaits(watcher)) >= 1, 10_000, 'the replay queues')
      expect((await replay).status).toBe(200)
      await holder.query('COMMIT')
    } finally {
      holder.release()
      watcher.release()
    }
    await paidOnce(order.id)
  }, 60_000)

  it('a process killed mid-apply leaves nothing claimed, and the retry applies it', async () => {
    const order = await orderWithAttempt()
    const { body } = simulator.emit(order.attempt, 'settle')
    const holder = await side.connect()
    const watcher = await side.connect()
    let killed: Response | Error
    const restore = absorbCheckedOutClientErrors(stack.pool)
    try {
      // Holds the attempt's row, which the apply writes after its ledger row: the apply stops
      // there with the event inserted and the order locked, uncommitted.
      await holder.query('BEGIN')
      await holder.query(
        `SELECT id FROM orders_payment_attempts WHERE _parent_id = ${order.id} FOR UPDATE`,
      )
      const pending = webhook(body).catch((error: Error) => error)
      const stuck = '%UPDATE orders_payment_attempts%'
      await waitUntil(async () => (await lockWaits(watcher, stuck)) === 1, 10_000, 'mid-apply')
      // The process dies: its connection goes, as a killed process's socket would.
      await watcher.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
          WHERE datname = current_database() AND wait_event_type = 'Lock'
            AND query ILIKE '${stuck}'`,
      )
      killed = await pending
      await holder.query('COMMIT')
    } finally {
      restore()
      holder.release()
      watcher.release()
    }
    // The killed delivery was never acknowledged, so Midtrans will deliver it again.
    expect(killed instanceof Response && killed.status === 200).toBe(false)
    // Nothing claimed: no ledger row, the order untouched and not locked by anyone.
    expect(await read.events(order.id)).toEqual([])
    expect(await read.order(order.id)).toMatchObject({
      status: 'pending_payment',
      payment_paid_at: null,
    })
    expect(await read.history(order.id)).toEqual([])
    const free = await side.connect()
    try {
      await free.query('BEGIN')
      await free.query(`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE NOWAIT`)
      await free.query('ROLLBACK')
    } finally {
      free.release()
    }

    // The retry applies it, once.
    expect((await webhook(body)).status).toBe(200)
    await paidOnce(order.id)
  }, 60_000)
})
