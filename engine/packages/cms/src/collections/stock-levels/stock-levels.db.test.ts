/**
 * `stock-levels` on a real, pushed Postgres (TASKS.md 3.3.b, 3.3.e): the database itself refuses a
 * second row for one store, product and variant — `NULLS NOT DISTINCT`, so a product without
 * variants too — and a negative or fractional quantity, whatever path writes it; a physical count
 * is stored less the units held by open orders; and store staff reach their own store's rows
 * only, by REST, through Payload's own handler. The constraints arrive through the constraint seam
 * (`db/constraints`), so this pushed database has exactly what the migration will.
 */
import { getPayload, type Where } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'
import { makeOrder, makeProduct, sqlError } from './shop.test-support'

describe.skipIf(!server)('stock levels, on a real database', () => {
  let stack: StaffStack
  let own: number
  let other: number
  let plain: number
  let varied: number

  beforeAll(async () => {
    stack = await startStaffStack('cms_stock_levels_test', (config, key) =>
      getPayload({ config, key }),
    )
    own = stack.stores[0].id
    other = stack.stores[1].id
    plain = (await makeProduct(stack.payload, 'OEI-TOTE')).id
    varied = (await makeProduct(stack.payload, 'OEI-PRINT', ['OEI-PRINT-A3', 'OEI-PRINT-A4'])).id
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const row = (data: Record<string, unknown>) =>
    stack.payload.create({ collection: 'stock-levels', data: data as never })

  it('refuses a second row for one store, product and variant — a NULL variant included', async () => {
    await row({ store: own, product: plain, quantity: 3 })
    await row({ store: own, product: varied, variantSku: 'OEI-PRINT-A3', quantity: 1 })
    // Other keys are other rows.
    await row({ store: other, product: plain, quantity: 2 })
    await row({ store: own, product: varied, variantSku: 'OEI-PRINT-A4', quantity: 0 })

    const insert = (variant: string) =>
      sqlError(
        stack.pool,
        `INSERT INTO stock_levels (store_id, product_id, variant_sku, quantity) VALUES (${own}, ${variant === 'NULL' ? plain : varied}, ${variant}, 5)`,
      )
    for (const variant of ['NULL', `'OEI-PRINT-A3'`]) {
      const error = await insert(variant)
      expect(error?.code, variant).toBe('23505')
      expect(error?.constraint).toBe('stock_levels_store_product_variant_unique')
    }
    // Through Payload, the same refusal: the save fails and no second row exists.
    await expect(row({ store: own, product: plain, quantity: 9 })).rejects.toThrow()
    const { rows } = await stack.pool.query(
      `SELECT count(*)::int AS n FROM stock_levels WHERE store_id = ${own} AND product_id = ${plain}`,
    )
    expect(rows[0]!.n).toBe(1)
    // An empty string is not a second "no variant".
    const blank = await sqlError(
      stack.pool,
      `INSERT INTO stock_levels (store_id, product_id, variant_sku, quantity) VALUES (${other}, ${plain}, '', 1)`,
    )
    expect(blank?.constraint).toBe('stock_levels_variant_sku_not_blank')
  })

  it('refuses a negative or fractional quantity in the database itself', async () => {
    const where = `WHERE store_id = ${own} AND product_id = ${plain}`
    for (const value of ['-1', '1.5', 'NULL']) {
      const error = await sqlError(
        stack.pool,
        `UPDATE stock_levels SET quantity = ${value} ${where}`,
      )
      expect(error?.code, value).toMatch(/^23(514|502)$/)
    }
    expect(
      (await sqlError(stack.pool, `UPDATE stock_levels SET quantity = quantity - 4 ${where}`))
        ?.constraint,
    ).toBe('stock_levels_quantity_non_negative')
    // COMMERCE.md §4's decrement takes nothing when the quantity is short, and the row is intact.
    const taken = await stack.pool.query(
      `UPDATE stock_levels SET quantity = quantity - 4 ${where} AND variant_sku IS NOT DISTINCT FROM NULL AND quantity >= 4 RETURNING id`,
    )
    expect(taken.rows).toHaveLength(0)
    const { rows } = await stack.pool.query(`SELECT quantity FROM stock_levels ${where}`)
    expect(Number(rows[0]!.quantity)).toBe(3)
  })

  it('refuses a row without a store or product, and a variant its product does not have', async () => {
    for (const columns of [
      'product_id, quantity) VALUES (' + plain,
      'store_id, quantity) VALUES (' + own,
    ]) {
      const error = await sqlError(stack.pool, `INSERT INTO stock_levels (${columns}, 1)`)
      expect(error?.code, columns).toBe('23502')
    }
    expect(await refusedWith(() => row({ store: other, product: varied, quantity: 1 }))).toEqual({
      variantSku: 'Choose one of this product’s variant SKUs: OEI-PRINT-A3, OEI-PRINT-A4.',
    })
    expect(
      await refusedWith(() =>
        row({ store: other, product: plain, variantSku: 'OEI-PRINT-A3', quantity: 1 }),
      ),
    ).toEqual({ variantSku: 'This product has no variants: leave the variant SKU empty.' })
  })

  it('stores a physical count less the units open orders hold, and 0 below them', async () => {
    const [stock] = (
      await stack.payload.find({
        collection: 'stock-levels',
        where: { and: [{ store: { equals: own } }, { product: { equals: plain } }] },
      })
    ).docs
    // Held: 2 paid + 1 waiting for a driver. Not held: delivered, expired, another store's.
    await makeOrder(stack.payload, { store: own, product: plain, qty: 2, status: 'paid' })
    await makeOrder(stack.payload, { store: own, product: plain, qty: 1, status: 'waiting_driver' })
    await makeOrder(stack.payload, { store: own, product: plain, qty: 4, status: 'delivered' })
    await makeOrder(stack.payload, { store: own, product: plain, qty: 4, status: 'expired' })
    await makeOrder(stack.payload, { store: other, product: plain, qty: 1, status: 'paid' })
    const count = async (physicalCount: number) => {
      const saved = await stack.rest('PATCH', `/api/stock-levels/${stock!.id}`, {
        as: 'store',
        json: { physicalCount },
      })
      expect(saved.status).toBe(200)
      return (saved.body?.doc as { quantity: number }).quantity
    }
    expect(await count(10)).toBe(7)
    expect(await count(2)).toBe(0)
    expect(await count(3)).toBe(0)
    expect(await count(4)).toBe(1)
    const refused = await stack.rest('PATCH', `/api/stock-levels/${stock!.id}`, {
      as: 'editor',
      json: { physicalCount: 2.5 },
    })
    expect(refused.status).toBe(400)
  }, 60_000)

  it('waits for an order in flight on the row, then counts its units as held', async () => {
    const where: Where = { and: [{ store: { equals: own } }, { product: { equals: plain } }] }
    const [stock] = (await stack.payload.find({ collection: 'stock-levels', where })).docs
    const [delivered] = (
      await stack.payload.find({
        collection: 'orders',
        where: { and: [{ store: { equals: own } }, { status: { equals: 'delivered' } }] },
      })
    ).docs
    type Client = { query: (text: string) => Promise<unknown>; release: () => void }
    const client = await (stack.pool as unknown as { connect: () => Promise<Client> }).connect()
    try {
      // An order being created: its decrement holds the row, its 4 units become held — uncommitted.
      await client.query('BEGIN')
      await client.query(`UPDATE stock_levels SET quantity = quantity WHERE id = ${stock!.id}`)
      await client.query(`UPDATE orders SET status = 'paid' WHERE id = ${delivered!.id}`)
      let settled = false
      const counting = stack
        .rest('PATCH', `/api/stock-levels/${stock!.id}`, {
          as: 'store',
          json: { physicalCount: 10 },
        })
        .finally(() => {
          settled = true
        })
      await new Promise((resolve) => setTimeout(resolve, 750))
      expect(settled, 'the count waits for the order’s commit').toBe(false)
      await client.query('COMMIT')
      const saved = await counting
      // Held after the commit: 2 paid + 1 waiting + 4 just paid = 7.
      expect((saved.body?.doc as { quantity: number }).quantity).toBe(3)
    } finally {
      client.release()
    }
  }, 60_000)

  it('lets store staff reach their own store’s rows alone, and change only the count', async () => {
    const theirs = (
      await stack.payload.find({ collection: 'stock-levels', where: { store: { equals: other } } })
    ).docs[0]!
    const mine = (
      await stack.payload.find({
        collection: 'stock-levels',
        where: { and: [{ store: { equals: own } }, { product: { equals: plain } }] },
      })
    ).docs[0]!
    const list = await stack.rest('GET', '/api/stock-levels?depth=0&limit=50', { as: 'store' })
    const stores = (list.body?.docs as Array<{ store: number }>).map((doc) => doc.store)
    expect(new Set(stores)).toEqual(new Set([own]))
    expect((await stack.rest('GET', '/api/stock-levels/count', { as: 'store' })).body).toEqual({
      totalDocs: stores.length,
    })
    expect(
      (await stack.rest('GET', `/api/stock-levels/${theirs.id}`, { as: 'store' })).status,
    ).toBe(404)
    const asked = await stack.rest('GET', `/api/stock-levels?where[store][equals]=${other}`, {
      as: 'store',
    })
    expect(asked.body?.docs).toEqual([])
    const patched = await stack.rest('PATCH', `/api/stock-levels/${theirs.id}`, {
      as: 'store',
      json: { physicalCount: 50 },
    })
    // Payload answers a scoped update it finds nothing for with 403, existing id or not.
    expect(patched.status).toBe(403)

    // Their own row: `quantity`, the store and the product are not theirs to type.
    const before = Number(mine.quantity)
    const sneaky = await stack.rest('PATCH', `/api/stock-levels/${mine.id}`, {
      as: 'store',
      json: { quantity: 999, store: other, product: varied },
    })
    expect(sneaky.status).toBe(200)
    const after = await stack.payload.findByID({
      collection: 'stock-levels',
      id: mine.id,
      depth: 0,
    })
    expect([Number(after.quantity), after.store, after.product]).toEqual([before, own, plain])

    expect(
      (
        await stack.rest('POST', '/api/stock-levels', {
          as: 'store',
          json: { store: own, product: varied, variantSku: 'OEI-PRINT-A4' },
        })
      ).status,
    ).toBe(403)
    expect(
      (await stack.rest('DELETE', `/api/stock-levels/${mine.id}`, { as: 'store' })).status,
    ).toBe(403)
    expect(
      (await stack.rest('DELETE', `/api/stock-levels/${mine.id}`, { as: 'editor' })).status,
    ).toBe(403)
    expect((await stack.rest('GET', '/api/stock-levels')).status).toBe(403)
  }, 60_000)

  it('lets an editor count any store’s row, and only the owner create one', async () => {
    const theirs = (
      await stack.payload.find({ collection: 'stock-levels', where: { store: { equals: other } } })
    ).docs[0]!
    const counted = await stack.rest('PATCH', `/api/stock-levels/${theirs.id}`, {
      as: 'editor',
      json: { physicalCount: 6 },
    })
    expect(counted.status).toBe(200)
    expect((counted.body?.doc as { quantity: number }).quantity).toBe(5) // one held by a paid order
    const json = { store: other, product: varied, variantSku: 'OEI-PRINT-A4', physicalCount: 2 }
    expect((await stack.rest('POST', '/api/stock-levels', { as: 'editor', json })).status).toBe(403)
    const made = await stack.rest('POST', '/api/stock-levels', { as: 'owner', json })
    expect(made.status).toBe(201)
    expect((made.body?.doc as { quantity: number }).quantity).toBe(2)
  }, 60_000)
})
