/**
 * The lock that lets exactly one process migrate a database (ARCHITECTURE.md §10,
 * DEPLOYMENT.md §3–4). Payload applies pending migrations on the first `getPayload()` of a
 * production process; a reload that briefly runs the old and the new process side by side, or a
 * `payload migrate` run by hand during a deploy, would otherwise send the same DDL twice. A
 * session-level `pg_advisory_lock` on its own connection serialises them: the second waits, then
 * reads `payload_migrations` afresh and finds nothing left to do.
 *
 * The lock is held on a dedicated connection, never one the migrations use, so it cannot be
 * released early by a migration's own COMMIT or ROLLBACK. A process that dies mid-migration
 * drops its connection and Postgres releases the lock with it — no stale lock survives a crash.
 * Advisory locks are scoped to the current database: two databases never wait on each other.
 *
 * Two things this needs of the connection (senior-db review of 3.2, N2):
 * - **`DATABASE_URL` reaches Postgres directly, or through a session-mode pooler** — never a
 *   transaction-mode one (PgBouncer's default for many hosts), which hands each statement to a
 *   different server session: the lock would be taken and released on sessions nobody holds.
 * - **The lock's connection must outlive the migration.** It sits idle while the migration runs on
 *   other connections, so a server `idle_session_timeout` shorter than the longest migration
 *   would end it and release the lock mid-migration. Losing the connection ends the process
 *   (`onLost`): carrying on would let a second process migrate beside this one.
 */
import { createHash } from 'node:crypto'

/** The part of `pg.Pool` this needs — a fake in tests, the adapter's pool in a process. */
export type LockPool = {
  connect(): Promise<LockClient>
}
export type LockClient = {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
  release(error?: Error | boolean): void
  on?(event: 'error', listener: (error: Error) => void): unknown
  off?(event: 'error', listener: (error: Error) => void): unknown
}

export type LockLog = (message: string) => void

/**
 * A signed 64-bit key derived from a fixed name, passed to Postgres as text so no JavaScript
 * number rounds it. Derived rather than invented so a reader can recompute it.
 */
export function advisoryLockKey(name: string): string {
  return createHash('sha256').update(name, 'utf8').digest().readBigInt64BE(0).toString()
}

/** The key every process takes before it migrates. Changing it lets two versions migrate at once. */
export const MIGRATION_LOCK_NAME = 'engine/payload-migrations'
export const MIGRATION_LOCK_KEY = advisoryLockKey(MIGRATION_LOCK_NAME)

/**
 * Runs `task` while holding the advisory lock `key`. Tries first so the log can say when a
 * process is waiting behind another; then waits as long as the holder needs (a migration that
 * hangs holds up the second process's health check, which rolls the deploy back — DEPLOYMENT.md
 * §3). Always unlocks and releases, and destroys the connection if unlocking itself failed.
 */
/** The lock's connection died while held: the lock is gone, so this process must not go on. */
function exitOnLostLock(error: Error, log: LockLog): void {
  log(
    `lost the advisory lock's connection (${error.message}); exiting so no second migration runs beside this one`,
  )
  process.exit(1)
}

export async function withAdvisoryLock<T>(
  pool: LockPool,
  key: string,
  task: () => Promise<T>,
  log: LockLog = () => {},
  onLost: (error: Error, log: LockLog) => void = exitOnLostLock,
): Promise<T> {
  const client = await pool.connect()
  const lost = (error: Error) => onLost(error, log)
  client.on?.('error', lost)
  let broken: Error | undefined
  try {
    const tried = await client.query('SELECT pg_try_advisory_lock($1::bigint) AS locked', [key])
    if (tried.rows[0]?.locked !== true) {
      log(`waiting for advisory lock ${key}: another process is migrating this database`)
      await client.query('SELECT pg_advisory_lock($1::bigint)', [key])
    }
    log(`holding advisory lock ${key}`)
    try {
      return await task()
    } finally {
      try {
        await client.query('SELECT pg_advisory_unlock($1::bigint)', [key])
        log(`released advisory lock ${key}`)
      } catch (error) {
        // The session is suspect; destroying the connection releases the lock server-side.
        broken = error instanceof Error ? error : new Error(String(error))
      }
    }
  } finally {
    client.off?.('error', lost)
    client.release(broken ?? false)
  }
}
