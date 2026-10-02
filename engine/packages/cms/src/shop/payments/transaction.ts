/**
 * The payments core's one way into the database: a domain transaction (ARCHITECTURE.md §7) and raw
 * SQL inside it, through the Postgres adapter's own session — the same seam the stock count uses
 * (`collections/stock-levels/count.ts`). Payload cannot say "UPDATE … WHERE status = $from
 * RETURNING", "INSERT … ON CONFLICT DO NOTHING" or "FOR UPDATE", and every one of those is what
 * makes a payment apply once.
 *
 * Every transaction here runs READ COMMITTED (a row lock taken after a wait reads the row as the
 * winner committed it, which the compare-and-sets rely on), with `lock_timeout` and
 * `statement_timeout` set by `SET LOCAL`, so a stuck lock fails the webhook with a 500 — Midtrans
 * retries — instead of holding a pool connection for the adapter's 60-second query ceiling.
 */
import { sql } from '@payloadcms/db-postgres/drizzle'
import type { Payload } from 'payload'

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
 * the dedupe row with it — and rethrows, so the caller answers 500 and the event is retried.
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

export { sql }
