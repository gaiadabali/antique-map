/**
 * A work's change expires what the public was shown of it (TASKS.md 8.2.e; ARCHITECTURE.md §9,
 * §15; CONVENTIONS.md §12) — through `@engine/cache`'s `invalidate(tags)`, the one way a write
 * expires a cached read, which runs **after the commit**: Payload runs `afterChange` and
 * `afterDelete` before it commits, so the hook never revalidates on the spot. Inside a Next request
 * (the admin, REST) `invalidate()` schedules the revalidation with `after()`, once the response has
 * gone; outside one (a seed, the importer, a job) the caller's collector on `req.context` keeps the
 * tags, and the caller flushes them once its operation has returned. A caller outside a request
 * that forgot its collector gets `after()`'s error — a failed save, never a stale page.
 *
 * **Which tags.** `work:<workUid>` — the work's record and whatever renders it: its own page, the
 * product page of its original and every card or listing that shows it tags it so (C2 loaders).
 * A save that touches no published state — a draft saved over a draft — expires nothing. The
 * vocabulary pages that list works by maker, place or subject, and the products of a work, have no
 * tag kind yet (`@engine/cache` makes `item`, `work`, `availability`, `price`): `worksListingTags`
 * is the seam they join when SCH adds them (8.2's report, follow-ups).
 *
 * The invalidation hooks run last, so nothing after them in this collection can throw on a save
 * that has already queued its tags (a throw keeps them all the same — over-invalidating costs one
 * recompute, `@engine/cache` batch).
 */
import { invalidate, workTag, type CacheTag } from '@engine/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { WORK_UID_PATTERN } from '../validators/work-record'

type WorkDoc = { workUid?: unknown; _status?: unknown } | null | undefined

const uidOf = (doc: WorkDoc) =>
  typeof doc?.workUid === 'string' && WORK_UID_PATTERN.test(doc.workUid) ? doc.workUid : null

/** Whether the public could see a version of the work: published now, or before this save. */
function touchesPublished(doc: WorkDoc, previous: WorkDoc): boolean {
  return (
    doc?._status !== 'draft' || (previous?._status !== undefined && previous._status !== 'draft')
  )
}

/** The tags a change to `doc` (from `previous`) expires. */
export function worksListingTags(doc: WorkDoc, previous?: WorkDoc): CacheTag[] {
  const uids = new Set([uidOf(doc), uidOf(previous)].filter((uid): uid is string => uid !== null))
  return [...uids].map(workTag)
}

export const invalidateWorkOnChange: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
  context,
}) => {
  if (!touchesPublished(doc as WorkDoc, previousDoc as WorkDoc)) return doc
  const tags = worksListingTags(doc as WorkDoc, previousDoc as WorkDoc)
  if (tags.length > 0) invalidate(tags, context)
  return doc
}

export const invalidateWorkOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  // A work never published leaves nothing cached behind; unpublishing it expired its tags then.
  if ((doc as WorkDoc)?._status === 'draft') return doc
  const tags = worksListingTags(doc as WorkDoc)
  if (tags.length > 0) invalidate(tags, context)
  return doc
}
