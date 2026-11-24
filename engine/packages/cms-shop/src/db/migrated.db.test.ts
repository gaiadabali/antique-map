/**
 * TASKS.md 23.1.c–d on the shop's **migrated** database (`./migrated-stack.test-support`, built by
 * the shop's own initial migration, not pushed): what only the migration's hand-written steps and
 * the collections' access give —
 *
 * - a store user lists, counts and finds only their own store's orders and stock, over REST and
 *   through the Local API with `overrideAccess: false`, and updates neither of another store's;
 * - the last owner cannot be demoted or deleted (the backstop trigger), nor `users` truncated;
 * - `payment_events` is append-only; the order number comes from its sequence;
 * - the stock constraint refuses a negative count; the extensions are there; no record has `site`.
 */
import { asUser } from '@engine/cms-core/access'
import { Forbidden, getPayload, NotFound } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { makeOrder, makeProduct, sqlError } from '../collections/stock-levels/shop.test-support'
import {
  idsOf,
  server,
  startMigratedStack,
  type MigratedStack,
} from './migrated-stack.test-support'

describe.skipIf(!server)('the shop on its migrated database (23.1)', () => {
  let stack: MigratedStack
  let own: number
  let other: number
  const orders = { mine: 0, theirs: 0 }
  const stock = { mine: 0, theirs: 0 }

  const as = (caller: keyof MigratedStack['users']) =>
    asUser({ user: stack.users[caller], payload: stack.payload } as never)

  beforeAll(async () => {
    stack = await startMigratedStack('migrated_test', (config, key) =>
      getPayload({ config, key, disableOnInit: true }),
    )
    const { payload } = stack
    own = stack.stores[0].id
    other = stack.stores[1].id
    const product = await makeProduct(payload, 'OEI-MIGRATED')
    orders.mine = (await makeOrder(payload, { store: own, product: product.id, qty: 1 })).id
    orders.theirs = (await makeOrder(payload, { store: other, product: product.id, qty: 1 })).id
    const row = (store: number) =>
      payload.create({ collection: 'stock-levels', data: { store, product: product.id } as never })
    stock.mine = (await row(own)).id as number
    stock.theirs = (await row(other)).id as number
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  for (const [collection, ids] of [
    ['orders', orders],
    ['stock-levels', stock],
  ] as const) {
    it(`${collection}: a store user lists and finds their own store’s only`, async () => {
      const list = await stack.rest('GET', `/api/${collection}?depth=0&limit=100`, { as: 'store' })
      expect(list.status).toBe(200)
      expect(idsOf(list)).toEqual([ids.mine])
      const count = await stack.rest('GET', `/api/${collection}/count`, { as: 'store' })
      expect(count.body).toEqual({ totalDocs: 1 })
      const theirs = await stack.rest('GET', `/api/${collection}/${ids.theirs}`, { as: 'store' })
      expect(theirs.status).toBe(404)
      const byStore = await stack.rest('GET', `/api/${collection}?where[store][equals]=${other}`, {
        as: 'store',
      })
      expect(idsOf(byStore)).toEqual([])
      const mirrored = await stack.rest('GET', `/api/${collection}?depth=0`, { as: 'otherStore' })
      expect(idsOf(mirrored)).toEqual([ids.theirs])
      const all = await stack.rest('GET', `/api/${collection}?depth=0`, { as: 'owner' })
      expect(idsOf(all).sort()).toEqual([ids.mine, ids.theirs].sort())
    })

    it(`${collection}: the Local API with overrideAccess:false scopes the same`, async () => {
      const { docs } = await stack.payload.find({ collection, depth: 0, ...as('store') })
      expect(docs.map((doc) => doc.id)).toEqual([ids.mine])
      await expect(
        stack.payload.findByID({ collection, id: ids.theirs, ...as('store') }),
      ).rejects.toBeInstanceOf(NotFound)
      await expect(
        stack.payload.update({ collection, id: ids.theirs, data: {}, ...as('store') }),
      ).rejects.toBeInstanceOf(Forbidden)
    })
  }

  it('keeps an owner: the last one is neither demoted nor deleted, and users is never truncated', async () => {
    const owner = stack.users.owner.id
    const demote = await sqlError(
      stack.pool,
      `UPDATE users SET role = 'editor' WHERE id = ${owner}`,
    )
    expect(demote?.message).toMatch(/last owner/)
    const remove = await sqlError(stack.pool, `DELETE FROM users WHERE id = ${owner}`)
    expect(remove?.message).toMatch(/last owner/)
    expect((await sqlError(stack.pool, 'TRUNCATE users CASCADE'))?.message).toMatch(/truncated/)
  })

  it('records payments append-only and numbers orders from the sequence', async () => {
    await stack.pool.query(
      `INSERT INTO payment_events (dedupe_key, source, payload_hash, received_at)
       VALUES ('test-dedupe', 'webhook', repeat('a', 64), now())`,
    )
    expect((await sqlError(stack.pool, 'DELETE FROM payment_events'))?.message).toMatch(
      /append-only/,
    )
    const { rows } = await stack.pool.query(`SELECT nextval('orders_number_seq') AS n`)
    expect(Number(rows[0]!.n)).toBeGreaterThanOrEqual(100001)
  })

  it('refuses a negative count and holds no site anywhere', async () => {
    const negative = await sqlError(
      stack.pool,
      `UPDATE stock_levels SET quantity = -1 WHERE id = ${stock.mine}`,
    )
    expect(negative?.constraint).toBe('stock_levels_quantity_non_negative')
    const { rows } = await stack.pool.query(
      `SELECT count(*) AS n FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'site'`,
    )
    expect(Number(rows[0]!.n)).toBe(0)
    const extensions = await stack.pool.query(
      `SELECT extname FROM pg_extension WHERE extname IN ('unaccent', 'pg_trgm') ORDER BY 1`,
    )
    expect(extensions.rows.map((row) => row.extname)).toEqual(['pg_trgm', 'unaccent'])
  })
})
