/**
 * The last-admin and first-user guards against a real, migrated Postgres (senior-db review of
 * 3.2, B1 and S2): concurrent demotions, bulk writes, raw SQL past every hook, and a
 * first-register race. It makes its own database on the server `CMS_TEST_POSTGRES_URL` names
 * (e.g. postgres://postgres:postgres@localhost:5432/postgres), applies the one migration set and
 * drops the database afterwards. Without that variable it skips — a setup state; a server that
 * is named and refuses is a failure (CONVENTIONS.md §8).
 */
import { buildConfig, getPayload, handleEndpoints, ValidationError, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '../../migrations'
import { engineConfig } from '../../payload.config'

const server = process.env.CMS_TEST_POSTGRES_URL
const origin = 'http://localhost:4167'

type Pool = {
  on?: (event: 'error', listener: () => void) => unknown
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
  connect: () => Promise<Pool & { release: () => void }>
  end: () => Promise<void>
}

describe.skipIf(!server)('the admin guards on a migrated database', () => {
  const database = `cms_admins_test_${process.pid}_${Date.now()}`
  let payload: Payload
  let config: Awaited<ReturnType<typeof buildConfig>>
  let pool: Pool

  const admins = async () =>
    Number(
      (await pool.query(`SELECT count(*) AS n FROM users_roles WHERE value = 'admin'`)).rows[0]!.n,
    )
  const idOf = async (email: string) =>
    (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]!.id as number
  const setRoles = (email: string, roles: string[]) =>
    idOf(email).then((id) => payload.update({ collection: 'users', id, data: { roles } }))

  beforeAll(async () => {
    const url = new URL(server!)
    url.pathname = `/${database}`
    const env = { DATABASE_URL: url.toString(), PAYLOAD_SECRET: 'a'.repeat(48), SITE_URL: origin }
    config = await buildConfig(engineConfig(env))
    // Payload creates the database on first connect when it does not exist.
    payload = await getPayload({ config, key: database, disableOnInit: true })
    await payload.db.migrate({ migrations: [...migrations] } as never)
    pool = (payload.db as unknown as { pool: Pool }).pool
    const password = 'correct horse battery staple 42'
    for (const [email, roles] of [
      ['a@test.example', ['admin']],
      ['b@test.example', ['admin']],
      ['c@test.example', ['editor']],
    ] as const) {
      await payload.create({
        collection: 'users',
        data: { email, password, name: email, roles: [...roles] },
      })
    }
  }, 120_000)

  afterAll(async () => {
    if (!payload) return
    const { Pool: PgPool } = (payload.db as unknown as { pg: { Pool: new (o: object) => Pool } }).pg
    // Dropping the database terminates whatever connection the pool is still closing: expected.
    pool.on?.('error', () => {})
    await payload.destroy()
    const admin = new PgPool({ connectionString: server })
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    await admin.end()
  }, 60_000)

  it('starts with two admins', async () => {
    expect(await admins()).toBe(2)
  })

  it('lets exactly one of two concurrent demotions through (B1)', async () => {
    const results = await Promise.allSettled([
      setRoles('a@test.example', ['editor']),
      setRoles('b@test.example', ['editor']),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect(await admins()).toBe(1)
    await setRoles('a@test.example', ['admin'])
    await setRoles('b@test.example', ['admin'])
    expect(await admins()).toBe(2)
  })

  it('refuses a bulk demotion or a bulk delete of every admin, and changes nothing (B1)', async () => {
    const where = { roles: { in: ['admin'] } }
    // The field error says "This is the only admin…"; the thrown message is Payload's summary.
    await expect(
      payload.update({ collection: 'users', where, data: { roles: ['editor'] } }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(payload.delete({ collection: 'users', where })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(await admins()).toBe(2)
    expect(Number((await pool.query('SELECT count(*) AS n FROM users')).rows[0]!.n)).toBe(3)
  })

  it('lets a bulk demotion through while an admin outside it remains', async () => {
    const id = await idOf('b@test.example')
    await payload.update({
      collection: 'users',
      where: { id: { equals: id } },
      data: { roles: ['editor'] },
    })
    expect(await admins()).toBe(1)
    await setRoles('b@test.example', ['admin'])
  })

  it('refuses, at COMMIT, raw SQL that removes every admin past the hooks (the trigger)', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`UPDATE users_roles SET value = 'editor' WHERE value = 'admin'`)
      await expect(client.query('COMMIT')).rejects.toThrow(/last admin/)
    } finally {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
    }
    expect(await admins()).toBe(2)
  })

  it('refuses the second of two raw demotions committed at once (the trigger takes the lock)', async () => {
    const [one, two] = [await pool.connect(), await pool.connect()]
    try {
      const [a, b] = [await idOf('a@test.example'), await idOf('b@test.example')]
      await one.query('BEGIN')
      await two.query('BEGIN')
      await one.query(
        `UPDATE users_roles SET value = 'editor' WHERE value = 'admin' AND parent_id = $1`,
        [a],
      )
      await two.query(
        `UPDATE users_roles SET value = 'editor' WHERE value = 'admin' AND parent_id = $1`,
        [b],
      )
      const commits = await Promise.allSettled([one.query('COMMIT'), two.query('COMMIT')])
      expect(commits.filter((c) => c.status === 'rejected')).toHaveLength(1)
    } finally {
      for (const client of [one, two]) {
        await client.query('ROLLBACK').catch(() => {})
        client.release()
      }
    }
    expect(await admins()).toBe(1)
    await setRoles('a@test.example', ['admin'])
    await setRoles('b@test.example', ['admin'])
  })

  it('makes one admin of three racing first-registers; the losers are refused (S2)', async () => {
    // An empty users table is the one state the trigger allows without an admin.
    await pool.query('DELETE FROM users')
    const register = (i: number) =>
      handleEndpoints({
        config,
        payloadInstanceCacheKey: database,
        request: new Request(`${origin}/api/users/first-register`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin },
          body: JSON.stringify({
            email: `racer${i}@test.example`,
            password: 'correct horse battery staple 42',
            name: `Racer ${i}`,
            roles: ['admin'],
          }),
        }),
      })
    const statuses = (await Promise.all([1, 2, 3].map(register))).map((r) => r.status).sort()
    expect(statuses).toEqual([200, 403, 403])
    expect(Number((await pool.query('SELECT count(*) AS n FROM users')).rows[0]!.n)).toBe(1)
    expect(await admins()).toBe(1)
  })
})
