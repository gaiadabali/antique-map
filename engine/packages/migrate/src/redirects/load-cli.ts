/**
 * Loads a site's `redirects` rows into the live database (9.4load), from the same committed
 * inventories 9.4a's `cli.ts` reads, against the real `works` instead of a fixture.
 *
 * Run through `payload run`, which drops `--flags`, so the arguments are bare words
 * (`./load-args`). Needs `DATABASE_URL` and `PAYLOAD_SECRET` in the environment; neither is ever
 * printed, and an error's text is scrubbed of any connection string before it is shown:
 *
 *   pnpm --filter @engine/migrate redirects:load -- <gallery|shop|all> <dry-run|apply> [prune]
 *     [unresolved-out=<dir>]
 *
 * `dry-run` counts only, writing nothing to the database. `prune` also deletes a site's rows the
 * current inventory no longer produces (never implicit: it is a delete). `unresolved-out=<dir>`
 * writes `unresolved.<site>.json`, the shape the 9.4.c verification tool reads with `--unresolved`
 * (a dry run writes it too: it is the one file the run exists to hand over).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Payload } from 'payload'

import { readCsvRecords } from '../sources/csv-products/legacy-urls/csv.mjs'
import { parseLoadArgs } from './load-args.ts'
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
  const records = readCsvRecords(readFileSync(csvPath, 'utf8'))
  return records.map((record) => record.path ?? '')
}

function urlsFor(site: SiteKey): string[] {
  return site === 'gallery' ? readGalleryUrls(GALLERY_TSV) : readShopUrls(SHOP_CSV)
}

function writeUnresolved(
  outDir: string,
  site: SiteKey,
  unresolved: LoadResult['unresolved'],
): void {
  mkdirSync(outDir, { recursive: true })
  writeFileSync(
    resolve(outDir, `unresolved.${site}.json`),
    `${JSON.stringify(unresolved, null, 2)}\n`,
  )
}

function printSummary(site: SiteKey, dryRun: boolean, result: LoadResult): void {
  console.log(
    `${site}${dryRun ? ' (dry run, nothing written)' : ''}: rows=${result.rows} gone=${result.gone} ` +
      `unresolved=${result.unresolved.length} | created=${result.created} updated=${result.updated} ` +
      `unchanged=${result.unchanged} pruned=${result.pruned}`,
  )
}

/** An error's text with any connection string taken out — a pg failure can echo one. */
function scrub(message: string): string {
  return message.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<url>')
}

async function main(): Promise<void> {
  const args = parseLoadArgs(process.argv.slice(2))
  for (const name of ['DATABASE_URL', 'PAYLOAD_SECRET']) {
    if (!process.env[name]) throw new Error(`${name} is not set in the environment.`)
  }
  // Imported only now (the config reads the environment at load time), and by a variable so this
  // package's type-check does not pull in the whole CMS config: `payload run` resolves it at runtime.
  const instance = '@engine/cms/instance'
  const { cms } = (await import(instance)) as { cms: () => Promise<Payload> }
  const payload = await cms()
  try {
    const works = await worksFromDb(payload)
    console.log(
      `works read: ${works.length} (${works.filter((work) => work.published).length} published)`,
    )
    for (const site of args.sites) {
      const result = await loadRedirects(payload, {
        site,
        urls: urlsFor(site),
        works,
        dryRun: args.dryRun,
        prune: args.prune,
      })
      printSummary(site, args.dryRun, result)
      if (args.unresolvedOut !== null) writeUnresolved(args.unresolvedOut, site, result.unresolved)
    }
  } finally {
    await payload.destroy()
  }
}

// Top-level await: `payload run` imports the script and exits — an un-awaited promise dies with it.
try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(`redirects:load: ${scrub(error instanceof Error ? error.message : String(error))}`)
  process.exit(1)
}
