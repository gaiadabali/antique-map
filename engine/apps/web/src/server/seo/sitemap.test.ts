/**
 * Sitemap helpers for ticket 9.3a.
 */
import { describe, expect, it } from 'vitest'

import { buildSitemap, isIndexable } from './sitemap'

describe('buildSitemap', () => {
  it('lists both locales per path and escapes &', () => {
    const xml = buildSitemap(
      [{ path: '/browse' }, { path: '/product/foo&bar' }],
      'https://antiquemapsindonesia.com',
    )

    expect(xml).toContain('<loc>https://antiquemapsindonesia.com/browse</loc>')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="id" href="https://antiquemapsindonesia.com/id/browse" />',
    )
    expect(xml).toContain('https://antiquemapsindonesia.com/product/foo&amp;bar')
    expect(xml).not.toContain('foo&bar')
  })

  it('skips non-indexable paths', () => {
    const xml = buildSitemap(
      [{ path: '/' }, { path: '/admin' }, { path: '/bag/thank-you' }],
      'https://oldeastindies.com',
    )
    expect(xml).toContain('<loc>https://oldeastindies.com/</loc>')
    expect(xml).not.toContain('/admin')
    expect(xml).not.toContain('/bag/thank-you')
  })

  it('emits lastmod when given', () => {
    const date = new Date('2026-10-03T12:00:00Z')
    const xml = buildSitemap([{ path: '/', lastModified: date }], 'https://oldeastindies.com')
    expect(xml).toContain('<lastmod>2026-10-03</lastmod>')
  })
})

describe('isIndexable', () => {
  it('excluded paths are not indexable', () => {
    expect(isIndexable('/admin')).toBe(false)
    expect(isIndexable('/api/anything')).toBe(false)
    expect(isIndexable('/track/123')).toBe(false)
    expect(isIndexable('/checkout')).toBe(false)
    expect(isIndexable('/bag')).toBe(false)
    expect(isIndexable('/order/123')).toBe(false)
  })

  it('public paths are indexable', () => {
    expect(isIndexable('/')).toBe(true)
    expect(isIndexable('/browse')).toBe(true)
    expect(isIndexable('/product/batavia')).toBe(true)
  })
})
