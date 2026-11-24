/** The product list's quick filters: their addresses, which one is showing, and the bulk move. */
import { describe, expect, it } from 'vitest'

import { activeFilter, filterHref, moveRequest } from './list-filters'

describe('filterHref', () => {
  it('is a plain list address Payload reads', () => {
    expect(filterHref({ kind: 'all' })).toBe('/admin/collections/products')
    expect(filterHref({ kind: 'drafts' })).toBe(
      '/admin/collections/products?where[_status][equals]=draft',
    )
    expect(filterHref({ kind: 'category', id: '7' })).toBe(
      '/admin/collections/products?where[category][equals]=7',
    )
  })

  it('names the out-of-stock products, and none when there are none', () => {
    expect(filterHref({ kind: 'outOfStock' }, [3, 9])).toBe(
      '/admin/collections/products?where[id][in]=3,9',
    )
    expect(filterHref({ kind: 'outOfStock' }, [])).toBe(
      '/admin/collections/products?where[id][in]=0',
    )
  })
})

describe('activeFilter', () => {
  it('reads raw search params', () => {
    expect(activeFilter({ 'where[_status][equals]': 'draft' })).toEqual({ kind: 'drafts' })
    expect(activeFilter({ 'where[id][in]': '3,9' })).toEqual({ kind: 'outOfStock' })
    expect(activeFilter({ 'where[category][equals]': '7', page: '2' })).toEqual({
      kind: 'category',
      id: '7',
    })
  })

  it('reads Payload’s own nested form', () => {
    const where = { or: [{ and: [{ _status: { equals: 'draft' } }] }] }
    expect(activeFilter({ where })).toEqual({ kind: 'drafts' })
    expect(activeFilter({ where: { id: { in: ['3', '9'] } } })).toEqual({ kind: 'outOfStock' })
  })

  it('is all without a filter, or with one it does not offer', () => {
    expect(activeFilter({})).toEqual({ kind: 'all' })
    expect(activeFilter(undefined)).toEqual({ kind: 'all' })
    expect(activeFilter({ search: 'tote', 'where[_status][equals]': 'published' })).toEqual({
      kind: 'all',
    })
  })
})

describe('moveRequest', () => {
  it('patches the selection with the category', () => {
    expect(moveRequest('?locale=en&where[id][in][0]=4', 7)).toEqual({
      method: 'PATCH',
      url: '/api/products?locale=en&where[id][in][0]=4&depth=0',
      body: { category: 7 },
    })
  })
})
