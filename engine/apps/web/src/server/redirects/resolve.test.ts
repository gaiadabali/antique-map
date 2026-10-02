/**
 * Tests for the runtime redirect resolver.
 */
import { describe, expect, it } from 'vitest'

import { resolveRedirect } from './resolve'

describe('resolveRedirect', () => {
  it('answers one hop and null for an unknown path', () => {
    const map = new Map<string, { to: string; code: 301 | 302 | 410 }>([
      ['/category/1-maps', { to: '/browse/maps', code: 301 }],
      ['/account', { to: '', code: 410 }],
    ])

    expect(resolveRedirect('gallery', map, '/category/1-maps', '')).toEqual({
      status: 301,
      location: '/browse/maps',
    })
    expect(resolveRedirect('gallery', map, '/account', '')).toEqual({ status: 410 })
    expect(resolveRedirect('gallery', map, '/unknown', '')).toBeNull()
  })

  it('normalises query keys the same way the builder does', () => {
    const map = new Map<string, { to: string; code: 301 }>([
      ['/category/1-maps?s=sold', { to: '/browse/maps?s=sold', code: 301 }],
    ])

    expect(resolveRedirect('gallery', map, '/category/1-maps', 's=sold&page=2')).toEqual({
      status: 301,
      location: '/browse/maps?s=sold',
    })
  })
})
