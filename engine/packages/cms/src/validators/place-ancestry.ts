/**
 * The gazetteer's cycle guard (TASKS.md 8.1.b, 8.1.e): a place can never be its own ancestor.
 * The place hierarchy is what a gazetteer path is made of (`/places/java/batavia`, C10), what the
 * place facet rolls its counts up through (TASKS.md 16.3.b) and what a breadcrumb walks — a
 * cycle would make each of them loop for ever.
 *
 * Pure: it judges a proposed parent against a lookup of the parents already stored, so the unit
 * test is the specification and the collection's hook (`collections/places/ancestry.ts`) only
 * fetches the chain. It holds on re-parenting — an update — as much as on create: a place moved
 * under one of its own descendants is refused.
 *
 * The depth is bounded too. EXPERIENCE-GALLERY.md §2's tree is three levels deep (Nusa Tenggara
 * › Timor › Kupang); `MAX_PLACE_DEPTH` leaves room for more and bounds the walk, so a chain
 * that never ends — a cycle stored before this guard, or written past it — is reported, not
 * followed.
 */

export type PlaceId = number | string

/** A root is depth 1; a place has at most `MAX_PLACE_DEPTH - 1` ancestors. */
export const MAX_PLACE_DEPTH = 6

export type AncestryProblem =
  /** The place is named as its own parent. */
  | { readonly kind: 'self' }
  /** The place would sit under one of its own descendants; `chain` runs parent → … → the place. */
  | { readonly kind: 'cycle'; readonly chain: readonly PlaceId[] }
  /** The proposed parent, or one of its ancestors, is not a stored place. */
  | { readonly kind: 'missing'; readonly id: PlaceId }
  /** The place would be deeper than `MAX_PLACE_DEPTH` — or the stored chain above never ends. */
  | { readonly kind: 'too-deep'; readonly depth: number }

/**
 * `parentOf(id)`: the stored parent of a place — `null` for a root, `undefined` for an id no
 * place has. `id` is the place being saved (`null` while it is being created).
 */
export type AncestryInput = {
  readonly id: PlaceId | null
  readonly parent: PlaceId | null
  readonly parentOf: (id: PlaceId) => PlaceId | null | undefined
  readonly maxDepth?: number
}

const same = (a: PlaceId, b: PlaceId) => String(a) === String(b)

/** What is wrong with putting the place under `parent`, or null when nothing is. */
export function ancestryProblem(input: AncestryInput): AncestryProblem | null {
  const { id, parent, parentOf } = input
  const maxDepth = input.maxDepth ?? MAX_PLACE_DEPTH
  if (parent === null) return null
  if (id !== null && same(parent, id)) return { kind: 'self' }

  const chain: PlaceId[] = []
  let current: PlaceId | null = parent
  while (current !== null) {
    if (id !== null && same(current, id)) return { kind: 'cycle', chain: [...chain, current] }
    chain.push(current)
    // The place itself sits one level below the deepest ancestor found so far.
    if (chain.length + 1 > maxDepth) return { kind: 'too-deep', depth: chain.length + 1 }
    const next: PlaceId | null | undefined = parentOf(current)
    if (next === undefined) return { kind: 'missing', id: current }
    current = next
  }
  return null
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
    case 'missing':
      return `The parent place ${nameOf(problem.id)} does not exist (it may have been deleted). Choose another.`
    case 'too-deep':
      return `The place hierarchy goes at most ${MAX_PLACE_DEPTH} levels deep; under this parent the place would be at level ${problem.depth}.`
  }
}
