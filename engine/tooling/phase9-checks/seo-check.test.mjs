// The 9.3.d page judgement (ticket: "a gallery page with offers in JSON-LD fails"; "a page missing
// its canonical or description fails").
import { describe, expect, it } from 'vitest'

import {
  containsPricing,
  isSitemapIndex,
  judgePage,
  localeCounts,
  sitemapLocations,
} from './seo-check.mjs'
import { goodPage } from './support/server.mjs'

const ORIGIN = 'https://gallery.example'

describe('judgePage', () => {
  it('passes a page with a canonical, alternates and a description', () => {
    const html = goodPage({ origin: ORIGIN, path: '/product/1' })
    expect(
      judgePage({ url: `${ORIGIN}/product/1`, status: 200, html, site: 'gallery', origin: ORIGIN })
        .problems,
    ).toEqual([])
  })

  it('fails a page with no canonical', () => {
    const html =
      '<html><head><meta name="description" content="x"><link rel="alternate" hreflang="en" href="/"><link rel="alternate" hreflang="id" href="/id"><link rel="alternate" hreflang="x-default" href="/"></head></html>'
    const { problems } = judgePage({
      url: `${ORIGIN}/x`,
      status: 200,
      html,
      site: 'gallery',
      origin: ORIGIN,
    })
    expect(problems).toContain('no canonical link')
  })

  it('fails a page with no description', () => {
    const html = `<html><head><link rel="canonical" href="${ORIGIN}/x"><link rel="alternate" hreflang="en" href="${ORIGIN}/x"><link rel="alternate" hreflang="id" href="${ORIGIN}/id/x"><link rel="alternate" hreflang="x-default" href="${ORIGIN}/x"></head></html>`
    const { problems } = judgePage({
      url: `${ORIGIN}/x`,
      status: 200,
      html,
      site: 'gallery',
      origin: ORIGIN,
    })
    expect(problems).toContain('no meta description')
  })

  it('fails a page missing the x-default alternate', () => {
    const html = `<html><head><link rel="canonical" href="${ORIGIN}/x"><meta name="description" content="x"><link rel="alternate" hreflang="en" href="${ORIGIN}/x"><link rel="alternate" hreflang="id" href="${ORIGIN}/id/x"></head></html>`
    const { problems } = judgePage({
      url: `${ORIGIN}/x`,
      status: 200,
      html,
      site: 'gallery',
      origin: ORIGIN,
    })
    expect(problems).toContain('no hreflang "x-default" alternate')
  })

  it('fails a canonical on another origin', () => {
    const html = goodPage({ origin: 'https://evil.example', path: '/x' })
    const { problems } = judgePage({
      url: `${ORIGIN}/x`,
      status: 200,
      html,
      site: 'gallery',
      origin: ORIGIN,
    })
    expect(problems.some((p) => p.startsWith('canonical is not'))).toBe(true)
  })

  it('fails a gallery page whose JSON-LD holds offers', () => {
    const html = goodPage({
      origin: ORIGIN,
      path: '/product/1',
      ld: [{ '@type': 'Product', offers: { price: '1' } }],
    })
    const { problems } = judgePage({
      url: `${ORIGIN}/product/1`,
      status: 200,
      html,
      site: 'gallery',
      origin: ORIGIN,
    })
    expect(problems).toContain('gallery JSON-LD contains price or offers')
  })

  it('allows offers on the shop', () => {
    const html = goodPage({
      origin: ORIGIN,
      path: '/product/1',
      ld: [{ '@type': 'Product', offers: { price: '1000' } }],
    })
    const { problems } = judgePage({
      url: `${ORIGIN}/product/1`,
      status: 200,
      html,
      site: 'shop',
      origin: ORIGIN,
    })
    expect(problems).toEqual([])
  })

  it('fails a non-200 page', () => {
    const { problems } = judgePage({
      url: `${ORIGIN}/x`,
      status: 404,
      html: '',
      site: 'gallery',
      origin: ORIGIN,
    })
    expect(problems).toContain('status 404')
  })
})

describe('containsPricing', () => {
  it('finds a price nested deep, and a bare offers key', () => {
    expect(containsPricing({ a: [{ b: { price: 1 } }] })).toBe(true)
    expect(containsPricing({ offers: [] })).toBe(true)
    expect(containsPricing({ name: 'no', identifier: 'IG-1' })).toBe(false)
  })
})

describe('sitemap parsing', () => {
  const XML = `<?xml version="1.0"?><urlset><url><loc>https://a.example/&amp;x</loc></url></urlset>`

  it('reads and unescapes loc entries', () => {
    expect(sitemapLocations(XML)).toEqual(['https://a.example/&x'])
  })

  it('detects an index', () => {
    expect(
      isSitemapIndex(
        '<sitemapindex><sitemap><loc>https://a.example/s.xml</loc></sitemap></sitemapindex>',
      ),
    ).toBe(true)
    expect(isSitemapIndex(XML)).toBe(false)
  })

  it('counts a site’s URLs per locale', () => {
    expect(
      localeCounts(['https://a.example/x', 'https://a.example/id/x', 'https://a.example/id']),
    ).toEqual({ en: 1, id: 2 })
  })
})

describe('goodPage fixture', () => {
  it('is itself a passing page (the fixture the other tests lean on)', () => {
    const html = goodPage({ origin: ORIGIN, path: '/' })
    expect(
      judgePage({ url: `${ORIGIN}/`, status: 200, html, site: 'gallery', origin: ORIGIN }).problems,
    ).toEqual([])
  })
})
