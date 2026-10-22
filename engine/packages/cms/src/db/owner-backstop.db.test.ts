/**
 * The initial migration's last-owner backstop on a real, migrated Postgres, for the paths the
 * users hooks never see (TASKS.md 2.5; the senior-db review of 2.4): an adapter write on a Payload
 * transaction, a raw INSERT, a raw session at REPEATABLE READ, a shadowing `search_path`, and a
 * TRUNCATE of `stores`. The hooks' own behaviour is `collections/users/admins.db.test.ts`.
 *
 * Its own database on the server `CMS_TEST_POSTGRES_URL` names, migrated with the one migration
 * set and dropped afterwards; without that variable it skips (a setup state, CONVENTIONS.md §10).
 */
import { createTestDatabase } from './test-database.test-support'
import {
  buildConfig,
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { migrations } from '../migrations'
import { engineConfig } from '../payload.config'
import { testOrigin } from './test-origin.test-support'

const server = process.env.CMS_TEST_POSTGRES_URL
const { env: originEnv } = testOrigin(4168)

type Client = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
}
type Pool = Client & {
  on?: (event: 'error', listener: () => void) => unknown
  connect: () => Promise<Client & { release: () => void }>
  end: () => Promise<void>
}

describe.skipIf(!server)('the last-owner backstop on a migrated database', () => {
  const database = `cms_owner_backstop_test_${process.pid}_${Date.now()}`
  let payload: Payload
  let pool: Pool

  const count = async (where = 'true') =>
    Number((await pool.query(`SELECT count(*) AS n FROM users WHERE ${where}`)).rows[0]!.n)
  const owners = () => count(`role = 'owner'`)
  const idOf = async (email: string) =>
    (await pool.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]!.id as number
  const insert = (rows: Array<[email: string, role: string]>) =>
    pool.query(
      `INSERT INTO users (name, email, role) VALUES ${rows.map((_, i) => `($${2 * i + 1}, $${2 * i + 1}, $${2 * i + 2})`).join(', ')}`,
      rows.flat(),
    )
  /** Runs `statements` in one raw session (`BEGIN` included) and rolls back whatever is left open. */
  async function session(statements: string[]): Promise<void> {
    const client = await pool.connect()
    try {
      for (const statement of statements) await client.query(statement)
    } finally {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
    }
  }
  /** The req's own transaction session, for a statement on it outside the adapter's methods. */
  async function onTransaction(req: PayloadRequest, raw: string): Promise<void> {
    const id = await req.transactionID
    const db = payload.db as unknown as {
      sessions: Record<string, { db: unknown }>
      execute: (args: { db: unknown; raw: string }) => Promise<unknown>
    }
    await db.execute({ db: db.sessions[String(id)]!.db, raw })
  }

  beforeAll(async () => {
    const url = new URL(server!)
    url.pathname = `/${database}`
    const env = { DATABASE_URL: url.toString(), PAYLOAD_SECRET: 'a'.repeat(48), ...originEnv }
    const config = await buildConfig(engineConfig(env))
    // Payload never creates a missing database (db/adapter, disableCreateDatabase): make it here,
    // with the pg db-postgres uses (a dependency of it, not of cms).
    const here = path.dirname(fileURLToPath(import.meta.url))
    const dbPostgres = realpathSync(path.join(here, '../../node_modules/@payloadcms/db-postgres'))
    const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
      Pool: new (o: object) => Pool
    }
    const admin = new pg.Pool({ connectionString: server })
    await createTestDatabase(admin, database, 'migrated')
    await admin.end()
    payload = await getPayload({ config, key: database, disableOnInit: true })
    await payload.db.migrate({ migrations: [...migrations] } as never)
    pool = (payload.db as unknown as { pool: Pool }).pool
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

  it('refuses a non-owner inserted into an empty users table; an owner beside it passes', async () => {
    expect(await count()).toBe(0)
    await expect(insert([['e0@test.example', 'editor']])).rejects.toThrow(/first user must be/)
    expect(await count()).toBe(0)
    // Judged at the end of the statement: the owner in the same INSERT counts.
    await insert([
      ['e1@test.example', 'editor'],
      ['a@test.example', 'owner'],
    ])
    await insert([['b@test.example', 'owner']])
    expect(await owners()).toBe(2)
  })

  it('refuses a raw demotion of the last owner at the statement, not at COMMIT', async () => {
    await pool.query(`UPDATE users SET role = 'editor' WHERE email = 'b@test.example'`)
    await expect(
      session(['BEGIN', `UPDATE users SET role = 'editor' WHERE role = 'owner'`]),
    ).rejects.toThrow(/last owner cannot lose/)
    await expect(session(['BEGIN', `DELETE FROM users WHERE role = 'owner'`])).rejects.toThrow(
      /last owner cannot lose/,
    )
    expect(await owners()).toBe(1)
  })

  it('lets one statement swap the owner, and a deferred script move it over two', async () => {
    const [a, b] = [await idOf('a@test.example'), await idOf('b@test.example')]
    const swap = (from: number, to: number) =>
      `UPDATE users SET role = CASE id WHEN ${from} THEN 'editor' ELSE 'owner' END::enum_users_role WHERE id IN (${from}, ${to})`
    await pool.query(swap(a, b))
    expect((await pool.query(`SELECT id FROM users WHERE role = 'owner'`)).rows).toEqual([
      { id: b },
    ])
    // DEFERRABLE: a hand-run script may demote first and promote second, judged at COMMIT.
    await session([
      'BEGIN',
      'SET CONSTRAINTS users_keep_an_owner_on_update DEFERRED',
      `UPDATE users SET role = 'editor' WHERE id = ${b}`,
      `UPDATE users SET role = 'owner' WHERE id = ${a}`,
      'COMMIT',
    ])
    expect((await pool.query(`SELECT id FROM users WHERE role = 'owner'`)).rows).toEqual([
      { id: a },
    ])
  })

  it('answers a Payload transaction’s hook-less write with the refusal, never a silent success', async () => {
    const a = await idOf('a@test.example')
    // drizzle wraps the database's error ("Failed query: …"); the refusal is its cause.
    const refusal = (write: Promise<unknown>) =>
      write.then(
        () => 'saved',
        (error: Error & { cause?: Error }) => error.cause?.message ?? error.message,
      )
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    try {
      expect(
        await refusal(
          payload.db.updateOne({ collection: 'users', id: a, data: { role: 'editor' }, req }),
        ),
      ).toMatch(/last owner cannot lose/)
    } finally {
      await killTransaction(req)
    }
    const doomed = await createLocalReq({}, payload)
    await initTransaction(doomed)
    try {
      expect(
        await refusal(
          payload.db.deleteOne({ collection: 'users', where: { id: { equals: a } }, req: doomed }),
        ),
      ).toMatch(/last owner cannot lose/)
    } finally {
      await killTransaction(doomed)
    }
    expect(await owners()).toBe(1)
  })

  it('shows why: deferred to COMMIT, the same refusal is swallowed and nothing is saved', async () => {
    // As 2.4 had it. Payload's commitTransaction resolves whether COMMIT succeeded or not, so a
    // caller of a deferred-refused save would have answered success.
    const a = await idOf('a@test.example')
    const req = await createLocalReq({}, payload)
    await initTransaction(req)
    await onTransaction(req, 'SET CONSTRAINTS users_keep_an_owner_on_update DEFERRED')
    await payload.db.updateOne({ collection: 'users', id: a, data: { role: 'editor' }, req })
    await expect(commitTransaction(req)).resolves.toBeUndefined()
    expect(await owners()).toBe(1)
  })

  it('refuses to judge an owner change outside READ COMMITTED; other writes there pass', async () => {
    await pool.query(`UPDATE users SET role = 'owner' WHERE email = 'b@test.example'`)
    for (const level of ['REPEATABLE READ', 'SERIALIZABLE']) {
      // Allowed at READ COMMITTED (a stays an owner) — refused here, unserialised by the lock.
      await expect(
        session([
          `BEGIN ISOLATION LEVEL ${level}`,
          `UPDATE users SET role = 'editor' WHERE email = 'b@test.example'`,
          'COMMIT',
        ]),
      ).rejects.toThrow(new RegExp(`must run at READ COMMITTED, not ${level}`))
    }
    // A write that cannot lose an owner fires nothing, at any level.
    await session([
      'BEGIN ISOLATION LEVEL REPEATABLE READ',
      `UPDATE users SET login_attempts = 1 WHERE role = 'owner'`,
      `INSERT INTO users (name, email, role) VALUES ('o3', 'o3@test.example', 'owner')`,
      'COMMIT',
    ])
    expect(await owners()).toBe(3)
    await pool.query(`DELETE FROM users WHERE email = 'o3@test.example'`)
  })

  it('reads public.users whatever the caller’s search_path holds (pinned)', async () => {
    // A shadow `users` holding an owner, first on the path: an unpinned trigger would count it.
    await pool.query(`CREATE SCHEMA shadow`)
    await pool.query(`CREATE TABLE shadow.users (role text)`)
    await pool.query(`INSERT INTO shadow.users VALUES ('owner')`)
    try {
      await pool.query(`UPDATE users SET role = 'editor' WHERE email = 'b@test.example'`)
      await expect(
        session([
          'BEGIN',
          'SET LOCAL search_path = shadow, public',
          `UPDATE public.users SET role = 'editor' WHERE role = 'owner'`,
        ]),
      ).rejects.toThrow(/last owner cannot lose/)
    } finally {
      await pool.query('DROP SCHEMA shadow CASCADE')
    }
    expect(await owners()).toBe(1)
  })

  it('refuses TRUNCATE of stores on its own, not only through the users cascade (R2)', async () => {
    // Its own trigger fires first, on the table named: without it the cascade reaching users
    // would answer "users is never truncated" — and nothing, were that foreign key ever gone.
    await expect(pool.query('TRUNCATE stores CASCADE')).rejects.toThrow(/stores is never truncated/)
    await expect(pool.query('TRUNCATE users CASCADE')).rejects.toThrow(/users is never truncated/)
    expect(await owners()).toBe(1)
  })
})
