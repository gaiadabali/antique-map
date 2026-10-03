/**
 * TASKS.md 3.5.e, the Check, on a **migrated** database (`./migrated-stack.test-support`):
 *
 * - a store user cannot read, update or list another store's order or stock row — by id and by
 *   query, over REST and through the Local API with `overrideAccess: false` (SECURITY.md R2, R3);
 * - an editor cannot read a lead;
 * - an anonymous request reads only published documents, never a staff-only field, and the
 *   loaders' Local API read returns only the fields it selects (R5, R6);
 * - the last owner cannot be removed (A7).
 */
import { Forbidden, getPayload, NotFound } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asUser } from '../access/as-user'
import { PUBLISHED_ONLY } from '../access/published'
import { makeOrder, makeProduct } from '../collections/stock-levels/shop.test-support'
import {
  fieldError,
  idsOf,
  server,
  startMigratedStack,
  type MigratedStack,
} from './migrated-stack.test-support'

describe.skipIf(!server)('role scoping on the migrated database (3.5.e)', () => {
  let stack: MigratedStack
  let own: number
  let other: number
  const orders = { mine: 0, theirs: 0 }
  const stock = { mine: 0, theirs: 0 }
  const works = { published: 0, draft: 0 }
  const products = { published: 0, draft: 0 }
  let lead: number

  /** The Local API as a signed-in user, access applied (`asUser`, R4). */
  const as = (caller: keyof MigratedStack['users']) =>
    asUser({ user: stack.users[caller], payload: stack.payload } as never)

  beforeAll(async () => {
    stack = await startMigratedStack('cms_role_scoping_test', (config, key) =>
      getPayload({ config, key, disableOnInit: true }),
    )
    const { payload, pool } = stack
    own = stack.stores[0].id
    other = stack.stores[1].id
    const product = await makeProduct(payload, 'OEI-SCOPE')
    products.published = product.id
    products.draft = (await makeProduct(payload, 'OEI-DRAFT')).id
    orders.mine = (await makeOrder(payload, { store: own, product: product.id, qty: 1 })).id
    orders.theirs = (await makeOrder(payload, { store: other, product: product.id, qty: 1 })).id
    const row = (store: number) =>
      payload.create({ collection: 'stock-levels', data: { store, product: product.id } as never })
    stock.mine = (await row(own)).id as number
    stock.theirs = (await row(other)).id as number
    // Works over REST as an editor (the works hooks' own path); one is then published and priced
    // in SQL — this proves who reads what, not what publishing demands (works-access.db.test.ts).
    const work = async (title: string) =>
      (
        (await stack.rest('POST', '/api/works?draft=true', { as: 'editor', json: { title } })).body
          ?.doc as { id: number }
      ).id
    works.published = await work('A published map')
    works.draft = await work('A draft map')
    await pool.query(
      `UPDATE works SET _status = 'published', asking_price = 18000,
         physical_export_status = 'cleared' WHERE id = $1`,
      [works.published],
    )
    await pool.query(`UPDATE products SET _status = 'published' WHERE id = $1`, [
      products.published,
    ])
    lead = (
      await payload.create({
        collection: 'leads',
        data: {
          kind: 'ask',
          site: 'gallery',
          source: 'form',
          payload: { name: 'A visitor', email: 'visitor@example.test', message: 'Is it framed?' },
        } as never,
      })
    ).id as number
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  describe('a store user and another store’s orders and stock', () => {
    for (const [collection, ids] of [
      ['orders', orders],
      ['stock-levels', stock],
    ] as const) {
      it(`${collection}: lists, counts and finds their own store’s only, over REST`, async () => {
        const list = await stack.rest('GET', `/api/${collection}?depth=0&limit=100`, {
          as: 'store',
        })
        expect(list.status).toBe(200)
        expect(idsOf(list)).toContain(ids.mine)
        expect(idsOf(list)).not.toContain(ids.theirs)
        const stores = (list.body?.docs as Array<{ store: number }>).map((doc) => doc.store)
        expect(new Set(stores)).toEqual(new Set([own]))
        const count = await stack.rest('GET', `/api/${collection}/count`, { as: 'store' })
        expect(count.body).toEqual({ totalDocs: stores.length })
        // By id, and by every query that would name it.
        expect(
          (await stack.rest('GET', `/api/${collection}/${ids.theirs}`, { as: 'store' })).status,
        ).toBe(404)
        for (const where of [
          `where[id][equals]=${ids.theirs}`,
          `where[store][equals]=${other}`,
          `where[or][0][store][equals]=${other}&where[or][1][id][equals]=${ids.theirs}`,
        ]) {
          const asked = await stack.rest('GET', `/api/${collection}?${where}`, { as: 'store' })
          expect(idsOf(asked), where).toEqual([])
        }
        // The other store's staff see the mirror image.
        const mirrored = await stack.rest('GET', `/api/${collection}?depth=0`, { as: 'otherStore' })
        expect(idsOf(mirrored)).toContain(ids.theirs)
        expect(idsOf(mirrored)).not.toContain(ids.mine)
      })

      it(`${collection}: cannot update another store’s, by id or by query`, async () => {
        const json =
          collection === 'orders'
            ? { needsAttention: { flag: true, reason: 'x' } }
            : { physicalCount: 50 }
        const byId = await stack.rest('PATCH', `/api/${collection}/${ids.theirs}`, {
          as: 'store',
          json,
        })
        expect(byId.status).toBe(403)
        const byQuery = await stack.rest(
          'PATCH',
          `/api/${collection}?where[store][equals]=${other}`,
          {
            as: 'store',
            json,
          },
        )
        expect(byQuery.body?.docs ?? []).toEqual([])
        const untouched = (await stack.payload.findByID({
          collection,
          id: ids.theirs,
          depth: 0,
        })) as Record<string, unknown>
        if (collection === 'orders') expect(untouched.needsAttention).toMatchObject({ flag: false })
        else expect(untouched.quantity).toBe(0)
      })

      it(`${collection}: the Local API with overrideAccess:false scopes the same`, async () => {
        const { docs } = await stack.payload.find({
          collection,
          depth: 0,
          limit: 100,
          ...as('store'),
        })
        expect(docs.map((doc) => doc.id)).not.toContain(ids.theirs)
        expect(docs.map((doc) => doc.id)).toContain(ids.mine)
        const { totalDocs } = await stack.payload.count({ collection, ...as('store') })
        expect(totalDocs).toBe(docs.length)
        await expect(
          stack.payload.findByID({ collection, id: ids.theirs, ...as('store') }),
        ).rejects.toBeInstanceOf(NotFound)
        await expect(
          stack.payload.update({ collection, id: ids.theirs, data: {}, ...as('store') }),
        ).rejects.toBeInstanceOf(Forbidden)
      })
    }

    it('cannot reassign their order to another store, or re-point a stock row', async () => {
      await stack.rest('PATCH', `/api/orders/${orders.mine}`, {
        as: 'store',
        json: { store: other },
      })
      await stack.rest('PATCH', `/api/stock-levels/${stock.mine}`, {
        as: 'store',
        json: { store: other },
      })
      const order = await stack.payload.findByID({
        collection: 'orders',
        id: orders.mine,
        depth: 0,
      })
      const row = await stack.payload.findByID({
        collection: 'stock-levels',
        id: stock.mine,
        depth: 0,
      })
      expect([order.store, row.store]).toEqual([own, own])
    })
  })

  it('an editor cannot read a lead — by id, in a list, or through the Local API', async () => {
    expect((await stack.rest('GET', `/api/leads/${lead}`, { as: 'editor' })).status).toBe(403)
    expect((await stack.rest('GET', '/api/leads', { as: 'editor' })).status).toBe(403)
    expect((await stack.rest('GET', '/api/leads/count', { as: 'editor' })).status).toBe(403)
    await expect(
      stack.payload.findByID({ collection: 'leads', id: lead, ...as('editor') }),
    ).rejects.toBeInstanceOf(Forbidden)
    // The owner does.
    expect((await stack.rest('GET', `/api/leads/${lead}`, { as: 'owner' })).status).toBe(200)
  })

  describe('an anonymous request', () => {
    it('reads published works and products only, and never a staff-only field', async () => {
      const list = await stack.rest('GET', '/api/works?depth=0')
      expect(idsOf(list)).toEqual([works.published])
      const work = (list.body?.docs as Array<Record<string, unknown>>)[0]!
      for (const field of ['askingPrice', 'physical', 'cataloguing', 'legacy', 'rights']) {
        expect(work, field).not.toHaveProperty(field)
      }
      expect((await stack.rest('GET', `/api/works/${works.draft}`)).status).toBe(404)
      expect((await stack.rest('GET', `/api/works/${works.draft}?draft=true`)).status).toBe(404)
      expect(idsOf(await stack.rest('GET', '/api/products?depth=0'))).toEqual([products.published])
      expect((await stack.rest('GET', '/api/works/versions')).status).toBe(403)
    })

    it('reads no list of people, orders, money or private images (R6)', async () => {
      for (const slug of [
        'users',
        'orders',
        'stock-levels',
        'leads',
        'partners',
        'chat-sessions',
        'payment-events',
        'discounts',
        'events',
        'masters',
        'media',
        'payload-locked-documents',
      ]) {
        expect((await stack.rest('GET', `/api/${slug}`)).status, slug).toBe(403)
      }
      expect((await stack.rest('GET', '/api/globals/site-settings')).status).toBe(403)
    })

    it('through the loaders’ Local API read, gets exactly the published fields it selects', async () => {
      const { docs } = await stack.payload.find({
        collection: 'works',
        overrideAccess: false,
        where: PUBLISHED_ONLY,
        select: { title: true },
        depth: 0,
      })
      expect(docs.map((doc) => doc.id)).toEqual([works.published])
      expect(Object.keys(docs[0]!).sort()).toEqual(['id', 'title'])
      // Selecting a staff-only field gets nothing for it without access.
      const priced = await stack.payload.find({
        collection: 'works',
        overrideAccess: false,
        where: PUBLISHED_ONLY,
        select: { title: true, askingPrice: true, physical: true },
      })
      expect(priced.docs[0]).not.toHaveProperty('askingPrice')
      expect(priced.docs[0]).not.toHaveProperty('physical')
    })
  })

  describe('the last owner', () => {
    it('cannot be deleted or demoted, over REST, with a plain reason', async () => {
      const id = stack.users.owner.id
      const deleted = await stack.rest('DELETE', `/api/users/${id}`, { as: 'owner' })
      expect(deleted.status).toBe(400)
      expect(fieldError(deleted)?.message).toMatch(/^This is the only owner\./)
      const demoted = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { role: 'editor' },
      })
      expect(demoted.status).toBe(400)
      expect(fieldError(demoted)).toMatchObject({
        path: 'role',
        message: expect.stringMatching(/only owner/),
      })
    })

    it('cannot be removed past every hook either: the database refuses it', async () => {
      const raw = stack.pool.query(`UPDATE users SET role = 'editor' WHERE role = 'owner'`)
      await expect(raw).rejects.toMatchObject({ message: expect.stringMatching(/owner/) })
      const left = await stack.pool.query(
        `SELECT count(*)::int AS n FROM users WHERE role = 'owner'`,
      )
      expect(left.rows[0]!.n).toBe(1)
    })
  })
})
