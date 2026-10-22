/**
 * `works.workUid`: unique and immutable, `IG-000123`, the prefix the gallery's
 * (`WORK_UID_PREFIX`) — the id redirects and the cache's work tag key on, so it is made once and
 * never changed. TASKS.md 3.2.b replaces it with CONTENT-MODEL.md §3's `publicId`.
 *
 * - **On create** it is the next number, taken under an exclusive lock in the operation's
 *   transaction (`./work-transaction`), so two works saved at once never share one. A person never
 *   chooses it — the admin's duplicate included; a script on the Local API (the migration
 *   importer) may hand one over, which must be of the gallery's shape.
 * - **On update** any change to it is refused, by any API.
 *
 * The number is the highest uid plus one; a deleted work's uid could come back if
 * it was the highest (8.2's report: a sequence would close that).
 */
import { ValidationError, type CollectionBeforeChangeHook, type PayloadRequest } from 'payload'

import { formatWorkUid, WORK_UID_PREFIX, workUidError } from '../validators/work-record'
import { asLabel } from './work-facts'
import { lockForTransaction, queryInTransaction, WORK_UID_LOCK_KEY } from './work-transaction'

const WORKS = 'works'

function refuse(req: PayloadRequest, message: string): never {
  throw new ValidationError(
    {
      collection: WORKS,
      errors: [{ path: 'workUid', message, label: asLabel('Work uid', message) }],
      req,
    },
    req.t,
  )
}

/** The next number under `prefix`, read under the lock in this operation's transaction. */
export async function nextWorkUid(req: PayloadRequest, prefix: string): Promise<string> {
  // Inlined below, so held to the prefix shape first: never a caller's arbitrary text in SQL.
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(prefix))
    throw new TypeError(`not a work uid prefix: "${prefix}"`)
  const why = 'Numbering a new work'
  await lockForTransaction(req, WORK_UID_LOCK_KEY, { why })
  const rows = await queryInTransaction(
    req,
    `SELECT coalesce(max(substring(work_uid from '^${prefix}-([0-9]+)$')::bigint), 0) AS n FROM "works"`,
    why,
  )
  return formatWorkUid(prefix, Number(rows[0]?.n ?? 0) + 1)
}

/** Whether this write is a script's — the Local API with no one signed in. */
const isScript = (req: PayloadRequest) => req.payloadAPI === 'local' && !req.user

export const assignWorkUid: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const sent = (data as { workUid?: unknown }).workUid
  if (operation === 'update') {
    const stored = (originalDoc as { workUid?: unknown } | undefined)?.workUid
    if ('workUid' in data && sent !== stored && !(stored == null && sent == null)) {
      refuse(req, 'A work keeps its uid for ever: redirects point at it.')
    }
    return data
  }
  const prefix = WORK_UID_PREFIX
  if (isScript(req) && typeof sent === 'string' && sent !== '') {
    const error = workUidError(sent, prefix)
    if (error) refuse(req, error)
    return data
  }
  return { ...data, workUid: await nextWorkUid(req, prefix) }
}
