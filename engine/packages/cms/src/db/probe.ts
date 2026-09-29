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
    try {
      const result = await client.query('SHOW default_transaction_isolation')
      const value = result.rows[0]?.default_transaction_isolation
      if (typeof value !== 'string')
        throw new Error('SHOW default_transaction_isolation answered nothing')
      return { transactionIsolation: value }
    } finally {
      client.release()
    }
  }
}
