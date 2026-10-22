/**
 * Sitemap helpers for ticket 9.3fix.
 */
import { describe, expect, it } from 'vitest'

import { buildSitemap, buildSitemapIndex, chunkEntries, isIndexable } from './sitemap'

describe('buildSitemap', () => {
  it('emits one <url> per locale, each with en, id and x-default alternates', () => {
    const xml = buildSitemap(
      [{ paths: { en: '/browse', id: '/id/jelajah' } }],
      'https://antiquemapsindonesia.com',
    )

    expect(xml).toContain('<loc>https://antiquemapsindonesia.com/browse</loc>')
    expect(xml).toContain('<loc>https://antiquemapsindonesia.com/id/jelajah</loc>')
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="en" href="https://antiquemapsindonesia.com/browse" />',
    )
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="id" href="https://antiquemapsindonesia.com/id/jelajah" />',
    )
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://antiquemapsindonesia.com/browse" />',
    )
  })

  it('escapes & in a path', () => {
    const xml = buildSitemap(
      [{ paths: { en: '/product/foo&bar', id: '/id/produk/foo&bar' } }],
      'https://oldeastindies.com',
    )
    expect(xml).toContain('https://oldeastindies.com/product/foo&amp;bar')
    expect(xml).not.toContain('foo&bar"')
  })

  it('skips an entry whose English path is not indexable', () => {
    const xml = buildSitemap(
      [
        { paths: { en: '/', id: '/id/' } },
        { paths: { en: '/admin/x', id: '/id/admin/x' } },
        { paths: { en: '/bag', id: '/id/bag' } },
      ],
      'https://oldeastindies.com',
    )
    expect(xml).toContain('<loc>https://oldeastindies.com/</loc>')
    expect(xml).not.toContain('/admin')
    expect(xml).not.toContain('/bag')
  })

  it('emits lastmod when given', () => {
    const date = new Date('2026-10-03T12:00:00Z')
    const xml = buildSitemap(
      [{ paths: { en: '/', id: '/id/' }, lastModified: date }],
      'https://oldeastindies.com',
    )
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

describe('buildSitemapIndex', () => {
  it('lists each chunk file as its own <sitemap>', () => {
    const xml = buildSitemapIndex(['sitemap-1.xml', 'sitemap-2.xml'], 'https://oldeastindies.com')
    expect(xml).toContain('<loc>https://oldeastindies.com/sitemap-1.xml</loc>')
    expect(xml).toContain('<loc>https://oldeastindies.com/sitemap-2.xml</loc>')
  })
})

describe('chunkEntries', () => {
  it('never puts more than `max` locale URLs (two per entry) in one chunk', () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      paths: { en: `/product/${i}`, id: `/id/produk/${i}` },
    }))
    const chunks = chunkEntries(entries, 4)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(2)
    expect(chunks[2]).toHaveLength(1)
  })

  it('answers one empty chunk for no entries', () => {
    expect(chunkEntries([])).toEqual([[]])
  })
})
