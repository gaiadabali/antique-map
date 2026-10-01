// The inventory: one row per distinct normalised legacy URL, with the
// evidence behind it — when the archive first and last captured it, every
// status it answered, and whether Search Console knows it. Built the same way
// from the same cache every time (rows sorted, no run timestamp), so a rebuild
// that changes nothing leaves the committed file byte-identical.
import { classifyAll } from './classify-path.mjs'
import { toCsv } from './csv.mjs'

export const INVENTORY_COLUMNS = [
  'host',
  'path',
  'kind',
  'rule',
  'first_seen',
  'last_seen',
  'statuses',
  'last_status',
  'captures',
  'sources',
  'gsc_clicks',
  'gsc_impressions',
]

/** `20200920105719` → `2020-09-20T10:57:19Z` (CDX timestamps are UTC). */
export function cdxTimestampToIso(timestamp) {
  if (!/^\d{14}$/.test(timestamp)) throw new Error(`"${timestamp}" is not a 14-digit CDX timestamp`)
  const t = timestamp
  return `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`
}

/**
 * @typedef {import('./normalise-path.mjs').Normalised} Normalised
 * @typedef {{
 *   host: string, path: string, query: string, key: string,
 *   firstSeen: string | null, lastSeen: string | null,
 *   lastStatus: string, lastStatusAt: string | null,
 *   statuses: Set<string>, mimetypes: Set<string>, captures: number,
 *   sources: Set<string>, gscClicks: number | null, gscImpressions: number | null,
 * }} Entry
 */

export function createInventory() {
  /** @type {Map<string, Entry>} */
  const entries = new Map()

  /** @param {Normalised} url */
  function entryFor(url) {
    const id = `${url.host} ${url.key}`
    let entry = entries.get(id)
    if (entry === undefined) {
      entry = {
        host: url.host,
        path: url.path,
        query: url.query,
        key: url.key,
        firstSeen: null,
        lastSeen: null,
        lastStatus: '',
        lastStatusAt: null,
        statuses: new Set(),
        mimetypes: new Set(),
        captures: 0,
        sources: new Set(),
        gscClicks: null,
        gscImpressions: null,
      }
      entries.set(id, entry)
    }
    return entry
  }

  /** @param {Entry} entry @param {string | null} when */
  function seen(entry, when) {
    if (when === null) return
    if (entry.firstSeen === null || when < entry.firstSeen) entry.firstSeen = when
    if (entry.lastSeen === null || when >= entry.lastSeen) entry.lastSeen = when
  }

  /**
   * One CDX capture. A `-` status is a revisit record (the same bytes as an
   * earlier capture); it counts as a capture but never as the last status
   * while a real one is known.
   * @param {Normalised} url
   * @param {import('./cdx.mjs').CdxRow} row
   */
  function addCapture(url, row) {
    const entry = entryFor(url)
    const when = cdxTimestampToIso(row.timestamp)
    seen(entry, when)
    entry.captures += 1
    entry.sources.add('cdx')
    entry.statuses.add(row.statuscode)
    if (row.mimetype !== '' && row.mimetype !== 'warc/revisit') entry.mimetypes.add(row.mimetype)
    if (row.statuscode !== '-' && (entry.lastStatusAt === null || when >= entry.lastStatusAt)) {
      entry.lastStatus = row.statuscode
      entry.lastStatusAt = when
    }
  }

  /**
   * One Search Console row. Several exports may overlap in period, so the
   * larger count is kept rather than a sum that would count a click twice.
   * @param {Normalised} url
   * @param {import('./gsc.mjs').GscRecord} record
   * @param {import('./gsc.mjs').GscMeta} meta
   */
  function addSearch(url, record, meta) {
    const entry = entryFor(url)
    entry.sources.add('gsc')
    seen(entry, meta.from === null ? null : `${meta.from}T00:00:00Z`)
    seen(entry, meta.to === null ? null : `${meta.to}T23:59:59Z`)
    seen(entry, record.lastCrawled === null ? null : `${record.lastCrawled}T00:00:00Z`)
    if (record.clicks !== null) entry.gscClicks = Math.max(entry.gscClicks ?? 0, record.clicks)
    if (record.impressions !== null) {
      entry.gscImpressions = Math.max(entry.gscImpressions ?? 0, record.impressions)
    }
  }

  /**
   * One `<url>` of an archived sitemap. Its `lastmod`, when present, is the
   * row's evidence date; otherwise the capture that listed it is.
   * @param {Normalised} url
   * @param {{ capturedAt: string, lastmod: string | null }} listing both ISO, UTC
   */
  function addListing(url, { capturedAt, lastmod }) {
    const entry = entryFor(url)
    entry.sources.add('sitemap')
    seen(entry, lastmod ?? capturedAt)
  }

  /**
   * @param {Record<string, string>} [kindOverrides]
   * @returns {Array<Record<string, string | number>>} sorted: main host first, then by path
   */
  function rows(kindOverrides = {}) {
    const list = [...entries.values()].sort((a, b) => {
      if (a.host !== b.host)
        return a.host === '@' ? -1 : b.host === '@' ? 1 : a.host < b.host ? -1 : 1
      return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    })
    const kinds = classifyAll(list, kindOverrides)
    return list.map((entry, i) => ({
      host: entry.host,
      path: entry.key,
      kind: kinds[i]?.kind ?? 'page',
      rule: kinds[i]?.rule ?? 'page',
      first_seen: entry.firstSeen ?? '',
      last_seen: entry.lastSeen ?? '',
      statuses: [...entry.statuses].sort().join('|'),
      last_status: entry.lastStatus || (entry.statuses.has('-') ? '-' : ''),
      captures: entry.captures,
      sources: [...entry.sources].sort().join('|'),
      gsc_clicks: entry.gscClicks ?? '',
      gsc_impressions: entry.gscImpressions ?? '',
    }))
  }

  return { addCapture, addSearch, addListing, rows, size: () => entries.size }
}

/** @param {Array<Record<string, string | number>>} rows */
export function inventoryCsv(rows) {
  return toCsv(INVENTORY_COLUMNS, rows)
}
