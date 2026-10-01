/**
 * TASKS.md 8.1.e: a place cannot be its own ancestor — on create, and on re-parenting.
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

  it('compares ids whatever their type: a numeric id and its string are one place', () => {
    const numeric = { 1: null, 2: 1, 3: 2 } as Record<string, number | null>
    const lookup = (id: PlaceId) => numeric[String(id)]
    expect(ancestryProblem({ id: 1, parent: '3', parentOf: lookup })?.kind).toBe('cycle')
    expect(ancestryProblem({ id: '1', parent: 1, parentOf: lookup })).toEqual({ kind: 'self' })
  })

  it('lets a place move anywhere outside its own subtree', () => {
    expect(ancestryProblem({ id: 'batavia', parent: 'sulawesi', parentOf })).toBeNull()
    expect(ancestryProblem({ id: 'kota-tua', parent: 'java', parentOf })).toBeNull()
    expect(ancestryProblem({ id: 'java', parent: 'sulawesi', parentOf })).toBeNull()
  })

  it('lets a place become (or stay) a root', () => {
    expect(ancestryProblem({ id: 'batavia', parent: null, parentOf })).toBeNull()
  })

  it('lets a new place (no id yet) go under any stored place', () => {
    expect(ancestryProblem({ id: null, parent: 'kota-tua', parentOf })).toBeNull()
  })
})

describe('the walk is bounded', () => {
  const chainOf = (length: number) => {
    // p1 is the root; p<n>'s parent is p<n-1>.
    const tree: Record<string, string | null> = {}
    for (let n = 1; n <= length; n += 1) tree[`p${n}`] = n === 1 ? null : `p${n - 1}`
    return (id: PlaceId) => tree[String(id)]
  }

  it(`allows a place ${MAX_PLACE_DEPTH} levels deep and no deeper`, () => {
    const lookup = chainOf(MAX_PLACE_DEPTH)
    // Under p5 the new place is at level 6; under p6, at level 7.
    expect(
      ancestryProblem({ id: null, parent: `p${MAX_PLACE_DEPTH - 1}`, parentOf: lookup }),
    ).toBeNull()
    expect(ancestryProblem({ id: null, parent: `p${MAX_PLACE_DEPTH}`, parentOf: lookup })).toEqual({
      kind: 'too-deep',
      depth: MAX_PLACE_DEPTH + 1,
    })
  })

  it('reports a stored loop above the parent instead of following it for ever', () => {
    const loop: Record<string, string> = { a: 'b', b: 'a' }
    const problem = ancestryProblem({ id: 'z', parent: 'a', parentOf: (id) => loop[String(id)] })
    expect(problem?.kind).toBe('too-deep')
  })

  it('reports a parent — or an ancestor — that no longer exists', () => {
    expect(ancestryProblem({ id: 'z', parent: 'gone', parentOf })).toEqual({
      kind: 'missing',
      id: 'gone',
    })
    const dangling = { a: 'gone' } as Record<string, string>
    expect(
      ancestryProblem({ id: 'z', parent: 'a', parentOf: (id) => dangling[String(id)] }),
    ).toEqual({ kind: 'missing', id: 'gone' })
  })

  it('says each problem in a sentence a cataloguer can act on', () => {
    expect(ancestryMessage({ kind: 'self' })).toBe('A place cannot be its own parent.')
    expect(ancestryMessage({ kind: 'missing', id: 9 })).toMatch(/does not exist/)
    expect(ancestryMessage({ kind: 'too-deep', depth: 7 })).toMatch(/at most 6 levels/)
  })
})
