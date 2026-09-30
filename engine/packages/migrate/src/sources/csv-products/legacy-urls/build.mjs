// Rebuilds the committed inventory from the raw cache alone — no network.
// `fetch-cdx` and `import-gsc` only add raw files to the cache; this is the
// one place their contents become rows.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { readCdxCache } from './cdx.mjs'
import { KINDS } from './classify-path.mjs'
import { readGscCache } from './gsc.mjs'
import { createInventory, inventoryCsv } from './inventory.mjs'
import { normaliseUrl } from './normalise-path.mjs'

/** @param {Record<string, number>} counts @param {string} key */
function bump(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1
}

/**
 * @param {{ domain: string, dataDir: string, kindOverrides?: Record<string, string> }} options
 */
export function buildInventory({ domain, dataDir, kindOverrides = {} }) {
  const inventory = createInventory()
  const { manifest, rowsByQuery } = readCdxCache(dataDir)
  /** @type {Record<string, number>} */
  const rejected = {}
  /** @type {Array<{ id: string, url: string, matchType: string, captures: number, distinct: number, missingFromDomain: number }>} */
  const queries = []
  const domainKeys = new Set()
  const queryKeys = new Map()

  for (const [id, rows] of rowsByQuery) {
    const keys = new Set()
    for (const row of rows) {
      const url = normaliseUrl(row.original, domain)
      if (!url.ok) {
        if (id === 'domain') bump(rejected, `cdx:${url.reason}`)
        continue
      }
      keys.add(`${url.host} ${url.key}`)
      // The domain match holds every capture the variants hold; counting the
      // variants' rows too would count one capture five times.
      if (id === 'domain') inventory.addCapture(url, row)
    }
    if (id === 'domain') keys.forEach((key) => domainKeys.add(key))
    queryKeys.set(id, { keys, captures: rows.length })
  }
  for (const query of manifest?.queries ?? []) {
    const found = queryKeys.get(query.id)
    const keys = found?.keys ?? new Set()
    queries.push({
      id: query.id,
      url: query.url,
      matchType: query.matchType ?? 'prefix (wildcard)',
      captures: found?.captures ?? 0,
      distinct: keys.size,
      missingFromDomain: [...keys].filter((key) => !domainKeys.has(key)).length,
    })
  }
  // A variant that saw a path the domain match did not would mean the domain
  // match is not the complete query we take it to be: fail, don't under-count.
  const gaps = queries.filter((query) => query.missingFromDomain > 0)
  if (gaps.length > 0) {
    throw new Error(`the domain query misses paths found by: ${gaps.map((q) => q.id).join(', ')}`)
  }

  const exports = []
  for (const { name, meta, records } of readGscCache(dataDir)) {
    let accepted = 0
    for (const record of records) {
      const url = normaliseUrl(record.url, domain)
      if (!url.ok) {
        bump(rejected, `gsc:${url.reason}`)
        continue
      }
      inventory.addSearch(url, record, meta)
      accepted += 1
    }
    exports.push({ name, from: meta.from, to: meta.to, rows: records.length, accepted })
  }

  const rows = inventory.rows(kindOverrides)
  /** @type {Record<string, number>} */
  const byKind = Object.fromEntries(KINDS.map((kind) => [kind, 0]))
  /** @type {Record<string, number>} */
  const bySource = {}
  /** @type {Record<string, number>} */
  const byHost = {}
  for (const row of rows) {
    bump(byKind, String(row.kind))
    bump(bySource, String(row.sources))
    bump(byHost, String(row.host))
  }
  const fetchedAt = (manifest?.queries ?? [])
    .flatMap((/** @type {{ fetchedAt?: Record<string, string> }} */ q) =>
      Object.values(q.fetchedAt ?? {}),
    )
    .sort()
  const summary = {
    total: rows.length,
    byKind,
    bySource,
    byHost,
    cdx: {
      endpoint: manifest?.endpoint ?? null,
      fetchedFrom: fetchedAt[0] ?? null,
      fetchedTo: fetchedAt.at(-1) ?? null,
      queries,
    },
    gsc: { exports },
    rejected,
  }
  return { rows, summary }
}

/**
 * @param {string} outDir e.g. `<brand>/content/legacy/inventory`
 * @param {ReturnType<typeof buildInventory>} built
 */
export function writeInventory(outDir, { rows, summary }) {
  mkdirSync(outDir, { recursive: true })
  const csvPath = join(outDir, 'urls.csv')
  const summaryPath = join(outDir, 'summary.json')
  writeFileSync(csvPath, inventoryCsv(rows))
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`)
  return { csvPath, summaryPath }
}
