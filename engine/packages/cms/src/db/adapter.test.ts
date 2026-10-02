import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { DatabaseAdapterObj, Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  buildDatabaseAdapter,
  devPushRequested,
  LOCKED_MIGRATION_METHODS,
  POOL_CONNECT_TIMEOUT_MS,
  QUERY_TIMEOUT_MS,
  runsMigrationsOnBoot,
  withMigrationLock,
  type BundledMigration,
} from './adapter'
import { MIGRATION_LOCK_KEY } from './advisory-lock'

const MIGRATIONS: BundledMigration[] = [
  { name: '20260101_000000_initial', up: async () => {}, down: async () => {} },
]
const fakePayload = { config: {}, logger: { info: () => {} } } as unknown as Payload

function adapterFor(env: Record<string, string | undefined>) {
  const adapterObj = buildDatabaseAdapter({ env, migrationDir: '.', migrations: MIGRATIONS })
  return adapterObj.init({ payload: fakePayload })
}

describe('the database adapter', () => {
  it('never pushes schema unless an agent opts in on its own database, and never in production', () => {
    expect(adapterFor({}).push).toBe(false)
    expect(adapterFor({ NODE_ENV: 'production' }).push).toBe(false)
    expect(adapterFor({ PAYLOAD_DEV_PUSH: 'true' }).push).toBe(false)
    expect(devPushRequested({ PAYLOAD_DEV_PUSH: '1' })).toBe(true)
    expect(devPushRequested({ PAYLOAD_DEV_PUSH: '1', NODE_ENV: 'production' })).toBe(false)
  })

  it('hands Payload the bundled migrations only in a process with RUN_MIGRATIONS=1', () => {
    expect(adapterFor({}).prodMigrations).toBeUndefined()
    expect(adapterFor({ RUN_MIGRATIONS: 'true' }).prodMigrations).toBeUndefined()
    expect(adapterFor({ RUN_MIGRATIONS: '0' }).prodMigrations).toBeUndefined()
    expect(adapterFor({ RUN_MIGRATIONS: '1' }).prodMigrations?.map((m) => m.name)).toEqual([
      '20260101_000000_initial',
    ])
    expect(runsMigrationsOnBoot({ RUN_MIGRATIONS: '1' })).toBe(true)
  })

  it('reads the connection from DATABASE_URL, and opens nothing while being built', () => {
    const adapter = adapterFor({ DATABASE_URL: 'postgres://u:p@db.invalid:5432/x' })
    expect(adapter.poolOptions).toEqual({
      connectionString: 'postgres://u:p@db.invalid:5432/x',
      connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
      query_timeout: QUERY_TIMEOUT_MS,
    })
    expect(adapter.pool).toBeUndefined()
  })

  it('bounds a pool connect and a query, and never creates a database it cannot find', () => {
    expect(POOL_CONNECT_TIMEOUT_MS).toBe(5_000)
    expect(QUERY_TIMEOUT_MS).toBe(60_000)
    expect(adapterFor({}).disableCreateDatabase).toBe(true)
  })

  it('declares no tables beside the collections’ own (no afterSchemaInit hook)', () => {
    expect(adapterFor({}).afterSchemaInit ?? []).toEqual([])
  })

  it('runs every migrate() under the migration lock', async () => {
    const queries: string[] = []
    const timeouts: unknown[] = []
    const client = {
      query: async (query: { text: string; query_timeout?: number }) => {
        queries.push(query.text)
        timeouts.push(query.query_timeout)
        return { rows: [{ locked: true }] }
      },
      release: () => {},
    }
    const migrate = vi.fn(async () => {
      queries.push('-- migrations run here')
    })
    const inner = {
      name: 'postgres',
      defaultIDType: 'number',
      init: () => ({ migrate, pool: { connect: async () => client }, payload: fakePayload }),
    } as unknown as DatabaseAdapterObj<PostgresAdapter>
    const adapter = withMigrationLock(inner).init({ payload: fakePayload })
    await adapter.migrate({ migrations: MIGRATIONS as never })
    expect(migrate).toHaveBeenCalledWith({ migrations: MIGRATIONS })
    expect(queries).toEqual([
      'SELECT pg_try_advisory_lock($1::bigint) AS locked',
      '-- migrations run here',
      'SELECT pg_advisory_unlock($1::bigint)',
    ])
    // The lock waits as long as another process migrates: its queries are exempt from the bound.
    expect(timeouts).toEqual([2_147_483_647, 2_147_483_647])
    expect(MIGRATION_LOCK_KEY).toMatch(/^-?\d+$/)
  })

  it('locks migrate:down, :fresh, :refresh and :reset too, re-entrantly', async () => {
    const queries: string[] = []
    const client = {
      query: async ({ text }: { text: string }) => {
        queries.push(text.split(' ')[1]!)
        return { rows: [{ locked: true }] }
      },
      release: () => {},
    }
    const inner = {
      name: 'postgres',
      defaultIDType: 'number',
      init: () => {
        const self: Record<string, unknown> = {
          pool: { connect: async () => client },
          payload: fakePayload,
        }
        for (const method of LOCKED_MIGRATION_METHODS) {
          self[method] = async () => {
            queries.push(`-- ${method}`)
            // A command that runs another inside itself takes no second lock.
            if (method === 'migrateRefresh') await (self.migrate as () => Promise<void>)()
          }
        }
        return self
      },
    } as unknown as DatabaseAdapterObj<PostgresAdapter>
    const adapter = withMigrationLock(inner).init({ payload: fakePayload }) as unknown as Record<
      string,
      () => Promise<void>
    >
    for (const method of ['migrateDown', 'migrateFresh', 'migrateReset'] as const) {
      queries.length = 0
      await adapter[method]!()
      expect(queries).toEqual([
        'pg_try_advisory_lock($1::bigint)',
        `-- ${method}`,
        'pg_advisory_unlock($1::bigint)',
      ])
    }
    queries.length = 0
    await adapter.migrateRefresh!()
    expect(queries).toEqual([
      'pg_try_advisory_lock($1::bigint)',
      '-- migrateRefresh',
      '-- migrate',
      'pg_advisory_unlock($1::bigint)',
    ])
  })
})
