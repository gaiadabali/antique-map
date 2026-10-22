/**
 * What the works hooks do inside an operation's own transaction: take a transaction-scoped
 * advisory lock, and run one read on the same connection, so what they read and what they write
 * commit or roll back together (as the place tree's lock does, `collections/places/tree`).
 *
 * Two locks, both released at the operation's COMMIT or ROLLBACK:
 *
 * - **`WORK_UID_LOCK_KEY`**, exclusive: a new work's uid is the next number, read and
 *   taken under it, so two works saved at once never take one number.
 * - **`WORK_REFERENCES_LOCK_KEY`**, shared by every work save and exclusive for a delete of a
 *   maker, place, term or source (`./work-references`). A save that still holds it shared has not
 *   committed; the delete waits for it, then counts every reference — and a save that starts after
 *   the delete took it waits until the delete is done, then fails on the gone row's foreign key
 *   rather than lose a credit silently. Saves never wait on each other.
 *
 * A write with no transaction to hold a lock (a Local API call with `disableTransaction`) is
 * refused rather than guarded half-way.
 */
import { APIError, type PayloadRequest } from 'payload'

import { advisoryLockKey } from '../db/advisory-lock'

export const WORK_UID_LOCK_KEY = advisoryLockKey('engine/works/uid')
export const WORK_REFERENCES_LOCK_KEY = advisoryLockKey('engine/works/references')

type Database = PayloadRequest['payload']['db']
type ExecuteArgs = Parameters<Database['execute']>[0]

/** The operation's own connection, or a refusal naming why it needs one. */
async function sessionOf(req: PayloadRequest, why: string): Promise<ExecuteArgs['db']> {
  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID === undefined ? undefined : db.sessions?.[transactionID]
  if (!session) throw new APIError(`${why} needs a transaction: save it with one.`, 500)
  return session.db as ExecuteArgs['db']
}

/** Runs `sql` on the operation's own connection and answers its rows. */
export async function queryInTransaction(
  req: PayloadRequest,
  sql: string,
  why: string,
): Promise<Array<Record<string, unknown>>> {
  const session = await sessionOf(req, why)
  const result = (await req.payload.db.execute({ db: session, raw: sql })) as {
    rows?: Array<Record<string, unknown>>
  }
  return result.rows ?? []
}

/** Takes `key` for the rest of the operation's transaction; `shared` lets other sharers in. */
export async function lockForTransaction(
  req: PayloadRequest,
  key: string,
  options: { shared?: boolean; why: string },
): Promise<void> {
  const fn = options.shared ? 'pg_advisory_xact_lock_shared' : 'pg_advisory_xact_lock'
  // `key` is advisoryLockKey()'s decimal string, never input: safe to inline.
  await queryInTransaction(req, `SELECT ${fn}(${BigInt(key).toString()})`, options.why)
}
