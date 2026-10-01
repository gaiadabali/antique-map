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

describe('canonicalRedirect() — the item’s public query rides on the 308 (C13 publicSearch, 5.3)', () => {
  const bali = '/product/1726-bali'

  it('carries x-public-search onto the redirect, as the proxy copied it', () => {
    expect(canonicalRedirect('/product/1726-old-bali', bali, '?utm_source=mail&gclid=x')).toBe(
      '/product/1726-bali?utm_source=mail&gclid=x',
    )
    expect(canonicalRedirect('/product/1726', bali, '?fbclid=a%20b&q=caf%C3%A9')).toBe(
      '/product/1726-bali?fbclid=a%20b&q=caf%C3%A9',
    )
  })

  it.each(['', null])('adds nothing when there is no query (%j)', (search) => {
    expect(canonicalRedirect('/product/1726-old-bali', bali, search)).toBe(bali)
    expect(canonicalRedirect('/product/1726-old-bali', bali)).toBe(bali)
  })

  it('never redirects the canonical address for its query: only the path decides', () => {
    expect(canonicalRedirect(bali, bali, '?utm_source=mail')).toBeNull()
  })

  it.each([
    'utm_source=mail', // not URL.search's spelling: no leading `?`
    '?',
    '?a=1#frag',
    '?a=1 b',
    '?a=1\tb',
    '?a=é',
  ])(
    'drops a value URL.search would never hold (%j) rather than write it into Location',
    (search) => {
      expect(canonicalRedirect('/product/1726-old-bali', bali, search)).toBe(bali)
    },
  )
})
