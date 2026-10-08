/**
 * IDOR on an order (TASKS.md 10.1.e, class 1; SECURITY.md §2.2 R2–R3): a store user who knows —
 * or guesses — the id of another store's order cannot list, count, read, update, move, hand back,
 * reassign or attach a driver image to it, through REST, the Local API with `overrideAccess:
 * false`, and the fulfilment core the `/api/x/orders/[id]/*` routes call.
 *
 * Every refusal has a control beside it — the same call on the user's own store's order lands —
 * so a test that passes because the harness is broken cannot hide.
 *
 * Planted violation (tests/security/plants/run-plants.mjs, class "idor"): `ownStoreOrders` in
 * `engine/packages/cms/src/collections/orders/access.ts` made to return `true` for a store user.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { reencodeImage } from '../../engine/packages/cms/src/shop/fulfilment/image'
import { png } from '../../engine/packages/cms/src/shop/fulfilment/image.test-support'
import {
  attachDriverImage,
  handBackOrder,
  moveOrder,
  reassignOrder,
} from '../../engine/packages/cms/src/shop/fulfilment'
import { memoryStore } from '../../engine/packages/cms/src/shop/fulfilment/fulfilment-db.test-support'
import { server, startSecurityStack, type SecurityStack } from './support/stack'

describe.skipIf(!server)('IDOR on an order: store A against store B’s order', () => {
  let stack: SecurityStack
  let mine: number
  let theirs: number
  let actorA: Record<string, unknown> & { id: number }

  beforeAll(async () => {
    stack = await startSecurityStack('security_idor')
    mine = stack.orders.A.id
    theirs = stack.orders.B.id
    actorA = { ...stack.users.storeA, collection: 'users' }
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const asA = (route: string, method = 'GET', json?: unknown) =>
    stack.rest(method, route, { as: 'storeA', json })
  const docs = (body: Record<string, unknown> | null) =>
    ((body as { docs?: Array<{ id: number }> }).docs ?? []).map((doc) => doc.id)
  const statusOf = async (id: number) =>
    String(
      (
        (await stack.pool.query(`SELECT status::text AS s FROM orders WHERE id = ${id}`))
          .rows[0] as { s: string }
      ).s,
    )

  describe('over REST', () => {
    it('lists, counts and reads only the user’s own store’s order', async () => {
      expect(docs((await asA('/api/orders?limit=100&depth=0')).body)).toEqual([mine])
      expect((await asA('/api/orders/count')).body).toMatchObject({ totalDocs: 1 })
      expect((await asA(`/api/orders/${mine}?depth=0`)).status).toBe(200)
      expect((await asA(`/api/orders/${theirs}?depth=0`)).status).toBe(404)
    })

    it('no query shape reaches the other order: id, store, or, not_equals', async () => {
      const probes = [
        `/api/orders?where[id][equals]=${theirs}`,
        `/api/orders?where[store][equals]=${stack.stores.B.id}`,
        `/api/orders?where[store][not_equals]=${stack.stores.A.id}`,
        `/api/orders?where[or][0][id][equals]=${theirs}&where[or][1][id][equals]=${mine}`,
        `/api/orders?where[id][in]=${theirs},${mine}`,
        `/api/orders?where[totals.total][greater_than]=0&sort=-id&depth=0`,
      ]
      for (const probe of probes) {
        const ids = docs((await asA(probe)).body)
        expect(ids, probe).not.toContain(theirs)
      }
    })

    it('cannot update, delete or re-point the other order — and can its own (control)', async () => {
      expect([403, 404]).toContain(
        (await asA(`/api/orders/${theirs}`, 'PATCH', { status: 'processing' })).status,
      )
      expect([401, 403]).toContain((await asA(`/api/orders/${theirs}`, 'DELETE')).status)
      expect(await statusOf(theirs)).toBe('paid')
      // The control: a one-step move on its own store's order is allowed over the same route.
      const own = await asA(`/api/orders/${mine}`, 'PATCH', { status: 'processing' })
      expect(own.status, JSON.stringify(own.body)).toBe(200)
      expect(await statusOf(mine)).toBe('processing')
    })

    it('cannot move its own order to another store or change what it was priced at', async () => {
      await asA(`/api/orders/${mine}`, 'PATCH', {
        store: stack.stores.B.id,
        totals: { total: 1, subtotal: 1, deliveryFee: 0, discount: 0 },
      })
      const row = (
        await stack.pool.query(`SELECT store_id, totals_total FROM orders WHERE id = ${mine}`)
      ).rows[0] as { store_id: number; totals_total: string | number }
      expect(row.store_id).toBe(stack.stores.A.id)
      expect(Number(row.totals_total)).toBe(110000)
    })
  })

  describe('through the Local API with access enforced', () => {
    const as = { user: undefined as unknown, overrideAccess: false }
    beforeAll(() => {
      as.user = actorA
    })

    it('finds, counts and reads only its own store’s order', async () => {
      const found = (await stack.api.find({ collection: 'orders', depth: 0, ...as })) as {
        docs: Array<{ id: number }>
      }
      expect(found.docs.map((doc) => doc.id)).toEqual([mine])
      await expect(
        stack.api.findByID({ collection: 'orders', id: theirs, depth: 0, ...as }),
      ).rejects.toThrow()
      await expect(
        stack.api.findByID({ collection: 'orders', id: mine, depth: 0, ...as }),
      ).resolves.toBeDefined()
    })

    it('cannot update the other store’s order', async () => {
      await expect(
        stack.api.update({
          collection: 'orders',
          id: theirs,
          data: { status: 'processing' },
          ...as,
        }),
      ).rejects.toThrow()
      expect(await statusOf(theirs)).toBe('paid')
    })
  })

  describe('through the fulfilment core the order routes call', () => {
    it('refuses a move, a hand-back and a reassign on the other store’s order, and a driver image', async () => {
      const move = await moveOrder(stack.payload, {
        orderId: theirs,
        to: 'processing',
        actor: actorA,
      })
      expect(move).toMatchObject({ ok: false, refusal: 'not_your_store' })
      const back = await handBackOrder(stack.payload, {
        orderId: theirs,
        actor: actorA,
        reason: 'not mine',
      })
      expect(back).toMatchObject({ ok: false, refusal: 'not_your_store' })
      const reassign = await reassignOrder(stack.payload, {
        orderId: theirs,
        toStoreId: stack.stores.A.id,
        actor: actorA,
      })
      expect(reassign).toMatchObject({ ok: false, refusal: 'not_allowed' })

      const images = memoryStore()
      const attach = await attachDriverImage(
        stack.payload,
        { orderId: theirs, actor: actorA, file: { buffer: png(8, 8) } },
        { store: images.deps.store, reencode: reencodeImage },
      )
      expect(attach).toMatchObject({ ok: false, refusal: 'not_your_store' })
      expect(images.calls.put, 'nothing was written to the bucket').toBe(0)
      expect(await statusOf(theirs)).toBe('paid')
    })

    it('lets the same user do the same to their own order (control)', async () => {
      // Store staff move one step forward: bring `mine` to `processing` if the REST control did not.
      if ((await statusOf(mine)) === 'paid') {
        await moveOrder(stack.payload, { orderId: mine, to: 'processing', actor: actorA })
      }
      const own = await moveOrder(stack.payload, {
        orderId: mine,
        to: 'waiting_driver',
        actor: actorA,
      })
      expect(own).toMatchObject({ ok: true, to: 'waiting_driver' })
      const images = memoryStore()
      const attach = await attachDriverImage(
        stack.payload,
        { orderId: mine, actor: actorA, file: { buffer: png(8, 8) } },
        { store: images.deps.store, reencode: reencodeImage },
      )
      expect(attach).toMatchObject({ ok: true })
      expect(images.calls.put).toBe(1)
    })

    it('refuses an actor who is not signed in, and one with no known role', async () => {
      expect(
        await moveOrder(stack.payload, { orderId: mine, to: 'on_the_way', actor: null }),
      ).toMatchObject({
        ok: false,
        refusal: 'not_staff',
      })
      expect(
        await moveOrder(stack.payload, {
          orderId: mine,
          to: 'on_the_way',
          actor: { id: 1, collection: 'users', role: 'visitor' },
        }),
      ).toMatchObject({ ok: false, refusal: 'not_staff' })
    })
  })
})
