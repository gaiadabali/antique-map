/** A post's `returnTo` never leaves the brand's own pages (senior-fe #15). */
import { fileURLToPath } from 'node:url'

import { loadBrandConfig } from '@engine/config/loader'
import { describe, expect, it } from 'vitest'

import { safeReturnTo } from '../src/spike/return-to'

const config = loadBrandConfig({
  env: {
    BRAND: 'test',
    BRAND_ROOT: fileURLToPath(new URL('../../../../test', import.meta.url)),
    TEST_STOREFRONT: 'gallery',
  },
})

describe('safeReturnTo()', () => {
  it('keeps a page address of the brand, and its query', () => {
    expect(safeReturnTo('/product/1726-bali', config)).toBe('/product/1726-bali')
    expect(safeReturnTo('/product/1726-bali?x=1', config)).toBe('/product/1726-bali?x=1')
  })

  it.each([
    '//evil.com/x',
    '/\\evil.com',
    '/\t/evil.com', // normalises to //evil.com
    '/\n/evil.com',
    'https://evil.com/product/1726-bali',
    '/admin',
    '/en/item/1726-bali',
    '',
  ])('sends %j home', (target) => {
    expect(safeReturnTo(target, config)).toBe('/')
  })
})
