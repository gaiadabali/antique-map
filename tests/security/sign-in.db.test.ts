/**
 * Sign-in and the browser rules Payload enforces, on a real Postgres over REST (TASKS.md 10.1.a;
 * SECURITY.md A2–A6, B4, B5, F6, R6): lockout, one answer to forgot-password, session end, reset
 * tokens, the session cookie, CSRF on a cookie-authenticated request, CORS, GraphQL off.
 *
 * A check that fails today because the control is missing is written as `it.fails` and carries its
 * finding id (docs/gates/security.md): the suite stays green while the defect stands, and Vitest
 * fails the file the day the control lands, so the `.fails` is taken off then.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  ADMIN_ORIGIN,
  PASSWORD,
  server,
  startSecurityStack,
  type SecurityStack,
} from './support/stack'

describe.skipIf(!server)('sign-in and the browser rules, on a real database', () => {
  let stack: SecurityStack

  beforeAll(async () => {
    stack = await startSecurityStack('security_auth')
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  const work = () => stack.work.published.id
  /** The work as the Local API reads it with access overridden: the truth under the REST filter. */
  const truth = () =>
    stack.api.findByID({ collection: 'works', id: work(), depth: 0, overrideAccess: true })

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

      const byEditor = await stack.rest('POST', '/api/users/unlock', {
        as: 'editor',
        json: { email },
      })
      expect([401, 403]).toContain(byEditor.status)
      expect((await login(email, PASSWORD)).status).toBe(401)

      const byOwner = await stack.rest('POST', '/api/users/unlock', {
        as: 'owner',
        json: { email },
      })
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
      expect(
        (await stack.rest('POST', '/api/users/forgot-password', { json: { email } })).status,
      ).toBe(200)
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
      const used = await stack.rest('POST', '/api/users/reset-password', {
        json: { token: row.token, password: fresh },
      })
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
      await stack.pool.query(
        `UPDATE users SET reset_password_expiration = now() - interval '1 minute' WHERE email = '${email}'`,
      )
      const token = (
        (
          await stack.pool.query(
            `SELECT reset_password_token AS t FROM users WHERE email = '${email}'`,
          )
        ).rows[0] as { t: string }
      ).t
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

    // F-03 (docs/gates/security.md): the password policy.
    it('refuses a password shorter than 12 characters on create (A2)', async () => {
      const reply = await stack.rest('POST', '/api/users', {
        as: 'owner',
        json: { email: 'weak@security.test', password: 'short', name: 'Weak', role: 'editor' },
      })
      expect(reply.status).toBe(400)
    })
    it('refuses a common password on create (A2)', async () => {
      const reply = await stack.rest('POST', '/api/users', {
        as: 'owner',
        json: {
          email: 'common@security.test',
          password: 'password1234',
          name: 'Common',
          role: 'editor',
        },
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
        expect(
          (
            await stack.rest('POST', route, {
              as: 'owner',
              json: { query: '{ Works { docs { id } } }' },
            })
          ).status,
        ).toBe(404)
        expect((await stack.rest('GET', route, { as: 'owner' })).status).toBe(404)
      }
    })

    it('upload by pasted URL is off (F6)', async () => {
      const upload = stack.config.collections.find((c) => c.slug === 'media')!.upload as {
        pasteURL?: unknown
      }
      expect(upload.pasteURL).toBe(false)
    })
  })
})
