import type { PostgresAdapter } from '@payloadcms/db-postgres'
import type { DatabaseAdapterObj, Payload } from 'payload'
import {
  getTableConfig,
  pgTable,
  primaryKey,
  text,
  type PgTableFn,
} from '@payloadcms/db-postgres/drizzle/pg-core'
import { describe, expect, it, vi } from 'vitest'

import {
  buildDatabaseAdapter,
  devPushRequested,
  LOCKED_MIGRATION_METHODS,
  runsMigrationsOnBoot,
  withMigrationLock,
  type BundledMigration,
} from './adapter'
import { MIGRATION_LOCK_KEY } from './advisory-lock'
import { declareEngineTables, declareEngineTablesFrom, engineTables } from './engine-tables'
import { idempotencyKeysTable } from './idempotency'

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

  it('locks migrate:down, :fresh, :refresh and :reset too, re-entrantly', async () => {
    const queries: string[] = []
    const client = {
      query: async (text: string) => {
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

describe('the engine-table seam', () => {
  const emptySchema = { enums: {}, relations: {}, tables: {} }
  const hookArgs = (tables: Record<string, unknown>) =>
    ({
      schema: { ...emptySchema, tables },
      adapter: { pgSchema: { table: pgTable } },
      extendTable: () => {},
    }) as unknown as Parameters<typeof declareEngineTables>[0]

  it('adds every area’s engine tables by name, through the adapter’s table builder', async () => {
    const result = await declareEngineTables(hookArgs({}))
    expect(Object.keys(result.tables)).toEqual([...engineTables().keys()])
    expect(Object.keys(result.tables)).toContain('idempotency_keys')
    const table = vi.fn(pgTable)
    await declareEngineTables({ ...hookArgs({}), adapter: { pgSchema: { table } } } as never)
    expect(table).toHaveBeenCalledWith('idempotency_keys', expect.anything(), expect.anything())
  })

  it('refuses an engine table whose name a Payload table already has', async () => {
    expect(() => declareEngineTables(hookArgs({ idempotency_keys: {} }))).toThrow(/collides/)
  })

  it('refuses a name two areas both declare', () => {
    const build = (t: PgTableFn) => t('twice', { id: text('id') })
    expect(() =>
      engineTables([
        ['a', { twice: build }],
        ['b', { twice: build }],
      ]),
    ).toThrow(/db\/a\.ts and db\/b\.ts/)
  })

  it('refuses a composite primary key (drizzle-kit push cannot introspect one)', () => {
    const composite = (t: PgTableFn) =>
      t('keyed', { a: text('a').notNull(), b: text('b').notNull() }, (c) => [
        primaryKey({ columns: [c.a, c.b] }),
      ])
    const hook = declareEngineTablesFrom([['area', { keyed: composite }]])
    expect(() => hook(hookArgs({}))).toThrow(/composite primary key/)
  })

  it('declares idempotency_keys unique on (operation, key), both NOT NULL, response nullable', () => {
    const config = getTableConfig(idempotencyKeysTable(pgTable))
    expect(config.primaryKeys).toEqual([])
    expect(config.uniqueConstraints.map((u) => u.columns.map((c) => c.name))).toEqual([
      ['operation', 'key'],
    ])
    const byName = Object.fromEntries(config.columns.map((c) => [c.name, c]))
    expect(byName.operation?.notNull && byName.key?.notNull).toBe(true)
    expect(byName.response?.notNull).toBe(false)
    expect(byName.operation?.getSQLType()).toBe('text COLLATE "C"')
  })
})
