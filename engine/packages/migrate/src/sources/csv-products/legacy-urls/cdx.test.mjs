import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { URL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { CDX_HOST, cdxQueries, cdxUrl, fetchCdx, parseCdxPage, readCdxCache } from './cdx.mjs'

const DOMAIN = 'example-shop.test'
const temps = /** @type {string[]} */ ([])
afterEach(() => temps.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'cdx-test-'))
  temps.push(dir)
  return dir
}

/** A fake archive: one page count per query, and a page body per (query, page). */
function fakeArchive(/** @type {number} */ pages) {
  const asked = /** @type {string[]} */ ([])
  const getText = async (/** @type {string} */ url) => {
    asked.push(url)
    const params = new URL(url).searchParams
    if (params.get('showNumPages') === 'true') return `${pages}\n`
    const page = params.get('page')
    return JSON.stringify([
      ['original', 'timestamp', 'statuscode', 'mimetype'],
      [`https://www.${DOMAIN}/page-${page}`, '20230101000000', '200', 'text/html'],
    ])
  }
  return { asked, getText }
}

describe('the CDX queries', () => {
  it('asks the domain match plus the apex, www, http and https spellings — all of the archive', () => {
    const queries = cdxQueries(DOMAIN)
    expect(queries.map((q) => q.id)).toEqual([
      'domain',
      'apex-prefix',
      'www-prefix',
      'http-apex',
      'https-www',
    ])
    for (const query of queries) {
      const url = new URL(cdxUrl(query, { page: 3 }))
      expect(url.hostname).toBe(CDX_HOST)
      expect(url.searchParams.get('output')).toBe('json')
      expect(url.searchParams.get('fl')).toBe('original,timestamp,statuscode,mimetype')
      expect(url.searchParams.get('page')).toBe('3')
      expect(url.searchParams.has('collapse')).toBe(false) // every capture, not the first
    }
    expect(
      new URL(cdxUrl(queries[0] ?? { id: '', url: '' }, { showNumPages: true })).searchParams.get(
        'showNumPages',
      ),
    ).toBe('true')
  })
})

describe('parseCdxPage', () => {
  it('reads rows by the header, whatever the field order', () => {
    const text = JSON.stringify([
      ['timestamp', 'original', 'mimetype', 'statuscode'],
      ['20200101000000', 'https://x.test/a', 'text/html', '200'],
      [],
    ])
    expect(parseCdxPage(text)).toEqual([
      {
        original: 'https://x.test/a',
        timestamp: '20200101000000',
        statuscode: '200',
        mimetype: 'text/html',
      },
    ])
  })

  it('treats an empty body or [] as an empty page and refuses a page without a needed field', () => {
    expect(parseCdxPage('')).toEqual([])
    expect(parseCdxPage('[]')).toEqual([])
    expect(() => parseCdxPage('[["original"]]')).toThrow(/timestamp/)
  })
})

describe('fetchCdx', () => {
  it('caches every page raw, and a rerun resumes without asking again', async () => {
    const dataDir = tempDir()
    const first = fakeArchive(2)
    const manifest = await fetchCdx({ domain: DOMAIN, dataDir, getText: first.getText })
    // five queries × (one page count + two pages)
    expect(first.asked).toHaveLength(15)
    expect(first.asked.every((url) => new URL(url).hostname === CDX_HOST)).toBe(true)
    expect(manifest.queries.map((q) => q.pages)).toEqual([2, 2, 2, 2, 2])
    expect(readFileSync(join(dataDir, 'cdx', 'domain', 'page-1.json'), 'utf8')).toContain('page-1')

    const again = fakeArchive(2)
    await fetchCdx({ domain: DOMAIN, dataDir, getText: again.getText })
    expect(again.asked).toHaveLength(0)

    const { rowsByQuery } = readCdxCache(dataDir)
    expect(rowsByQuery.get('domain')?.map((row) => row.original)).toEqual([
      `https://www.${DOMAIN}/page-0`,
      `https://www.${DOMAIN}/page-1`,
    ])
  })

  it('fetches a truncated page again, and everything with refresh', async () => {
    const dataDir = tempDir()
    await fetchCdx({ domain: DOMAIN, dataDir, getText: fakeArchive(1).getText })
    writeFileSync(join(dataDir, 'cdx', 'domain', 'page-0.json'), '[["original","timest')
    const resumed = fakeArchive(1)
    await fetchCdx({ domain: DOMAIN, dataDir, getText: resumed.getText })
    expect(resumed.asked).toHaveLength(1)
    expect(resumed.asked[0]).toContain('matchType=domain')

    const refreshed = fakeArchive(1)
    await fetchCdx({ domain: DOMAIN, dataDir, getText: refreshed.getText, refresh: true })
    expect(refreshed.asked).toHaveLength(10)
  })

  it('refuses to cache a page that does not parse', async () => {
    const dataDir = tempDir()
    const getText = async (/** @type {string} */ url) =>
      url.includes('showNumPages') ? '1' : '<html>busy</html>'
    await expect(fetchCdx({ domain: DOMAIN, dataDir, getText })).rejects.toThrow()
    expect(() => readCdxCache(dataDir)).not.toThrow() // no manifest was written
  })
})
