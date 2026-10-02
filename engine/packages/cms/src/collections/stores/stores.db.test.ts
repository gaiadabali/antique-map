/**
 * `stores` access on a real Postgres, over REST through Payload's own handler (senior-be review of
 * 2.4): a store user lists, counts and fetches their own store alone — another store's id is not
 * found, so its existence is not confirmed either; an editor reads every store; only the owner
 * creates, updates or deletes one; the public reads active, listed stores alone, without their
 * code, WhatsApp or notes (TASKS.md 3.3.b). An active store has its address and pin, inside
 * Indonesia — the database's rule too. A store a staff account, a stock row or an order still
 * points at cannot be deleted, by the hook's plain refusal or, on any other path, by the database
 * (TASKS.md 3.3.d). Without `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { refusedWith } from '../places/pushed-database.test-support'
import { makeOrder, makeProduct, sqlError } from '../stock-levels/shop.test-support'
import { server, startStaffStack, type StaffStack } from '../users/staff.test-support'

describe.skipIf(!server)('stores, by role, on a real database', () => {
  let stack: StaffStack
  let own: number
  let other: number

  beforeAll(async () => {
    stack = await startStaffStack('cms_stores_access_test', (config, key) =>
      getPayload({ config, key }),
    )
    own = stack.stores[0].id
    other = stack.stores[1].id
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const codes = (body: Record<string, unknown> | null) =>
    ((body?.docs ?? []) as Array<{ code: string }>).map((doc) => doc.code).sort()

  it('lists, counts and fetches a store user’s own store alone', async () => {
    const list = await stack.rest('GET', '/api/stores?depth=0', { as: 'store' })
    expect(list.status).toBe(200)
    expect(codes(list.body)).toEqual(['UBD-01'])
    expect(list.body?.totalDocs).toBe(1)
    expect((await stack.rest('GET', '/api/stores/count', { as: 'store' })).body).toEqual({
      totalDocs: 1,
    })
    expect((await stack.rest('GET', `/api/stores/${own}`, { as: 'store' })).status).toBe(200)
    expect((await stack.rest('GET', `/api/stores/${other}`, { as: 'store' })).status).toBe(404)
    // A where naming the other store finds nothing: the scope is ANDed into every query.
    const asked = await stack.rest('GET', `/api/stores?where[id][equals]=${other}`, { as: 'store' })
    expect(codes(asked.body)).toEqual([])
  })

  it('shows an editor and the owner every store, and the public no store not yet taking orders', async () => {
    for (const as of ['editor', 'owner'] as const) {
      expect(codes((await stack.rest('GET', '/api/stores?depth=0', { as })).body)).toEqual([
        'SNR-01',
        'UBD-01',
      ])
    }
    // Both test stores are new: inactive, so not public.
    const publicList = await stack.rest('GET', '/api/stores')
    expect(publicList.status).toBe(200)
    expect(publicList.body?.docs).toEqual([])
  })

  it('lets no editor or store user create, update or delete a store — their own included', async () => {
    for (const as of ['editor', 'store'] as const) {
      const made = await stack.rest('POST', '/api/stores', {
        as,
        json: { code: `X-${as}`, name: 'Nope' },
      })
      expect(made.status, `create as ${as}`).toBe(403)
      for (const id of [own, other]) {
        const renamed = await stack.rest('PATCH', `/api/stores/${id}`, {
          as,
          json: { name: 'Renamed' },
        })
        expect(renamed.status, `update ${id} as ${as}`).toBe(403)
        expect((await stack.rest('DELETE', `/api/stores/${id}`, { as })).status).toBe(403)
      }
    }
    const { docs } = await stack.payload.find({ collection: 'stores', depth: 0, sort: 'code' })
    expect(docs.map((doc) => [doc.code, doc.name])).toEqual([
      ['SNR-01', 'Sanur'],
      ['UBD-01', 'Ubud'],
    ])
  })

  it('lets the owner create, update and delete one', async () => {
    const made = await stack.rest('POST', '/api/stores', {
      as: 'owner',
      json: { code: 'KUT-01', name: 'Kuta' },
    })
    expect(made.status).toBe(201)
    const id = (made.body?.doc as { id: number }).id
    expect(
      (
        await stack.rest('PATCH', `/api/stores/${id}`, {
          as: 'owner',
          json: { name: 'Kuta Beach' },
        })
      ).status,
    ).toBe(200)
    expect((await stack.rest('DELETE', `/api/stores/${id}`, { as: 'owner' })).status).toBe(200)
  })

  it('takes orders only with an address and a pin inside Indonesia — the database agrees', async () => {
    const errors = await refusedWith(() =>
      stack.payload.create({
        collection: 'stores',
        data: { code: 'GNY-01', name: 'Gianyar', active: true },
      }),
    )
    expect(Object.keys(errors).sort()).toEqual(['address', 'lat', 'lng'])
    const swapped = await refusedWith(() =>
      stack.payload.create({
        collection: 'stores',
        data: { code: 'GNY-01', name: 'Gianyar', lat: 115.3, lng: -8.5 },
      }),
    )
    expect(swapped.lat).toMatch(/outside Indonesia/)
    for (const [values, constraint] of [
      [`'X-1', 'X', true, NULL, NULL, NULL`, 'stores_active_has_address_and_pin'],
      [`'X-2', 'X', true, '  ', -8.5, 115.2`, 'stores_active_has_address_and_pin'],
      [`'X-3', 'X', false, NULL, 40.7, -74.0`, 'stores_pin_in_indonesia'],
    ] as const) {
      const error = await sqlError(
        stack.pool,
        `INSERT INTO stores (code, name, active, address, lat, lng) VALUES (${values})`,
      )
      expect(error?.constraint, values).toBe(constraint)
    }
  })

  it('shows the public an active, listed store — without its code, WhatsApp or notes', async () => {
    const data = {
      code: 'SKW-01',
      name: 'Sukawati',
      area: 'Gianyar',
      address: 'Jl. Raya Sukawati 9',
      lat: -8.596,
      lng: 115.283,
      whatsapp: '+6281111111111',
      notes: 'Key under the mat',
      active: true,
    }
    await stack.payload.create({ collection: 'stores', data })
    await stack.payload.create({
      collection: 'stores',
      data: { ...data, code: 'SKW-02', listed: false },
    })
    const list = await stack.rest('GET', '/api/stores?depth=0')
    const docs = list.body?.docs as Array<Record<string, unknown>>
    expect(docs.map((doc) => doc.name)).toEqual(['Sukawati'])
    expect(docs[0]).toMatchObject({ area: 'Gianyar', lat: -8.596, lng: 115.283 })
    for (const hidden of ['code', 'whatsapp', 'notes']) expect(docs[0]).not.toHaveProperty(hidden)
  })

  it('refuses to delete a store staff, stock or orders still point at — on every path', async () => {
    // UBD-01 has the store user.
    const staffed = await stack.rest('DELETE', `/api/stores/${own}`, { as: 'owner' })
    expect(staffed.status).toBe(409)
    expect(JSON.stringify(staffed.body)).toMatch(/still has 1 staff account\./)
    const raw = await sqlError(stack.pool, `DELETE FROM stores WHERE id = ${own}`)
    expect(raw?.constraint).toBe('users_store_staff_have_a_store')

    // SNR-01 has no staff: a stock row and an order hold it instead.
    const product = await makeProduct(stack.payload, 'OEI-CARD')
    await stack.payload.create({
      collection: 'stock-levels',
      data: { store: other, product: product.id, quantity: 4 },
    })
    await makeOrder(stack.payload, { store: other, product: product.id, qty: 1 })
    const stocked = await stack.rest('DELETE', `/api/stores/${other}`, { as: 'owner' })
    expect(stocked.status).toBe(409)
    expect(JSON.stringify(stocked.body)).toMatch(/still has 1 stock row and 1 order\./)
    expect((await sqlError(stack.pool, `DELETE FROM stores WHERE id = ${other}`))?.code).toBe(
      '23502',
    )
    const { rows } = await stack.pool.query(`SELECT count(*)::int AS n FROM stores`)
    expect(rows[0]!.n).toBeGreaterThanOrEqual(2)
  }, 60_000)
})
