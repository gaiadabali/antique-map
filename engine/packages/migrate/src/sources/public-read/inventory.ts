/**
 * The URL inventory — the old site's URL list the redirect gate requests
 * against the new site (MIGRATION.md §6, TASKS.md 37.1.b). Two copies:
 *
 * - the raw one in LEGACY_DATA_DIR, every URL with its referrer count;
 * - the committed one, paths and statuses only: no host, no body, nothing a
 *   person typed. A URL whose query names a token or an address is dropped
 *   from it and counted instead (it is on the never-list, so never fetched).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

import type { CrawlResult, InventoryEntry } from './crawl.ts'

const PERSONAL_QUERY = /[?&](?:token|_token|signature|email|e-mail|phone|name)=/i

export type InventorySummary = {
  generatedAt: string
  origin: string
  sitemapFound: boolean
  stoppedEarly: boolean
  urls: number
  byKind: Record<string, number>
  byStatus: Record<string, number>
  products: { discovered: number; fetched: number }
  images: { originalsFetched: number; variantsSeen: number }
  categories: number
  droppedFromCommittedCopy: number
}

function locationPath(location: string | null, origin: string): string {
  if (location === null) return ''
  try {
    const url = new URL(location, origin)
    return url.origin === new URL(origin).origin ? `${url.pathname}${url.search}` : url.href
  } catch {
    return ''
  }
}

function statusKey(entry: InventoryEntry): string {
  return entry.status !== null ? String(entry.status) : (entry.note ?? 'unknown')
}

function sorted(result: CrawlResult): InventoryEntry[] {
  return [...result.inventory.values()].sort((a, b) => (a.path < b.path ? -1 : 1))
}

function write(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

export function summarise(result: CrawlResult, origin: string, dropped: number): InventorySummary {
  const byKind: Record<string, number> = {}
  const byStatus: Record<string, number> = {}
  let productsFetched = 0
  let originalsFetched = 0
  let variantsSeen = 0
  let products = 0
  for (const entry of result.inventory.values()) {
    const kind = entry.kind === 'listing' ? `listing:${entry.listing}` : entry.kind
    byKind[kind] = (byKind[kind] ?? 0) + 1
    const status = statusKey(entry)
    byStatus[status] = (byStatus[status] ?? 0) + 1
    if (entry.kind === 'product') {
      products += 1
      if (entry.status === 200) productsFetched += 1
    }
    if (entry.kind === 'image') {
      if (entry.fetched && entry.status === 200) originalsFetched += 1
      else variantsSeen += 1
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    origin,
    sitemapFound: result.sitemapFound,
    stoppedEarly: result.stoppedEarly,
    urls: result.inventory.size,
    byKind,
    byStatus,
    products: { discovered: products, fetched: productsFetched },
    images: { originalsFetched, variantsSeen },
    categories: result.categories.length,
    droppedFromCommittedCopy: dropped,
  }
}

const HEADER = 'path\tkind\tstatus\tlocation'

/** Writes the raw inventory (with referrer counts) and, if asked, the committed copy. */
export function writeInventory(
  result: CrawlResult,
  origin: string,
  rawFile: string,
  committedDir: string | null,
): InventorySummary {
  const entries = sorted(result)
  const raw = entries.map((entry) =>
    [
      entry.path,
      entry.kind === 'listing' ? `listing:${entry.listing}` : entry.kind,
      statusKey(entry),
      locationPath(entry.location, origin),
      String(entry.referrers),
    ].join('\t'),
  )
  write(rawFile, `${HEADER}\treferrers\n${raw.join('\n')}\n`)

  const committed = entries.filter((entry) => !PERSONAL_QUERY.test(entry.path))
  const dropped = entries.length - committed.length
  const summary = summarise(result, origin, dropped)
  if (committedDir !== null) {
    const lines = committed.map((entry) =>
      [
        entry.path,
        entry.kind === 'listing' ? `listing:${entry.listing}` : entry.kind,
        statusKey(entry),
        locationPath(entry.location, origin),
      ].join('\t'),
    )
    write(`${committedDir}/urls.tsv`, `${HEADER}\n${lines.join('\n')}\n`)
    write(`${committedDir}/summary.json`, `${JSON.stringify(summary, null, 2)}\n`)
  }
  return summary
}
