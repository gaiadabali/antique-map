/**
 * The owner's staff work on a real Postgres over REST (TASKS.md 27.6.c): the owner adds a store
 * user with a password of the owner's choosing, who then signs in; the owner resets a person's
 * password by typing a new one; an account switched off is signed out at once, cannot sign in,
 * and reaches nothing; nobody switches off their own account, and only the owner switches anyone.
 * Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from './staff.test-support'

const NEW_PASSWORD = 'a-new-staff-password-27'

describe.skipIf(!server)(
  'the owner adding, resetting and switching off staff',
  { timeout: 30_000 },
  () => {
    let stack: StaffStack

    beforeAll(async () => {
      stack = await startStaffStack('cms_users_accounts_test', (config, key) =>
        getPayload({ config, key }),
      )
    }, 180_000)
    afterAll(() => stack?.stop(), 60_000)

    const login = (email: string, password: string) =>
      stack.rest('POST', '/api/users/login', { json: { email, password } })

    it('adds a store user with the owner’s password, who signs in to their store alone', async () => {
      const added = await stack.rest('POST', '/api/users', {
        as: 'owner',
        json: {
          name: 'Made',
          email: 'made@staff.test',
          password: NEW_PASSWORD,
          role: 'store',
          store: stack.stores[1].id,
        },
      })
      expect(added.status).toBe(201)
      const doc = (added.body as { doc: { active: boolean; role: string } }).doc
      expect(doc).toMatchObject({ active: true, role: 'store' })
      const signed = await login('made@staff.test', NEW_PASSWORD)
      expect(signed.status).toBe(200)
      expect((signed.body as { user: { store: { id: number } } }).user.store.id).toBe(
        stack.stores[1].id,
      )
    })

    it('lets the owner reset a person’s password by typing a new one; nobody else', async () => {
      const { id } = stack.users.editor
      const refused = await stack.rest('PATCH', `/api/users/${stack.users.store.id}`, {
        as: 'editor',
        json: { password: 'editor-sets-this-one-1' },
      })
      expect(refused.status).toBe(403)
      const reset = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { password: NEW_PASSWORD },
      })
      expect(reset.status).toBe(200)
      expect((await login('editor@staff.test', NEW_PASSWORD)).status).toBe(200)
    })

    it('refuses a switch-off by anyone but the owner, and the owner’s of their own account', async () => {
      const editor = await stack.rest('PATCH', `/api/users/${stack.users.store.id}`, {
        as: 'editor',
        json: { active: false },
      })
      expect(editor.status).toBe(403)
      const self = await stack.rest('PATCH', `/api/users/${stack.users.owner.id}`, {
        as: 'owner',
        json: { active: false },
      })
      expect(self.status).toBe(400)
      expect(JSON.stringify(self.body)).toMatch(/your own account/)
    })

    it('signs a switched-off account out, refuses its sign-in, and lets it back when on', async () => {
      const { id } = stack.users.store
      expect((await stack.rest('GET', '/api/orders', { as: 'store' })).status).toBe(200)
      const off = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { active: false },
      })
      expect(off.status).toBe(200)
      // The session it held is gone: the same token is nobody now.
      const me = await stack.rest('GET', '/api/users/me', { as: 'store' })
      expect((me.body as { user: unknown }).user ?? null).toBeNull()
      expect((await stack.rest('GET', '/api/orders', { as: 'store' })).status).toBe(403)
      const refused = await login('store@staff.test', 'staff-db-test-password-1')
      expect(refused.status).toBe(401)
      expect(JSON.stringify(refused.body)).toMatch(/switched off/)

      const on = await stack.rest('PATCH', `/api/users/${id}`, {
        as: 'owner',
        json: { active: true },
      })
      expect(on.status).toBe(200)
      expect((await login('store@staff.test', 'staff-db-test-password-1')).status).toBe(200)
    })
  },
)
