/**
 * A products rail's source (TASKS.md 27.5.d): the newest, the newest of a category, or the editor's
 * picks in the order dragged; a rail saved before `source` existed reads as it showed then.
 */
import { describe, expect, it } from 'vitest'

import { inPickedOrder, railQuery, railSelectionOf, railSourceOf } from './rail'

describe('a rail’s source', () => {
  it('is what the editor chose', () => {
    expect(railSourceOf({ source: 'picked' })).toBe('picked')
    expect(railSourceOf({ source: 'newest', category: 4 })).toBe('newest')
    expect(railSourceOf({ source: 'category', category: 4 })).toBe('category')
  })

  it('reads a rail saved before `source` existed as it showed then', () => {
    expect(railSourceOf({ category: 4 })).toBe('category')
    expect(railSourceOf({ category: null })).toBe('newest')
    expect(railSourceOf({ source: 'bogus' })).toBe('newest')
  })
})

describe('what a rail reads', () => {
  it('takes the category, populated or not', () => {
    expect(railSelectionOf({ source: 'category', category: { id: 7, slug: 'maps' } })).toEqual({
      source: 'category',
      categoryId: 7,
    })
  })

  it('keeps the picks in the editor’s order, each once', () => {
    expect(railSelectionOf({ source: 'picked', products: [5, { id: 3 }, 5, 9] })).toEqual({
      source: 'picked',
      productIds: [5, 3, 9],
    })
  })

  it('falls back to the newest for a half-made choice, never an empty rail', () => {
    expect(railSelectionOf({ source: 'picked', products: [] })).toEqual({ source: 'newest' })
    expect(railSelectionOf({ source: 'category', category: null })).toEqual({ source: 'newest' })
  })

  it('asks the products read for the right filter and size', () => {
    expect(railQuery({ source: 'newest' })).toEqual({ where: [], sort: '-updatedAt', limit: 6 })
    expect(railQuery({ source: 'category', categoryId: 7 }).where).toEqual([
      { category: { equals: 7 } },
    ])
    const picked = railQuery({ source: 'picked', productIds: [5, 3, 9] })
    expect(picked.where).toEqual([{ id: { in: [5, 3, 9] } }])
    expect(picked.limit).toBe(3)
  })

  it('puts the rows back in the picked order, leaving out what was not found', () => {
    const rows = [
      { id: 9, name: 'c' },
      { id: 5, name: 'a' },
    ]
    expect(inPickedOrder(rows, [5, 3, 9]).map((row) => row.name)).toEqual(['a', 'c'])
  })
})
