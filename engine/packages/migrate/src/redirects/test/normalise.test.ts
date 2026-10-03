/**
 * Tests for the redirect key normalisation shared by builder and resolver.
 */
import { describe, expect, it } from 'vitest'

import { normalisePathname, redirectKey } from '../normalise'

describe('redirectKey', () => {
  it('keeps meaningful gallery query keys and drops noise', () => {
    expect(redirectKey('gallery', '/category/1-maps', 's=sold&page=2&foo=bar')).toBe(
      '/category/1-maps?s=sold',
    )
    expect(redirectKey('gallery', '/category/1-maps', 'o=newest')).toBe('/category/1-maps?o=newest')
  })

  it('keeps meaningful shop query keys', () => {
    expect(redirectKey('shop', '/shop', 'category=Maps&tag=bali&format=json')).toBe(
      '/shop?category=Maps&tag=bali',
    )
  })

  it('collapses trailing and doubled slashes', () => {
    expect(redirectKey('gallery', '/about-us/', '')).toBe('/about-us')
    expect(redirectKey('gallery', '//about//us//', '')).toBe('/about/us')
  })

  it('sorts query keys deterministically', () => {
    expect(redirectKey('shop', '/shop', 'tag=bali&category=Maps')).toBe(
      '/shop?category=Maps&tag=bali',
    )
  })
})

describe('normalisePathname', () => {
  it('normalises the root', () => {
    expect(normalisePathname('')).toBe('/')
    expect(normalisePathname('///')).toBe('/')
  })
})
