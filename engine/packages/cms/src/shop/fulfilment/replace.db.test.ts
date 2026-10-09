/**
 * **Replace damaged item** on a real, pushed Postgres (COMMERCE.md §12; TASKS.md 10.7.a, 10.7.c):
 * - with stock at the original's store: the units are taken, and a Rp 0 `replacement` order is
 *   written `processing` at that store, linked both ways, with its own tracking link emailed;
 * - with a line short: nothing is written — no order, no history, every stock row as it was;
 * - store staff and anyone signed out are refused, by the core and by the endpoint;
 * - never more than was sold, counting earlier replacements; only a delivered order;
 * - the owner panel's plain form post reaches it through `POST /api/orders/:id/replace`.
 */
import { getPayload, handleEndpoints } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import {
  PASSWORD,
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { setMailTransport, type MailMessage } from '../notify/transport'
import { openShop, type Shop } from '../orders/orders-db.test-support'
import { actors, placeOrder, readers } from './fulfilment-db.test-support'
import { replaceDamagedItem } from './replace'

describe.skipIf(!server)('replace damaged item, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let as: ReturnType<typeof actors>
  let read: ReturnType<typeof readers>

  beforeAll(async () => {
    stack = await startStaffStack('cms_replace_test', (config, key) => getPayload({ config, key }))
    shop = await openShop(stack)
    as = actors(stack)
    read = readers(stack)
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)
  afterEach(() => setMailTransport(null))

  const query = async (text: string) => (await stack.pool.query(text)).rows
  const lineIds = async (orderId: number) =>
    (await query(`SELECT id FROM orders_lines WHERE _parent_id = ${orderId} ORDER BY _order`)).map(
      (row) => String(row.id),
    )
  const replacementsOf = async (orderId: number) =>
    query(`SELECT * FROM orders WHERE replacement_of_id = ${orderId} ORDER BY id`)

  it('takes the stock and creates a Rp 0 replacement at the same store, linked both ways', async () => {
    const sent: MailMessage[] = []
    setMailTransport({ send: async (message) => void sent.push(message) })
    const original = await placeOrder(stack, {
      store: shop.ubud,
      status: 'delivered',
      lines: [{ qty: 2, stock: { [shop.ubud]: 3 } }],
    })
    const [lineId] = await lineIds(original.id)

    const result = await replaceDamagedItem(stack.payload, {
      orderId: original.id,
      lines: [{ lineId: lineId!, qty: 1 }],
      note: '  Frame cracked, photo on WhatsApp  ',
      actor: as.editor,
    })
    expect(result).toMatchObject({ ok: true, originalId: original.id })
    if (!result.ok) return
    expect(await read.quantity(original.stock[0]![shop.ubud]!)).toBe(2)

    const [made] = await replacementsOf(original.id)
    const was = await read.order(original.id)
    expect(made).toMatchObject({
      id: result.orderId,
      number: String(result.number), // numeric: pg returns it as a string
      channel: 'replacement',
      replacement_of_id: original.id,
      status: 'processing',
      store_id: shop.ubud,
      contact_email: was.contact_email,
      contact_whatsapp: was.contact_whatsapp,
      delivery_address: was.delivery_address,
      payment_paid_at: null,
      payment_transaction_id: null,
      expires_at: null,
      discount_code: null,
      needs_attention_flag: false,
    })
    for (const total of [
      'totals_subtotal',
      'totals_discount',
      'totals_delivery_fee',
      'totals_total',
    ]) {
      expect(Number(made![total])).toBe(0)
    }
    expect(made!.tracking_token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(made!.tracking_token_hash).not.toBe(was.tracking_token_hash)
    const lines = await query(
      `SELECT unit_price, qty, line_total, sku FROM orders_lines WHERE _parent_id = ${result.orderId}`,
    )
    expect(lines.map((l) => [Number(l.unit_price), Number(l.qty), Number(l.line_total)])).toEqual([
      [95000, 1, 95000],
    ])

    expect(await read.history(result.orderId)).toEqual([
      {
        from: null,
        to: 'processing',
        actor: 'user',
        by_id: stack.users.editor.id,
        note: `Replacement for order #${String(was.number)}, Rp 0: Frame cracked, photo on WhatsApp`,
      },
    ])
    expect(await read.history(original.id)).toEqual([
      {
        from: 'delivered',
        to: 'delivered',
        actor: 'user',
        by_id: stack.users.editor.id,
        note: `Damaged item replaced by order #${result.number} (Rp 0): Frame cracked, photo on WhatsApp`,
      },
    ])
    // The buyer's tracking email ("being packed"), with the replacement's own link.
    expect(sent.map((m) => m.to)).toEqual(['b@example.test'])
    expect(sent[0]!.text).toMatch(/being packed/)
    expect(sent[0]!.text).toMatch(/\/track\//)
  })

  it('writes nothing when the store is short on any line', async () => {
    const original = await placeOrder(stack, {
      store: shop.ubud,
      status: 'delivered',
      // The first line's unit is there (taken first, in the lock order), the second's is not.
      lines: [
        { qty: 1, stock: { [shop.ubud]: 4 } },
        { qty: 1, stock: { [shop.ubud]: 0, [shop.sanur]: 6 } },
      ],
    })
    const ids = await lineIds(original.id)
    const result = await replaceDamagedItem(stack.payload, {
      orderId: original.id,
      lines: ids.map((lineId) => ({ lineId, qty: 1 })),
      note: 'Both broken',
      actor: as.owner,
    })
    expect(result).toMatchObject({
      ok: false,
      refusal: 'replace_short',
      lines: [{ productId: original.products[1], variantSku: null }],
    })
    expect(await read.quantity(original.stock[0]![shop.ubud]!)).toBe(4)
    expect(await read.quantity(original.stock[1]![shop.ubud]!)).toBe(0)
    expect(await read.quantity(original.stock[1]![shop.sanur]!)).toBe(6)
    expect(await replacementsOf(original.id)).toEqual([])
    expect(await read.history(original.id)).toEqual([])
  })

  it('refuses store staff and anyone signed out — in the core and at the endpoint', async () => {
    const original = await placeOrder(stack, {
      store: shop.ubud,
      status: 'delivered',
      lines: [{ qty: 1, stock: { [shop.ubud]: 2 } }],
    })
    const [lineId] = await lineIds(original.id)
    for (const actor of [as.store, null]) {
      const result = await replaceDamagedItem(stack.payload, {
        orderId: original.id,
        lines: [{ lineId: lineId!, qty: 1 }],
        note: 'Broken',
        actor,
      })
      expect(result).toMatchObject({ ok: false, refusal: 'not_allowed' })
    }
    for (const caller of ['store', undefined] as const) {
      const answer = await stack.rest('POST', `/api/orders/${original.id}/replace`, { as: caller })
      expect(answer.status).toBe(403)
    }
    expect(await read.quantity(original.stock[0]![shop.ubud]!)).toBe(2)
    expect(await replacementsOf(original.id)).toEqual([])
    expect(await read.history(original.id)).toEqual([])
  })

  it('never replaces more than was sold, counting earlier replacements; only a delivered order', async () => {
    const original = await placeOrder(stack, {
      store: shop.ubud,
      status: 'delivered',
      lines: [{ qty: 2, stock: { [shop.ubud]: 10 } }],
    })
    const [lineId] = await lineIds(original.id)
    const replace = (qty: number, orderId = original.id, id = lineId!) =>
      replaceDamagedItem(stack.payload, {
        orderId,
        lines: [{ lineId: id, qty }],
        note: 'Torn',
        actor: as.owner,
      })
    expect(await replace(3)).toMatchObject({ ok: false, refusal: 'replace_too_many' })
    expect(await replace(0)).toMatchObject({ ok: false, refusal: 'replace_no_lines' })
    expect(await replace(1, original.id, 'not-a-line')).toMatchObject({
      ok: false,
      refusal: 'replace_no_lines',
    })
    // Two clicks on Confirm for the whole line: one replacement, one refusal.
    const clicks = await Promise.all([replace(2), replace(2)])
    expect(clicks.filter((r) => r.ok)).toHaveLength(1)
    expect(clicks.filter((r) => !r.ok)).toMatchObject([{ refusal: 'replace_too_many' }])
    expect(await read.quantity(original.stock[0]![shop.ubud]!)).toBe(8)
    expect(await replacementsOf(original.id)).toHaveLength(1)

    const open = await placeOrder(stack, {
      store: shop.ubud,
      status: 'on_the_way',
      lines: [{ qty: 1, stock: { [shop.ubud]: 5 } }],
    })
    const [openLine] = await lineIds(open.id)
    expect(await replace(1, open.id, openLine!)).toMatchObject({
      ok: false,
      refusal: 'wrong_status',
    })
    expect(
      await replaceDamagedItem(stack.payload, {
        orderId: original.id,
        lines: [{ lineId: lineId!, qty: 1 }],
        note: '   ',
        actor: as.owner,
      }),
    ).toMatchObject({ ok: false, refusal: 'note_required' })
  })

  it("the panel's form post: the owner is sent to the new order; a short store comes back with the reason", async () => {
    const original = await placeOrder(stack, {
      store: shop.ubud,
      status: 'delivered',
      lines: [{ qty: 1, stock: { [shop.ubud]: 1 } }],
    })
    const [lineId] = await lineIds(original.id)
    const { token } = await stack.payload.login({
      collection: 'users',
      data: { email: 'owner@staff.test', password: PASSWORD },
    })
    const { rows } = await stack.pool.query('SELECT current_database() AS name')
    const post = (form: Record<string, string>) =>
      handleEndpoints({
        config: stack.payload.config,
        payloadInstanceCacheKey: String(rows[0]!.name),
        request: new Request(`http://localhost/api/orders/${original.id}/replace`, {
          method: 'POST',
          headers: { authorization: `JWT ${token}` },
          body: new URLSearchParams(form),
        }),
      })
    const form = { line: lineId!, [`qty_${lineId}`]: '1', note: 'Glass broken' }

    const done = await post(form)
    expect(done.status).toBe(303)
    const [made] = await replacementsOf(original.id)
    expect(done.headers.get('location')).toBe(`/admin/orders/${String(made!.id)}`)

    // The one unit is gone now; a second replacement is refused with the reason, nothing written.
    await stack.pool.query(
      `UPDATE stock_levels SET quantity = 0 WHERE id = ${original.stock[0]![shop.ubud]!}`,
    )
    await stack.pool.query(`UPDATE orders SET status = 'cancelled' WHERE id = ${String(made!.id)}`)
    const short = await post(form)
    expect(short.status).toBe(303)
    expect(short.headers.get('location')).toBe(`/admin/orders/${original.id}?error=replace_short`)
    expect(await replacementsOf(original.id)).toHaveLength(1)
  })
})
