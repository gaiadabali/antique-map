// Google Search Console exports: the URLs Google still indexes or sends
// visitors to, which the Wayback Machine may never have captured.
//
// Two export shapes are read:
//   Performance → Search results → Export → CSV → `Pages.csv`
//     Top pages, Clicks, Impressions, CTR, Position
//     (an Indonesian-UI export's Halaman teratas, Klik, Tayangan are accepted too)
//   Indexing → Pages → a status → Export → CSV (the example-URL table)
//     URL, Last crawled
// Only the page column is required; clicks and impressions rank the redirect
// work, `Last crawled` dates a row. Raw exports are copied into
// `<dataDir>/gsc/` (LEGACY_DATA_DIR, outside git) and the inventory is
// rebuilt from there.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { basename, join } from 'node:path'

import { parseCsv } from './csv.mjs'

const COLUMN_ALIASES = {
  page: ['top pages', 'page', 'pages', 'url', 'halaman teratas', 'halaman'],
  clicks: ['clicks', 'klik'],
  impressions: ['impressions', 'tayangan'],
  lastCrawled: ['last crawled'],
}

/**
 * @typedef {{ url: string, clicks: number | null, impressions: number | null, lastCrawled: string | null }} GscRecord
 * @typedef {{ from: string | null, to: string | null, originalName: string }} GscMeta
 */

/** "1,234" and "1.234" (a localised export) are both one thousand two hundred and thirty-four. */
function parseCount(value) {
  const digits = value.replace(/[^\d]/g, '')
  return digits === '' ? null : Number.parseInt(digits, 10)
}

/** `2026-09-14` or `Sep 14, 2026` → `2026-09-14`; anything else → null. */
export function parseGscDate(value) {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = Date.parse(`${trimmed} UTC`)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0, 10)
}

/**
 * @param {string} text the CSV as exported
 * @returns {GscRecord[]}
 */
export function parseGscCsv(text) {
  const [header, ...rows] = parseCsv(text)
  if (header === undefined) return []
  const names = header.map((name) => name.trim().toLowerCase())
  /** @param {string[]} aliases */
  const column = (aliases) => names.findIndex((name) => aliases.includes(name))
  const page = column(COLUMN_ALIASES.page)
  if (page < 0) {
    throw new Error(
      `not a Search Console pages export: no page column (expected one of ${COLUMN_ALIASES.page.join(', ')}; found ${header.join(', ')})`,
    )
  }
  const clicks = column(COLUMN_ALIASES.clicks)
  const impressions = column(COLUMN_ALIASES.impressions)
  const lastCrawled = column(COLUMN_ALIASES.lastCrawled)
  return rows
    .filter((fields) => (fields[page] ?? '').trim() !== '')
    .map((fields) => ({
      url: (fields[page] ?? '').trim(),
      clicks: clicks < 0 ? null : parseCount(fields[clicks] ?? ''),
      impressions: impressions < 0 ? null : parseCount(fields[impressions] ?? ''),
      lastCrawled: lastCrawled < 0 ? null : parseGscDate(fields[lastCrawled] ?? ''),
    }))
}

/**
 * Copies an export into the cache beside a `.meta.json` recording the period
 * it covers (Search Console puts the period in the UI, not in `Pages.csv`).
 * Parsing first refuses a file that is not an export before anything is kept.
 * @param {{ file: string, dataDir: string, from?: string | null, to?: string | null, name?: string }} options
 */
export function importGscFile({ file, dataDir, from = null, to = null, name }) {
  const records = parseGscCsv(readFileSync(file, 'utf8'))
  for (const [label, date] of [
    ['from', from],
    ['to', to],
  ]) {
    if (date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date))
      throw new Error(`--${label} must be YYYY-MM-DD`)
  }
  const dir = join(dataDir, 'gsc')
  mkdirSync(dir, { recursive: true })
  const target = name ?? basename(file)
  copyFileSync(file, join(dir, target))
  /** @type {GscMeta} */
  const meta = { from, to, originalName: basename(file) }
  writeFileSync(join(dir, `${target}.meta.json`), `${JSON.stringify(meta, null, 2)}\n`)
  return { name: target, records: records.length }
}

/**
 * @param {string} dataDir
 * @returns {Array<{ name: string, meta: GscMeta, records: GscRecord[] }>} sorted by file name
 */
export function readGscCache(dataDir) {
  const dir = join(dataDir, 'gsc')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith('.csv'))
    .sort()
    .map((name) => {
      const metaPath = join(dir, `${name}.meta.json`)
      const meta = existsSync(metaPath)
        ? JSON.parse(readFileSync(metaPath, 'utf8'))
        : { from: null, to: null, originalName: name }
      return { name, meta, records: parseGscCsv(readFileSync(join(dir, name), 'utf8')) }
    })
}
