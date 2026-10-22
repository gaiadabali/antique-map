/**
 * Run the redirect builder over the committed gallery and shop inventories with
 * generated fixtures, asserting every inventory URL gets exactly one outcome.
 */
import { describe, expect, it } from 'vitest'

import { buildRedirects } from '../build'
import { dedupeLegacyUrls } from '../normalise'
import { type WorkLookup } from '../rules'

const GALLERY_TSV = new URL('../../../data/gallery/inventory/urls.tsv', import.meta.url)
const SHOP_CSV = new URL('../../../data/shop/inventory/urls.csv', import.meta.url)

async function readGalleryUrls(tsvPath: URL): Promise<string[]> {
  const { readFileSync } = await import('node:fs')
  const text = readFileSync(tsvPath, 'utf8')
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const [header, ...rows] = lines
  if (!header || !header.startsWith('path')) throw new Error(`unexpected header in ${tsvPath}`)
  return rows.map((row) => {
    const [path] = row.split('\t')
    return path ?? ''
  })
}

async function readShopUrls(csvPath: URL): Promise<string[]> {
  const { readFileSync } = await import('node:fs')
  const { readCsvRecords } = await import('../../sources/csv-products/legacy-urls/csv.mjs')
  const text = readFileSync(csvPath, 'utf8')
  const records = readCsvRecords(text)
  return records.map((record) => record.path ?? '')
}

function fixtureWorks(count: number): WorkLookup[] {
  return Array.from({ length: count }, (_, i) => ({
    legacyId: i + 1,
    publicId: 100000 + i,
    slug: `work-${i + 1}`,
    published: true,
  }))
}

describe('full inventory runs', () => {
  it('resolves every unique gallery URL after collapsing pagination noise', async () => {
    const urls = await readGalleryUrls(GALLERY_TSV)
    expect(urls).toHaveLength(7665)
    const uniqueUrls = dedupeLegacyUrls('gallery', urls)
    const result = buildRedirects({
      site: 'gallery',
      urls: uniqueUrls,
      works: fixtureWorks(2500),
      categories: { '/new-additions': '/browse?sort=newest', '/catalogue': '/browse' },
    })
    const outcomes = result.rows.length + result.unresolved.length
    expect(outcomes).toBe(uniqueUrls.length)
  })

  it('resolves every unique shop URL', async () => {
    const urls = await readShopUrls(SHOP_CSV)
    expect(urls).toHaveLength(673)
    const uniqueUrls = dedupeLegacyUrls('shop', urls)
    const result = buildRedirects({
      site: 'shop',
      urls: uniqueUrls,
      works: fixtureWorks(700),
      categories: { '/collection/antique-maps-prints': '/collections/antique-maps' },
    })
    const outcomes = result.rows.length + result.unresolved.length
    expect(outcomes).toBe(uniqueUrls.length)
  })
})
