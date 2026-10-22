/**
 * What staff change on their own account, on a real Postgres over REST (senior-be review of 2.4):
 * an editor and a store user may rename themselves, but a PATCH of their own `role` or `store`
 * leaves the stored values as they were (owner-only field access), and a new email is refused
 * (`./self-edit`). The owner changes all three. Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from './staff.test-support'

describe.skipIf(!server)('staff editing themselves, on a real database', () => {
  let stack: StaffStack

  beforeAll(async () => {
    stack = await startStaffStack('cms_users_self_test', (config, key) =>
      getPayload({ config, key }),
    )
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  const stored = async (id: number) =>
    (await stack.payload.findByID({ collection: 'users', id, depth: 0 })) as unknown as {
      name: string
      email: string
      role: string
      store: number | null
    }

  it('keeps an editor’s and a store user’s own role and store, whatever they send', async () => {
    const other = stack.stores[1].id
    for (const as of ['editor', 'store'] as const) {
      const { id } = stack.users[as]
      const before = await stored(id)
      const sent = await stack.rest('PATCH', `/api/users/${id}`, {
        as,
        json: { role: 'owner', store: other, name: `${as} renamed` },
      })
      expect(sent.status, as).toBe(200)
      const after = await stored(id)
      expect(after.role, as).toBe(before.role)
      expect(after.store, as).toBe(before.store)
      expect(after.name, as).toBe(`${as} renamed`)
    }
  })

  it('refuses an editor’s or a store user’s new email, and keeps the old one', async () => {
    for (const as of ['editor', 'store'] as const) {
      const { id } = stack.users[as]
      const sent = await stack.rest('PATCH', `/api/users/${id}`, {
        as,
        json: { email: `${as}@elsewhere.test` },
      })
      expect(sent.status, as).toBe(400)
      expect(JSON.stringify(sent.body), as).toMatch(/Only the owner changes/)
      expect((await stored(id)).email, as).toBe(`${as}@staff.test`)
    }
  })

  it('lets the owner change another user’s email, role and store', async () => {
    const { id } = stack.users.store
    const sent = await stack.rest('PATCH', `/api/users/${id}`, {
      as: 'owner',
      json: { email: 'store-moved@staff.test', store: stack.stores[1].id },
    })
    expect(sent.status).toBe(200)
    expect(await stored(id)).toMatchObject({
      email: 'store-moved@staff.test',
      role: 'store',
      store: stack.stores[1].id,
    })
  })
})
