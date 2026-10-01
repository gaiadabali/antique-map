/**
 * The database probe `runBootCheck({ database })` takes (`@engine/config/boot-check`, TASKS.md
 * 3.1.a): it asks the database it is connected to for its default isolation level, which must be
 * READ COMMITTED — `reserve()`'s lock order assumes it (ARCHITECTURE.md §6). `@engine/config`
 * imports no driver, so the process that owns the connection passes this in: the app's boot
 * (4.1) with Payload's own pool, `payload.db.pool`, after `getPayload()`.
 *
 * It throws when the database cannot answer; `checkDatabase()` turns that into a finding with
 * the connection string's credentials redacted.
 */
import type { DatabaseProbe } from '@engine/config/boot-check'

import type { LockPool } from './advisory-lock'

export function databaseProbe(pool: Pick<LockPool, 'connect'>): DatabaseProbe {
  return async () => {
    const client = await pool.connect()
    // A failed probe hands its error to `release()`, so pg destroys the connection rather than
    // pooling it: after a query timeout on a connection gone dark the query stays queued on it, and
    // a pooled one would stall every later query drawn on it (4.6 senior-be review #1).
    let failure: Error | undefined
    try {
      const result = await client.query('SHOW default_transaction_isolation')
      const value = result.rows[0]?.default_transaction_isolation
      if (typeof value !== 'string')
        throw new Error('SHOW default_transaction_isolation answered nothing')
      return { transactionIsolation: value }
    } catch (error) {
      failure = error instanceof Error ? error : new Error(String(error))
      throw error
    } finally {
      client.release(failure)
    }
  }
}
