// The Wayback Machine's CDX index for one domain: which queries we ask, how
// their pages are fetched and cached, and how a cached page is read back.
// Raw responses are kept verbatim under `<dataDir>/cdx/` (LEGACY_DATA_DIR,
// outside git) so the inventory can be rebuilt offline, and a rerun resumes
// from the first page it does not have.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { URL, URLSearchParams } from 'node:url'

export const CDX_ENDPOINT = 'https://web.archive.org/cdx/search/cdx'
export const CDX_HOST = 'web.archive.org'
export const CDX_FIELDS = ['original', 'timestamp', 'statuscode', 'mimetype']

/**
 * @typedef {{ id: string, url: string, matchType?: 'domain' | 'prefix' }} CdxQuery
 * @typedef {{ original: string, timestamp: string, statuscode: string, mimetype: string }} CdxRow
 */

/**
 * Every capture of the domain, asked five ways. The `domain` match is the
 * complete one (apex, `www.` and any subdomain, both schemes — the index keys
 * on a scheme-less SURT); the four variants are the spellings the plan names,
 * kept as a cross-check that the domain match missed nothing.
 * @param {string} domain
 * @returns {CdxQuery[]}
 */
export function cdxQueries(domain) {
  return [
    { id: 'domain', url: domain, matchType: 'domain' },
    { id: 'apex-prefix', url: `${domain}/`, matchType: 'prefix' },
    { id: 'www-prefix', url: `www.${domain}/`, matchType: 'prefix' },
    { id: 'http-apex', url: `http://${domain}/*` },
    { id: 'https-www', url: `https://www.${domain}/*` },
  ]
}

/**
 * Every capture, uncollapsed — the first and last capture of a path and every
 * status it answered are the point, and `collapse=urlkey` keeps only the first.
 * @param {CdxQuery} query
 * @param {{ page?: number, showNumPages?: boolean }} [paging]
 */
export function cdxUrl(query, paging = {}) {
  const params = new URLSearchParams({ url: query.url })
  if (query.matchType) params.set('matchType', query.matchType)
  if (paging.showNumPages) {
    params.set('showNumPages', 'true')
  } else {
    params.set('output', 'json')
    params.set('fl', CDX_FIELDS.join(','))
    params.set('page', String(paging.page ?? 0))
  }
  const url = new URL(CDX_ENDPOINT)
  url.search = params.toString()
  return url.toString()
}

/**
 * One cached page (`output=json`): a header row naming the fields, then one
 * array per capture; an empty body or `[]` is an empty page.
 * @param {string} text
 * @returns {CdxRow[]}
 */
export function parseCdxPage(text) {
  if (text.trim() === '') return []
  const data = JSON.parse(text)
  if (!Array.isArray(data)) throw new Error('a CDX page is not a JSON array')
  const [header, ...rows] = data
  if (header === undefined) return []
  const index = Object.fromEntries(CDX_FIELDS.map((field) => [field, header.indexOf(field)]))
  for (const field of CDX_FIELDS) {
    if (index[field] < 0) throw new Error(`a CDX page has no "${field}" column`)
  }
  return rows
    .filter((row) => Array.isArray(row) && row.length > 0)
    .map((row) => ({
      original: String(row[index.original]),
      timestamp: String(row[index.timestamp]),
      statuscode: String(row[index.statuscode]),
      mimetype: String(row[index.mimetype]),
    }))
}

/** @param {string} path @param {string} text */
function writeAtomically(path, text) {
  writeFileSync(`${path}.partial`, text)
  renameSync(`${path}.partial`, path)
}

/** @param {string} path */
function readCachedPage(path) {
  if (!existsSync(path)) return null
  const text = readFileSync(path, 'utf8')
  try {
    parseCdxPage(text)
    return text
  } catch {
    return null // a truncated page is fetched again
  }
}

/**
 * Fetches every page of every query into `<dataDir>/cdx/<query id>/`,
 * skipping pages already cached (unless `refresh`), and writes a manifest of
 * what was asked and when.
 * @param {object} options
 * @param {string} options.domain
 * @param {string} options.dataDir
 * @param {(url: string) => Promise<string>} options.getText  a polite fetch
 * @param {boolean} [options.refresh]
 * @param {(line: string) => void} [options.log]
 * @param {() => Date} [options.clock]
 */
export async function fetchCdx({
  domain,
  dataDir,
  getText,
  refresh = false,
  log = () => {},
  clock = () => new Date(),
}) {
  const root = join(dataDir, 'cdx')
  const manifestPath = join(root, 'manifest.json')
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null
  const manifest = { domain, endpoint: CDX_ENDPOINT, fields: CDX_FIELDS, queries: [] }
  for (const query of cdxQueries(domain)) {
    const dir = join(root, query.id)
    mkdirSync(dir, { recursive: true })
    const numPagesPath = join(dir, 'num-pages.txt')
    if (refresh || !existsSync(numPagesPath)) {
      writeAtomically(numPagesPath, (await getText(cdxUrl(query, { showNumPages: true }))).trim())
    }
    const pages = Number.parseInt(readFileSync(numPagesPath, 'utf8'), 10)
    if (!Number.isInteger(pages) || pages < 0) throw new Error(`${query.id}: bad page count`)
    const before = previous?.queries?.find((/** @type {{ id: string }} */ q) => q.id === query.id)
    const fetchedAt = { ...(before?.fetchedAt ?? {}) }
    for (let page = 0; page < pages; page += 1) {
      const pagePath = join(dir, `page-${page}.json`)
      if (!refresh && readCachedPage(pagePath) !== null) {
        log(`${query.id}: page ${page + 1}/${pages} cached`)
        continue
      }
      log(`${query.id}: fetching page ${page + 1}/${pages}`)
      const text = await getText(cdxUrl(query, { page }))
      parseCdxPage(text) // refuse to cache a page that does not parse
      writeAtomically(pagePath, text)
      fetchedAt[page] = clock().toISOString()
    }
    manifest.queries.push({ ...query, pages, fetchedAt })
  }
  writeAtomically(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifest
}

/**
 * Reads the cache back: every row of every cached page, grouped by query id.
 * @param {string} dataDir
 * @returns {{ manifest: any, rowsByQuery: Map<string, CdxRow[]> }}
 */
export function readCdxCache(dataDir) {
  const root = join(dataDir, 'cdx')
  const manifestPath = join(root, 'manifest.json')
  if (!existsSync(manifestPath)) return { manifest: null, rowsByQuery: new Map() }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const rowsByQuery = new Map()
  for (const query of manifest.queries) {
    const rows = []
    for (let page = 0; page < query.pages; page += 1) {
      const text = readCachedPage(join(root, query.id, `page-${page}.json`))
      if (text === null) throw new Error(`${query.id}: page ${page} is missing — run fetch-cdx`)
      rows.push(...parseCdxPage(text))
    }
    rowsByQuery.set(query.id, rows)
  }
  return { manifest, rowsByQuery }
}
