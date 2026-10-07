/**
 * The drafting tool's audit trail on a work (TASKS.md 8.3.b; AI.md §5 "Flags and the publish
 * gate"): who verified each drafted field and when is the **server's** record, taken from the
 * request's signed-in user at the moment the field's Verified box goes on — never a value the
 * client sends.
 *
 * - **A client write** (REST or GraphQL — the admin saves through REST): `drafted` and the last
 *   run (`aiDraftRun`) keep their stored values whatever is sent, so nobody clears a draft flag or
 *   forges who asked for a run; `verifiedBy` / `verifiedAt` are stamped when `verified` turns on,
 *   kept while it stays on, and cleared when it goes off.
 * - **A server write** (the Local API: the drafting tool itself, the importer, a seed, a test)
 *   is trusted with what it sends; a field it marks verified without saying who or when is
 *   stamped all the same.
 *
 * Runs before `hooks/work-cataloguing` and `hooks/work-guard`, which read the result.
 */
import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { isStaffUser } from '../access/roles'
import { AI_DRAFTABLE_FIELDS } from '../collections/works/vocabulary'

type Doc = Record<string, unknown>

const obj = (value: unknown): Doc =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Doc) : {}

/** A relation's id, whether stored as the id or populated. */
const idOf = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  const id = obj(value).id
  return typeof id === 'number' || typeof id === 'string' ? id : null
}

function userIdOf(req: PayloadRequest): number | string | null {
  return isStaffUser(req.user) ? idOf(req.user) : null
}

/** One draftable field's entry, as this save will store it. */
function stampEntry(
  was: Doc,
  sent: Doc,
  trusted: boolean,
  who: number | string | null,
  now: string,
): Doc {
  const got = { ...was, ...sent }
  const verified = got.verified === true
  const turnedOn = verified && was.verified !== true
  if (trusted) {
    if (!turnedOn || got.verifiedAt) return got
    return { ...got, verifiedBy: idOf(got.verifiedBy) ?? who, verifiedAt: now }
  }
  return {
    drafted: was.drafted === true,
    verified,
    verifiedBy: !verified ? null : turnedOn ? who : idOf(was.verifiedBy),
    verifiedAt: !verified ? null : turnedOn ? now : (was.verifiedAt ?? now),
  }
}

export const stampAiDraft: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const sent = obj(data).cataloguing
  if (sent === undefined || sent === null || typeof sent !== 'object') return data
  const before = obj(operation === 'update' ? obj(originalDoc).cataloguing : undefined)
  const trusted = req.payloadAPI === 'local'
  const sentGroup = sent as Doc
  // A server write that does not touch the drafting fields leaves them to Payload's merge.
  if (trusted && sentGroup.aiDraft === undefined) return data
  const who = userIdOf(req)
  const now = new Date().toISOString()
  const beforeDraft = obj(before.aiDraft)
  const sentDraft = obj(sentGroup.aiDraft)
  const aiDraft: Doc = {}
  for (const field of AI_DRAFTABLE_FIELDS) {
    aiDraft[field] = stampEntry(obj(beforeDraft[field]), obj(sentDraft[field]), trusted, who, now)
  }
  const cataloguing: Doc = { ...sentGroup, aiDraft }
  if (!trusted) {
    const run = obj(before.aiDraftRun)
    cataloguing.aiDraftRun = {
      requestedBy: idOf(run.requestedBy),
      requestedAt: run.requestedAt ?? null,
      record: run.record ?? null,
    }
  }
  return { ...(data as Doc), cataloguing }
}
