// The domain's own sitemaps, as the Wayback Machine archived them — read
// through playback on web.archive.org in its raw `id_` form (the bytes the
// crawler saw, no toolbar), never from the old site (D43). Only captures the
// CDX index lists as 200 are asked for, and a child sitemap is followed only
// when the index shows it was archived too. Raw XML is cached under
// `<dataDir>/sitemap/` (LEGACY_DATA_DIR, outside git).
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { normaliseUrl } from './normalise-path.mjs'

export const PLAYBACK_ORIGIN = 'https://web.archive.org'

/**
 * @typedef {{ loc: string, lastmod: string | null }} SitemapEntry
 * @typedef {{ type: 'urlset' | 'sitemapindex', entries: SitemapEntry[] }} Sitemap
 * @typedef {{ timestamp: string, original: string }} Capture
 */

/** @param {string} timestamp @param {string} original */
export function playbackUrl(timestamp, original) {
  return `${PLAYBACK_ORIGIN}/web/${timestamp}id_/${original}`
}

/** @param {string} text */
function decodeXml(text) {
  return text
    .replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

/** The first unprefixed `<name>` inside `block` — so `<image:loc>` is never taken for `<loc>`. */
function child(block, name) {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(block)
  return match === null ? null : decodeXml(match[1] ?? '')
}

/**
 * A `<urlset>` or `<sitemapindex>` (sitemaps.org 0.9), read without an XML
 * dependency: each `<url>` / `<sitemap>` block gives its `<loc>` and `<lastmod>`.
 * @param {string} xml
 * @returns {Sitemap}
 */
export function parseSitemap(xml) {
  const isIndex = /<sitemapindex[\s>]/.test(xml)
  if (!isIndex && !/<urlset[\s>]/.test(xml))
    throw new Error('not a sitemap: no <urlset> or <sitemapindex>')
  const tag = isIndex ? 'sitemap' : 'url'
  const entries = []
  for (const match of xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))) {
    const loc = child(match[1] ?? '', 'loc')
    if (loc === null || loc === '') continue
    const lastmod = child(match[1] ?? '', 'lastmod')
    entries.push({ loc, lastmod: lastmod === '' ? null : lastmod })
  }
  return { type: isIndex ? 'sitemapindex' : 'urlset', entries }
}

/** `2024-06-20`, `2024-06-20T08:15:00+07:00` → UTC ISO seconds; anything else → null. */
export function lastmodToIso(lastmod) {
  if (lastmod === null) return null
  const time = Date.parse(lastmod)
  return Number.isNaN(time) ? null : new Date(time).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * The 200 captures of `/sitemap.xml` — the entry point; any child is found through it — oldest first.
 * @param {import('./cdx.mjs').CdxRow[]} rows
 * @param {string} domain
 * @returns {Capture[]}
 */
export function sitemapCaptures(rows, domain) {
  return rows
    .filter((row) => row.statuscode === '200')
    .filter((row) => {
      const url = normaliseUrl(row.original, domain)
      return url.ok && url.host === '@' && url.key === '/sitemap.xml'
    })
    .map((row) => ({ timestamp: row.timestamp, original: row.original }))
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))
}

/**
 * The archived 200 capture of `loc` nearest `timestamp`, or null when the
 * index never captured it — then it is reported, not requested.
 * @param {string} loc @param {string} timestamp
 * @param {import('./cdx.mjs').CdxRow[]} rows @param {string} domain
 * @returns {Capture | null}
 */
export function archivedCapture(loc, timestamp, rows, domain) {
  const wanted = normaliseUrl(loc, domain)
  if (!wanted.ok) return null
  let best = null
  for (const row of rows) {
    if (row.statuscode !== '200') continue
    const url = normaliseUrl(row.original, domain)
    if (!url.ok || url.host !== wanted.host || url.key !== wanted.key) continue
    const distance = Math.abs(Number(row.timestamp) - Number(timestamp))
    if (best === null || distance < best.distance) best = { row, distance }
  }
  return best === null ? null : { timestamp: best.row.timestamp, original: best.row.original }
}

/** @param {Capture} capture */
const cacheName = (capture) =>
  `${capture.timestamp}-${capture.original
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/\.xml$/i, '')
    .replace(/[^\w.-]+/g, '_')}.xml`

/**
 * Fetches each root capture, then each archived child of a sitemap index,
 * into the cache (a cached file that parses is not fetched again).
 * @param {object} options
 * @param {string} options.domain
 * @param {string} options.dataDir
 * @param {import('./cdx.mjs').CdxRow[]} options.cdxRows the domain query's rows
 * @param {(url: string) => Promise<string>} options.getText a polite fetch
 * @param {(line: string) => void} [options.log]
 */
export async function fetchSitemaps({ domain, dataDir, cdxRows, getText, log = () => {} }) {
  const dir = join(dataDir, 'sitemap')
  mkdirSync(dir, { recursive: true })
  const files = []
  const unarchived = []
  const queue = sitemapCaptures(cdxRows, domain).map((capture) => ({ capture, parent: null }))
  const seen = new Set()
  while (queue.length > 0) {
    const { capture, parent } = /** @type {{ capture: Capture, parent: string | null }} */ (
      queue.shift()
    )
    const file = cacheName(capture)
    if (seen.has(file)) continue
    seen.add(file)
    const path = join(dir, file)
    let xml = existsSync(path) ? readFileSync(path, 'utf8') : null
    if (xml !== null && !isSitemap(xml)) xml = null
    if (xml === null) {
      log(`sitemap: fetching ${capture.timestamp} ${capture.original}`)
      xml = await getText(playbackUrl(capture.timestamp, capture.original))
      parseSitemap(xml) // refuse to cache what is not a sitemap
      writeFileSync(`${path}.partial`, xml)
      renameSync(`${path}.partial`, path)
    } else {
      log(`sitemap: ${capture.timestamp} ${capture.original} cached`)
    }
    const sitemap = parseSitemap(xml)
    files.push({ file, ...capture, parent, type: sitemap.type, entries: sitemap.entries.length })
    if (sitemap.type !== 'sitemapindex') continue
    for (const { loc } of sitemap.entries) {
      const archived = archivedCapture(loc, capture.timestamp, cdxRows, domain)
      if (archived === null) unarchived.push({ loc, parent: file })
      else queue.push({ capture: archived, parent: file })
    }
  }
  const manifest = { files, unarchived }
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

/** @param {string} xml */
function isSitemap(xml) {
  try {
    parseSitemap(xml)
    return true
  } catch {
    return false
  }
}

/**
 * Every cached urlset's entries, with the capture that listed them.
 * @param {string} dataDir
 */
export function readSitemapCache(dataDir) {
  const dir = join(dataDir, 'sitemap')
  const manifestPath = join(dir, 'manifest.json')
  if (!existsSync(manifestPath)) return { manifest: null, sitemaps: [] }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const sitemaps = manifest.files.map(
    (/** @type {{ file: string, timestamp: string }} */ entry) => ({
      ...entry,
      sitemap: parseSitemap(readFileSync(join(dir, entry.file), 'utf8')),
    }),
  )
  return { manifest, sitemaps }
}
