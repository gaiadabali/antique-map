/**
 * A reference-safe delete for the discovery vocabulary (TASKS.md 8.2.g; the 8.1 review, senior-be,
 * "For 8.2"). A work points at makers, places, terms and sources; Payload stores a single relation
 * as a column whose foreign key is `ON DELETE SET NULL`, and a many-relation as a row of
 * `works_rels` the delete cascades away — so deleting a maker a work credits would drop the credit
 * **silently**, and the published page would lose its maker line with no error anywhere.
 *
 * So a maker, place, term or source that any work still references — as stored, or in a work's
 * latest draft, which may be the next to publish — cannot be deleted: "still used by N works".
 * A cataloguer merging duplicates re-points the works first.
 *
 * **Under a lock.** Every work save takes `WORK_REFERENCES_LOCK_KEY` shared; the delete takes it
 * exclusively before it counts, so it waits for every work save in flight to commit and counts what
 * they wrote, and a work save that starts while the delete runs waits for it, then fails on the
 * gone row's foreign key — loudly — rather than credit a deleted maker (`./work-transaction`).
 */
import {
  APIError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type PayloadRequest,
  type Where,
} from 'payload'

import { lockForTransaction, WORK_REFERENCES_LOCK_KEY } from './work-transaction'

/** The vocabulary a work references, and where on a work each is referenced. */
export const WORK_REFERENCE_PATHS = {
  makers: ['makers.maker'],
  places: ['places.place'],
  terms: ['subjects', 'condition.grade'],
  sources: ['references.source'],
} as const satisfies Record<string, readonly string[]>
export type ReferencedCollection = keyof typeof WORK_REFERENCE_PATHS

const NOUNS: Record<ReferencedCollection, string> = {
  makers: 'maker',
  places: 'place',
  terms: 'term',
  sources: 'source',
}

/** Every work save holds the references lock shared, so a vocabulary delete waits for it. */
export const holdWorkReferences: CollectionBeforeChangeHook = async ({ data, req }) => {
  await lockForTransaction(req, WORK_REFERENCES_LOCK_KEY, {
    shared: true,
    why: 'Saving a work',
  })
  return data
}

const anyOf = (paths: readonly string[], prefix: string, id: number | string): Where => ({
  or: paths.map((path) => ({ [`${prefix}${path}`]: { equals: id } })),
})

/** The works that reference `id` of `collection`, as stored or in their latest draft. */
export async function worksUsing(
  req: PayloadRequest,
  collection: ReferencedCollection,
  id: number | string,
): Promise<Set<string>> {
  const paths = WORK_REFERENCE_PATHS[collection]
  // The works collection's types are generated after the wave merges (TASKS.md 10.3.b).
  const payload = req.payload as unknown as {
    find: (args: object) => Promise<{ docs: Array<{ id: unknown }> }>
    findVersions: (args: object) => Promise<{ docs: Array<{ parent: unknown }> }>
  }
  const common = {
    collection: 'works',
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  }
  const stored = await payload.find({
    ...common,
    where: anyOf(paths, '', id),
    select: { workUid: true },
  })
  const drafted = await payload.findVersions({
    ...common,
    where: { and: [{ latest: { equals: true } }, anyOf(paths, 'version.', id)] },
  })
  const found = new Set<string>()
  for (const doc of stored.docs) found.add(String(doc.id))
  for (const version of drafted.docs) {
    const parent = version.parent
    const parentId =
      typeof parent === 'object' && parent !== null ? (parent as { id: unknown }).id : parent
    if (parentId !== null && parentId !== undefined) found.add(String(parentId))
  }
  return found
}

/** The message a refused delete answers with. */
export function stillUsedMessage(collection: ReferencedCollection, count: number): string {
  const works = count === 1 ? '1 work' : `${count} works`
  return `This ${NOUNS[collection]} is still used by ${works} (published or in a draft). Point those works at another ${NOUNS[collection]}, or remove it from them, before deleting it.`
}

/** A `beforeDelete` hook refusing to delete a record of `collection` any work still references. */
export function refuseDeleteWhileWorksUse(
  collection: ReferencedCollection,
): CollectionBeforeDeleteHook {
  return async ({ id, req }) => {
    await lockForTransaction(req, WORK_REFERENCES_LOCK_KEY, {
      why: `Deleting a ${NOUNS[collection]}`,
    })
    const using = await worksUsing(req, collection, id)
    if (using.size === 0) return
    throw new APIError(stillUsedMessage(collection, using.size), 409, null, true)
  }
}
