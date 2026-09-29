/**
 * How Payload reaches this process's one database (ARCHITECTURE.md §2, §10; DEPLOYMENT.md §4).
 *
 * - **One database per process**, from `DATABASE_URL`. The pool is created on the first
 *   `getPayload()`, never at import: the build imports this config with no database at all
 *   (CONVENTIONS.md §12).
 * - **No schema push.** Schema reaches a database through migrations only (DEPLOYMENT.md §4.5).
 *   The one exception is PARALLEL-TRACKS.md §3.2's opt-in for an agent's own suffixed database,
 *   `PAYLOAD_DEV_PUSH=1`, and never in a production build (Payload itself never pushes there).
 * - **Migrations in the web process only**: the bundled set (`prodMigrations` — a standalone
 *   build has no migration folder to read) is handed to Payload only when `RUN_MIGRATIONS=1`,
 *   so a worker, a CLI or a second pm2 app never migrates (ARCHITECTURE.md §10). Payload applies
 *   it on the first `getPayload()` of a production build — `/api/health`'s, on a deploy.
 * - **Under an advisory lock**: every `migrate()` — the web process's and `payload migrate`'s —
 *   takes `MIGRATION_LOCK_KEY` first (`./advisory-lock`).
 * - **Engine tables** Payload cannot express are declared in `afterSchemaInit` (`./engine-tables`),
 *   so the one migration set carries them (PARALLEL-TRACKS.md §1).
 */
import { postgresAdapter, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { DatabaseAdapterObj } from 'payload'

import { MIGRATION_LOCK_KEY, withAdvisoryLock, type LockPool } from './advisory-lock'
import { declareEngineTables } from './engine-tables'

export type DatabaseEnv = Readonly<Record<string, string | undefined>>

/** A migration as the generated `migrations/index.ts` lists it. */
export type BundledMigration = NonNullable<
  Parameters<typeof postgresAdapter>[0]['prodMigrations']
>[number]

export type DatabaseAdapterOptions = {
  readonly env: DatabaseEnv
  /** `src/migrations`, where `payload migrate:create` writes (the SCH lead only). */
  readonly migrationDir: string
  readonly migrations: readonly BundledMigration[]
}

/** `RUN_MIGRATIONS=1` is the web process's mark (DEPLOYMENT.md §2, §8); anything else never migrates on boot. */
export function runsMigrationsOnBoot(env: DatabaseEnv): boolean {
  return env.RUN_MIGRATIONS === '1'
}

/** Dev push: opt-in on one's own database, never in a production build (PARALLEL-TRACKS.md §3.2). */
export function devPushRequested(env: DatabaseEnv): boolean {
  return env.PAYLOAD_DEV_PUSH === '1' && env.NODE_ENV !== 'production'
}

export function buildDatabaseAdapter(
  options: DatabaseAdapterOptions,
): DatabaseAdapterObj<PostgresAdapter> {
  const { env, migrationDir, migrations } = options
  const adapter = postgresAdapter({
    pool: { connectionString: env.DATABASE_URL },
    push: devPushRequested(env),
    migrationDir,
    ...(runsMigrationsOnBoot(env) ? { prodMigrations: [...migrations] } : {}),
    afterSchemaInit: [declareEngineTables],
  })
  return withMigrationLock(adapter)
}

/**
 * Wraps the adapter Payload builds so its `migrate()` runs under the migration lock. Payload
 * calls `this.migrate(...)` both on boot (`connect()`, production + `prodMigrations`) and from
 * `payload migrate`, so replacing the method covers both; the pool exists by then, since both
 * migrate after connecting.
 */
export function withMigrationLock(
  adapterObj: DatabaseAdapterObj<PostgresAdapter>,
): DatabaseAdapterObj<PostgresAdapter> {
  return {
    ...adapterObj,
    init: (args) => {
      const adapter = adapterObj.init(args)
      const migrate = adapter.migrate.bind(adapter)
      adapter.migrate = (migrateArgs) =>
        withAdvisoryLock(
          adapter.pool as unknown as LockPool,
          MIGRATION_LOCK_KEY,
          () => migrate(migrateArgs),
          (message) => adapter.payload.logger.info({ msg: `[migrations] ${message}` }),
        )
      return adapter
    },
  }
}
