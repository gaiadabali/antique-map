/**
 * `key.ts` restates `@engine/migrate/redirects`' `redirectKey()` (see its header): this holds the
 * two to the same answer, so a row the 9.4a builder keyed is the row the route looks up.
 */
import { describe, expect, it } from 'vitest'

import { redirectKey as builderKey } from '../../../migrate/src/redirects/normalise'

import { redirectKey } from './key'

const CASES: ReadonlyArray<readonly [string, string]> = [
  ['/', ''],
  ['/category/1-maps', ''],
  ['/category/1-maps/', ''],
  ['//category//1-maps//', ''],
  ['/category/1-maps', 's=sold'],
  ['/category/1-maps', '?s=sold'],
  ['/category/1-maps', 'page=2&s=sold&o=newest'],
  ['/category/1-maps', 'o=newest&s=sold'],
  ['/category/1-maps', 's=&page=2'],
  ['/category/1-maps', 's=b&s=a'],
  ['/our-collection/Old%20Map', 'category=maps&tag=old&utm_source=x'],
  ['/Product/1706-Bali', ''],
  ['/product/1706-bali', 'q=%C3%A9'],
]

describe('redirectKey', () => {
  it.each(['gallery', 'shop'] as const)('answers as the builder does for %s', (site) => {
    for (const [path, search] of CASES) {
      expect(redirectKey(site, path, search), `${path}?${search}`).toBe(
        builderKey(site, path, search),
      )
    }
  })
})
