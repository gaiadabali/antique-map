// The whole read against a fake site: what is fetched, what is only
// inventoried, that a second run is free, that the build never reaches the
// network, and that the committed inventory carries paths and nothing else.
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { buildRecords, type PublicProductRecord } from '../build.ts'
import { crawl } from '../crawl.ts'
import { writeInventory } from '../inventory.ts'
import { fixture, newFetcher, type FakeAnswer } from './helpers.ts'

const JPEG = { status: 200, type: 'image/jpeg', body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) }

// The sold filter lists only sold items: here, the second card of the listing fixture alone.
const SOLD_LISTING = `<div class="row product-item">
  <h2 class="title"><a href="https://old-store.example/product/102-mock-plan">Mock plan</a></h2>
  <a href="#sold-out">Sold</a>
</div>`

function site(): Record<string, FakeAnswer | FakeAnswer[]> {
  return {
    '/robots.txt': { status: 200, type: 'text/plain', body: 'User-agent: *\nDisallow:\n' },
    '/sitemap.xml': { status: 500, body: 'a framework stack trace' },
    '/': { status: 200, body: fixture('listing.html') },
    '/category/1-all-mock-maps': { status: 200, body: fixture('listing.html') },
    '/category/1-all-mock-maps?s=sold': { status: 200, body: SOLD_LISTING },
    '/product/101-mock-chart-year-1689': { status: 200, body: fixture('product-listed.html') },
    '/product/102-mock-plan': { status: 200, body: fixture('product-sold.html') },
    '/storage/products/101-501.jpg': JPEG,
    '/storage/products/101-502.jpg': JPEG,
    '/storage/products/102-601.jpg': JPEG,
    '/about-us': { status: 301, headers: { location: 'https://old-store.example/about' } },
    '/about': { status: 200, body: '<p>about</p>' },
  }
}

describe('the public read', () => {
  it('fetches pages, listings, products and original images — and only inventories the rest', async () => {
    const { fetcher, config, requests } = newFetcher(site())
    const result = await crawl({ config, fetcher })
    const fetched = requests.map((request) => request.url)
    expect(fetched).toEqual(
      expect.arrayContaining([
        '/robots.txt',
        '/sitemap.xml',
        '/',
        '/category/1-all-mock-maps?s=sold',
        '/product/101-mock-chart-year-1689',
        '/product/102-mock-plan',
        '/storage/products/101-501.jpg',
        '/storage/products/102-601.jpg',
        '/about-us',
        '/about',
      ]),
    )
    for (const never of [
      '/account/basket',
      '/s?u350=1',
      '/category/1-all-mock-maps?p=lowest',
      '/category/1-all-mock-maps?o=newest',
      '/category/1-all-mock-maps?s=unsold',
      '/storage/products/101-501S.jpg',
    ]) {
      expect(fetched).not.toContain(never)
      expect(result.inventory.has(never)).toBe(true)
    }
    // a form's endpoint written in a script is neither requested nor inventoried
    expect(fetched).not.toContain('/product/101/enquire')
    expect(result.inventory.has('/product/101/enquire')).toBe(false)
    expect(new Set(fetched).size).toBe(fetched.length) // nothing twice, even in one run
    expect(result.inventory.get('/account/basket')?.note).toBe('never')
    expect(result.inventory.get('/about-us')).toMatchObject({
      status: 301,
      location: 'https://old-store.example/about',
    })
    expect(result.categories.map((category) => category.id)).toEqual([1, 22, 2])
    // pages and listings before products, products before images
    const firstProduct = fetched.findIndex((url) => url.startsWith('/product/'))
    const lastListing = fetched.findLastIndex((url) => url.startsWith('/category/'))
    const firstImage = fetched.findIndex((url) => url.startsWith('/storage/'))
    expect(lastListing).toBeLessThan(firstProduct)
    expect(firstProduct).toBeLessThan(firstImage)
  })

  it('resumes from its cache: a second run makes no request at all', async () => {
    const first = newFetcher(site())
    await crawl({ config: first.config, fetcher: first.fetcher })
    const second = newFetcher(site(), { cacheDir: first.cacheDir })
    const again = await crawl({ config: second.config, fetcher: second.fetcher })
    expect(second.requests).toEqual([])
    expect(again.inventory.size).toBeGreaterThan(20)
  })

  it('stops at maxRequests and picks up where it stopped', async () => {
    const first = newFetcher(site())
    const partial = await crawl({ config: first.config, fetcher: first.fetcher, maxRequests: 4 })
    expect(partial.stoppedEarly).toBe(true)
    expect(first.requests.length).toBeLessThanOrEqual(4 + 2) // robots and the sitemap probe come first
    const second = newFetcher(site(), { cacheDir: first.cacheDir })
    await crawl({ config: second.config, fetcher: second.fetcher })
    const both = [...first.requests, ...second.requests].map((request) => request.url)
    expect(new Set(both).size).toBe(both.length)
  })

  it('builds raw product records offline, sold ones included, and writes a paths-only inventory', async () => {
    const online = newFetcher(site())
    await crawl({ config: online.config, fetcher: online.fetcher })
    const offline = newFetcher({}, { cacheDir: online.cacheDir, offline: true })
    const outDir = mkdtempSync(join(tmpdir(), 'public-read-out-'))
    const built = await buildRecords({ config: offline.config, fetcher: offline.fetcher, outDir })
    expect(offline.requests).toEqual([])
    expect(built.counts).toMatchObject({
      products: 2,
      listed: 1,
      sold: 1,
      imagesLinked: 3,
      imagesMissing: 0,
    })

    const read = (id: number) =>
      JSON.parse(
        readFileSync(join(outDir, 'products', `${id}.json`), 'utf8'),
      ) as PublicProductRecord
    const listed = read(101)
    expect(listed).toMatchObject({ legacyId: 101, availability: 'listed', soldEvidence: [] })
    expect(listed.maker).toEqual({
      legacyId: 7,
      name: 'Mock Maker',
      path: '/mapmaker/7-mock-maker',
    })
    expect(listed.categories.map((category) => category.legacyId)).toEqual([1, 22])
    expect(listed.cardFields).toContainEqual({ label: 'Year', value: 'null' })
    expect(listed.images.map((image) => image.file)).toEqual([
      'images/101-501.jpg',
      'images/101-502.jpg',
    ])
    expect(readdirSync(join(outDir, 'images')).sort()).toEqual([
      '101-501.jpg',
      '101-502.jpg',
      '102-601.jpg',
    ])
    const sold = read(102)
    expect(sold.availability).toBe('sold')
    expect(sold.soldEvidence).toEqual(['page', 'card', 'sold-listing'])

    const committed = mkdtempSync(join(tmpdir(), 'inventory-'))
    const summary = writeInventory(
      built.crawl,
      'https://old-store.example',
      join(outDir, 'urls.tsv'),
      committed,
    )
    const lines = readFileSync(join(committed, 'urls.tsv'), 'utf8').trim().split('\n')
    expect(lines[0]).toBe('path\tkind\tstatus\tlocation')
    for (const line of lines.slice(1)) expect(line.startsWith('/')).toBe(true)
    expect(lines.join('\n')).not.toMatch(/old-store\.example|@|referrers/)
    expect(lines).toContain('/about-us\tpage\t301\t/about')
    expect(summary.products).toEqual({ discovered: 2, fetched: 2 })
  })
})
