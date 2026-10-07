/**
 * Loads a site's `redirects` rows into the live database (9.4load), from the same committed
 * inventories 9.4a's `cli.ts` reads, against the real `works` instead of a fixture.
 *
 * Run from the repo root (needs DATABASE_URL and PAYLOAD_SECRET; never printed):
 *
 *   pnpm --filter @engine/migrate redirects:load -- --site gallery|shop|all [--dry-run] [--prune]
 *     [--unresolved-out <dir>]
 *
 * `--dry-run` counts only, writing nothing. `--prune` also deletes a site's rows the current
 * inventory no longer produces (refused by default — a row an editor added by hand must not
 * vanish because this run forgot its `from`). `--unresolved-out <dir>` writes
 * `unresolved.<site>.json`, the shape the 9.4.c verification tool reads with `--unresolved`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { cms } from '@engine/cms/instance'

import { readCsvRecords } from '../sources/csv-products/legacy-urls/csv.mjs'
import { loadRedirects, type LoadResult } from './load.ts'
import type { SiteKey } from './normalise.ts'
import { worksFromDb } from './works-from-db.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const GALLERY_TSV = resolve(HERE, '../../data/gallery/inventory/urls.tsv')
const SHOP_CSV = resolve(HERE, '../../data/shop/inventory/urls.csv')

/** Mirrors `cli.ts`'s reader: the inventory's `location` column when it has one, else `path`. */
function readGalleryUrls(tsvPath: string): string[] {
  const text = readFileSync(tsvPath, 'utf8')
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const [header, ...rows] = lines
  if (!header || !header.startsWith('path')) throw new Error(`unexpected header in ${tsvPath}`)
  return rows.map((row) => {
    const [path, , , location] = row.split('\t')
    return location && location.startsWith('/') ? location : (path ?? '')
  })
}

function readShopUrls(csvPath: string): string[] {
  const text = readFileSync(csvPath, 'utf8')
  const records = readCsvRecords(text)
  return records.map((record) => record.path ?? '')
}

function urlsFor(site: SiteKey): string[] {
  return site === 'gallery' ? readGalleryUrls(GALLERY_TSV) : readShopUrls(SHOP_CSV)
}

function writeUnresolved(outDir: string, site: SiteKey, unresolved: LoadResult['unresolved']): void {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, `unresolved.${site}.json`), `${JSON.stringify(unresolved, null, 2)}\n`)
}

function printSummary(site: SiteKey, result: LoadResult): void {
  console.log(
    `${site}: ${result.rows} rows (${result.gone} gone, ${result.unresolved.length} unresolved) — ` +
      `${result.created} created, ${result.updated} updated, ${result.unchanged} unchanged, ${result.pruned} pruned`,
  )
}

function parseSite(value: string | undefined): SiteKey[] {
  if (value === 'gallery' || value === 'shop') return [value]
  if (value === 'all') return ['gallery', 'shop']
  throw new Error('usage: --site gallery|shop|all [--dry-run] [--prune] [--unresolved-out <dir>]')
}

let code = 0
const payload = await cms()
try {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      site: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      prune: { type: 'boolean', default: false },
      'unresolved-out': { type: 'string' },
    },
  })
  const sites = parseSite(values.site)
  const works = await worksFromDb(payload)
  for (const site of sites) {
    const result = await loadRedirects(payload, {
      site,
      urls: urlsFor(site),
      works,
      dryRun: values['dry-run'] === true,
      prune: values.prune === true,
    })
    printSummary(site, result)
    if (values['unresolved-out']) writeUnresolved(values['unresolved-out'], site, result.unresolved)
  }
} catch (error) {
  code = 1
  console.error(`redirects:load: ${error instanceof Error ? error.message : String(error)}`)
} finally {
  await payload.destroy()
}
process.exit(code)
