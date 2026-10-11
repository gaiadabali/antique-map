/** The wall's address: what `?site=&state=&q=&page=` means, and how a link writes it back. */
import { describe, expect, it } from 'vitest'

import { MAX_PAGE, isFiltered, parseFilter, wallHref } from './filter'

describe('parseFilter', () => {
  it('reads the four words', () => {
    expect(parseFilter({ site: 'shop', state: 'drafts', q: '  OEI-BAG  ', page: '3' })).toEqual({
      site: 'shop',
      state: 'drafts',
      q: 'OEI-BAG',
      page: 3,
    })
  })

  it('falls back to everything for a missing or unknown choice', () => {
    expect(parseFilter(undefined)).toEqual({ site: 'all', state: 'all', q: '', page: 1 })
    expect(parseFilter({ site: 'moon', state: 'x', page: '-4' })).toEqual({
      site: 'all',
      state: 'all',
      q: '',
      page: 1,
    })
    expect(parseFilter({ page: 'abc' }).page).toBe(1)
  })

  it('takes the first of a repeated parameter and bounds the page and the query', () => {
    expect(parseFilter({ site: ['gallery', 'shop'] }).site).toBe('gallery')
    expect(parseFilter({ page: '999999' }).page).toBe(MAX_PAGE)
    expect(parseFilter({ q: 'x'.repeat(500) }).q).toHaveLength(80)
    expect(parseFilter({ q: 'a \n\t b' }).q).toBe('a b')
  })

  it('accepts the strip’s AI-drafts state', () => {
    expect(parseFilter({ state: 'ai' }).state).toBe('ai')
  })
})

describe('wallHref', () => {
  const base = parseFilter({ site: 'gallery', state: 'attention', q: 'bali', page: '2' })

  it('leaves defaults out and resets the page when a filter changes', () => {
    expect(wallHref(parseFilter({}))).toBe('/admin')
    expect(wallHref(base, { state: 'all' })).toBe('/admin?site=gallery&q=bali')
    expect(wallHref(base, { site: 'all' })).toBe('/admin?state=attention&q=bali')
  })

  it('keeps the page when only the page changes, and encodes the search', () => {
    expect(wallHref(base, { page: 3 })).toBe('/admin?site=gallery&state=attention&q=bali&page=3')
    expect(wallHref(parseFilter({ q: 'a&b c' }))).toBe('/admin?q=a%26b+c')
  })
})

describe('isFiltered', () => {
  it('is false only for the plain wall', () => {
    expect(isFiltered(parseFilter({}))).toBe(false)
    expect(isFiltered(parseFilter({ page: '4' }))).toBe(false)
    expect(isFiltered(parseFilter({ q: 'x' }))).toBe(true)
    expect(isFiltered(parseFilter({ state: 'sold' }))).toBe(true)
  })
})
