// The archived-sitemap source (D43), on synthetic sitemaps in fixtures/sitemap/.
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { buildInventory } from './build.mjs'
import { CDX_HOST } from './cdx.mjs'
import {
  archivedCapture,
  fetchSitemaps,
  lastmodToIso,
  parseSitemap,
  playbackUrl,
  sitemapCaptures,
} from './sitemap.mjs'

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const DOMAIN = 'example-shop.test'
const URLSET = readFileSync(join(FIXTURES, 'sitemap', 'urlset.xml'), 'utf8')
const INDEX = readFileSync(join(FIXTURES, 'sitemap', 'index.xml'), 'utf8')
const temps = /** @type {string[]} */ ([])
afterEach(() => temps.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })))

function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'sitemap-test-'))
  temps.push(dir)
  cpSync(join(FIXTURES, 'cache'), dir, { recursive: true })
  return dir
}

/** @param {string} original @param {string} timestamp @param {string} [status] */
const row = (original, timestamp, status = '200') => ({
  original,
  timestamp,
  statuscode: status,
  mimetype: 'text/xml',
})

/** A fake archive answering playback URLs from a map of original → body. */
function fakePlayback(/** @type {Record<string, string>} */ bodies) {
  const asked = /** @type {string[]} */ ([])
  const getText = async (/** @type {string} */ url) => {
    asked.push(url)
    const original = url.replace(/^https:\/\/web\.archive\.org\/web\/\d{14}id_\//, '')
    const body = bodies[original]
    if (body === undefined) throw new Error(`not in the fake archive: ${url}`)
    return body
  }
  return { asked, getText }
}

describe('parseSitemap', () => {
  it('reads each <url> loc and lastmod — never an <image:loc>, CDATA and entities decoded', () => {
    expect(parseSitemap(URLSET)).toEqual({
      type: 'urlset',
      entries: [
        { loc: `https://www.${DOMAIN}/home`, lastmod: '2023-11-17' },
        {
          loc: `https://www.${DOMAIN}/shop/p/harbour-map-1849`,
          lastmod: '2024-05-23T08:15:00+07:00',
        },
        { loc: `https://www.${DOMAIN}/shop?category=Maps&format=json`, lastmod: null },
        { loc: `https://www.${DOMAIN}/shop?tag=bali&format=rss`, lastmod: 'not a date' },
        { loc: 'https://elsewhere.test/page', lastmod: null },
      ],
    })
  })

  it('reads a sitemap index, and refuses what is not a sitemap', () => {
    expect(parseSitemap(INDEX)).toEqual({
      type: 'sitemapindex',
      entries: [
        { loc: `https://www.${DOMAIN}/sitemap-pages.xml`, lastmod: '2024-06-01' },
        { loc: `https://www.${DOMAIN}/sitemap-never-archived.xml`, lastmod: null },
      ],
    })
    expect(() => parseSitemap('<html><body>Wayback error</body></html>')).toThrow(/not a sitemap/)
  })

  it('turns lastmod into UTC and drops what is not a date', () => {
    expect(lastmodToIso('2024-05-23T08:15:00+07:00')).toBe('2024-05-23T01:15:00Z')
    expect(lastmodToIso('2023-11-17')).toBe('2023-11-17T00:00:00Z')
    expect(lastmodToIso('not a date')).toBeNull()
    expect(lastmodToIso(null)).toBeNull()
  })
})

describe('which captures are asked for', () => {
  const rows = [
    row(`https://www.${DOMAIN}/sitemap.xml`, '20240808221041'),
    row(`https://www.${DOMAIN}/sitemap.xml`, '20240624134228'),
    row(`https://www.${DOMAIN}/sitemap.xml`, '20240901000000', '404'),
    row(`https://www.${DOMAIN}/sitemap-pages.xml`, '20240601000000'),
    row(`https://www.${DOMAIN}/sitemap-pages.xml`, '20240620000000'),
  ]

  it('only the /sitemap.xml captures the index holds as 200, oldest first', () => {
    expect(sitemapCaptures(rows.slice(0, 3), DOMAIN)).toEqual([
      { timestamp: '20240624134228', original: `https://www.${DOMAIN}/sitemap.xml` },
      { timestamp: '20240808221041', original: `https://www.${DOMAIN}/sitemap.xml` },
    ])
  })

  it('a child at its capture nearest the parent, or none when never archived', () => {
    expect(
      archivedCapture(`https://${DOMAIN}/sitemap-pages.xml`, '20240624134228', rows, DOMAIN),
    ).toEqual({ timestamp: '20240620000000', original: `https://www.${DOMAIN}/sitemap-pages.xml` })
    expect(
      archivedCapture(`https://www.${DOMAIN}/nope.xml`, '20240624134228', rows, DOMAIN),
    ).toBeNull()
  })

  it('in the raw id_ playback form on the archive', () => {
    const url = new URL(playbackUrl('20240624134228', `https://www.${DOMAIN}/sitemap.xml`))
    expect(url.hostname).toBe(CDX_HOST)
    expect(url.pathname).toBe(`/web/20240624134228id_/https://www.${DOMAIN}/sitemap.xml`)
  })
})

describe('fetchSitemaps', () => {
  it('asks each root capture once, follows only archived children, and resumes from the cache', async () => {
    const dataDir = scratch()
    const cdxRows = [
      row(`https://www.${DOMAIN}/sitemap.xml`, '20240624134228'),
      row(`https://www.${DOMAIN}/sitemap-pages.xml`, '20240620000000'),
    ]
    const archive = fakePlayback({
      [`https://www.${DOMAIN}/sitemap.xml`]: INDEX,
      [`https://www.${DOMAIN}/sitemap-pages.xml`]: URLSET,
    })
    const manifest = await fetchSitemaps({
      domain: DOMAIN,
      dataDir,
      cdxRows,
      getText: archive.getText,
    })
    expect(archive.asked).toEqual([
      `https://web.archive.org/web/20240624134228id_/https://www.${DOMAIN}/sitemap.xml`,
      `https://web.archive.org/web/20240620000000id_/https://www.${DOMAIN}/sitemap-pages.xml`,
    ])
    expect(manifest.unarchived).toEqual([
      {
        loc: `https://www.${DOMAIN}/sitemap-never-archived.xml`,
        parent: `20240624134228-www.${DOMAIN}_sitemap.xml`,
      },
    ])
    expect(manifest.files.map((file) => [file.type, file.entries])).toEqual([
      ['sitemapindex', 2],
      ['urlset', 5],
    ])

    const again = fakePlayback({})
    await fetchSitemaps({ domain: DOMAIN, dataDir, cdxRows, getText: again.getText })
    expect(again.asked).toEqual([])
  })

  it('refuses to cache a playback that is not a sitemap', async () => {
    const dataDir = scratch()
    const cdxRows = [row(`https://www.${DOMAIN}/sitemap.xml`, '20240624134228')]
    const archive = fakePlayback({ [`https://www.${DOMAIN}/sitemap.xml`]: '<html>busy</html>' })
    await expect(
      fetchSitemaps({ domain: DOMAIN, dataDir, cdxRows, getText: archive.getText }),
    ).rejects.toThrow(/not a sitemap/)
  })

  it('adds listed pages to the inventory as a third source, lastmod as their date', async () => {
    const dataDir = scratch()
    const cdxRows = [row(`https://www.${DOMAIN}/sitemap.xml`, '20240624134228')]
    const archive = fakePlayback({ [`https://www.${DOMAIN}/sitemap.xml`]: URLSET })
    await fetchSitemaps({ domain: DOMAIN, dataDir, cdxRows, getText: archive.getText })
    const { rows, summary } = buildInventory({ domain: DOMAIN, dataDir })
    const byPath = Object.fromEntries(rows.map((r) => [`${r.host} ${r.path}`, r]))
    expect(byPath['@ /shop/p/harbour-map-1849']).toMatchObject({
      sources: 'cdx|sitemap',
      first_seen: '2022-11-05T12:00:00Z',
      last_seen: '2024-07-01T00:00:00Z', // a later capture still wins over an earlier lastmod
    })
    expect(byPath['@ /home']).toMatchObject({
      sources: 'sitemap',
      kind: 'page',
      first_seen: '2023-11-17T00:00:00Z',
      last_seen: '2023-11-17T00:00:00Z',
      captures: 0,
    })
    // no lastmod (or not a date): the capture that listed it dates it
    expect(byPath['@ /shop?tag=bali']).toMatchObject({
      sources: 'sitemap',
      last_seen: '2024-06-24T13:42:28Z',
    })
    expect(byPath['@ /shop?category=Maps']?.sources).toBe('sitemap')
    expect(summary.rejected).toMatchObject({ 'sitemap:foreign-host': 1 })
    expect(summary.sitemap.captures).toEqual([
      {
        timestamp: '20240624134228',
        original: `https://www.${DOMAIN}/sitemap.xml`,
        parent: null,
        type: 'urlset',
        file: `20240624134228-www.${DOMAIN}_sitemap.xml`,
        entries: 5,
        accepted: 4,
      },
    ])
  })
})
