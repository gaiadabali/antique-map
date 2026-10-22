/**
 * The sitemap sources on a fake Payload (9.3fix): what they ask for (published only, no access
 * override, an explicit select) and the URLs they make of the answer. The real-database twin is
 * `sitemap-sources.db.test.ts`.
 */
import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { buildSitemap } from './sitemap'
import { queryGallerySitemap, queryShopSitemap } from './sitemap-sources'

type FindArgs = {
  readonly collection: string
  readonly overrideAccess?: boolean
  readonly where?: unknown
  readonly select?: Record<string, unknown>
}

function fakePayload(data: Record<string, readonly Record<string, unknown>[]>) {
  const calls: FindArgs[] = []
  const payload = {
    find: async (args: FindArgs) => {
      calls.push(args)
      return { docs: data[args.collection] ?? [] }
    },
  } as unknown as Payload
  return { payload, calls }
}

const UPDATED = '2026-09-30T08:00:00.000Z'

describe('the gallery sitemap sources', () => {
  const { payload, calls } = fakePayload({
    works: [
      { publicId: 12, title: 'Kaart van Batavia', updatedAt: UPDATED },
      { publicId: 13, title: 'Sold chart', updatedAt: UPDATED },
    ],
    makers: [{ slug: 'blaeu', updatedAt: UPDATED }],
    pages: [
      { slug: 'about', kind: 'info', updatedAt: UPDATED },
      { slug: 'voyage', kind: 'story', updatedAt: UPDATED },
    ],
    places: [
      { id: 1, slug: 'java', parent: null, updatedAt: UPDATED },
      { id: 2, slug: 'batavia', parent: 1, updatedAt: UPDATED },
    ],
  })

  it('the sitemap lists every published work in both locales with translated segments', async () => {
    const entries = await queryGallerySitemap(payload)
    const work = entries.find((entry) => entry.paths.en.includes('kaart-van-batavia'))
    expect(work?.paths.en).toBe('/product/12-kaart-van-batavia')
    expect(work?.paths.id).toBe('/id/produk/12-kaart-van-batavia')
    const maker = entries.find((entry) => entry.paths.en.includes('blaeu'))
    expect(maker?.paths).toEqual({ en: '/makers/blaeu', id: '/id/pembuat/blaeu' })
    const place = entries.find((entry) => entry.paths.en.endsWith('/batavia'))
    expect(place?.paths).toEqual({ en: '/places/java/batavia', id: '/id/tempat/java/batavia' })
    const story = entries.find((entry) => entry.paths.en.includes('voyage'))
    expect(story?.paths.id).toBe('/id/cerita/voyage')
    expect(entries.find((entry) => entry.paths.en === '/contact')?.paths.id).toBe('/id/kontak')
    expect(entries.find((entry) => entry.paths.en === '/sell-to-us')?.paths.id).toBe(
      '/id/jual-ke-kami',
    )
  })

  it('a sold work is listed (the read filters on publication, never on status)', async () => {
    const entries = await queryGallerySitemap(payload)
    expect(entries.some((entry) => entry.paths.en.includes('sold-chart'))).toBe(true)
    expect(JSON.stringify(calls.map((call) => call.where))).not.toContain('"status"')
  })

  it('every read is published-only, anonymous and projected', async () => {
    await queryGallerySitemap(payload)
    expect(calls.length).toBeGreaterThan(0)
    for (const call of calls) {
      expect(call.overrideAccess).toBe(false)
      expect(JSON.stringify(call.where)).toContain('{"_status":{"equals":"published"}}')
      expect(call.select).toBeDefined()
      expect(JSON.stringify(call.select)).not.toMatch(/price|notes|rights|cataloguing/i)
    }
  })

  it('each url carries en, id and x-default alternates and its own lastmod', async () => {
    const xml = buildSitemap(await queryGallerySitemap(payload), 'https://g.test')
    expect(xml).toContain('<loc>https://g.test/id/produk/12-kaart-van-batavia</loc>')
    expect(xml).toContain('hreflang="id" href="https://g.test/id/produk/12-kaart-van-batavia"')
    expect(xml).toContain('hreflang="x-default" href="https://g.test/product/12-kaart-van-batavia"')
    expect(xml).toContain('<lastmod>2026-09-30</lastmod>')
  })
})

describe('the shop sitemap sources', () => {
  const { payload } = fakePayload({
    products: [
      {
        slug: 'batik-sarong',
        updatedAt: UPDATED,
        category: { slug: 'textiles', updatedAt: UPDATED },
      },
    ],
  })

  it('the shop sitemap lists published products and no /contact', async () => {
    const entries = await queryShopSitemap(payload)
    const product = entries.find((entry) => entry.paths.en.includes('batik-sarong'))
    expect(product?.paths).toEqual({ en: '/product/batik-sarong', id: '/id/produk/batik-sarong' })
    expect(entries.find((entry) => entry.paths.en === '/collections/textiles')?.paths.id).toBe(
      '/id/koleksi/textiles',
    )
    expect(entries.some((entry) => /contact|kontak/.test(entry.paths.en + entry.paths.id))).toBe(
      false,
    )
    expect(entries.find((entry) => entry.paths.en === '/partnership')?.paths.id).toBe(
      '/id/kemitraan',
    )
  })
})
