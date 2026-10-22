/**
 * The gazetteer's cycle guard (TASKS.md 8.1.b, 8.1.e): a place can never be its own ancestor.
 * The place hierarchy is what a gazetteer path is made of (`/places/java/batavia`, C10), what the
 * place facet rolls its counts up through (TASKS.md 16.3.b) and what a breadcrumb walks — a
 * cycle would make each of them loop for ever. Every reader of the tree still caps its walk at
 * `MAX_PLACE_DEPTH`, so data written past this guard cannot hang a page.
 *
 * Pure: it judges a proposed parent against a lookup of the parents already stored, so the unit
 * test is the specification and the collection's hooks (`collections/places/ancestry.ts`) only
 * fetch the chain — under a lock that serialises tree writes, without which two re-parents that
 * each look legal (X under Y, Y under X) would both commit (senior-be review of 8.1, S1).
 *
 * - **Cycles** are refused on every save: as its own parent, or under one of its descendants.
 * - **Depth** is judged only when the place moves (a new parent) — and then for the whole subtree
 *   it carries: the parent's level plus the subtree's height must fit `MAX_PLACE_DEPTH`. A save
 *   that keeps its parent is never refused for depth, so no existing place becomes un-editable
 *   (S2). EXPERIENCE-GALLERY.md §2's tree is three levels deep; six leaves room.
 */

export type PlaceId = number | string

/** A root is level 1; a place has at most `MAX_PLACE_DEPTH - 1` ancestors. */
export const MAX_PLACE_DEPTH = 6

export type AncestryProblem =
  /** The place is named as its own parent. */
  | { readonly kind: 'self' }
  /** The place would sit under one of its own descendants; `chain` runs parent → … → the place. */
  | { readonly kind: 'cycle'; readonly chain: readonly PlaceId[] }
  /** The places above the parent already loop among themselves (data written past the guard). */
  | { readonly kind: 'loop'; readonly at: PlaceId }
  /** The proposed parent, or one of its ancestors, is not a stored place. */
  | { readonly kind: 'missing'; readonly id: PlaceId }
  /** Moved under this parent, the place or its deepest descendant would pass `MAX_PLACE_DEPTH`. */
  | { readonly kind: 'too-deep'; readonly depth: number; readonly height: number }

/**
 * `parentOf(id)`: the stored parent of a place — `null` for a root, `undefined` for an id no place
 * has (or that was not read). `id` is the place being saved (`null` while it is being created).
 * `moving`: the save gives the place a parent it did not have (always, on create).
 * `height`: the levels the place carries — 1 for a place with nothing under it.
 */
export type AncestryInput = {
  readonly id: PlaceId | null
  readonly parent: PlaceId | null
  readonly parentOf: (id: PlaceId) => PlaceId | null | undefined
  readonly moving?: boolean
  readonly height?: number
  readonly maxDepth?: number
}

const same = (a: PlaceId, b: PlaceId) => String(a) === String(b)

/** What is wrong with putting the place under `parent`, or null when nothing is. */
export function ancestryProblem(input: AncestryInput): AncestryProblem | null {
  const { id, parent, parentOf } = input
  const moving = input.moving ?? true
  const height = Math.max(1, input.height ?? 1)
  const maxDepth = input.maxDepth ?? MAX_PLACE_DEPTH
  if (parent === null) return null
  if (id !== null && same(parent, id)) return { kind: 'self' }

  // The chain is the parent's level; the moved subtree hangs `height` levels below it. A cycle is
  // looked for first, so a move that closes one is named as one even in a deep tree.
  const tooDeep = (length: number): AncestryProblem | null =>
    moving && length + height > maxDepth
      ? { kind: 'too-deep', depth: length + height, height }
      : null
  const chain: PlaceId[] = []
  const seen = new Set<string>()
  let current: PlaceId | null = parent
  while (current !== null) {
    if (id !== null && same(current, id)) return { kind: 'cycle', chain: [...chain, current] }
    if (seen.has(String(current))) return { kind: 'loop', at: current }
    seen.add(String(current))
    chain.push(current)
    const next: PlaceId | null | undefined = parentOf(current)
    if (next === undefined) {
      // A place that stays put is not judged on what lies beyond the chain read; a move is — an
      // unread ancestor past the deepest legal level is too deep, a vanished one is missing.
      if (!moving) return null
      return tooDeep(chain.length) ?? { kind: 'missing', id: current }
    }
    current = next
  }
  return tooDeep(chain.length)
}

/** The plain sentence a cataloguer reads for a problem; `nameOf` turns ids into names. */
export function ancestryMessage(
  problem: AncestryProblem,
  nameOf: (id: PlaceId) => string = String,
): string {
  switch (problem.kind) {
    case 'self':
      return 'A place cannot be its own parent.'
    case 'cycle': {
      const path = problem.chain.map(nameOf).join(' › ')
      return `This place cannot go under ${nameOf(problem.chain[0]!)}: that place is already inside this one (${path}). Move it out first.`
    }
    case 'loop':
      return `The places above ${nameOf(problem.at)} loop into each other. Ask an admin to repair the hierarchy first.`
    case 'missing':
      return `The parent place ${nameOf(problem.id)} does not exist (it may have been deleted). Choose another.`
    case 'too-deep': {
      const carried =
        problem.height > 1 ? `, with the ${problem.height - 1} level(s) of places under it,` : ''
      return `The place hierarchy goes at most ${MAX_PLACE_DEPTH} levels deep; under this parent the place${carried} would reach level ${problem.depth}.`
    }
  }
}
