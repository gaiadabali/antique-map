/**
 * TASKS.md 3.5.c and 3.5.d, and the migration's hand-written steps (3.5.a), on a **migrated**
 * database (`./migrated-stack.test-support`):
 *
 * - a store user moves their order one step forward and no further, refused with a plain field
 *   message over REST and through the Local API alike (the 8.6 finding); each move is recorded;
 * - role and store changes are recorded, the owner's alone to make (SECURITY.md R7); an editor and
 *   a store user cannot change their own role or store over REST, and nothing is recorded;
 * - the admin's locks: store staff reach their own alone, never another's;
 * - the payment ledger refuses UPDATE, DELETE and TRUNCATE in the database; order numbers come
 *   from `orders_number_seq`, from 100001.
 */
import { getPayload, ValidationError } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { asUser } from '../access/as-user'
import { makeOrder, makeProduct } from '../collections/stock-levels/shop.test-support'
import {
  fieldError,
  idsOf,
  server,
  startMigratedStack,
  type MigratedStack,
} from './migrated-stack.test-support'

describe.skipIf(!server)('staff records on the migrated database (3.5.c, 3.5.d)', () => {
  let stack: MigratedStack
  let product: number

  beforeAll(async () => {
    stack = await startMigratedStack('cms_staff_records_test', (config, key) =>
      getPayload({ config, key, disableOnInit: true }),
    )
    product = (await makeProduct(stack.payload, 'OEI-RECORDS')).id
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const order = async (status = 'paid', store = stack.stores[0].id) =>
    (await makeOrder(stack.payload, { store, product, qty: 1, status })).id
  const stored = (id: number) =>
    stack.payload.findByID({ collection: 'orders', id, depth: 0 }) as unknown as Promise<{
      status: string
      history?: Array<{ from: string; to: string; by: number; actor: string }>
    }>

  describe('an order’s status, moved by a store user (3.5.c)', () => {
    it('moves one step forward, and records who moved it', async () => {
      const id = await order('paid')
      const moved = await stack.rest('PATCH', `/api/orders/${id}`, {
        as: 'store',
        json: { status: 'processing' },
      })
      expect(moved.status).toBe(200)
      const after = await stored(id)
      expect(after.status).toBe('processing')
      expect(after.history?.at(-1)).toMatchObject({
        from: 'paid',
        to: 'processing',
        actor: 'user',
        by: stack.users.store.id,
      })
    })

    it('refuses two steps, a step back and a cancel, with a plain message on status', async () => {
      const id = await order('processing')
      for (const status of ['on_the_way', 'paid', 'cancelled']) {
        const refused = await stack.rest('PATCH', `/api/orders/${id}`, {
          as: 'store',
          json: { status },
        })
        expect(refused.status, status).toBe(400)
        expect(fieldError(refused), status).toMatchObject({
          path: 'status',
          message: expect.stringMatching(
            /^Store staff (move an order one step forward only|cannot move)/,
          ),
        })
      }
      expect((await stored(id)).status).toBe('processing')
    })

    it('answers the Local API with the same ValidationError and the same words', async () => {
      const id = await order('paid')
      const attempt = stack.payload.update({
        collection: 'orders',
        id,
        data: { status: 'delivered' } as never,
        ...asUser({ user: stack.users.store, payload: stack.payload } as never),
      })
      await expect(attempt).rejects.toBeInstanceOf(ValidationError)
      await attempt.catch((error: ValidationError) => {
        expect(error.data.errors[0]).toMatchObject({
          path: 'status',
          message:
            'Store staff move an order one step forward only: from “Paid” the next step is “Processing”. Hand it back with a reason if something is wrong.',
        })
      })
    })

    it('refuses “on the way” until the driver’s details are uploaded', async () => {
      const id = await order('waiting_driver')
      const refused = await stack.rest('PATCH', `/api/orders/${id}`, {
        as: 'store',
        json: { status: 'on_the_way' },
      })
      expect(fieldError(refused)?.message).toMatch(/^Upload the driver’s details/)
      // The server's upload route records them (with access overridden); then the step is theirs.
      await stack.payload.update({
        collection: 'orders',
        id,
        data: { driverImage: { key: `orders/${id}/driver.webp` } } as never,
      })
      const moved = await stack.rest('PATCH', `/api/orders/${id}`, {
        as: 'store',
        json: { status: 'on_the_way' },
      })
      expect(moved.status).toBe(200)
    })

    it('lets an editor cancel, step back once, and never reopen a cancelled order', async () => {
      const id = await order('waiting_driver')
      const back = await stack.rest('PATCH', `/api/orders/${id}`, {
        as: 'editor',
        json: { status: 'processing' },
      })
      expect(back.status).toBe(200)
      expect(
        (
          await stack.rest('PATCH', `/api/orders/${id}`, {
            as: 'editor',
            json: { status: 'cancelled' },
          })
        ).status,
      ).toBe(200)
      const reopened = await stack.rest('PATCH', `/api/orders/${id}`, {
        as: 'owner',
        json: { status: 'paid' },
      })
      expect(fieldError(reopened)?.message).toMatch(/^An order cannot move from “Cancelled”/)
    })

    it('leaves the server’s own moves alone (no signed-in user): payment and expiry', async () => {
      const id = await order('pending_payment')
      await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
      expect((await stored(id)).status).toBe('paid')
    })
  })

  describe('role and store changes (3.5.d, SECURITY.md R7)', () => {
    type Change = {
      by: number | null
      fromRole: string | null
      toRole: string
      fromStore: number | null
      toStore: number | null
    }
    const changes = async (id: number) =>
      (
        (await stack.payload.findByID({ collection: 'users', id, depth: 0 })) as unknown as {
          accessChanges?: Change[]
        }
      ).accessChanges ?? []

    it('records each account’s first role and store', async () => {
      expect(await changes(stack.users.store.id)).toMatchObject([
        { by: null, fromRole: null, toRole: 'store', fromStore: null, toStore: stack.stores[0].id },
      ])
      expect(await changes(stack.users.editor.id)).toMatchObject([
        { toRole: 'editor', toStore: null },
      ])
    })

    it('records the owner moving a store user to another store, and to editor', async () => {
      const { id } = await stack.payload.create({
        collection: 'users',
        data: {
          email: 'mover@migrated.test',
          password: 'mover-password-12345',
          name: 'Mover',
          role: 'store',
          store: stack.stores[0].id,
        } as never,
      })
      const moved = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { store: stack.stores[1].id },
      })
      expect(moved.status).toBe(200)
      const promoted = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { role: 'editor' },
      })
      expect(promoted.status).toBe(200)
      const renamed = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { name: 'Mover B' },
      })
      expect(renamed.status).toBe(200)
      const owner = stack.users.owner.id
      expect(await changes(id as number)).toMatchObject([
        { by: null, toRole: 'store', toStore: stack.stores[0].id },
        {
          by: owner,
          fromRole: 'store',
          toRole: 'store',
          fromStore: stack.stores[0].id,
          toStore: stack.stores[1].id,
        },
        // The store rule clears a non-store role's store; the record says so.
        {
          by: owner,
          fromRole: 'store',
          toRole: 'editor',
          fromStore: stack.stores[1].id,
          toStore: null,
        },
      ])
      // The owner reads the record over REST.
      const read = await stack.rest('GET', `/api/users/${id}`, { as: 'owner' })
      expect(read.body?.accessChanges).toHaveLength(3)
    })

    it('keeps an editor’s and a store user’s own role and store over REST, recording nothing', async () => {
      for (const as of ['editor', 'store'] as const) {
        const { id } = stack.users[as]
        const before = await stack.payload.findByID({ collection: 'users', id, depth: 0 })
        const recorded = (await changes(id)).length
        const sent = await stack.rest('PATCH', `/api/users/${id}`, {
          as,
          json: {
            role: 'owner',
            store: stack.stores[1].id,
            accessChanges: [],
            name: `${as} again`,
          },
        })
        expect(sent.status, as).toBe(200)
        const after = await stack.payload.findByID({ collection: 'users', id, depth: 0 })
        expect([after.role, after.store], as).toEqual([before.role, before.store])
        expect(after.name).toBe(`${as} again`)
        expect(await changes(id), as).toHaveLength(recorded)
        // Their own account, read back, shows none of its record (Payload answers an array it
        // may not read with an empty one).
        expect(recorded, as).toBeGreaterThan(0)
        const self = await stack.rest('GET', `/api/users/${id}`, { as })
        expect(self.body?.accessChanges ?? [], as).toEqual([])
      }
    })
  })

  describe('the admin’s locks (3.5.d)', () => {
    const lock = async (holder: 'editor' | 'store', orderId: number) =>
      (await stack.payload.db.create({
        collection: 'payload-locked-documents',
        data: {
          document: { relationTo: 'orders', value: orderId },
          user: { relationTo: 'users', value: stack.users[holder].id },
        },
      })) as { id: number }

    it('lets store staff list and release their own locks, and no one else’s', async () => {
      const editors = await lock('editor', await order())
      const mine = await lock('store', await order())
      const list = await stack.rest('GET', '/api/payload-locked-documents?depth=0', { as: 'store' })
      expect(idsOf(list)).toEqual([mine.id])
      expect(
        idsOf(await stack.rest('GET', '/api/payload-locked-documents', { as: 'editor' })).sort(),
      ).toEqual([editors.id, mine.id].sort())
      const theirs = await stack.rest('DELETE', `/api/payload-locked-documents/${editors.id}`, {
        as: 'store',
      })
      expect(theirs.status).toBe(403)
      expect(
        (
          await stack.rest('PATCH', `/api/payload-locked-documents/${mine.id}`, {
            as: 'store',
            json: { user: { relationTo: 'users', value: stack.users.owner.id } },
          })
        ).status,
      ).toBe(403)
      expect(
        (
          await stack.rest('POST', '/api/payload-locked-documents', {
            as: 'store',
            json: {
              globalSlug: 'site-settings',
              user: { relationTo: 'users', value: stack.users.store.id },
            },
          })
        ).status,
      ).toBe(403)
      expect(
        (await stack.rest('DELETE', `/api/payload-locked-documents/${mine.id}`, { as: 'store' }))
          .status,
      ).toBe(200)
      expect(
        idsOf(await stack.rest('GET', '/api/payload-locked-documents', { as: 'owner' })),
      ).toEqual([editors.id])
    })
  })

  describe('the migration’s hand-written SQL (3.5.a)', () => {
    it('refuses UPDATE, DELETE and TRUNCATE of the payment ledger, for any session', async () => {
      const event = await stack.payload.create({
        collection: 'payment-events',
        data: {
          dedupeKey: 'b'.repeat(64),
          source: 'simulate',
          grossAmount: 205000,
          receivedAt: new Date().toISOString(),
        } as never,
      })
      for (const statement of [
        `UPDATE payment_events SET outcome = 'tidied' WHERE id = ${event.id}`,
        `DELETE FROM payment_events WHERE id = ${event.id}`,
        // CASCADE: a plain TRUNCATE is refused sooner, for the locks table's foreign key.
        'TRUNCATE payment_events CASCADE',
      ]) {
        await expect(stack.pool.query(statement), statement).rejects.toMatchObject({
          code: '23001',
          message: expect.stringMatching(/^payment_events is append-only/),
        })
      }
      const left = await stack.pool.query('SELECT count(*)::int AS n FROM payment_events')
      expect(left.rows[0]!.n).toBe(1)
    })

    it('numbers orders from orders_number_seq, starting at 100001, owned by the column', async () => {
      const first = await stack.pool.query(`SELECT nextval('orders_number_seq')::int AS n`)
      expect(first.rows[0]!.n).toBe(100001)
      const owner = await stack.pool.query(
        `SELECT d.refobjid::regclass::text AS tbl, a.attname AS col
           FROM pg_depend d JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
          WHERE d.objid = 'orders_number_seq'::regclass AND d.deptype = 'a'`,
      )
      expect(owner.rows).toEqual([{ tbl: 'orders', col: 'number' }])
    })
  })
})
