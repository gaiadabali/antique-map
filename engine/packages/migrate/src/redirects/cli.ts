/**
 * CLI that reads the two committed inventories and a works JSON fixture, then
 * writes `redirects.<site>.json` and `unresolved.<site>.json` to an output
 * directory. The fixture is the shape `buildRedirects` expects until 3.7 seeds
 * the real works.
 *
 * Run from the repo root:
 *   node --experimental-strip-types engine/packages/migrate/src/redirects/cli.ts \
 *     --works <works.json> --out <dir>
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { readCsvRecords } from '../sources/csv-products/legacy-urls/csv.mjs'
import { buildRedirects, type RedirectInput } from './build'
import { dedupeLegacyUrls, type SiteKey } from './normalise'
import { type WorkLookup } from './rules'

const GALLERY_TSV = 'engine/packages/migrate/data/gallery/inventory/urls.tsv'
const SHOP_CSV = 'engine/packages/migrate/data/shop/inventory/urls.csv'

function readGalleryUrls(tsvPath: string): string[] {
  const text = readFileSync(tsvPath, 'utf8')
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
  const [header, ...rows] = lines
  if (!header || !header.startsWith('path')) throw new Error(`unexpected header in ${tsvPath}`)
  return rows.map((row) => {
    const [path, kind, status, location] = row.split('\t')
    void kind
    void status
    return location && location.startsWith('/') ? location : (path ?? '')
  })
}

function readShopUrls(csvPath: string): string[] {
  const text = readFileSync(csvPath, 'utf8')
  const records = readCsvRecords(text)
  return records.map((record) => record.path ?? '')
}

function loadWorks(path: string): WorkLookup[] {
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
  if (!Array.isArray(raw)) throw new Error('works fixture must be an array')
  return raw.map((item: unknown) => {
    const w = item as Record<string, unknown>
    if (
      typeof w.legacyId !== 'number' ||
      typeof w.publicId !== 'number' ||
      typeof w.slug !== 'string' ||
      typeof w.published !== 'boolean'
    ) {
      throw new Error('works fixture item must have legacyId, publicId, slug, published')
    }
    return {
      legacyId: w.legacyId,
      publicId: w.publicId,
      slug: w.slug,
      published: w.published,
    }
  })
}

function writeJson(outDir: string, name: string, value: unknown): void {
  writeFileSync(resolve(outDir, name), `${JSON.stringify(value, null, 2)}\n`)
}

function buildSite(site: SiteKey, urls: string[], works: WorkLookup[], outDir: string): void {
  // ponytail: empty category map until curator reviews it; all categories and
  // makers become unresolved, which is the safe default.
  const uniqueUrls = dedupeLegacyUrls(site, urls)
  const input: RedirectInput = { site, urls: uniqueUrls, works, categories: {} }
  const { rows, gone, unresolved } = buildRedirects(input)
  writeJson(outDir, `redirects.${site}.json`, rows)
  writeJson(outDir, `unresolved.${site}.json`, unresolved)
  console.error(
    `${site}: ${uniqueUrls.length} unique URLs → ${rows.length} rows (${gone.length} gone, ${unresolved.length} unresolved); ${urls.length - uniqueUrls.length} duplicates skipped`,
  )
}

function main(): void {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      works: { type: 'string', short: 'w' },
      out: { type: 'string', short: 'o' },
    },
  })
  const worksPath = values.works
  const outDir = values.out
  if (typeof worksPath !== 'string' || typeof outDir !== 'string') {
    console.error('usage: --works <works.json> --out <dir>')
    process.exit(1)
  }
  const resolvedOut = resolve(outDir)
  mkdirSync(resolvedOut, { recursive: true })

  const works = loadWorks(worksPath)
  buildSite('gallery', readGalleryUrls(GALLERY_TSV), works, resolvedOut)
  buildSite('shop', readShopUrls(SHOP_CSV), works, resolvedOut)
}

main()
