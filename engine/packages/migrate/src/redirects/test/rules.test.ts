/**
 * Unit tests for the legacy redirect rules.
 */
import { describe, expect, it } from 'vitest'

import { galleryRule, resolveRule, shopRule, type RuleContext, type WorkLookup } from '../rules'

const works: WorkLookup[] = [
  { legacyId: 1706, publicId: 1706, slug: 'bali-island-large-map', published: true },
  { legacyId: 1, publicId: 100001, slug: 'old-slug', published: false },
]

const categories: Record<string, string> = {
  '1': '/browse/antique-maps',
  '12': '/browse/sea-charts',
}

const ctx: RuleContext = { site: 'gallery', works, categories }

describe('gallery rules', () => {
  it('maps an old product URL to the new item URL by publicId', () => {
    expect(galleryRule('/product/1706-old-slug', '', ctx)).toEqual({
      kind: 'redirect',
      to: '/product/1706-bali-island-large-map',
      code: 301,
    })
  })

  it('keeps ?s=sold and ?o=newest on category redirects', () => {
    expect(galleryRule('/category/1-all-antique-maps', 's=sold', ctx)).toEqual({
      kind: 'redirect',
      to: '/browse/antique-maps?s=sold',
      code: 301,
    })
    expect(galleryRule('/category/1-all-antique-maps', 'o=newest', ctx)).toEqual({
      kind: 'redirect',
      to: '/browse/antique-maps?o=newest',
      code: 301,
    })
  })

  it('an unpublished destination is unresolved, never redirected', () => {
    expect(galleryRule('/product/1-stale-slug', '', ctx)).toEqual({
      kind: 'unresolved',
      reason: 'work 1 is not published',
    })
  })

  it('an account path is gone', () => {
    expect(galleryRule('/account/basket', '', ctx)).toEqual({ kind: 'gone' })
    expect(galleryRule('/account/register', '', ctx)).toEqual({ kind: 'gone' })
  })

  it('a missing work is unresolved', () => {
    expect(galleryRule('/product/99999-no-such-work', '', ctx)).toEqual({
      kind: 'unresolved',
      reason: 'no work for legacy id 99999',
    })
  })

  it('a static path with a hand map redirects', () => {
    const withStatic: RuleContext = { ...ctx, categories: { '/catalogue': '/browse' } }
    expect(galleryRule('/catalogue', '', withStatic)).toEqual({
      kind: 'redirect',
      to: '/browse',
      code: 301,
    })
  })
})

describe('shop rules', () => {
  const shopCtx: RuleContext = {
    site: 'shop',
    works: [{ legacyId: 1, publicId: 101, slug: 'tote-bag', published: true }],
    categories: { '/collection/antique-maps-prints': '/collections/antique-maps' },
  }

  it('maps a shop product slug to the new product page', () => {
    expect(shopRule('/products/tote-bag', '', shopCtx)).toEqual({
      kind: 'redirect',
      to: '/product/tote-bag',
      code: 301,
    })
  })

  it('maps a Squarespace product path', () => {
    expect(shopRule('/our-collection/p/tote-bag', '', shopCtx)).toEqual({
      kind: 'redirect',
      to: '/product/tote-bag',
      code: 301,
    })
  })

  it('maps a shop collection path', () => {
    expect(shopRule('/collection/antique-maps-prints', '', shopCtx)).toEqual({
      kind: 'redirect',
      to: '/collections/antique-maps',
      code: 301,
    })
  })
})

describe('resolveRule picks a site', () => {
  it('dispatches gallery', () => {
    expect(resolveRule('gallery', '/account/login', '', ctx)).toEqual({ kind: 'gone' })
  })
  it('dispatches shop', () => {
    expect(
      resolveRule('shop', '/account/login', '', { site: 'shop', works: [], categories: {} }),
    ).toEqual({
      kind: 'gone',
    })
  })
})
