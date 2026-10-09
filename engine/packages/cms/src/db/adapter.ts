/**
 * How Payload reaches this process's one database (ARCHITECTURE.md §2, §10; DEPLOYMENT.md §4).
 *
 * - **One database per process**, from `DATABASE_URL`. The pool is created on the first
 *   `getPayload()`, never at import: the build imports this config with no database at all
 *   (CONVENTIONS.md §12).
 * - **No schema push.** Schema reaches a database through migrations only (DEPLOYMENT.md §4.5).
 *   The one exception is PARALLEL-TRACKS.md §3.2's opt-in for an agent's own suffixed database,
 *   `PAYLOAD_DEV_PUSH=1`, and never in a production build (Payload itself never pushes there).
 *   It survives a second boot only while no table has a composite primary key — the thing
 *   drizzle-kit 0.31.7's push introspection cannot read (`42P02`, senior-db review of 3.2, S1).
 * - **Migrations in the web process only**: the bundled set (`prodMigrations` — a standalone
 *   build has no migration folder to read) is handed to Payload only when `RUN_MIGRATIONS=1`,
 *   so a worker, a CLI or a second pm2 app never migrates (ARCHITECTURE.md §10). Payload applies
 *   it on the first `getPayload()` of a production build — `/api/health`'s, on a deploy.
 * - **Under an advisory lock**: every migration command — the web process's `migrate()` and the
 *   CLI's `migrate`, `migrate:down`, `:fresh`, `:refresh`, `:reset` — takes `MIGRATION_LOCK_KEY`
 *   first (`./advisory-lock`).
 * - **Bounded waits** (the independent senior-db review of 4.8, S3). A pool connect — a new
 *   connection, or a free client when every one is out — gives up after `POOL_CONNECT_TIMEOUT_MS`,
 *   and a query after `QUERY_TIMEOUT_MS`, so a full pool or a black-holed connection answers
 *   `/api/health` with an error rather than never. pg's own default for both is "wait forever".
 *   The query bound is the web process's ceiling for one statement, a migration's included, so a
 *   backfill that would run longer is batched; the migration lock's own wait is exempt, since it
 *   lasts as long as another process's migration (`withMigrationLock`). A domain transaction sets
 *   tighter server-side timeouts of its own (ARCHITECTURE.md §6).
 * - **One client is always out.** Payload's first connect (`connectWithReconnect`,
 *   `@payloadcms/db-postgres/dist/connect.js`) checks a client out to prove the database answers
 *   and to hang its reconnect-on-`ECONNRESET` listener on it, and never releases it: that client is
 *   the adapter's liveness watch, so at most `max - 1` (pg's default `max` is 10) serve queries.
 * - **Constraints Payload cannot express** — CHECKs, a unique key over several columns — are
 *   declared beside each collection and added to the drizzle schema in `afterSchemaInit`
 *   (`./constraints`), so a dev push, a test's pushed database and `migrate:create` all carry
 *   them (CONVENTIONS.md §13).
 * - **Never a database it cannot find** (S4). Payload would `CREATE DATABASE` a `DATABASE_URL`
 *   that names none and boot on it empty — a typo migrated into an empty shop whose health check
 *   is green. `disableCreateDatabase` makes it refuse; `pnpm db:fresh` and a host's provisioning
 *   create the databases themselves.
 */
import { postgresAdapter, type PostgresAdapter } from '@payloadcms/db-postgres'
import type { DatabaseAdapterObj } from 'payload'

import { MIGRATION_LOCK_KEY, withAdvisoryLock, type LockPool } from './advisory-lock'
import { declareConstraints } from './constraints'

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

/** How long a pool connect waits, for a new connection or a free client. */
export const POOL_CONNECT_TIMEOUT_MS = 5_000
/** The pool's size, explicit (pg's implicit 10) so one process stays well inside the role's 20. */
export const POOL_MAX = 8
/** How long an idle pooled connection is kept before it is closed. */
export const POOL_IDLE_TIMEOUT_MS = 30_000
/** How long one query waits for its answer: the longest statement a process may run. */
export const QUERY_TIMEOUT_MS = 60_000
/** setTimeout's largest delay: the migration lock's wait, bounded by nothing short of it. */
const UNBOUNDED_MS = 2_147_483_647

export function buildDatabaseAdapter(
  options: DatabaseAdapterOptions,
): DatabaseAdapterObj<PostgresAdapter> {
  const { env, migrationDir, migrations } = options
  const adapter = postgresAdapter({
    pool: {
      connectionString: env.DATABASE_URL,
      connectionTimeoutMillis: POOL_CONNECT_TIMEOUT_MS,
      max: POOL_MAX,
      idleTimeoutMillis: POOL_IDLE_TIMEOUT_MS,
      query_timeout: QUERY_TIMEOUT_MS,
    },
    disableCreateDatabase: true,
    push: devPushRequested(env),
    migrationDir,
    afterSchemaInit: [declareConstraints],
    ...(runsMigrationsOnBoot(env) ? { prodMigrations: [...migrations] } : {}),
  })
  return withMigrationLock(adapter)
}

/** Every adapter method that runs migrations: each takes the lock (senior-db review of 3.2, N1). */
export const LOCKED_MIGRATION_METHODS = [
  'migrate',
  'migrateDown',
  'migrateFresh',
  'migrateRefresh',
  'migrateReset',
] as const

/**
 * Wraps the adapter Payload builds so every migration command runs under the migration lock.
 * Payload calls `this.migrate(...)` both on boot (`connect()`, production + `prodMigrations`) and
 * from `payload migrate`; `migrate:down`, `:fresh`, `:refresh` and `:reset` are wrapped the same.
 * The pool exists by then, since each runs after connecting. Re-entrant within the process: a
 * command that called another would otherwise wait on its own lock from a second connection.
 */
export function withMigrationLock(
  adapterObj: DatabaseAdapterObj<PostgresAdapter>,
): DatabaseAdapterObj<PostgresAdapter> {
  return {
    ...adapterObj,
    init: (args) => {
      const adapter = adapterObj.init(args)
      // A failed connect rejects the adapter's `initializing` promise with no reason, and nothing
      // in Payload awaits it: under Next that is a log line, in a plain Node process (a seed, an
      // import, `payload jobs:run`) an unhandled rejection that kills it before the caller's own
      // catch can retry (review N1). Observed here; whoever awaits it still sees the rejection.
      void (adapter as { initializing?: Promise<unknown> }).initializing?.catch(() => undefined)
      let holding = false
      const log = (message: string) =>
        adapter.payload.logger.info({ msg: `[migrations] ${message}` })
      for (const method of LOCKED_MIGRATION_METHODS) {
        const original = adapter[method] as ((...a: unknown[]) => Promise<unknown>) | undefined
        if (typeof original !== 'function') continue
        const bound = original.bind(adapter)
        const locked = async (...methodArgs: unknown[]) => {
          if (holding) return bound(...methodArgs)
          return withAdvisoryLock(
            unboundedQueries(adapter.pool as unknown as LockPool),
            MIGRATION_LOCK_KEY,
            async () => {
              holding = true
              try {
                return await bound(...methodArgs)
              } finally {
                holding = false
              }
            },
            log,
          )
        }
        Object.assign(adapter, { [method]: locked })
      }
      return adapter
    },
  }
}

/**
 * `pool`, its clients' queries exempt from `QUERY_TIMEOUT_MS`: the migration lock waits in
 * `pg_advisory_lock` for as long as another process migrates. A client-side timeout there would
 * also leave the session queued for the lock and hand it back to the pool, to take the lock later
 * with nobody to release it.
 */
export function unboundedQueries(pool: LockPool): LockPool {
  return {
    async connect() {
      const client = await pool.connect()
      return {
        query: (text, values) =>
          client.query({ text, values, query_timeout: UNBOUNDED_MS } as never),
        release: (error) => client.release(error),
        on: client.on?.bind(client),
        off: client.off?.bind(client),
      }
    },
  }
}
