/**
 * Unit tests for the redirect builder and its safety checks.
 */
import { describe, expect, it } from 'vitest'

import { buildRedirects, type RedirectInput } from '../build'

const base: RedirectInput = {
  site: 'gallery',
  urls: [],
  works: [{ legacyId: 1, publicId: 1001, slug: 'a', published: true }],
  categories: { '1': '/browse/maps' },
}

describe('buildRedirects', () => {
  it('fails on a duplicate from', () => {
    expect(() =>
      buildRedirects({
        ...base,
        urls: ['/product/1-old', '/product/1-old'],
      }),
    ).toThrow(/duplicate "from"/)
  })

  it('fails on a chain', () => {
    expect(() =>
      buildRedirects({
        ...base,
        urls: ['/path/a', '/path/b'],
        categories: {
          '/path/a': '/path/b',
          '/path/b': '/browse/maps',
        },
      }),
    ).toThrow(/redirect chain/)
  })

  it('builds a redirect row and counts unresolved', () => {
    const result = buildRedirects({
      ...base,
      urls: ['/product/1-old', '/category/1-x', '/product/99-missing'],
    })
    expect(result.rows).toHaveLength(2)
    expect(result.unresolved).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      site: 'gallery',
      from: '/product/1-old',
      to: '/product/1001-a',
      code: 301,
    })
    expect(result.unresolved[0]).toMatchObject({
      from: '/product/99-missing',
      reason: 'no work for legacy id 99',
    })
  })

  it('records gone rows for account paths', () => {
    const result = buildRedirects({
      ...base,
      urls: ['/account/basket'],
    })
    expect(result.gone).toEqual(['/account/basket'])
    expect(result.rows[0]).toMatchObject({ code: 410, to: '' })
  })

  it('ignores scheme and host when parsing inventory URLs', () => {
    const result = buildRedirects({
      ...base,
      urls: ['https://antiquemapsindonesia.com/product/1-old'],
    })
    expect(result.rows[0]).toMatchObject({ from: '/product/1-old' })
  })
})
