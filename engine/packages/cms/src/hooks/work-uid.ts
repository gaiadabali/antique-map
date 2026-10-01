/**
 * `works.workUid` (CONTENT-MODEL.md §1): unique and immutable, `<prefix>-000123`, the prefix the
 * brand's own (C1 `ids.workUidPrefix`) — the id sister sync, redirects and the cache's work tag
 * key on, so it is made once and never changed.
 *
 * - **On create** it is the brand's next number, taken under an exclusive lock in the operation's
 *   transaction (`./work-transaction`), so two works saved at once never share one. A person never
 *   chooses it — the admin's duplicate included; a script on the Local API (the migration
 *   importer) may hand one over, which must be of this brand's shape.
 * - **On update** any change to it is refused, by any API.
 *
 * The number is the highest of this brand's uids plus one; a deleted work's uid could come back if
 * it was the highest (8.2's report: a sequence would close that).
 */
import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type PayloadRequest,
} from 'payload'

import { activeBrand } from '../access/brand'
import { formatWorkUid, workUidError } from '../validators/work-record'
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

/** The brand's prefix, or a refusal: a uid cannot be made for no brand. */
function prefixOf(): string {
  const prefix = activeBrand()?.ids.workUidPrefix
  if (!prefix) {
    throw new APIError(
      'No brand is loaded (BRAND is unset), so a new work cannot be given its uid: the prefix is the brand’s.',
      500,
    )
  }
  return prefix
}

/** The next number under `prefix`, read under the lock in this operation's transaction. */
export async function nextWorkUid(req: PayloadRequest, prefix: string): Promise<string> {
  const why = 'Numbering a new work'
  await lockForTransaction(req, WORK_UID_LOCK_KEY, { why })
  // `prefix` matched C1's `^[A-Z][A-Z0-9]{1,7}$` when the brand config loaded: safe to inline.
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
      refuse(req, 'A work keeps its uid for ever: sister copies and redirects point at it.')
    }
    return data
  }
  const prefix = prefixOf()
  if (isScript(req) && typeof sent === 'string' && sent !== '') {
    const error = workUidError(sent, prefix)
    if (error) refuse(req, error)
    return data
  }
  return { ...data, workUid: await nextWorkUid(req, prefix) }
}
