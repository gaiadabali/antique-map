/**
 * The hooks that apply the gazetteer's guards (`validators/place-ancestry`, pure) on every write
 * path — the admin, REST, the Local API, the seed and the importer — because a hook, unlike
 * access or a field validator, is never skipped (CONTENT-MODEL.md §9: guards run on every write).
 * Each first takes the place-tree lock (`./tree`), so concurrent writes are judged one at a time.
 *
 * **Both versions of the tree are walked.** With drafts, a place has a published parent (the
 * main row) and its latest draft's parent, and either may later be the one in force: a draft
 * that moves Bali under Lombok, published while Lombok's published parent is Bali, would close a
 * loop no single view shows. So a proposed parent is refused if *either* chain above it reaches
 * the place being saved. A swap is two steps — publish the move out first, then the move in —
 * and the message says which place is in the way.
 *
 * **Depth is judged on a move only**, for the subtree the place carries; a save that keeps its
 * parent is checked for cycles alone, so a place is never left un-editable (senior-be review, S2).
 *
 * **A place with places under it cannot be deleted** — under it as stored or in a child's latest
 * draft (S3): those children would silently become roots and their addresses would change.
 */
import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
} from 'payload'

import { ancestryMessage, ancestryProblem, type PlaceId } from '../../validators/place-ancestry'
import { chainAbove, childrenOf, idOf, lockPlaceTree, subtreeHeight } from './tree'

export { idOf } from './tree'

const PLACES = 'places'

type PlaceDoc = { id?: unknown; parent?: unknown }

/** The effective parent of this save: the one sent, else the one it already had. */
function proposedParent(data: Record<string, unknown>, originalDoc: unknown): PlaceId | null {
  if ('parent' in data) return idOf(data.parent)
  return idOf((originalDoc as PlaceDoc | undefined)?.parent)
}

export const guardAncestry: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const parent = proposedParent(data as Record<string, unknown>, originalDoc)
  const id = operation === 'update' ? idOf((originalDoc as PlaceDoc | undefined)?.id) : null
  const before = operation === 'update' ? idOf((originalDoc as PlaceDoc | undefined)?.parent) : null
  const moving = operation === 'create' || String(parent) !== String(before)
  if (parent === null) return data
  await lockPlaceTree(req)
  // Only a move needs the height of what it carries; a new place carries nothing yet.
  const height = moving && id !== null ? await subtreeHeight(req, id) : 1
  const ownName = (data as { name?: unknown }).name
  for (const draft of [false, true]) {
    const { parentOf, names } = await chainAbove(req, parent, draft)
    const problem = ancestryProblem({
      id,
      parent,
      moving,
      height,
      parentOf: (each) => parentOf.get(String(each)),
    })
    if (!problem) continue
    const nameOf = (each: PlaceId) =>
      id !== null && String(each) === String(id) && typeof ownName === 'string'
        ? ownName
        : (names.get(String(each)) ?? `#${each}`)
    throw new ValidationError(
      {
        collection: PLACES,
        ...(id === null ? {} : { id }),
        errors: [{ path: 'parent', message: ancestryMessage(problem, nameOf) }],
        req,
      },
      req.t,
    )
  }
  return data
}

export const keepChildrenAttached: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await lockPlaceTree(req)
  const children = (await childrenOf(req, [id])).filter((child) => String(child) !== String(id))
  if (children.length === 0) return
  const places = children.length === 1 ? 'one place is' : `${children.length} places are`
  throw new APIError(
    `This place cannot be deleted while ${places} under it (published or in a draft). Move or delete those first.`,
    409,
    null,
    true,
  )
}
