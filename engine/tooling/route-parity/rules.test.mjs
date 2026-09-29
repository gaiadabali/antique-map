import { describe, expect, it } from 'vitest'

import {
  diffMethods,
  findDuplicateMounts,
  findReservedSegmentCollisions,
  firstSegment,
  matchersEqual,
} from './rules.mjs'

const route = (path, methods = ['GET']) => ({ path, methods })

describe('firstSegment', () => {
  it('reads the first segment after /api/ — where Payload reads a collection slug (C13)', () => {
    expect(firstSegment('/api/x/commerce/cart/[[...path]]')).toBe('x')
    expect(firstSegment('/api/x/media/[...path]')).toBe('x')
    expect(firstSegment('/api/health')).toBe('health')
    expect(firstSegment('/api/graphql')).toBe('graphql')
  })

  it('is null outside /api/ and for a dynamic first segment', () => {
    expect(firstSegment('/brand-assets/[...path]')).toBeNull()
    expect(firstSegment('/api/[...slug]')).toBeNull()
  })
})

describe('findReservedSegmentCollisions — the planted violation (2.2.i)', () => {
  it('is empty for the real reserved words absent, then flags a route shadowing one', () => {
    const clean = [route('/api/x/commerce/cart/[[...path]]'), route('/api/health')]
    expect(findReservedSegmentCollisions(clean)).toEqual([])

    const shadowing = [...clean, route('/api/graphql/[...path]')]
    expect(findReservedSegmentCollisions(shadowing)).toEqual([
      { path: '/api/graphql/[...path]', segment: 'graphql' },
    ])
  })

  it('flags a route shadowing a discovered collection slug, never one under /api/x/', () => {
    const routes = [route('/api/works/[...path]'), route('/api/x/works/[...path]')]
    expect(findReservedSegmentCollisions(routes, [])).toEqual([])
    expect(findReservedSegmentCollisions(routes, ['works'])).toEqual([
      { path: '/api/works/[...path]', segment: 'works' },
    ])
  })

  it('flags every /api/x/ route once a collection is named x, and /api/health for health', () => {
    const routes = [route('/api/x/a'), route('/api/x/b'), route('/api/health')]
    expect(findReservedSegmentCollisions(routes, ['x', 'health'])).toEqual([
      { path: '/api/x/a', segment: 'x' },
      { path: '/api/x/b', segment: 'x' },
      { path: '/api/health', segment: 'health' },
    ])
  })
})

describe('findDuplicateMounts', () => {
  it('flags two routes mounting the same path', () => {
    const routes = [route('/api/x/a'), route('/api/x/b'), route('/api/x/a', ['POST'])]
    expect(findDuplicateMounts(routes)).toEqual(['/api/x/a'])
  })
})

describe('diffMethods', () => {
  it('reports a missing method and an unmanifested extra', () => {
    expect(diffMethods(['GET', 'POST'], ['GET'])).toEqual({ missing: ['POST'], extra: [] })
    expect(diffMethods(['GET'], ['GET', 'DELETE'])).toEqual({ missing: [], extra: ['DELETE'] })
  })
})

describe('matchersEqual', () => {
  it('compares two matcher arrays literally, in order', () => {
    expect(matchersEqual(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(matchersEqual(['a', 'b'], ['b', 'a'])).toBe(false)
    expect(matchersEqual(['a'], ['a', 'b'])).toBe(false)
  })
})
