/**
 * The hooks that apply the gazetteer's cycle guard (`validators/place-ancestry`, pure) on every
 * write path — the admin, REST, the Local API, the seed and the importer — because a hook, unlike
 * access or a field validator, is never skipped (CONTENT-MODEL.md §9: guards run on every write).
 *
 * **Both versions of the tree are walked.** With drafts, a place has a published parent (the
 * main row) and its latest draft's parent, and either may later be the one in force: a draft
 * that moves Bali under Lombok, published while Lombok's published parent is Bali, would close a
 * loop no single view shows. So a proposed parent is refused if *either* chain above it reaches
 * the place being saved. A swap is two steps — publish the move out first, then the move in —
 * and the message says which place is in the way.
 *
 * A place with places under it cannot be deleted: its children would silently become roots and
 * their addresses would change. Move or delete them first.
 */
import {
  APIError,
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type PayloadRequest,
} from 'payload'

import {
  ancestryMessage,
  ancestryProblem,
  MAX_PLACE_DEPTH,
  type PlaceId,
} from '../../validators/place-ancestry'

const PLACES = 'places'

type PlaceRow = { id: PlaceId; parent?: unknown; name?: unknown }

/** A relationship value as an id: Payload hands one over as an id or as the populated document. */
export function idOf(value: unknown): PlaceId | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return null
}

async function readPlace(
  req: PayloadRequest,
  id: PlaceId,
  draft: boolean,
): Promise<PlaceRow | null> {
  const doc = await req.payload.findByID({
    collection: PLACES,
    id,
    depth: 0,
    draft,
    overrideAccess: true,
    disableErrors: true,
    req,
    select: { parent: true, name: true },
  })
  return (doc as PlaceRow | null) ?? null
}

/** One version of the chain above `parent`, as a lookup the pure guard reads, plus the names. */
async function chainAbove(
  req: PayloadRequest,
  parent: PlaceId,
  draft: boolean,
): Promise<{ parentOf: Map<string, PlaceId | null>; names: Map<string, string> }> {
  const parentOf = new Map<string, PlaceId | null>()
  const names = new Map<string, string>()
  let current: PlaceId | null = parent
  // One more than the deepest legal chain, so a chain that never ends is seen as too deep.
  for (let step = 0; current !== null && step <= MAX_PLACE_DEPTH; step += 1) {
    if (parentOf.has(String(current))) break
    const row = await readPlace(req, current, draft)
    if (!row) break
    const next = idOf(row.parent)
    parentOf.set(String(current), next)
    if (typeof row.name === 'string') names.set(String(current), row.name)
    current = next
  }
  return { parentOf, names }
}

/** The effective parent of this save: the one sent, else the one it already had. */
function proposedParent(data: Record<string, unknown>, originalDoc: unknown): PlaceId | null {
  if ('parent' in data) return idOf(data.parent)
  return idOf((originalDoc as { parent?: unknown } | undefined)?.parent)
}

export const guardAncestry: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  operation,
  req,
}) => {
  const parent = proposedParent(data as Record<string, unknown>, originalDoc)
  if (parent === null) return data
  const id =
    operation === 'update' ? (idOf((originalDoc as PlaceRow | undefined)?.id) ?? null) : null
  const ownName = (data as { name?: unknown }).name
  for (const draft of [false, true]) {
    const { parentOf, names } = await chainAbove(req, parent, draft)
    const problem = ancestryProblem({
      id,
      parent,
      parentOf: (each) => parentOf.get(String(each)),
    })
    if (!problem) continue
    const nameOf = (each: PlaceId) =>
      id !== null && String(each) === String(id) && typeof ownName === 'string'
        ? ownName
        : (names.get(String(each)) ?? `#${each}`)
    throw new ValidationError({
      collection: PLACES,
      ...(id === null ? {} : { id }),
      errors: [{ path: 'parent', message: ancestryMessage(problem, nameOf) }],
      req,
    })
  }
  return data
}

export const keepChildrenAttached: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await req.payload.count({
    collection: PLACES,
    overrideAccess: true,
    req,
    where: { parent: { equals: id } },
  })
  if (totalDocs === 0) return
  const places = totalDocs === 1 ? 'one place is' : `${totalDocs} places are`
  throw new APIError(
    `This place cannot be deleted while ${places} under it. Move or delete those first.`,
    409,
    null,
    true,
  )
}
