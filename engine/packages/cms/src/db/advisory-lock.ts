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
 * Advisory locks are scoped to the current database, so the two brands never wait on each other.
 */
import { createHash } from 'node:crypto'

/** The part of `pg.Pool` this needs — a fake in tests, the adapter's pool in a process. */
export type LockPool = {
  connect(): Promise<LockClient>
}
export type LockClient = {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
  release(error?: Error | boolean): void
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
export async function withAdvisoryLock<T>(
  pool: LockPool,
  key: string,
  task: () => Promise<T>,
  log: LockLog = () => {},
): Promise<T> {
  const client = await pool.connect()
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
    client.release(broken ?? false)
  }
}
