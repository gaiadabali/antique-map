// The 9.3.d page judgement (ticket: "a gallery page with offers in JSON-LD fails"; "a page missing
// its canonical or description fails"; "a sitemap on the canonical origin is crawled through the
// base"; "a sitemap loc on another origin fails and is not requested").
import { afterEach, describe, expect, it } from 'vitest'

import { requestOnce } from './http.mjs'
import {
  collectSitemapUrls,
  containsPricing,
  crawlPages,
  isSitemapIndex,
  judgePage,
  localeCounts,
  resolveLocs,
  sitemapLocations,
} from './seo-check.mjs'
import { goodPage, startServer } from './support/server.mjs'

const ORIGIN = 'https://gallery.example'

let server
afterEach(async () => {
  if (server) await server.close()
  server = undefined
})

const get = (url) => requestOnce(url, { method: 'GET' })

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

const sitemapXml = (locs) =>
  `<?xml version="1.0"?><urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join('')}</urlset>`

describe('resolveLocs', () => {
  it('maps locs on the canonical origin onto the base and flags the others', () => {
    const { requested, foreign } = resolveLocs(
      [`${ORIGIN}/a`, 'https://evil.example/b', `${ORIGIN}/c?x=1`],
      { origin: ORIGIN, base: 'http://127.0.0.1:9999' },
    )
    expect(requested).toEqual([
      { url: `${ORIGIN}/a`, req: 'http://127.0.0.1:9999/a' },
      { url: `${ORIGIN}/c?x=1`, req: 'http://127.0.0.1:9999/c?x=1' },
    ])
    expect(foreign).toEqual(['https://evil.example/b'])
  })
})

describe('collectSitemapUrls', () => {
  it('crawls a sitemap on the canonical origin through the base', async () => {
    server = await startServer({
      '/sitemap.xml': () => ({ status: 200, body: sitemapXml([`${ORIGIN}/a`, `${ORIGIN}/b`]) }),
    })
    const collected = await collectSitemapUrls({ origin: ORIGIN, base: server.base, get })
    expect(collected.failures).toEqual([])
    expect(collected.pages.map((p) => p.req)).toEqual([`${server.base}/a`, `${server.base}/b`])
    expect(collected.pages.map((p) => p.url)).toEqual([`${ORIGIN}/a`, `${ORIGIN}/b`])
    expect(server.hits.map((h) => h.path)).toEqual(['/sitemap.xml'])
  })

  it('fails a sitemap loc on another origin and never requests it', async () => {
    server = await startServer({
      '/sitemap.xml': () => ({
        status: 200,
        body: sitemapXml([`${ORIGIN}/a`, 'https://evil.example/b']),
      }),
    })
    const collected = await collectSitemapUrls({ origin: ORIGIN, base: server.base, get })
    expect(collected.failures).toEqual([
      { url: 'https://evil.example/b', problems: ['sitemap lists another origin'] },
    ])
    expect(collected.pages.map((p) => p.req)).toEqual([`${server.base}/a`])
    expect(server.hits.some((h) => h.host?.includes('evil'))).toBe(false)
  })

  it('follows an index’s children through the base', async () => {
    server = await startServer({
      '/sitemap.xml': () => ({
        status: 200,
        body: `<sitemapindex><sitemap><loc>${ORIGIN}/sitemap-en.xml</loc></sitemap></sitemapindex>`,
      }),
      '/sitemap-en.xml': () => ({ status: 200, body: sitemapXml([`${ORIGIN}/a`]) }),
    })
    const collected = await collectSitemapUrls({ origin: ORIGIN, base: server.base, get })
    expect(collected.failures).toEqual([])
    expect(collected.pages.map((p) => p.req)).toEqual([`${server.base}/a`])
    expect(server.hits.map((h) => h.path)).toEqual(['/sitemap.xml', '/sitemap-en.xml'])
  })

  it('throws when the sitemap itself is missing', async () => {
    server = await startServer({})
    await expect(collectSitemapUrls({ origin: ORIGIN, base: server.base, get })).rejects.toThrow(
      /sitemap\.xml answered 404/,
    )
  })
})

describe('crawlPages', () => {
  it('judges each page against the canonical origin, requesting it through the base', async () => {
    server = await startServer({
      '/a': () => ({ status: 200, body: goodPage({ origin: ORIGIN, path: '/a' }) }),
    })
    const pages = [{ url: `${ORIGIN}/a`, req: `${server.base}/a` }]
    const { checked, failures } = await crawlPages(pages, { get, site: 'gallery', origin: ORIGIN })
    expect(checked).toBe(1)
    expect(failures).toEqual([])
  })
})
