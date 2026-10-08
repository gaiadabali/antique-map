/**
 * Field access and authentication, on a real Postgres over REST (TASKS.md 10.1.a; SECURITY.md
 * A1–A7, R3, R5–R7, B4, B5): what the table in §2.2 says about single fields (the owner's asking
 * price and acquisition, the staff-only `physical`), the sign-in rules (lockout, session end, one
 * answer to forgot-password, the last owner), and the browser rules that Payload itself enforces
 * (CSRF on a cookie-authenticated request, CORS, GraphQL off).
 *
 * A check that fails today because the control is missing is written as `it.fails` and carries its
 * finding id (docs/gates/security.md): the suite stays green while the defect stands, and Vitest
 * fails the file the day the control lands, so the `.fails` is taken off then.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ADMIN_ORIGIN, PASSWORD, server, startSecurityStack, type SecurityStack } from './support/stack'

const idOf = (doc: Record<string, unknown> | null) => (doc as { doc?: { id: number } }).doc?.id

describe.skipIf(!server)('fields and authentication, on a real database', () => {
  let stack: SecurityStack

  beforeAll(async () => {
    stack = await startSecurityStack('security_auth')
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const work = () => stack.work.published.id
  const read = (as: Parameters<SecurityStack['rest']>[2] extends infer T ? (T extends { as?: infer W } ? W : never) : never) =>
    stack.rest('GET', `/api/works/${work()}?depth=0`, { as })
  /** The work as the Local API reads it with access overridden: the truth under the REST filter. */
  const truth = () =>
    stack.api.findByID({ collection: 'works', id: work(), depth: 0, overrideAccess: true })

  describe('fields (§2.2: works.askingPrice, physical, acquisition)', () => {
    it('the asking price is the owner’s alone to read', async () => {
      expect((await read('owner')).body).toMatchObject({ askingPrice: 18_000 })
      expect((await read('editor')).body).not.toHaveProperty('askingPrice')
      expect((await read('anonymous')).body).not.toHaveProperty('askingPrice')
      expect([401, 403]).toContain((await read('storeA')).status)
    })

    it('an editor’s write of the asking price or the acquisition cost changes nothing, while the title and the export status land', async () => {
      const editor = { ...stack.users.editor, collection: 'users' }
      type Now = {
        title: string
        askingPrice?: number
        physical?: { exportStatus?: string; acquisition?: { cost?: { amount?: number } } }
      }
      // Through REST (the cache hook of a committed save needs a request scope this harness lacks,
      // so the answer may be a 500 after the write: the stored row is what is judged).
      await stack.rest('PATCH', `/api/works/${work()}`, {
        as: 'editor',
        json: { askingPrice: 1, physical: { acquisition: { cost: { amount: 1, currency: 'USD' } } } },
      })
      // Through the Local API as the editor, access enforced: a control write that must land
      // (so the proof below is not vacuous) beside the forbidden ones that must not.
      await stack.api.update({
        collection: 'works',
        id: work(),
        user: editor,
        overrideAccess: false,
        data: {
          title: 'Edited by the editor',
          askingPrice: 1,
          physical: { exportStatus: 'permit-pending', acquisition: { cost: { amount: 1, currency: 'USD' } } },
        },
      })
      const now = (await truth()) as Now
      expect(now.title, 'the editor’s allowed write landed').toBe('Edited by the editor')
      expect(now.physical?.exportStatus).toBe('permit-pending')
      expect(now.askingPrice).toBe(18_000)
      expect(now.physical?.acquisition?.cost?.amount).toBe(1_500_000)
    })

    it('`physical` is the owner’s and the editors’; the acquisition is the owner’s alone', async () => {
      const owner = (await read('owner')).body as { physical?: Record<string, unknown> }
      expect(owner.physical).toHaveProperty('acquisition')
      const editor = (await read('editor')).body as { physical?: Record<string, unknown> }
      expect(editor.physical).toHaveProperty('exportStatus')
      expect(editor.physical).not.toHaveProperty('acquisition')
      expect((await read('anonymous')).body).not.toHaveProperty('physical')
    })

    it('a draft is a 404 to the public, and the version history is staff only', async () => {
      const id = stack.work.draft.id
      expect((await stack.rest('GET', `/api/works/${id}`)).status).toBe(404)
      expect([401, 403]).toContain((await stack.rest('GET', '/api/works/versions')).status)
      expect([401, 403]).toContain(
        (await stack.rest('GET', '/api/works/versions', { as: 'storeA' })).status,
      )
      expect((await stack.rest('GET', '/api/works/versions', { as: 'editor' })).status).toBe(200)
    })
  })

  describe('users (R7, A7): roles and the store are the owner’s to change', () => {
    const own = (who: 'editor' | 'storeA') => stack.users[who].id
    const userNow = async (id: number) =>
      (await stack.api.findByID({ collection: 'users', id, depth: 0, overrideAccess: true })) as {
        role?: string
        store?: number | { id: number } | null
      }

    it('a store user cannot make themselves an owner or move themselves to another store', async () => {
      await stack.rest('PATCH', `/api/users/${own('storeA')}`, {
        as: 'storeA',
        json: { role: 'owner', store: stack.stores.B.id },
      })
      const now = await userNow(own('storeA'))
      expect(now.role).toBe('store')
      const store = typeof now.store === 'object' ? now.store?.id : now.store
      expect(store).toBe(stack.stores.A.id)
    })

    it('an editor cannot make themselves an owner', async () => {
      await stack.rest('PATCH', `/api/users/${own('editor')}`, { as: 'editor', json: { role: 'owner' } })
      expect((await userNow(own('editor'))).role).toBe('editor')
    })

    it('the last owner can neither lose the role nor be deleted (A7)', async () => {
      const owner = stack.users.owner.id
      await stack.rest('PATCH', `/api/users/${owner}`, { as: 'owner', json: { role: 'editor' } })
      expect((await userNow(owner)).role).toBe('owner')
      await stack.rest('DELETE', `/api/users/${owner}`, { as: 'owner' })
      expect((await userNow(owner)).role).toBe('owner')
    })

    it('records a role or store change the owner makes: who, when, from, to — and shows it to the owner alone (R7)', async () => {
      const target = stack.seeded.users!.id
      const before = (await stack.api.findByID({ collection: 'users', id: target, depth: 0, overrideAccess: true })) as {
        accessChanges?: unknown[]
      }
      const was = before.accessChanges?.length ?? 0
      const changed = await stack.rest('PATCH', `/api/users/${target}`, {
        as: 'owner',
        json: { store: stack.stores.A.id },
      })
      expect(changed.status).toBe(200)
      const asOwner = await stack.rest('GET', `/api/users/${target}?depth=0`, { as: 'owner' })
      const history = (asOwner.body as { accessChanges?: Array<Record<string, unknown>> }).accessChanges ?? []
      expect(history.length).toBe(was + 1)
      expect(history.at(-1)).toMatchObject({ by: stack.users.owner.id })
      expect(history.at(-1)).toHaveProperty('at')
      // The editor's own account was recorded when it was made (the owner sees that row), yet an
      // editor reading it gets no history: Payload answers a hidden array as an empty one.
      const editorId = stack.users.editor.id
      const seenByOwner = await stack.rest('GET', `/api/users/${editorId}?depth=0`, { as: 'owner' })
      expect(((seenByOwner.body as { accessChanges?: unknown[] }).accessChanges ?? []).length).toBeGreaterThan(0)
      const seenByEditor = await stack.rest('GET', `/api/users/${editorId}?depth=0`, { as: 'editor' })
      expect((seenByEditor.body as { accessChanges?: unknown[] }).accessChanges ?? []).toEqual([])
    })

    it('only `users` sign in, with the three roles of the table (A1)', () => {
      const withAuth = stack.config.collections.filter((collection) => collection.auth).map((c) => c.slug)
      expect(withAuth).toEqual(['users'])
      const role = stack.config.collections
        .find((collection) => collection.slug === 'users')!
        .fields.find((field) => 'name' in field && field.name === 'role') as { options?: Array<{ value: string }> }
      expect(role.options?.map((option) => option.value).sort()).toEqual(['editor', 'owner', 'store'])
    })
  })

  describe('sign-in (A3–A6)', () => {
    const make = async (name: string) => {
      const email = `${name}@security.test`
      await stack.api.create({
        collection: 'users',
        data: { email, password: PASSWORD, name, role: 'editor' },
      })
      return email
    }
    const login = (email: string, password: string) =>
      stack.rest('POST', '/api/users/login', { json: { email, password } })

    it('locks an account after 5 failed sign-ins, even for the right password; only the owner unlocks it (A3)', async () => {
      const email = await make('lockout')
      for (let attempt = 1; attempt <= 5; attempt += 1) {
        expect((await login(email, `wrong-password-${attempt}`)).status).toBe(401)
      }
      const locked = await login(email, PASSWORD)
      expect(locked.status).toBe(401)
      expect(locked.body).not.toHaveProperty('token')
      // Another account is not affected by it.
      expect((await login(stack.users.editor.email as string, PASSWORD)).status).toBe(200)

      const byEditor = await stack.rest('POST', '/api/users/unlock', { as: 'editor', json: { email } })
      expect([401, 403]).toContain(byEditor.status)
      expect((await login(email, PASSWORD)).status).toBe(401)

      const byOwner = await stack.rest('POST', '/api/users/unlock', { as: 'owner', json: { email } })
      expect(byOwner.status).toBe(200)
      expect((await login(email, PASSWORD)).status).toBe(200)
    })

    it('forgot-password answers the same for an address that exists and one that does not (A4)', async () => {
      const known = await stack.rest('POST', '/api/users/forgot-password', {
        json: { email: stack.users.editor.email },
      })
      const unknown = await stack.rest('POST', '/api/users/forgot-password', {
        json: { email: 'nobody-at-all@security.test' },
      })
      expect(unknown.status).toBe(known.status)
      expect(unknown.body).toEqual(known.body)
    })

    it('a session ends when the user signs out, and when the owner removes the user (A5)', async () => {
      const email = await make('session')
      const first = await login(email, PASSWORD)
      const token = first.body!.token as string
      const me = (as: string) => stack.rest('GET', '/api/users/me', { token: as })
      expect((await me(token)).body).toMatchObject({ user: { email } })
      expect((await stack.rest('POST', '/api/users/logout', { token })).status).toBe(200)
      expect((await me(token)).body).toMatchObject({ user: null })

      const second = await login(email, PASSWORD)
      const doomed = second.body!.token as string
      const id = (second.body as { user: { id: number } }).user.id
      expect((await me(doomed)).body).toMatchObject({ user: { email } })
      await stack.api.delete({ collection: 'users', id, overrideAccess: true })
      expect((await me(doomed)).body).toMatchObject({ user: null })
    })

    it('the session cookie is HttpOnly and SameSite=Lax, scoped to no other domain (A5)', async () => {
      const reply = await login(stack.users.editor.email as string, PASSWORD)
      const cookie = reply.cookies.find((line) => line.startsWith('payload-token='))
      expect(cookie, 'a session cookie is set').toBeDefined()
      expect(cookie).toMatch(/HttpOnly/i)
      expect(cookie).toMatch(/SameSite=Lax/i)
      expect(cookie).not.toMatch(/Domain=/i)
    })

    it('a password-reset token expires within the hour and works once (A6)', async () => {
      const email = await make('resetter')
      expect((await stack.rest('POST', '/api/users/forgot-password', { json: { email } })).status).toBe(200)
      const row = (
        await stack.pool.query(
          `SELECT reset_password_token AS token, reset_password_expiration AS expires FROM users WHERE email = '${email}'`,
        )
      ).rows[0] as { token: string; expires: Date }
      expect(row.token).toMatch(/^[0-9a-f]{40}$/)
      const lifetime = new Date(row.expires).getTime() - Date.now()
      expect(lifetime).toBeGreaterThan(0)
      expect(lifetime).toBeLessThanOrEqual(60 * 60 * 1000)

      const fresh = 'a-new-password-for-the-test-1'
      const used = await stack.rest('POST', '/api/users/reset-password', { json: { token: row.token, password: fresh } })
      expect(used.status).toBe(200)
      expect((await login(email, fresh)).status).toBe(200)
      const again = await stack.rest('POST', '/api/users/reset-password', {
        json: { token: row.token, password: 'another-password-for-the-test-2' },
      })
      expect(again.status).toBeGreaterThanOrEqual(400)
      expect((await login(email, 'another-password-for-the-test-2')).status).toBe(401)
    })

    it('an expired reset token is refused (A6)', async () => {
      const email = await make('expired')
      await stack.rest('POST', '/api/users/forgot-password', { json: { email } })
      await stack.pool.query(`UPDATE users SET reset_password_expiration = now() - interval '1 minute' WHERE email = '${email}'`)
      const token = ((await stack.pool.query(`SELECT reset_password_token AS t FROM users WHERE email = '${email}'`)).rows[0] as { t: string }).t
      const reply = await stack.rest('POST', '/api/users/reset-password', {
        json: { token, password: 'a-new-password-for-the-test-3' },
      })
      expect(reply.status).toBeGreaterThanOrEqual(400)
      expect((await login(email, 'a-new-password-for-the-test-3')).status).toBe(401)
    })

    it('a session token lives at most 8 hours (A6)', async () => {
      const reply = await login(stack.users.editor.email as string, PASSWORD)
      const [, body] = (reply.body!.token as string).split('.')
      const claims = JSON.parse(Buffer.from(body!, 'base64url').toString()) as {
        iat: number
        exp: number
      }
      expect(claims.exp - claims.iat).toBeLessThanOrEqual(8 * 3600)
      expect(claims.exp - claims.iat).toBeGreaterThan(0)
      // Recorded for docs/gates/security.md: the lifetime the config really sets.
      console.info(`[security] session token lifetime: ${claims.exp - claims.iat} s`)
    })

    // FINDING F-03 (docs/gates/security.md): no password policy exists, so A2 does not hold.
    it.fails('refuses a password shorter than 12 characters on create (A2)', async () => {
      const reply = await stack.rest('POST', '/api/users', {
        as: 'owner',
        json: { email: 'weak@security.test', password: 'short', name: 'Weak', role: 'editor' },
      })
      expect(reply.status).toBe(400)
    })
    it.fails('refuses a common password on create (A2)', async () => {
      const reply = await stack.rest('POST', '/api/users', {
        as: 'owner',
        json: { email: 'common@security.test', password: 'password1234', name: 'Common', role: 'editor' },
      })
      expect(reply.status).toBe(400)
    })
  })

  describe('browser rules Payload enforces (B4, B5, R6)', () => {
    const cookieFor = async () => {
      const reply = await stack.rest('POST', '/api/users/login', {
        json: { email: stack.users.editor.email, password: PASSWORD },
      })
      return reply.cookies.find((line) => line.startsWith('payload-token='))!.split(';')[0]!
    }

    it('a cookie signs a request in only from the admin origin (CSRF, B4)', async () => {
      const cookie = await cookieFor()
      const me = (origin?: string) =>
        stack.rest('GET', '/api/users/me', {
          headers: { cookie, ...(origin ? { origin } : {}) },
        })
      expect((await me(ADMIN_ORIGIN)).body).toMatchObject({ user: { role: 'editor' } })
      expect((await me('https://evil.example')).body).toMatchObject({ user: null })
      expect((await me('http://gallery.localhost:4170')).body).toMatchObject({ user: null })
    })

    it('a cookie-authenticated write from a foreign origin changes nothing (B4)', async () => {
      const cookie = await cookieFor()
      const reply = await stack.rest('PATCH', `/api/works/${work()}`, {
        headers: { cookie, origin: 'https://evil.example' },
        json: { title: 'Defaced' },
      })
      expect([401, 403]).toContain(reply.status)
      expect(((await truth()) as { title: string }).title).not.toBe('Defaced')
    })

    it('answers CORS to the admin origin only (B5)', async () => {
      const allowed = await stack.rest('GET', '/api/works?limit=1', {
        headers: { origin: ADMIN_ORIGIN },
      })
      expect(allowed.headers.get('access-control-allow-origin')).toBe(ADMIN_ORIGIN)
      for (const origin of ['https://evil.example', 'http://gallery.localhost:4170', 'null']) {
        const other = await stack.rest('GET', '/api/works?limit=1', { headers: { origin } })
        expect(other.headers.get('access-control-allow-origin'), origin).toBeNull()
      }
    })

    it('GraphQL is off (R6)', async () => {
      for (const route of ['/api/graphql', '/api/graphql-playground']) {
        expect((await stack.rest('POST', route, { as: 'owner', json: { query: '{ Works { docs { id } } }' } })).status).toBe(404)
        expect((await stack.rest('GET', route, { as: 'owner' })).status).toBe(404)
      }
    })

    it('upload by pasted URL is off (F6)', async () => {
      const upload = stack.config.collections.find((c) => c.slug === 'media')!.upload as { pasteURL?: unknown }
      expect(upload.pasteURL).toBe(false)
      void idOf
    })
  })
})
