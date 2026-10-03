/**
 * The place facet's tree (5.1.a): the published gazetteer as the browse page filters it. One
 * read, `overrideAccess: false`, drafts filtered, the fields the facet shows only — a place's
 * localized modern name, its slug and its parent. The counts roll up to ancestors: a work's
 * primary place counts at every place it lies within, so Java shows the works of Batavia
 * (EXPERIENCE-GALLERY.md §4).
 *
 * The tree is also what resolves a browse path's place segments (`java/batavia`): a gazetteer
 * path is the ancestors' slugs, outermost first, and a URL whose path does not name one place is
 * no address.
 */
import type { Payload } from 'payload'

import type { SiteLocale } from '@engine/config/sites'

export type PlaceNode = {
  readonly id: number
  readonly slug: string
  readonly name: string
  readonly parentId: number | null
}

/** The published places, flat. `slug` is the modern name's slug; a place carries no per-locale
 * slug of its own — the seed's slugs are the gazetteer paths the docs name (`places`). */
export async function loadPlaces(payload: Payload, locale: SiteLocale): Promise<readonly PlaceNode[]> {
  const found = await payload.find({
    collection: 'places',
    overrideAccess: false,
    where: { _status: { equals: 'published' } },
    select: { slug: true, name: true, parent: true },
    depth: 0,
    limit: 0,
    pagination: false,
    locale,
  })
  const parentOf = new Map<number, number | null>()
  for (const doc of found.docs as readonly Record<string, unknown>[]) {
    const id = Number(doc.id)
    const parent = doc.parent
    parentOf.set(
      id,
      typeof parent === 'number' ? parent : typeof parent === 'object' && parent !== null && 'id' in parent ? Number((parent as { id: unknown }).id) : null,
    )
  }
  return (found.docs as readonly Record<string, unknown>[]).map((doc) => ({
    id: Number(doc.id),
    slug: typeof doc.slug === 'string' ? doc.slug : '',
    name: typeof doc.name === 'string' ? doc.name : '',
    parentId: parentOf.get(Number(doc.id)) ?? null,
  }))
}

/** The descendants of a place, including itself, as the ids a place filter covers. */
export function descendantIdsOf(
  places: readonly PlaceNode[],
  placeId: number,
): readonly number[] {
  const childrenOf = new Map<number, number[]>()
  for (const place of places) {
    if (place.parentId === null) continue
    const known = childrenOf.get(place.parentId)
    childrenOf.set(place.parentId, [...(known ?? []), place.id])
  }
  const ids: number[] = [placeId]
  for (let index = 0; index < ids.length; index += 1) {
    const current = ids[index]
    if (current === undefined) break
    for (const child of childrenOf.get(current) ?? []) ids.push(child)
  }
  return ids
}

/** The ancestor chain of a place, outermost first, itself last. */
export function ancestorsOf(places: readonly PlaceNode[], placeId: number): readonly PlaceNode[] {
  const byId = new Map(places.map((place) => [place.id, place]))
  const chain: PlaceNode[] = []
  let current = byId.get(placeId)
  while (current !== undefined) {
    chain.unshift(current)
    current = current.parentId === null ? undefined : byId.get(current.parentId)
  }
  return chain
}

/** The place id a gazetteer path names (`java/batavia`), or `null` — no such address. The path
 * must end at the place and name every ancestor before it: the path is the tree's, not a search. */
export function placeIdOfPath(
  places: readonly PlaceNode[],
  path: readonly string[],
): number | null {
  if (path.length === 0) return null
  const tail = path[path.length - 1]
  if (tail === undefined) return null
  const bySlug = new Map(places.map((place) => [place.slug, place]))
  const last = bySlug.get(tail)
  if (last === undefined) return null
  const chain = ancestorsOf(places, last.id)
  if (chain.length !== path.length) return null
  return chain.every((place, index) => place.slug === path[index]) ? last.id : null
}

/** The counts a facet shows: every place a work's primary place lies within, counted once per
 * work — the roll-up. A place counts only works the other filters leave in. */
export function rolledUpCounts(
  places: readonly PlaceNode[],
  counts: ReadonlyMap<number, number>,
): ReadonlyMap<number, number> {
  const rolled = new Map<number, number>()
  for (const [placeId, count] of counts) {
    for (const place of ancestorsOf(places, placeId as number)) {
      rolled.set(place.id, (rolled.get(place.id) ?? 0) + count)
    }
  }
  return rolled
}
