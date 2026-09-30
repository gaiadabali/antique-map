import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { buildInventory, writeInventory } from './build.mjs'
import { readCsvRecords } from './csv.mjs'
import { cdxTimestampToIso, INVENTORY_COLUMNS } from './inventory.mjs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const DOMAIN = 'example-shop.test'
const temps = /** @type {string[]} */ ([])
afterEach(() => temps.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'build-test-'))
  temps.push(dir)
  cpSync(join(FIXTURES, 'cache'), join(dir, 'data'), { recursive: true })
  return { dataDir: join(dir, 'data'), outDir: join(dir, 'inventory') }
}

describe('buildInventory from a cached CDX index', () => {
  it('lists every distinct normalised path once, with its evidence and kind', () => {
    const { dataDir } = scratch()
    const { rows } = buildInventory({
      domain: DOMAIN,
      dataDir,
      kindOverrides: { '/prints': 'category' },
    })
    expect(rows.map((row) => `${row.host} ${row.path} ${row.kind}/${row.rule}`)).toEqual([
      '@ / page/home',
      '@ /about page/page',
      '@ /cart system/platform-path',
      '@ /journal blog/blog-collection',
      '@ /journal/2023/3/4/a-post blog/blog-entry',
      '@ /prints category/override',
      '@ /robots.txt system/root-file',
      '@ /s/catalogue.pdf asset/asset-path',
      '@ /shop category/store-collection',
      '@ /shop/p/harbour-map-1849 product/store-product',
      '@ /shop?category=Posters category/store-filter',
      'shop /products/tote-bag product/product-path',
    ])
    const harbour = rows.find((row) => row.path === '/shop/p/harbour-map-1849')
    // plain, ?format=json and trailing-slash spellings plus a revisit: one row, four captures
    expect(harbour).toEqual({
      host: '@',
      path: '/shop/p/harbour-map-1849',
      kind: 'product',
      rule: 'store-product',
      first_seen: '2022-11-05T12:00:00Z',
      last_seen: '2024-07-01T00:00:00Z',
      statuses: '-|200|404',
      last_status: '404', // the revisit after it carries no status of its own
      captures: 4,
      sources: 'cdx',
      gsc_clicks: '',
      gsc_impressions: '',
    })
    expect(rows.find((row) => row.path === '/prints')?.last_status).toBe('-')
  })

  it('reports what it left out — by reason, never by content — and the cross-check per query', () => {
    const { dataDir } = scratch()
    const { summary } = buildInventory({ domain: DOMAIN, dataDir })
    expect(summary.rejected).toEqual({ 'cdx:personal': 1 })
    expect(JSON.stringify(summary)).not.toContain('someone')
    expect(summary.byKind).toEqual({
      product: 2,
      category: 2,
      page: 3,
      blog: 2,
      asset: 1,
      system: 2,
    })
    expect(summary.cdx.queries).toEqual([
      {
        id: 'domain',
        url: DOMAIN,
        matchType: 'domain',
        captures: 17,
        distinct: 12,
        missingFromDomain: 0,
      },
      {
        id: 'www-prefix',
        url: `www.${DOMAIN}/`,
        matchType: 'prefix',
        captures: 3,
        distinct: 3,
        missingFromDomain: 0,
      },
    ])
  })

  it('fails when a variant query saw a path the domain match did not', () => {
    const { dataDir } = scratch()
    const page = join(dataDir, 'cdx', 'www-prefix', 'page-0.json')
    const rows = JSON.parse(readFileSync(page, 'utf8'))
    rows.push([`https://www.${DOMAIN}/only-here`, '20230101000000', '200', 'text/html'])
    writeFileSync(page, JSON.stringify(rows))
    expect(() => buildInventory({ domain: DOMAIN, dataDir })).toThrow(/www-prefix/)
  })

  it('writes the same bytes on every rebuild, in the documented columns', () => {
    const { dataDir, outDir } = scratch()
    const first = writeInventory(outDir, buildInventory({ domain: DOMAIN, dataDir }))
    const csv = readFileSync(first.csvPath, 'utf8')
    const summary = readFileSync(first.summaryPath, 'utf8')
    writeInventory(outDir, buildInventory({ domain: DOMAIN, dataDir }))
    expect(readFileSync(first.csvPath, 'utf8')).toBe(csv)
    expect(readFileSync(first.summaryPath, 'utf8')).toBe(summary)
    expect(csv.split('\n')[0]).toBe(INVENTORY_COLUMNS.join(','))
    expect(readCsvRecords(csv)).toHaveLength(12)
  })

  it('reads CDX timestamps as UTC', () => {
    expect(cdxTimestampToIso('20200920105719')).toBe('2020-09-20T10:57:19Z')
    expect(() => cdxTimestampToIso('2020')).toThrow(/14-digit/)
  })
})
