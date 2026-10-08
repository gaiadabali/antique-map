/**
 * The payments core's one way into the database: a domain transaction (ARCHITECTURE.md §7) and raw
 * SQL inside it, through the Postgres adapter's own session — the same seam the stock count uses
 * (`collections/stock-levels/count.ts`). Payload cannot say "UPDATE … WHERE status = $from
 * RETURNING", "INSERT … ON CONFLICT DO NOTHING" or "FOR UPDATE", and every one of those is what
 * makes a payment apply once.
 *
 * Every transaction here runs READ COMMITTED (a row lock taken after a wait reads the row as the
 * winner committed it, which the compare-and-sets rely on), with `lock_timeout` and
 * `statement_timeout` set by `SET LOCAL`, so a stuck lock never holds a pool connection for the
 * adapter's 60-second query ceiling.
 *
 * **Contention is an answer, not a defect** (TASKS.md 10.5). The contended lock of each flow — the
 * order a payment applies to, the stock rows an order takes — is taken by `underShortLock`: under
 * a savepoint with a short `lock_timeout`, so a loser learns it lost within seconds, the
 * transaction stays usable to find out why (was the event already recorded? is the unit gone?),
 * and the caller answers plainly — 200 or 503 to Midtrans, `out_of_stock` or `busy` to a buyer —
 * instead of throwing a database error. `isLockContention` recognises the error.
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

import { isLockContention } from './contention'

type Database = Payload['db']
type Session = Parameters<Database['execute']>[0]['db']
export type Statement = ReturnType<typeof sql>
export type Row = Record<string, unknown>

/** The lock wait and statement ceilings of a payments transaction. */
export const LOCK_TIMEOUT = '5s'
export const STATEMENT_TIMEOUT = '15s'

export type Tx = {
  /** Runs one statement in the transaction and returns its rows. */
  rows(statement: Statement): Promise<Row[]>
}

/**
 * Runs `work` in one READ COMMITTED transaction and commits; any throw rolls everything back —
 * the dedupe row with it — and rethrows.
 */
export async function inTransaction<T>(payload: Payload, work: (tx: Tx) => Promise<T>): Promise<T> {
  const { db } = payload
  const id = await db.beginTransaction({ isolationLevel: 'read committed' })
  if (id === null) throw new Error('payments: the database adapter refused to open a transaction')
  const session = db.sessions?.[id]?.db as Session | undefined
  if (!session) throw new Error('payments: the transaction has no session')
  const tx: Tx = {
    async rows(statement) {
      const result = (await db.execute({ db: session, sql: statement })) as { rows?: Row[] }
      return result.rows ?? []
    },
  }
  try {
    await tx.rows(sql.raw(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`))
    await tx.rows(sql.raw(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT}'`))
    const result = await work(tx)
    await db.commitTransaction(id)
    return result
  } catch (error) {
    await db.rollbackTransaction(id)
    throw error
  }
}

export type ShortLock<T> = { readonly locked: true; readonly value: T } | { readonly locked: false }

/**
 * Runs `work` — the statements that take a contended lock — under a savepoint with `lock_timeout`
 * at `timeout`. Lock contention rolls back to the savepoint (releasing whatever `work` locked or
 * wrote) and answers `{ locked: false }`, the transaction still open and usable; anything else is
 * rethrown. On success the transaction's own `LOCK_TIMEOUT` is restored for what follows.
 */
export async function underShortLock<T>(
  tx: Tx,
  timeout: string,
  work: () => Promise<T>,
): Promise<ShortLock<T>> {
  await tx.rows(sql.raw('SAVEPOINT short_lock'))
  await tx.rows(sql.raw(`SET LOCAL lock_timeout = '${timeout}'`))
  try {
    const value = await work()
    await tx.rows(sql.raw(`SET LOCAL lock_timeout = '${LOCK_TIMEOUT}'`))
    await tx.rows(sql.raw('RELEASE SAVEPOINT short_lock'))
    return { locked: true, value }
  } catch (error) {
    if (!isLockContention(error)) throw error
    // Undoes `work` and the SET LOCAL with it: the transaction's LOCK_TIMEOUT is back.
    await tx.rows(sql.raw('ROLLBACK TO SAVEPOINT short_lock'))
    return { locked: false }
  }
}

/** Reads a whole-rupiah or count column (`numeric`, which pg returns as a string) as a safe integer. */
export function wholeOf(value: unknown, what: string): number {
  const number = typeof value === 'string' ? Number(value) : value
  if (typeof number !== 'number' || !Number.isSafeInteger(number)) {
    throw new RangeError(`payments: ${what} is not a whole number: ${String(value)}`)
  }
  return number
}

/** A timestamp column as a Date (pg returns `timestamptz` as a Date already; a string is parsed). */
export function dateOf(value: unknown, what: string): Date {
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) throw new RangeError(`payments: ${what} is not a timestamp`)
  return date
}

export { isLockContention, sql }
