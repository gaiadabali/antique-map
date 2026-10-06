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
 * product page of its original and every card that shows it tags it so (C2 loaders) — and
 * `catalogue:gallery`, the gallery's listings: browse, facets, search and the home rail, which
 * show works no record tag can name (a work published a moment ago is on no cached listing yet).
 * Every save that touches published state expires both: a publish, an edit of a published work,
 * an unpublish, a delete. A draft saved over a published work cannot be told from an unpublish
 * here, so it expires them too — one recompute, never a stale page. A save that touches no
 * published state — a draft saved over a never-published draft — expires nothing
 * (`./published-state`, which also says why a draft over a draft may still be an unpublish). The
 * vocabulary the listings filter and find by expires the catalogue from its own hooks
 * (`./vocabulary-invalidate`).
 *
 * The invalidation hooks run last, so nothing after them in this collection can throw on a save
 * that has already queued its tags (a throw keeps them all the same — over-invalidating costs one
 * recompute, `@engine/cache` batch).
 */
import { catalogueTag, invalidate, workTag, type CacheTag } from '@engine/cache'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { WORK_UID_PATTERN } from '../validators/work-record'
import { changedPublishedState } from './published-state'

type WorkDoc = { workUid?: unknown; _status?: unknown } | null | undefined

/** The gallery's listings: every published work's change can add to, drop from or reorder one. */
const GALLERY_CATALOGUE = catalogueTag('gallery')

const uidOf = (doc: WorkDoc) =>
  typeof doc?.workUid === 'string' && WORK_UID_PATTERN.test(doc.workUid) ? doc.workUid : null

/** The tags a change to `doc` (from `previous`) expires: its uids' and the gallery's listings. */
export function worksListingTags(doc: WorkDoc, previous?: WorkDoc): CacheTag[] {
  const uids = new Set([uidOf(doc), uidOf(previous)].filter((uid): uid is string => uid !== null))
  return [...[...uids].map(workTag), GALLERY_CATALOGUE]
}

export const invalidateWorkOnChange: CollectionAfterChangeHook = async (args) => {
  const { doc, previousDoc, context } = args
  if (!(await changedPublishedState(args))) return doc
  invalidate(worksListingTags(doc as WorkDoc, previousDoc as WorkDoc), context)
  return doc
}

export const invalidateWorkOnDelete: CollectionAfterDeleteHook = ({ doc, context }) => {
  // A work never published leaves nothing cached behind; unpublishing it expired its tags then.
  if ((doc as WorkDoc)?._status === 'draft') return doc
  invalidate(worksListingTags(doc as WorkDoc), context)
  return doc
}
