#!/usr/bin/env node
// Legacy URL discovery for a brand's old domain (MIGRATION.md §10).
//
//   node <this file> fetch-cdx  --site <brand>/content/legacy/discovery.json [--refresh] [--interval-ms 1500]
//   node <this file> import-gsc --site … --file Pages.csv [--from YYYY-MM-DD --to YYYY-MM-DD]
//   node <this file> build      --site …
//
// Every command ends by rebuilding `<site dir>/inventory/{urls.csv,summary.json}`
// from the raw cache in `--data-dir` (default: LEGACY_DATA_DIR, read from the
// environment or ./.env.local). The domain comes from the discovery file —
// this code names no brand (CONVENTIONS.md §1).
import console from 'node:console'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { parseArgs } from 'node:util'

import { buildInventory, writeInventory } from './build.mjs'
import { CDX_HOST, fetchCdx } from './cdx.mjs'
import { importGscFile } from './gsc.mjs'
import { createPoliteFetch } from './polite-fetch.mjs'

const USAGE = `usage: cli.mjs <fetch-cdx | import-gsc | build> --site <discovery.json> [options]
  --data-dir <dir>      raw cache (default LEGACY_DATA_DIR)
  --out <dir>           inventory folder (default <site dir>/inventory)
  --refresh             fetch-cdx: fetch every page again instead of resuming
  --interval-ms <n>     fetch-cdx: gap between requests, at least 1000 (default 1500)
  --file <csv>          import-gsc: the Search Console export
  --from / --to <date>  import-gsc: the period the export covers (YYYY-MM-DD)`

const USER_AGENT = 'legacy-url-inventory/1.0 (read-only CDX reader; one request at a time)'

/** @param {string} path */
function readDiscovery(path) {
  const discovery = JSON.parse(readFileSync(path, 'utf8'))
  if (typeof discovery.domain !== 'string' || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(discovery.domain)) {
    throw new Error(`${path}: "domain" must be a bare registrable domain, e.g. example.com`)
  }
  return { domain: discovery.domain, kindOverrides: discovery.kindOverrides ?? {} }
}

function legacyDataDir() {
  if (process.env.LEGACY_DATA_DIR === undefined && existsSync('.env.local')) {
    process.loadEnvFile('.env.local')
  }
  return process.env.LEGACY_DATA_DIR
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      site: { type: 'string' },
      'data-dir': { type: 'string' },
      out: { type: 'string' },
      refresh: { type: 'boolean', default: false },
      'interval-ms': { type: 'string', default: '1500' },
      file: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
      help: { type: 'boolean', default: false },
    },
  })
  const [command] = positionals
  if (values.help || command === undefined || values.site === undefined) {
    console.log(USAGE)
    return values.help ? 0 : 2
  }
  const sitePath = resolve(values.site)
  const { domain, kindOverrides } = readDiscovery(sitePath)
  const dataDir = values['data-dir'] ?? legacyDataDir()
  if (dataDir === undefined || dataDir === '') {
    throw new Error('no raw cache: pass --data-dir or set LEGACY_DATA_DIR (it must be outside git)')
  }
  const outDir = values.out ?? join(dirname(sitePath), 'inventory')

  if (command === 'fetch-cdx') {
    const polite = createPoliteFetch({
      allowedHosts: [CDX_HOST],
      userAgent: USER_AGENT,
      minIntervalMs: Number(values['interval-ms']),
      log: (line) => console.log(line),
    })
    await fetchCdx({
      domain,
      dataDir,
      getText: polite.getText,
      refresh: values.refresh,
      log: (line) => console.log(line),
    })
    console.log(`${polite.requests.length} request(s), all to ${CDX_HOST}:`)
    polite.requests.forEach((url) => console.log(`  ${url}`))
  } else if (command === 'import-gsc') {
    if (values.file === undefined) throw new Error('import-gsc needs --file <export.csv>')
    const imported = importGscFile({
      file: values.file,
      dataDir,
      from: values.from ?? null,
      to: values.to ?? null,
    })
    console.log(`imported ${imported.records} row(s) as gsc/${imported.name}`)
  } else if (command !== 'build') {
    console.log(USAGE)
    return 2
  }

  const built = buildInventory({ domain, dataDir, kindOverrides })
  const { csvPath } = writeInventory(outDir, built)
  const { total, byKind, bySource, rejected } = built.summary
  console.log(`${total} path(s) → ${csvPath}`)
  console.log(`by kind   ${JSON.stringify(byKind)}`)
  console.log(`by source ${JSON.stringify(bySource)}`)
  console.log(`rejected  ${JSON.stringify(rejected)}`)
  return 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  },
)
