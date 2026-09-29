import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { DatabaseAdapterObj, Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  buildDatabaseAdapter,
  devPushRequested,
  runsMigrationsOnBoot,
  withMigrationLock,
  type BundledMigration,
} from './adapter'
import { MIGRATION_LOCK_KEY } from './advisory-lock'
import { declareEngineTables, ENGINE_TABLES } from './engine-tables'

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
    expect(adapter.poolOptions).toEqual({ connectionString: 'postgres://u:p@db.invalid:5432/x' })
    expect(adapter.pool).toBeUndefined()
  })

  it('declares the engine tables in afterSchemaInit, so migrations carry them', () => {
    expect(adapterFor({}).afterSchemaInit).toContain(declareEngineTables)
  })

  it('runs every migrate() under the migration lock', async () => {
    const queries: string[] = []
    const client = {
      query: async (text: string) => {
        queries.push(text)
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
    expect(MIGRATION_LOCK_KEY).toMatch(/^-?\d+$/)
  })
})

describe('the engine-table seam', () => {
  const emptySchema = { enums: {}, relations: {}, tables: {} }
  const hookArgs = (tables: Record<string, unknown>) =>
    ({
      schema: { ...emptySchema, tables },
      adapter: {},
      extendTable: () => {},
    }) as unknown as Parameters<typeof declareEngineTables>[0]

  it('adds every engine table by its name', async () => {
    const result = await declareEngineTables(hookArgs({}))
    expect(Object.keys(result.tables)).toEqual(Object.keys(ENGINE_TABLES))
    expect(Object.keys(result.tables)).toContain('idempotency_keys')
  })

  it('refuses an engine table whose name a Payload table already has', async () => {
    expect(() => declareEngineTables(hookArgs({ idempotency_keys: {} }))).toThrow(/collides/)
  })
})
