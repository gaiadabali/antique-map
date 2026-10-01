/**
 * `@engine/cms/instance` and `@engine/cache`'s out-of-request mode against a real, migrated
 * Postgres (TASKS.md 4.8.f; the independent senior-db review of 4.8, T1). It makes its own
 * database on the server `CMS_TEST_POSTGRES_URL` names (the maintenance database; the role must be
 * able to CREATE DATABASE), applies the one migration set and drops it afterwards, as
 * `admins.db.test.ts` does, so CI's real-database step runs it. Without that variable it skips.
 *
 * - `cms()` resolves one instance; its pool answers READ COMMITTED; with every client held the
 *   probe fails within the pool's connect timeout; a missing database refuses to boot.
 * - The after-commit proof, on a stub collection with an `afterChange` hook that asks a second
 *   connection what it sees, invalidates, and can write a nested document or throw: a create, an
 *   update, a rollback, `disableTransaction` and a hook's nested write each keep exactly the right
 *   tags, and a `req` goes in through `operation(write, { req })` alone.
 */
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildConfig,
  createLocalReq,
  getPayload,
  initTransaction,
  killTransaction,
  type CollectionConfig,
  type CollectionSlug,
  type Payload,
} from 'payload'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// cms depends on @engine/cache from 8.2's hooks on; until then its source is reached directly.
import { invalidate, invalidationBatch, itemTag } from '../../cache/src/index'
import { POOL_CONNECT_TIMEOUT_MS } from './db/adapter'
import { databaseProbe } from './db/probe'
import { migrations } from './migrations'
import { engineConfig } from './payload.config'

type Pool = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
  connect: () => Promise<{ release: (error?: Error | boolean) => void }>
  end: () => Promise<void>
  on?: (event: 'error', listener: () => void) => unknown
  totalCount: number
  idleCount: number
  options: { max: number }
}

const server = process.env.CMS_TEST_POSTGRES_URL
const SECRET = 'instance-db-test-only-never-signs-anything'.padEnd(48, 'x')
const here = path.dirname(fileURLToPath(import.meta.url))
// pg is db-postgres's dependency, not cms's: reached from beside it.
const { Pool: PgPool } = createRequire(
  path.join(realpathSync(path.join(here, '../node_modules/@payloadcms/db-postgres')), 'x.js'),
)('pg') as { Pool: new (options: object) => Pool }

/** `database` on the server `CMS_TEST_POSTGRES_URL` names; the maintenance database when skipped. */
const urlOf = (database: string) => {
  const url = new URL(server ?? 'postgres://skipped@localhost/postgres')
  url.pathname = `/${database}`
  return url.href
}
const settle = <T>(promise: Promise<T>) =>
  promise.then(
    () => 'resolved',
    (e: Error) => e.message,
  )

describe.skipIf(!server)('on a migrated database of its own', () => {
  const database = `cms_instance_test_${process.pid}_${Date.now()}`
  const env = {
    DATABASE_URL: urlOf(database),
    PAYLOAD_SECRET: SECRET,
    SITE_URL: 'http://localhost:4199',
  }
  let admin: Pool
  let observer: Pool
  let payload: Payload
  let proof: Payload
  let slug: CollectionSlug

  /** What a second connection sees of a document: its `updated_at`, or null while it is not there. */
  const seen = async (id: unknown) =>
    ((await observer.query(`SELECT updated_at FROM "${slug}" WHERE id = $1`, [id])).rows[0]
      ?.updated_at ?? null) as Date | null
  const atHook: Array<{ id: number; visible: Date | null }> = []

  beforeAll(async () => {
    admin = new PgPool({ connectionString: server })
    await admin.query(`CREATE DATABASE "${database}"`)
    const saved = { ...process.env }
    Object.assign(process.env, env)
    for (const key of ['RUN_MIGRATIONS', 'PAYLOAD_DEV_PUSH', 'BRAND', 'PGHOST', 'PGPORT'])
      delete process.env[key]
    vi.resetModules()
    const { cms } = await import('@engine/cms/instance')
    payload = await cms()
    process.env = saved
    await payload.db.migrate({ migrations: [...migrations] } as never)
    observer = new PgPool({ connectionString: env.DATABASE_URL })

    // A second instance of the one config, with a hook on a stub collection (id and timestamps).
    const input = engineConfig(env)
    // A stub's own fields are none; the first config's sanitising has added Payload's to the shared
    // objects (id, timestamps), so count those out.
    const payloadFields = new Set(['id', 'createdAt', 'updatedAt'])
    const stub = input.collections?.find((each) =>
      each.fields.every((field) => 'name' in field && payloadFields.has(field.name)),
    )
    if (!stub) throw new Error('no stub collection left to hang the proof hook on: pick another')
    slug = stub.slug as CollectionSlug
    const hook: NonNullable<
      NonNullable<CollectionConfig['hooks']>['afterChange']
    >[number] = async ({ doc, context, req }) => {
      atHook.push({ id: doc.id, visible: await seen(doc.id) })
      invalidate([itemTag(doc.id)], context)
      if (context.nested) {
        // Its own transaction (no req): commits before the parent's later hook throws.
        await req.payload.create({
          collection: slug,
          data: {},
          context: { ...context, nested: false, fail: false },
        })
      }
      if (context.fail) throw new Error('a later hook failed')
      return doc
    }
    input.collections = input.collections!.map((each) =>
      each === stub ? { ...each, hooks: { ...each.hooks, afterChange: [hook] } } : each,
    )
    proof = await getPayload({
      config: await buildConfig(input),
      key: `${database}_proof`,
      disableOnInit: true,
    })
  }, 120_000)

  afterAll(async () => {
    // Payload's destroy() leaves its pool open (review N2), and pool.end() would wait for the one
    // client Payload never releases. Dropping the database WITH (FORCE) ends every session of
    // both pools instead; their idle clients' errors go to the pool, the held one's to Payload's
    // own listener.
    for (const instance of [proof, payload]) {
      if (!instance) continue
      ;(instance.db as unknown as { pool?: Pool }).pool?.on?.('error', () => {})
      await instance.destroy()
    }
    await observer?.end()
    await admin?.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    await admin?.end()
  }, 60_000)

  describe('cms()', () => {
    it('resolves one instance, at once and again', async () => {
      const { cms } = await import('@engine/cms/instance')
      const [first, second] = await Promise.all([cms(), cms()])
      expect(first).toBe(payload)
      expect(second).toBe(payload)
    })

    it('databaseProbe(cmsPool(payload))() answers READ COMMITTED', async () => {
      const { cmsPool } = await import('@engine/cms/instance')
      expect(await databaseProbe(cmsPool(payload))()).toEqual({
        transactionIsolation: 'read committed',
      })
    })

    it('with every client held, the probe fails within the connect timeout, then answers', async () => {
      const { cmsPool } = await import('@engine/cms/instance')
      const pool = (payload.db as unknown as { pool: Pool }).pool
      // Payload's first connect keeps one client for good: its liveness watch (db/adapter).
      expect(pool.totalCount - pool.idleCount).toBeGreaterThanOrEqual(1)
      const held: Array<{ release: () => void }> = []
      while (pool.totalCount < pool.options.max || pool.idleCount > 0)
        held.push(await pool.connect())
      const started = Date.now()
      await expect(databaseProbe(cmsPool(payload))()).rejects.toThrow(/timeout/i)
      const waited = Date.now() - started
      expect(waited).toBeGreaterThanOrEqual(POOL_CONNECT_TIMEOUT_MS - 250)
      expect(waited).toBeLessThan(POOL_CONNECT_TIMEOUT_MS + 2_000)
      for (const client of held) client.release()
      expect(await databaseProbe(cmsPool(payload))()).toEqual({
        transactionIsolation: 'read committed',
      })
    }, 30_000)

    it('refuses to boot on a database that does not exist, and creates none', async () => {
      const missing = `${database}_missing`
      const config = await buildConfig(engineConfig({ ...env, DATABASE_URL: urlOf(missing) }))
      await expect(getPayload({ config, key: missing, disableOnInit: true })).rejects.toThrow(
        /does not exist/,
      )
      const found = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [missing])
      expect(found.rows).toEqual([])
    }, 30_000)
  })

  describe('the collector against Payload transactions', () => {
    const create = (context: Record<string, unknown>, extra: object = {}) =>
      proof.create({ collection: slug, data: {}, context, ...extra })

    it('a create: the hook runs before the commit; its tag is kept once the call returned', async () => {
      const batch = invalidationBatch()
      const doc = await batch.operation(async (context) => {
        const created = await create(context)
        expect(batch.pending).toEqual([]) // still inside the operation
        return created
      })
      expect(atHook.at(-1)).toEqual({ id: doc.id, visible: null })
      expect(await seen(doc.id)).not.toBeNull()
      expect(batch.pending).toEqual([`item:${doc.id}`])
    })

    it('an update: the hook sees the old row; its tag is kept once the call returned', async () => {
      const doc = await invalidationBatch().operation((context) => create(context))
      const before = await seen(doc.id)
      const batch = invalidationBatch()
      await new Promise((resolve) => setTimeout(resolve, 5))
      const updated = await batch.operation((context) =>
        proof.update({ collection: slug, id: doc.id, data: {}, context }),
      )
      expect(atHook.at(-1)).toEqual({ id: doc.id, visible: before })
      expect((await seen(doc.id))?.getTime()).toBe(new Date(updated.updatedAt).getTime())
      expect(batch.pending).toEqual([`item:${doc.id}`])
    })

    it('a rollback: the save is gone, and its tag is kept all the same', async () => {
      const batch = invalidationBatch()
      expect(await settle(batch.operation((context) => create({ ...context, fail: true })))).toBe(
        'a later hook failed',
      )
      const { id } = atHook.at(-1)!
      expect(await seen(id)).toBeNull()
      expect(batch.pending).toEqual([`item:${id}`])
    })

    it('disableTransaction: the write committed before the throw, and its tag is kept', async () => {
      const batch = invalidationBatch()
      const outcome = batch.operation((context) =>
        create({ ...context, fail: true }, { disableTransaction: true }),
      )
      expect(await settle(outcome)).toBe('a later hook failed')
      const { id, visible } = atHook.at(-1)!
      expect(visible).not.toBeNull() // no transaction: visible at the hook already
      expect(await seen(id)).not.toBeNull()
      expect(batch.pending).toEqual([`item:${id}`])
    })

    it("a hook's nested write commits in its own transaction; both tags are kept", async () => {
      const batch = invalidationBatch()
      const from = atHook.length
      expect(
        await settle(
          batch.operation((context) => create({ ...context, nested: true, fail: true })),
        ),
      ).toBe('a later hook failed')
      const [parent, child] = atHook.slice(from)
      expect(await seen(parent!.id)).toBeNull()
      expect(await seen(child!.id)).not.toBeNull()
      expect([...batch.pending].sort()).toEqual([`item:${child!.id}`, `item:${parent!.id}`].sort())
    })

    it('a req goes in through { req }: refused with its transaction open, clean after', async () => {
      const batch = invalidationBatch()
      const open = await createLocalReq({}, proof)
      await initTransaction(open)
      expect(await settle(batch.operation(() => create({}, { req: open }), { req: open }))).toMatch(
        /this req has a transaction open/,
      )
      await killTransaction(open)

      const req = await createLocalReq({}, proof)
      const doc = await batch.operation(() => proof.create({ collection: slug, data: {}, req }), {
        req,
      })
      expect(atHook.at(-1)).toEqual({ id: doc.id, visible: null })
      expect(batch.pending).toEqual([`item:${doc.id}`])
      expect(Object.keys(req.context ?? {})).toEqual([])
    })

    it("a jobs run's batch.context() on its req keeps each tag; without a collector a save fails", async () => {
      const batch = invalidationBatch()
      const req = await createLocalReq({ context: batch.context() }, proof)
      const a = await proof.create({ collection: slug, data: {}, req })
      const b = await proof.create({ collection: slug, data: {}, req })
      expect(batch.pending).toEqual([`item:${a.id}`, `item:${b.id}`])

      expect(await settle(create({}))).toMatch(/outside a request scope/)
      expect(await seen(atHook.at(-1)!.id)).toBeNull()
    })
  })
})
