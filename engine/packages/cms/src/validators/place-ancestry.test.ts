/**
 * TASKS.md 8.1.e: a place cannot be its own ancestor — on create, and on re-parenting — and a
 * move fits the whole subtree it carries in `MAX_PLACE_DEPTH`, while a save that keeps its parent
 * is never refused for depth (senior-be review of 8.1, S2).
 */
import { describe, expect, it } from 'vitest'

import { ancestryMessage, ancestryProblem, MAX_PLACE_DEPTH, type PlaceId } from './place-ancestry'

/** Java › Batavia › Kota Tua, and Sulawesi beside them: the stored parents. */
const TREE: Record<string, PlaceId | null> = {
  java: null,
  batavia: 'java',
  'kota-tua': 'batavia',
  sulawesi: null,
}
const parentOf = (id: PlaceId) => TREE[String(id)]
const NAMES: Record<string, string> = {
  java: 'Java',
  batavia: 'Batavia',
  'kota-tua': 'Kota Tua',
  sulawesi: 'Sulawesi',
}

describe('a place can never be its own ancestor', () => {
  it('refuses a place as its own parent', () => {
    expect(ancestryProblem({ id: 'java', parent: 'java', parentOf })).toEqual({ kind: 'self' })
  })

  it('refuses re-parenting a place under its child', () => {
    expect(ancestryProblem({ id: 'java', parent: 'batavia', parentOf })).toEqual({
      kind: 'cycle',
      chain: ['batavia', 'java'],
    })
  })

  it('refuses re-parenting a place under its grandchild, naming the loop', () => {
    const problem = ancestryProblem({ id: 'java', parent: 'kota-tua', parentOf })
    expect(problem).toEqual({ kind: 'cycle', chain: ['kota-tua', 'batavia', 'java'] })
    expect(ancestryMessage(problem!, (id) => NAMES[String(id)]!)).toBe(
      'This place cannot go under Kota Tua: that place is already inside this one (Kota Tua › Batavia › Java). Move it out first.',
    )
  })

  it('refuses a cycle on a save that keeps its parent, too', () => {
    expect(ancestryProblem({ id: 'java', parent: 'kota-tua', parentOf, moving: false })?.kind).toBe(
      'cycle',
    )
  })

  it('compares ids whatever their type: a numeric id and its string are one place', () => {
    const numeric = { 1: null, 2: 1, 3: 2 } as Record<string, number | null>
    const lookup = (id: PlaceId) => numeric[String(id)]
    expect(ancestryProblem({ id: 1, parent: '3', parentOf: lookup })?.kind).toBe('cycle')
    expect(ancestryProblem({ id: '1', parent: 1, parentOf: lookup })).toEqual({ kind: 'self' })
  })

  it('lets a place move anywhere outside its own subtree, or become a root', () => {
    expect(ancestryProblem({ id: 'batavia', parent: 'sulawesi', parentOf })).toBeNull()
    expect(ancestryProblem({ id: 'kota-tua', parent: 'java', parentOf })).toBeNull()
    expect(ancestryProblem({ id: 'batavia', parent: null, parentOf })).toBeNull()
    expect(ancestryProblem({ id: null, parent: 'kota-tua', parentOf })).toBeNull()
  })
})

describe('depth, for the subtree a move carries', () => {
  // p1 is the root; p<n>'s parent is p<n-1>.
  const chainOf = (length: number) => {
    const tree: Record<string, string | null> = {}
    for (let n = 1; n <= length; n += 1) tree[`p${n}`] = n === 1 ? null : `p${n - 1}`
    return (id: PlaceId) => tree[String(id)]
  }
  const lookup = chainOf(MAX_PLACE_DEPTH)

  it(`allows a place ${MAX_PLACE_DEPTH} levels deep and no deeper`, () => {
    expect(ancestryProblem({ id: null, parent: 'p5', parentOf: lookup })).toBeNull()
    expect(ancestryProblem({ id: null, parent: 'p6', parentOf: lookup })).toEqual({
      kind: 'too-deep',
      depth: 7,
      height: 1,
    })
  })

  it('counts the levels a moved place carries below it', () => {
    // F with one child under p5: F at level 6, its child at 7 — refused; under p4 it fits.
    expect(ancestryProblem({ id: 'f', parent: 'p5', parentOf: lookup, height: 2 })).toEqual({
      kind: 'too-deep',
      depth: 7,
      height: 2,
    })
    expect(ancestryProblem({ id: 'f', parent: 'p4', parentOf: lookup, height: 2 })).toBeNull()
    expect(ancestryMessage({ kind: 'too-deep', depth: 7, height: 2 })).toBe(
      'The place hierarchy goes at most 6 levels deep; under this parent the place, with the 1 level(s) of places under it, would reach level 7.',
    )
  })

  it('never refuses a save that keeps its parent for depth, however deep it already is', () => {
    const deeper = chainOf(9)
    expect(ancestryProblem({ id: 'x', parent: 'p9', parentOf: deeper, moving: false })).toBeNull()
    expect(
      ancestryProblem({ id: 'x', parent: 'p9', parentOf: deeper, moving: false, height: 4 }),
    ).toBeNull()
    expect(ancestryProblem({ id: 'x', parent: 'p9', parentOf: deeper })?.kind).toBe('too-deep')
  })

  it('reads a chain that runs past what was read as too deep on a move, not as missing', () => {
    const partial = (id: PlaceId) => (Number(String(id).slice(1)) > 2 ? chainOf(9)(id) : undefined)
    expect(ancestryProblem({ id: 'x', parent: 'p9', parentOf: partial })?.kind).toBe('too-deep')
    expect(ancestryProblem({ id: 'x', parent: 'p9', parentOf: partial, moving: false })).toBeNull()
  })

  it('names a cycle as a cycle even in a deep tree', () => {
    // p1 moved under p6 — its own descendant — carrying the whole chain.
    expect(
      ancestryProblem({ id: 'p1', parent: 'p6', parentOf: lookup, height: MAX_PLACE_DEPTH })?.kind,
    ).toBe('cycle')
  })
})

describe('the walk is bounded', () => {
  it('reports a stored loop above the parent instead of following it for ever', () => {
    const loop: Record<string, string> = { a: 'b', b: 'a' }
    for (const moving of [true, false]) {
      expect(
        ancestryProblem({ id: 'z', parent: 'a', moving, parentOf: (id) => loop[String(id)] }),
      ).toEqual({ kind: 'loop', at: 'a' })
    }
  })

  it('reports a parent — or an ancestor — that no longer exists, on a move', () => {
    expect(ancestryProblem({ id: 'z', parent: 'gone', parentOf })).toEqual({
      kind: 'missing',
      id: 'gone',
    })
    const dangling = { a: 'gone' } as Record<string, string>
    expect(
      ancestryProblem({ id: 'z', parent: 'a', parentOf: (id) => dangling[String(id)] }),
    ).toEqual({ kind: 'missing', id: 'gone' })
    expect(ancestryProblem({ id: 'z', parent: 'gone', parentOf, moving: false })).toBeNull()
  })

  it('says each problem in a sentence a cataloguer can act on', () => {
    expect(ancestryMessage({ kind: 'self' })).toBe('A place cannot be its own parent.')
    expect(ancestryMessage({ kind: 'missing', id: 9 })).toMatch(/does not exist/)
    expect(ancestryMessage({ kind: 'loop', at: 9 })).toMatch(/Ask an admin to repair/)
    expect(ancestryMessage({ kind: 'too-deep', depth: 7, height: 1 })).toBe(
      'The place hierarchy goes at most 6 levels deep; under this parent the place would reach level 7.',
    )
  })
})
