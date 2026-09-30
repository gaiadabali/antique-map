import { describe, expect, it } from 'vitest'

import { classifyAll } from './classify-path.mjs'

/** @param {string} path @param {{ query?: string, mimetypes?: string[], host?: string }} [extra] */
function entry(path, extra = {}) {
  return {
    host: extra.host ?? '@',
    path,
    query: extra.query ?? '',
    mimetypes: new Set(extra.mimetypes ?? ['text/html']),
  }
}

/** @param {ReturnType<typeof entry>[]} entries @param {Record<string, string>} [overrides] */
function kinds(entries, overrides) {
  const result = classifyAll(entries, overrides)
  return Object.fromEntries(
    entries.map((e, i) => [
      e.query ? `${e.path}?${e.query}` : e.path,
      `${result[i]?.kind}/${result[i]?.rule}`,
    ]),
  )
}

describe('classifyAll', () => {
  it('knows a Squarespace store by its /p/ children', () => {
    expect(
      kinds([
        entry('/our-collection/p/harbour-map-1849'),
        entry('/our-collection'),
        entry('/our-collection/posters'),
        entry('/our-collection', { query: 'category=Maps' }),
      ]),
    ).toEqual({
      '/our-collection/p/harbour-map-1849': 'product/store-product',
      '/our-collection': 'category/store-collection',
      '/our-collection/posters': 'category/store-collection',
      '/our-collection?category=Maps': 'category/store-filter',
    })
  })

  it('knows the /products/<slug> store shape and its category listings', () => {
    expect(
      kinds([
        entry('/products/tote-bag'),
        entry('/products'),
        entry('/products/category/frames'),
        entry('/products/category/frames/antique-maps-3'),
      ]),
    ).toEqual({
      '/products/tote-bag': 'product/product-path',
      '/products': 'category/product-listing',
      '/products/category/frames': 'category/product-listing',
      '/products/category/frames/antique-maps-3': 'category/product-listing',
    })
  })

  it('knows a blog by its dated children, and its listings from its posts', () => {
    expect(
      kinds([
        entry('/notes/2023/3/4/a-post'),
        entry('/notes'),
        entry('/notes/2023/3'),
        entry('/notes/tag/bali'),
        entry('/lookbook/category/archipelago'),
      ]),
    ).toEqual({
      '/notes/2023/3/4/a-post': 'blog/blog-entry',
      '/notes': 'blog/blog-collection',
      '/notes/2023/3': 'blog/blog-listing',
      '/notes/tag/bali': 'blog/blog-listing',
      '/lookbook/category/archipelago': 'blog/blog-listing',
    })
  })

  it('sorts assets, system paths and pages', () => {
    expect(
      kinds([
        entry('/s/catalogue.pdf', { mimetypes: ['application/pdf'] }),
        entry('/bg.jpg', { mimetypes: [] }),
        entry('/feed-image', { mimetypes: ['image/png'] }),
        entry('/robots.txt'),
        entry('/sitemap.xml'),
        entry('/.well-known/security.txt'),
        entry('/cart'),
        entry('/account/login'),
        entry('/'),
        entry('/about'),
        entry('/legal/terms-of-use'),
      ]),
    ).toEqual({
      '/s/catalogue.pdf': 'asset/asset-path',
      '/bg.jpg': 'asset/file-extension',
      '/feed-image': 'asset/mimetype',
      '/robots.txt': 'system/root-file',
      '/sitemap.xml': 'system/root-file',
      '/.well-known/security.txt': 'system/platform-path',
      '/cart': 'system/platform-path',
      '/account/login': 'system/platform-path',
      '/': 'page/home',
      '/about': 'page/page',
      '/legal/terms-of-use': 'page/page',
    })
  })

  it("lets the brand's data settle what the shape cannot, and refuses an unknown kind", () => {
    expect(kinds([entry('/prints')], { '/prints': 'category' })).toEqual({
      '/prints': 'category/override',
    })
    expect(() => classifyAll([entry('/prints')], { '/prints': 'shop' })).toThrow(/not a kind/)
  })
})
