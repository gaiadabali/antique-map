/**
 * Reading the place tree for its guards (`./ancestry`), in **both** of its versions: the stored
 * parent (the main row, what is published) and the latest draft's, since either may be the one
 * in force later (a draft publishes). And the lock that serialises every write to the tree.
 *
 * **The lock** (senior-be review of 8.1, S1). The guards read the tree at READ COMMITTED, so two
 * re-parents that each look legal alone — X under Y and Y under X, at once — would both commit a
 * cycle. Every save and delete of a place first takes `PLACE_TREE_LOCK_KEY`, a transaction-scoped
 * advisory lock, inside the operation's own transaction: the second writer waits until the first
 * commits, then reads the tree as the first left it. A write with no transaction to hold the lock
 * (a Local API call with `disableTransaction`) is refused rather than guarded half-way.
 */
import { APIError, type PayloadRequest, type Where } from 'payload'

import { advisoryLockKey } from '../../db/advisory-lock'
import { MAX_PLACE_DEPTH, type PlaceId } from '../../validators/place-ancestry'

const PLACES = 'places'
export const PLACE_TREE_LOCK_KEY = advisoryLockKey('engine/places/tree')

/** A relationship value as an id: Payload hands one over as an id or as the populated document. */
export function idOf(value: unknown): PlaceId | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number' || typeof value === 'string') return value
  if (typeof value === 'object' && 'id' in value) return idOf((value as { id: unknown }).id)
  return null
}

/** Takes the place-tree lock in the operation's transaction; released at its COMMIT or ROLLBACK. */
export async function lockPlaceTree(req: PayloadRequest): Promise<void> {
  const { db } = req.payload
  const transactionID = req.transactionID ? await req.transactionID : undefined
  const session = transactionID === undefined ? undefined : db.sessions?.[transactionID]
  if (!session) {
    throw new APIError(
      'A change to the place hierarchy needs a transaction, so that two changes never close a loop between them.',
      500,
    )
  }
  type ExecuteArgs = Parameters<typeof db.execute>[0]
  await db.execute({
    db: session.db as ExecuteArgs['db'],
    raw: `SELECT pg_advisory_xact_lock(${PLACE_TREE_LOCK_KEY})`,
  })
}

type PlaceRow = { id: PlaceId; parent?: unknown; name?: unknown }

async function readPlace(req: PayloadRequest, id: PlaceId, draft: boolean) {
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
export async function chainAbove(
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

/** The places directly under any of `ids`, as stored or in a latest draft. */
export async function childrenOf(req: PayloadRequest, ids: readonly PlaceId[]): Promise<PlaceId[]> {
  if (ids.length === 0) return []
  const stored = await req.payload.find({
    collection: PLACES,
    where: { parent: { in: [...ids] } },
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
    select: { parent: true },
  })
  const latestWhere: Where = {
    and: [{ latest: { equals: true } }, { 'version.parent': { in: [...ids] } }],
  }
  const drafted = await req.payload.findVersions({
    collection: PLACES,
    where: latestWhere,
    depth: 0,
    limit: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const found = new Map<string, PlaceId>()
  for (const doc of stored.docs) found.set(String(doc.id), doc.id)
  for (const version of drafted.docs) {
    const id = idOf((version as { parent?: unknown }).parent)
    if (id !== null) found.set(String(id), id)
  }
  return [...found.values()]
}

/**
 * The levels `id` carries — 1 for a place with nothing under it — in either version of the tree,
 * walked down level by level and stopped once it passes `MAX_PLACE_DEPTH` (no move fits then).
 */
export async function subtreeHeight(req: PayloadRequest, id: PlaceId): Promise<number> {
  const seen = new Set<string>([String(id)])
  let level: PlaceId[] = [id]
  let height = 1
  while (height <= MAX_PLACE_DEPTH) {
    const next = (await childrenOf(req, level)).filter((child) => !seen.has(String(child)))
    if (next.length === 0) break
    for (const child of next) seen.add(String(child))
    level = next
    height += 1
  }
  return height
}
