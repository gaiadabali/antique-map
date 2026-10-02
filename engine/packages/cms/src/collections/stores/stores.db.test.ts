/**
 * `stores` access on a real Postgres, over REST through Payload's own handler (senior-be review of
 * 2.4): a store user lists, counts and fetches their own store alone — another store's id is not
 * found, so its existence is not confirmed either; an editor reads every store; only the owner
 * creates, updates or deletes one. Without `CMS_TEST_POSTGRES_URL` it skips — a setup state.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

  it('shows an editor and the owner every store, and the public none', async () => {
    for (const as of ['editor', 'owner'] as const) {
      expect(codes((await stack.rest('GET', '/api/stores?depth=0', { as })).body)).toEqual([
        'SNR-01',
        'UBD-01',
      ])
    }
    expect((await stack.rest('GET', '/api/stores')).status).toBe(403)
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
})
