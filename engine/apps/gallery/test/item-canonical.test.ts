/** The item route's one-address rule (`src/item/canonical.ts`): read the id, compare the path. */
import { describe, expect, it } from 'vitest'

import { canonicalRedirect, MissingPublicPathError, parsePublicId } from '../src/item/canonical'

describe('parsePublicId()', () => {
  it.each([
    ['1706-caf%C3%A9-de-java', 1706],
    ['1706-café-de-java', 1706],
    ['1726-b%2561li', 1726],
    ['1726', 1726],
    ['1706-van-t%27hoff', 1706],
  ])('%s → %s', (segment, id) => expect(parsePublicId(segment)).toBe(id))

  it.each(['01726-bali', '0', '-1', 'bali', '1726bali', '99999999999999999999-x'])(
    '%s names no item',
    (segment) => expect(parsePublicId(segment)).toBeNull(),
  )
})

describe('canonicalRedirect()', () => {
  const canonical = '/product/1706-caf%C3%A9-de-java'

  it('keeps the canonical address', () => {
    expect(canonicalRedirect(canonical, canonical)).toBeNull()
  })

  it.each([
    '/product/1706-caf%C3%A9-java',
    '/product/1706-van-t%27hoff',
    '/product/1706',
    '/product/1706-caf%c3%a9-de-java', // were Next not to upper-case it first
  ])('redirects %s to the canonical address', (asked) => {
    expect(canonicalRedirect(asked, canonical)).toBe(canonical)
  })

  it.each([null, ''])('refuses a request with no public path (%j), never looping', (asked) => {
    expect(() => canonicalRedirect(asked, canonical)).toThrow(MissingPublicPathError)
  })
})
