/**
 * A payment after expiry, on a real, pushed Postgres (COMMERCE.md §13; TASKS.md 10.7.b, 10.7.c):
 * - the store still holds every unit → re-taken in the same transaction, the order `paid`, flagged
 *   "stock re-taken, send it";
 * - the units sold again meanwhile → `paid`, nothing taken, flagged "stock gone"; and because it
 *   holds nothing, a cancel gives nothing back and a reassign takes at the new store only;
 * - a payment on a `cancelled` order leaves it cancelled, flagged for the money's return;
 * - clearing the flag: owner or editor, with a note, recorded in history; store staff refused.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeProduct } from '../../collections/stock-levels/shop.test-support'
import { server } from '../../collections/users/staff.test-support'
import { UNITS_GONE_NOTE, UNITS_TAKEN_NOTE } from '../fulfilment/held-units'
import { clearOrderFlag, moveOrder, reassignOrder } from '../fulfilment'
import { startLateStack, type LateStack } from './late-payment-db.test-support'

describe.skipIf(!server)('a payment after expiry, on a real database', () => {
  let s: LateStack

  beforeAll(async () => {
    s = await startLateStack('cms_late_payment_test')
  }, 180_000)
  afterAll(() => s?.stack.stop(), 60_000)

  const ubud = () => s.stack.stores[0].id
  const historyOf = async (id: number) => s.read.history(id)
  let retaken: number

  it('re-takes the units at the same store, in the same transaction, and marks the order paid', async () => {
    const order = await s.expiredOrder({ store: ubud(), qty: 2, left: 3 })
    expect(await s.read.stock(order.stock)).toBe(5) // the sweep gave the two back

    expect((await s.webhook(s.settleBody(order))).status).toBe(200)

    const row = await s.read.order(order.id)
    expect(row).toMatchObject({ status: 'paid', needs_attention_flag: true })
    expect(row.payment_paid_at).not.toBeNull()
    expect(row.needs_attention_reason).toMatch(
      /^Paid after expiry .*stock re-taken at its store, send it/,
    )
    expect(await s.read.stock(order.stock)).toBe(3)
    expect((await historyOf(order.id)).at(-1)).toMatchObject({
      from: 'expired',
      to: 'paid',
      actor: 'midtrans',
    })
    expect((await historyOf(order.id)).at(-1)!.note).toMatch(
      /after the order expired\. Its units were re-taken at Ubud \(UBD-01\)/,
    )
    expect((await s.read.events(order.id)).at(-1)).toMatchObject({ outcome: 'late-payment' })

    // The same notification again changes nothing: no second take, no second move.
    expect((await s.webhook(s.settleBody(order))).status).toBe(200)
    expect(await s.read.stock(order.stock)).toBe(3)
    expect((await historyOf(order.id)).filter((h) => h.to === 'paid')).toHaveLength(1)
    retaken = order.id
  }, 60_000)

  it('marks it paid and flags "stock gone" when the store no longer holds every unit; a cancel returns nothing', async () => {
    const order = await s.expiredOrder({ store: ubud(), qty: 2, left: 0 })
    // Sold again meanwhile: one of the two returned units left with another buyer.
    await s.stack.pool.query(`UPDATE stock_levels SET quantity = 1 WHERE id = ${order.stock}`)

    expect((await s.webhook(s.settleBody(order))).status).toBe(200)

    const row = await s.read.order(order.id)
    expect(row).toMatchObject({ status: 'paid', needs_attention_flag: true })
    expect(row.needs_attention_reason).toMatch(
      /stock gone at its store — reassign, or cancel and return the money/,
    )
    expect(await s.read.stock(order.stock)).toBe(1) // nothing taken: not the one unit left
    const paid = (await historyOf(order.id)).at(-1)!
    expect(paid).toMatchObject({ from: 'expired', to: 'paid', actor: 'midtrans' })
    expect(String(paid.note).startsWith(UNITS_GONE_NOTE)).toBe(true)

    // The owner cancels it to return the money: no unit goes back on a shelf that never had it.
    const cancelled = await moveOrder(s.stack.payload, {
      orderId: order.id,
      to: 'cancelled',
      actor: s.as.owner,
      reason: 'Stock gone; money returned in Midtrans.',
    })
    expect(cancelled).toMatchObject({ ok: true, stockReturned: false })
    expect(await s.read.stock(order.stock)).toBe(1)
  }, 60_000)

  it('a short line rolls back the lines before it: every unit re-taken, or none', async () => {
    // Two lines: the first product's unit is still there after expiry, the second's sold again.
    // The second product is made after the first, so it comes second in the lock order: the
    // first line is taken before the second is found short.
    let secondStock = 0
    const order = await s.expiredOrder({ store: ubud(), qty: 1, left: 0 }, async (held) => {
      const second = await makeProduct(s.stack.payload, 'OEI-LATE-TWO')
      expect(second.id).toBeGreaterThan(held.product)
      const { rows } = await s.stack.pool.query(
        `INSERT INTO stock_levels (store_id, product_id, quantity, updated_at, created_at)
         VALUES (${ubud()}, ${second.id}, 0, now(), now()) RETURNING id`,
      )
      secondStock = Number(rows[0]!.id)
      await s.stack.pool.query(
        `INSERT INTO orders_lines (_order, _parent_id, id, product_id, sku, name, unit_price, qty, line_total)
         VALUES (2, ${held.id}, 'aaaaaaaaaaaaaaaaaaaaaaaa', ${second.id}, 'OEI-LATE-TWO', 'A map', 95000, 1, 95000)`,
      )
      await s.stack.pool.query(
        `UPDATE orders SET totals_subtotal = totals_subtotal + 95000, totals_total = totals_total + 95000
          WHERE id = ${held.id}`,
      )
    })
    expect(await s.read.stock(order.stock)).toBe(1)
    expect(await s.read.stock(secondStock)).toBe(1)
    await s.stack.pool.query(`UPDATE stock_levels SET quantity = 0 WHERE id = ${secondStock}`)

    expect((await s.webhook(s.settleBody(order))).status).toBe(200)
    const row = await s.read.order(order.id)
    expect(row).toMatchObject({ status: 'paid', needs_attention_flag: true })
    expect(row.needs_attention_reason).toMatch(/stock gone/)
    expect(await s.read.stock(order.stock)).toBe(1) // the first line's unit was not kept
    expect(await s.read.stock(secondStock)).toBe(0)
  }, 60_000)

  it('a "stock gone" order reassigned takes its units at the new store only, and holds them after', async () => {
    const order = await s.expiredOrder({ store: ubud(), qty: 2, left: 0 })
    await s.stack.pool.query(`UPDATE stock_levels SET quantity = 0 WHERE id = ${order.stock}`)
    expect((await s.webhook(s.settleBody(order))).status).toBe(200)
    expect((await s.read.order(order.id)).status).toBe('paid')

    const sanur = s.shop.sanur
    const { rows } = await s.stack.pool.query(
      `INSERT INTO stock_levels (store_id, product_id, quantity, updated_at, created_at)
       VALUES (${sanur}, ${order.product}, 5, now(), now()) RETURNING id`,
    )
    const sanurStock = Number(rows[0]!.id)
    const moved = await reassignOrder(s.stack.payload, {
      orderId: order.id,
      toStoreId: sanur,
      actor: s.as.editor,
    })
    expect(moved).toMatchObject({ ok: true, toStoreId: sanur })
    expect(await s.read.stock(sanurStock)).toBe(3)
    expect(await s.read.stock(order.stock)).toBe(0) // Ubud is given nothing it never had
    expect(String((await historyOf(order.id)).at(-1)!.note).startsWith(UNITS_TAKEN_NOTE)).toBe(true)

    // It holds its units now: a cancel puts them back at Sanur.
    const cancelled = await moveOrder(s.stack.payload, {
      orderId: order.id,
      to: 'cancelled',
      actor: s.as.owner,
      reason: 'Buyer changed address.',
    })
    expect(cancelled).toMatchObject({ ok: true, stockReturned: true })
    expect(await s.read.stock(sanurStock)).toBe(5)
    expect(await s.read.stock(order.stock)).toBe(0)
  }, 60_000)

  it('a payment on a cancelled order leaves it cancelled, flagged for the money to go back', async () => {
    const order = await s.expiredOrder({ store: ubud(), qty: 1, left: 2 })
    // An expired order cannot be cancelled through the machine; staff cancelled it before expiry
    // in the real case — set the status as that cancel would have left it.
    await s.stack.pool.query(`UPDATE orders SET status = 'cancelled' WHERE id = ${order.id}`)
    expect((await s.webhook(s.settleBody(order))).status).toBe(200)
    const row = await s.read.order(order.id)
    expect(row).toMatchObject({
      status: 'cancelled',
      needs_attention_flag: true,
      payment_paid_at: null,
    })
    expect(row.needs_attention_reason).toMatch(/after the order was cancelled .*stays cancelled/)
    expect(await s.read.stock(order.stock)).toBe(3)
  }, 60_000)

  it('clearing the flag: the owner with a note, recorded in history; store staff and no note refused', async () => {
    const { payload } = s.stack
    expect(
      await clearOrderFlag(payload, { orderId: retaken, note: 'Sent it.', actor: s.as.store }),
    ).toMatchObject({ ok: false, refusal: 'not_allowed' })
    expect(
      await clearOrderFlag(payload, { orderId: retaken, note: '  ', actor: s.as.owner }),
    ).toMatchObject({ ok: false, refusal: 'note_required' })
    // Through the endpoint too: store staff and anyone signed out are refused before anything is read.
    for (const as of ['store', undefined] as const) {
      const answer = await s.stack.rest('POST', `/api/orders/${retaken}/clear-flag`, { as })
      expect(answer.status).toBe(403)
    }
    expect((await s.read.order(retaken)).needs_attention_flag).toBe(true)

    const cleared = await clearOrderFlag(payload, {
      orderId: retaken,
      note: 'Sent from Ubud; buyer told on WhatsApp.',
      actor: s.as.owner,
    })
    expect(cleared).toEqual({ ok: true, orderId: retaken })
    const row = await s.read.order(retaken)
    expect(row).toMatchObject({
      status: 'paid',
      needs_attention_flag: false,
      needs_attention_reason: null,
    })
    const last = (
      await s.stack.pool.query(
        `SELECT "from"::text AS "from", "to"::text AS "to", actor::text AS actor, by_id, note
         FROM orders_history WHERE _parent_id = ${retaken} ORDER BY _order DESC LIMIT 1`,
      )
    ).rows[0]!
    expect(last).toMatchObject({
      from: 'paid',
      to: 'paid',
      actor: 'user',
      by_id: s.stack.users.owner.id,
    })
    expect(last.note).toMatch(
      /^Flag cleared: Sent from Ubud; buyer told on WhatsApp\. \(was: Paid after expiry/,
    )

    // A second click finds nothing to clear and writes nothing.
    const before = (await historyOf(retaken)).length
    expect(
      await clearOrderFlag(payload, { orderId: retaken, note: 'Again.', actor: s.as.editor }),
    ).toMatchObject({ ok: false, refusal: 'not_flagged' })
    expect(await historyOf(retaken)).toHaveLength(before)
  }, 60_000)
})
