/**
 * The last-owner and first-user guards against a real, migrated Postgres (senior-db review of
 * 3.2, B1 and S2; SECURITY.md A7): concurrent demotions, bulk writes, raw SQL past every hook, and
 * a first-register race — on `users.role`, the one role column TASKS.md 2.4 gives each user. It makes its own database on the server `CMS_TEST_POSTGRES_URL` names
 * (e.g. postgres://postgres:postgres@localhost:5432/postgres), applies the one migration set and
 * drops the database afterwards. Without that variable it skips — a setup state; a server that
 * is named and refuses is a failure (CONVENTIONS.md §8).
 */
import {
  buildConfig,
  commitTransaction,
  createLocalReq,
  getPayload,
  handleEndpoints,
  initTransaction,
  ValidationError,
  type Payload,
} from 'payload'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '../../migrations'
import { testOrigin } from '../../db/test-origin.test-support'
import { engineConfig } from '../../payload.config'

const server = process.env.CMS_TEST_POSTGRES_URL
const { origin, env: originEnv } = testOrigin(4167)

type Pool = {
  on?: (event: 'error', listener: () => void) => unknown
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
  connect: () => Promise<Pool & { release: () => void }>
  end: () => Promise<void>
}

describe.skipIf(!server)('the owner guards on a migrated database', () => {
  const database = `cms_admins_test_${process.pid}_${Date.now()}`
  let payload: Payload
  let config: Awaited<ReturnType<typeof buildConfig>>
  let pool: Pool

  const owners = async () =>
    Number((await pool.query(`SELECT count(*) AS n FROM users WHERE role = 'owner'`)).rows[0]!.n)
  const idOf = async (email: string) =>
    (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]!.id as number
  const setRole = (email: string, role: string) =>
    idOf(email).then((id) => payload.update({ collection: 'users', id, data: { role } }))

  beforeAll(async () => {
    const url = new URL(server!)
    url.pathname = `/${database}`
    const env = { DATABASE_URL: url.toString(), PAYLOAD_SECRET: 'a'.repeat(48), ...originEnv }
    config = await buildConfig(engineConfig(env))
    // Payload never creates a missing database (db/adapter, disableCreateDatabase): make it here,
    // with the pg db-postgres uses (a dependency of it, not of cms).
    const here = path.dirname(fileURLToPath(import.meta.url))
    const dbPostgres = realpathSync(
      path.join(here, '../../../node_modules/@payloadcms/db-postgres'),
    )
    const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
      Pool: new (o: object) => Pool
    }
    const admin = new pg.Pool({ connectionString: server })
    await admin.query(`CREATE DATABASE "${database}"`)
    await admin.end()
    payload = await getPayload({ config, key: database, disableOnInit: true })
    await payload.db.migrate({ migrations: [...migrations] } as never)
    pool = (payload.db as unknown as { pool: Pool }).pool
    const password = 'correct horse battery staple 42'
    for (const [email, role] of [
      ['a@test.example', 'owner'],
      ['b@test.example', 'owner'],
      ['c@test.example', 'editor'],
    ] as const) {
      await payload.create({ collection: 'users', data: { email, password, name: email, role } })
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

  it('starts with two owners', async () => {
    expect(await owners()).toBe(2)
  })

  it('lets exactly one of two concurrent demotions through (B1)', async () => {
    const results = await Promise.allSettled([
      setRole('a@test.example', 'editor'),
      setRole('b@test.example', 'editor'),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect(await owners()).toBe(1)
    await setRole('a@test.example', 'owner')
    await setRole('b@test.example', 'owner')
    expect(await owners()).toBe(2)
  })

  it('refuses a bulk demotion or a bulk delete of every owner, and changes nothing (B1)', async () => {
    const where = { role: { equals: 'owner' } }
    // The field error says "This is the only owner…"; the thrown message is Payload's summary.
    await expect(
      payload.update({ collection: 'users', where, data: { role: 'editor' } }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(payload.delete({ collection: 'users', where })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(await owners()).toBe(2)
    expect(Number((await pool.query('SELECT count(*) AS n FROM users')).rows[0]!.n)).toBe(3)
  })

  it('lets a bulk demotion through while an owner outside it remains', async () => {
    const id = await idOf('b@test.example')
    await payload.update({
      collection: 'users',
      where: { id: { equals: id } },
      data: { role: 'editor' },
    })
    expect(await owners()).toBe(1)
    await setRole('b@test.example', 'owner')
  })

  it('refuses, at COMMIT, raw SQL that removes every owner past the hooks (the trigger)', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`UPDATE users SET role = 'editor' WHERE role = 'owner'`)
      await expect(client.query('COMMIT')).rejects.toThrow(/last owner/)
    } finally {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
    }
    expect(await owners()).toBe(2)
  })

  it('refuses the second of two raw demotions committed at once (the trigger takes the lock)', async () => {
    const [one, two] = [await pool.connect(), await pool.connect()]
    try {
      const [a, b] = [await idOf('a@test.example'), await idOf('b@test.example')]
      await one.query('BEGIN')
      await two.query('BEGIN')
      await one.query(`UPDATE users SET role = 'editor' WHERE role = 'owner' AND id = $1`, [a])
      await two.query(`UPDATE users SET role = 'editor' WHERE role = 'owner' AND id = $1`, [b])
      const commits = await Promise.allSettled([one.query('COMMIT'), two.query('COMMIT')])
      expect(commits.filter((c) => c.status === 'rejected')).toHaveLength(1)
    } finally {
      for (const client of [one, two]) {
        await client.query('ROLLBACK').catch(() => {})
        client.release()
      }
    }
    expect(await owners()).toBe(1)
    await setRole('a@test.example', 'owner')
    await setRole('b@test.example', 'owner')
  })

  it('never deadlocks a held save of an owner’s role against a demotion of the same owner (R1)', async () => {
    // T1 keeps A an owner (and renames A) inside a transaction held open; T2 then demotes A (B
    // stays an owner, so both are allowed). Were T1's hook to take no lock, T1 would hold A's row
    // and T2, holding the owners lock from its hook, would wait for it — and any later lock T1
    // asked for would close the circle (40P01). Payload's commitTransaction swallows a failed
    // COMMIT, so the proof is a marker row T1 wrote — a store, which only a committed T1 leaves
    // behind (T1's own rename is no proof: T2 read A before T1 committed and saves over it).
    const a = await idOf('a@test.example')
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    await payload.update({
      collection: 'users',
      id: a,
      data: { role: 'owner', name: 'Held by T1' },
      req,
    })
    await payload.create({ collection: 'stores', data: { code: 'R1-HELD', name: 'Marker' }, req })
    const demotion = payload.update({ collection: 'users', id: a, data: { role: 'editor' } })
    await new Promise((resolve) => setTimeout(resolve, 300))
    await commitTransaction(req)
    await expect(demotion).resolves.toBeTruthy()
    const marker = await pool.query(`SELECT count(*) AS n FROM stores WHERE code = 'R1-HELD'`)
    expect(Number(marker.rows[0]!.n)).toBe(1)
    expect(await owners()).toBe(1)
    await setRole('a@test.example', 'owner')
    expect(await owners()).toBe(2)
  })

  it('refuses TRUNCATE of users, directly or cascaded from stores (R2)', async () => {
    // A bare TRUNCATE is refused already by the tables that reference users (its sessions).
    await expect(pool.query('TRUNCATE users')).rejects.toThrow()
    await expect(pool.query('TRUNCATE users CASCADE')).rejects.toThrow(/never truncated/)
    await expect(pool.query('TRUNCATE stores CASCADE')).rejects.toThrow(/never truncated/)
    expect(await owners()).toBe(2)
  })

  it('makes one owner of three racing first-registers; the losers are refused (S2)', async () => {
    // An empty users table is the one state the trigger allows without an owner.
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
            role: 'owner',
          }),
        }),
      })
    const statuses = (await Promise.all([1, 2, 3].map(register))).map((r) => r.status).sort()
    expect(statuses).toEqual([200, 403, 403])
    expect(Number((await pool.query('SELECT count(*) AS n FROM users')).rows[0]!.n)).toBe(1)
    expect(await owners()).toBe(1)
  })
})
