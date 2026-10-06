/**
 * Whether a save changed what the public could see of a drafted record — the gate the cache
 * invalidation hooks share (`./work-invalidate`, `./vocabulary-invalidate`): a save the public never
 * saw expires nothing, so a seed's or a test's draft writes need no collector.
 *
 * **The trap.** On an update, Payload's `previousDoc` is the record's latest *version*
 * (`getLatestCollectionVersion`), not the published row the public reads. Once a draft revision has
 * been saved over a published record, the next save reads draft → draft — and that save may be the
 * unpublish, which takes the record off every listing. So a draft → draft update asks whether the
 * record was ever published (one count of its published versions, in the save's transaction): if
 * it was, the save expires the tags. That over-invalidates a draft edit of a once-published record
 * — one recompute — and never misses an unpublish (the 5.1 stale-browse fix's db test proved the
 * miss on a real Payload).
 */
import type { CollectionAfterChangeHook } from 'payload'

type Drafted = { _status?: unknown } | null | undefined

/** What `doc` and `previous` alone show: published now, or published in the version before. */
export function touchesPublished(doc: Drafted, previous: Drafted): boolean {
  return (
    doc?._status !== 'draft' || (previous?._status !== undefined && previous._status !== 'draft')
  )
}

type ChangeArgs = Pick<
  Parameters<CollectionAfterChangeHook>[0],
  'collection' | 'doc' | 'operation' | 'previousDoc' | 'req'
>

/** Whether this save may have changed what the public sees (see the header for draft → draft). */
export async function changedPublishedState({
  collection,
  doc,
  operation,
  previousDoc,
  req,
}: ChangeArgs): Promise<boolean> {
  if (touchesPublished(doc as Drafted, previousDoc as Drafted)) return true
  const id = (doc as { id?: unknown } | null)?.id
  if (operation !== 'update' || (typeof id !== 'number' && typeof id !== 'string')) return false
  const { totalDocs } = await req.payload.countVersions({
    collection: collection.slug as never,
    where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
    overrideAccess: true,
    req,
  })
  return totalDocs > 0
}
