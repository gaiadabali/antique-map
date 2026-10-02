/**
 * `orders` on a real, pushed Postgres (TASKS.md 3.3.c, 3.3.e): an order cannot exist without a
 * store or a priced total — refused by the database itself, not only by Payload's `required` — nor
 * with a total that is not `subtotal − discount + deliveryFee`; nobody creates, deletes or
 * re-prices one through the API; store staff see their own store's orders only; the tracking
 * token's hash never leaves the server.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { makeOrder, makeProduct, sqlError, tokenHash } from '../stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'

describe.skipIf(!server)('orders, on a real database', () => {
  let stack: StaffStack
  let own: number
  let other: number
  let product: number
  let mine: { id: number }
  let theirs: { id: number }

  beforeAll(async () => {
    stack = await startStaffStack('cms_orders_test', (config, key) => getPayload({ config, key }))
    own = stack.stores[0].id
    other = stack.stores[1].id
    product = (await makeProduct(stack.payload, 'OEI-MUG')).id
    mine = await makeOrder(stack.payload, { store: own, product, qty: 2 })
    theirs = await makeOrder(stack.payload, { store: other, product, qty: 1 })
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  /** A raw INSERT of an order with every required column, `overrides` replacing some. */
  const insertOrder = (overrides: Record<string, string>) => {
    const columns: Record<string, string> = {
      number: String(900000 + Math.floor(Math.random() * 99999)),
      site: `'shop'`,
      channel: `'web'`,
      contact_name: `'B'`,
      contact_whatsapp: `'+6281234567890'`,
      contact_email: `'b@example.test'`,
      contact_locale: `'en'`,
      delivery_address: `'Jl. 1'`,
      delivery_lat: '-8.5',
      delivery_lng: '115.2',
      store_id: String(own),
      totals_subtotal: '190000',
      totals_discount: '0',
      totals_delivery_fee: '15000',
      totals_total: '205000',
      status: `'paid'`,
      tracking_token_hash: `'${tokenHash()}'`,
      ...overrides,
    }
    const names = Object.keys(columns).filter((name) => columns[name] !== 'OMIT')
    return sqlError(
      stack.pool,
      `INSERT INTO orders (${names.join(', ')}) VALUES (${names.map((n) => columns[n]).join(', ')})`,
    )
  }

  it('accepts a complete, priced order written by the server', async () => {
    expect(await insertOrder({})).toBeNull()
  })

  it('refuses an order without a store, in the database and through Payload', async () => {
    expect((await insertOrder({ store_id: 'OMIT' }))?.code).toBe('23502')
    expect((await insertOrder({ store_id: 'NULL' }))?.code).toBe('23502')
    const errors = await refusedWith(() =>
      stack.payload.create({
        collection: 'orders',
        data: { ...(withoutStore() as object) } as never,
      }),
    )
    expect(Object.keys(errors)).toContain('store')
  })

  it('refuses an order without a priced total, or with one that is not the sum of its parts', async () => {
    expect((await insertOrder({ totals_total: 'OMIT' }))?.code).toBe('23502')
    expect((await insertOrder({ totals_total: 'NULL' }))?.code).toBe('23502')
    expect((await insertOrder({ totals_subtotal: 'NULL' }))?.code).toBe('23502')
    for (const [overrides, constraint] of [
      [{ totals_total: '1' }, 'orders_totals_priced'],
      [{ totals_total: '-205000', totals_subtotal: '-190000' }, 'orders_totals_priced'],
      [{ totals_discount: '200000', totals_total: '5000' }, 'orders_totals_priced'],
      [{ totals_subtotal: '190000.5', totals_total: '205000.5' }, 'orders_totals_whole'],
      [{ tracking_token_hash: `'a-raw-token'` }, 'orders_tracking_token_hash_shape'],
    ] as const) {
      const error = await insertOrder(overrides as Record<string, string>)
      expect(error?.constraint, JSON.stringify(overrides)).toBe(constraint)
    }
    const errors = await refusedWith(() =>
      stack.payload.create({
        collection: 'orders',
        data: { ...(withoutStore() as object), store: own, totals: {} } as never,
      }),
    )
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['totals.subtotal', 'totals.total']))
  })

  it('refuses a line whose total is not its unit price times its quantity', async () => {
    const line = (qty: string, unit: string, total: string) =>
      sqlError(
        stack.pool,
        `INSERT INTO orders_lines (_order, _parent_id, id, product_id, sku, name, unit_price, qty, line_total)
         VALUES (9, ${mine.id}, 'x${Math.random()}', ${product}, 'S', 'N', ${unit}, ${qty}, ${total})`,
      )
    expect(await line('2', '95000', '190000')).toBeNull()
    for (const [qty, unit, total] of [
      ['2', '95000', '95000'],
      ['0', '95000', '0'],
      ['1.5', '100', '150'],
      ['1', '-5', '-5'],
    ]) {
      expect((await line(qty!, unit!, total!))?.constraint, `${qty} × ${unit}`).toBe(
        'orders_lines_priced',
      )
    }
  })

  it('lets nobody create or delete an order through the API — the owner included', async () => {
    for (const as of ['owner', 'editor', 'store'] as const) {
      const made = await stack.rest('POST', '/api/orders', { as, json: withoutStore() })
      expect(made.status, `create as ${as}`).toBe(403)
      expect((await stack.rest('DELETE', `/api/orders/${mine.id}`, { as })).status).toBe(403)
    }
    expect((await stack.rest('GET', '/api/orders')).status).toBe(403)
  })

  it('keeps what an order was priced and sold with out of reach of a staff update', async () => {
    const changed = await stack.rest('PATCH', `/api/orders/${mine.id}`, {
      as: 'editor',
      json: {
        status: 'processing',
        store: other,
        totals: { subtotal: 1, discount: 0, deliveryFee: 0, total: 1 },
        trackingTokenHash: tokenHash(),
      },
    })
    expect(changed.status).toBe(200)
    const doc = changed.body?.doc as Record<string, unknown>
    expect(doc.status).toBe('processing')
    expect(doc.store).toMatchObject({ id: own })
    expect(doc.totals).toMatchObject({ subtotal: 190000, total: 205000 })
    expect(doc).not.toHaveProperty('trackingTokenHash')
  })

  it('shows store staff their own store’s orders alone, and lets them hand one back', async () => {
    const list = await stack.rest('GET', '/api/orders?depth=0&limit=100', { as: 'store' })
    const stores = new Set((list.body?.docs as Array<{ store: number }>).map((d) => d.store))
    expect(stores).toEqual(new Set([own]))
    expect((await stack.rest('GET', `/api/orders/${theirs.id}`, { as: 'store' })).status).toBe(404)
    const asked = await stack.rest('GET', `/api/orders?where[store][equals]=${other}`, {
      as: 'store',
    })
    expect(asked.body?.docs).toEqual([])
    expect(
      (await stack.rest('PATCH', `/api/orders/${theirs.id}`, { as: 'store', json: {} })).status,
    ).toBe(403)
    const handedBack = await stack.rest('PATCH', `/api/orders/${mine.id}`, {
      as: 'store',
      json: {
        needsAttention: { flag: true, reason: 'Out of the indigo print' },
        status: 'cancelled',
      },
    })
    expect(handedBack.status).toBe(200)
    const doc = handedBack.body?.doc as Record<string, unknown>
    expect(doc.needsAttention).toMatchObject({ flag: true, reason: 'Out of the indigo print' })
    // The status is not theirs to move until 3.5.c gives them the forward step.
    expect(doc.status).toBe('processing')
  })

  function withoutStore() {
    return {
      number: 123456,
      lines: [{ product, sku: 'S', name: 'N', unitPrice: 1000, qty: 1, lineTotal: 1000 }],
      contact: { name: 'B', whatsapp: '+6281234567890', email: 'b@example.test', locale: 'en' },
      delivery: { address: 'Jl. 1', lat: -8.5, lng: 115.2 },
      totals: { subtotal: 1000, discount: 0, deliveryFee: 0, total: 1000 },
      trackingTokenHash: tokenHash(),
    }
  }
})
