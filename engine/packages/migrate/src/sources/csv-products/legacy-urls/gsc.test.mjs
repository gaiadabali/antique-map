// The Search Console half, tested on synthetic exports (fixtures/gsc/) while
// the owner's real one (OA11) is outstanding.
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { buildInventory } from './build.mjs'
import { parseCsv } from './csv.mjs'
import { importGscFile, parseGscCsv, parseGscDate, readGscCache } from './gsc.mjs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const DOMAIN = 'example-shop.test'
const temps = /** @type {string[]} */ ([])
afterEach(() => temps.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

/** A scratch LEGACY_DATA_DIR holding a copy of the synthetic CDX cache. */
function dataDirWithCdx() {
  const dir = mkdtempSync(join(tmpdir(), 'gsc-test-'))
  temps.push(dir)
  cpSync(join(FIXTURES, 'cache'), dir, { recursive: true })
  return dir
}

/** @param {string} name */
const fixture = (name) => readFileSync(join(FIXTURES, 'gsc', name), 'utf8')

describe('parseGscCsv', () => {
  it('reads the Performance "Pages" export: BOM, quoted thousands, a comma inside a URL', () => {
    expect(parseGscCsv(fixture('Pages.csv'))).toEqual([
      {
        url: `https://www.${DOMAIN}/shop/p/harbour-map-1849`,
        clicks: 12,
        impressions: 1234,
        lastCrawled: null,
      },
      {
        url: `https://${DOMAIN}/shop/p/spice-islands-map-year-1724`,
        clicks: 3,
        impressions: 410,
        lastCrawled: null,
      },
      {
        url: `https://www.${DOMAIN}/shop/p/a,b-print`,
        clicks: 0,
        impressions: 5,
        lastCrawled: null,
      },
      { url: 'https://elsewhere.test/page', clicks: 1, impressions: 1, lastCrawled: null },
      { url: `https://www.${DOMAIN}/about#team`, clicks: 0, impressions: 20, lastCrawled: null },
    ])
  })

  it('reads the same export saved with CRLF line endings', () => {
    const crlf = fixture('Pages.csv').replaceAll('\n', '\r\n')
    expect(parseGscCsv(crlf)).toEqual(parseGscCsv(fixture('Pages.csv')))
  })

  it('reads an export from the Indonesian UI', () => {
    expect(parseGscCsv(fixture('Pages-id.csv'))).toEqual([
      {
        url: `https://www.${DOMAIN}/shop/p/harbour-map-1849`,
        clicks: 7,
        impressions: 1500,
        lastCrawled: null,
      },
    ])
  })

  it('reads the page-indexing export, dating each row by Last crawled', () => {
    expect(parseGscCsv(fixture('index-report.csv'))).toEqual([
      {
        url: `https://www.${DOMAIN}/old-page`,
        clicks: null,
        impressions: null,
        lastCrawled: '2026-09-14',
      },
      {
        url: `https://www.${DOMAIN}/shop/p/harbour-map-1849`,
        clicks: null,
        impressions: null,
        lastCrawled: '2026-09-01',
      },
    ])
    expect(parseGscDate('not a date')).toBeNull()
  })

  it('refuses a file that is not a pages export, naming the columns it expects', () => {
    expect(() => parseGscCsv('Query,Clicks\nold maps,4\n')).toThrow(/top pages/)
  })

  it('parseCsv refuses an unterminated quote', () => {
    expect(() => parseCsv('a,"b\n')).toThrow(/quoted/)
  })
})

describe('importing an export into the inventory', () => {
  it('adds Search Console pages to the CDX rows: overlaps become cdx|gsc, new pages gsc', () => {
    const dataDir = dataDirWithCdx()
    const file = join(dataDir, 'download.csv')
    writeFileSync(file, fixture('Pages.csv'))
    expect(
      importGscFile({ file, dataDir, from: '2025-05-01', to: '2026-08-31', name: 'Pages.csv' }),
    ).toEqual({
      name: 'Pages.csv',
      records: 5,
    })
    expect(existsSync(join(dataDir, 'gsc', 'Pages.csv.meta.json'))).toBe(true)
    expect(readGscCache(dataDir)[0]?.meta).toEqual({
      from: '2025-05-01',
      to: '2026-08-31',
      originalName: 'download.csv',
    })

    const { rows, summary } = buildInventory({ domain: DOMAIN, dataDir })
    const byPath = Object.fromEntries(rows.map((row) => [`${row.host} ${row.path}`, row]))
    expect(byPath['@ /shop/p/harbour-map-1849']).toMatchObject({
      kind: 'product',
      sources: 'cdx|gsc',
      first_seen: '2022-11-05T12:00:00Z',
      last_seen: '2026-08-31T23:59:59Z',
      gsc_clicks: 12,
      gsc_impressions: 1234,
    })
    expect(byPath['@ /shop/p/spice-islands-map-year-1724']).toMatchObject({
      kind: 'product',
      rule: 'store-product',
      sources: 'gsc',
      first_seen: '2025-05-01T00:00:00Z',
      captures: 0,
    })
    expect(byPath['@ /shop/p/a,b-print']?.sources).toBe('gsc')
    expect(byPath['@ /about']).toMatchObject({ sources: 'cdx|gsc', gsc_impressions: 20 })
    expect(summary.rejected).toMatchObject({ 'gsc:foreign-host': 1 })
    expect(summary.gsc.exports).toEqual([
      { name: 'Pages.csv', from: '2025-05-01', to: '2026-08-31', rows: 5, accepted: 4 },
    ])
    expect(summary.bySource).toEqual({ cdx: 10, 'cdx|gsc': 2, gsc: 2 })
  })

  it('keeps the larger count when two exports overlap, rather than counting a click twice', () => {
    const dataDir = dataDirWithCdx()
    for (const name of ['Pages.csv', 'Pages-id.csv']) {
      importGscFile({ file: join(FIXTURES, 'gsc', name), dataDir })
    }
    const { rows } = buildInventory({ domain: DOMAIN, dataDir })
    const harbour = rows.find((row) => row.path === '/shop/p/harbour-map-1849')
    expect(harbour).toMatchObject({ gsc_clicks: 12, gsc_impressions: 1500 })
  })

  it('refuses a malformed period before anything is copied', () => {
    const dataDir = dataDirWithCdx()
    expect(() =>
      importGscFile({ file: join(FIXTURES, 'gsc', 'Pages.csv'), dataDir, from: '01/05/2025' }),
    ).toThrow(/YYYY-MM-DD/)
    expect(existsSync(join(dataDir, 'gsc'))).toBe(false)
  })
})
