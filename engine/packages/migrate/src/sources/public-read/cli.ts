/**
 * The public read's command line (TASKS.md 7.1.c, D41).
 *
 *   crawl  --config <file> [--max-requests N] [--inventory-out <dir>]
 *          read the old site politely, resuming from the cache
 *   build  --config <file> [--inventory-out <dir>]
 *          no network at all: replay the cache into product JSON, images and the inventory
 *
 * Common: [--data-dir <dir>] (else LEGACY_DATA_DIR), [--base-url], [--user-agent].
 * Raw output lands in <data-dir>/public-read/; only --inventory-out (paths and
 * statuses) is meant for git.
 */
import { readFileSync } from 'node:fs'
import { isAbsolute, join, relative, sep } from 'node:path'
import { parseArgs } from 'node:util'

import { buildRecords } from './build.ts'
import { ResponseCache } from './cache.ts'
import { parseReaderConfig, type ReaderConfig } from './config.ts'
import { crawl } from './crawl.ts'
import { legacyDataDir, resolveFromInvocation, workspaceRoot } from './env.ts'
import { writeInventory } from './inventory.ts'
import { PoliteFetcher, ReadAborted } from './polite-fetch.ts'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    config: { type: 'string' },
    'data-dir': { type: 'string' },
    'base-url': { type: 'string' },
    'user-agent': { type: 'string' },
    'max-requests': { type: 'string' },
    'inventory-out': { type: 'string' },
  },
})

function log(line: string): void {
  process.stdout.write(`[${new Date().toISOString()}] ${line}\n`)
}

/** Raw output never lands inside the checkout, except under a gitignored content/legacy/raw/. */
function assertOutsideGit(dataDir: string): void {
  const root = workspaceRoot()
  if (root === null) return
  const inside = relative(root, dataDir).split(sep).join('/')
  const isInside = inside === '' || (!inside.startsWith('..') && !isAbsolute(inside))
  if (isInside && !inside.includes('content/legacy/raw')) {
    throw new Error(`refusing data dir ${dataDir}: raw output stays outside git (MIGRATION.md §4)`)
  }
}

function loadConfig(): ReaderConfig {
  if (!values.config) throw new Error('--config <file> is required')
  const raw: unknown = JSON.parse(readFileSync(resolveFromInvocation(values.config), 'utf8'))
  const overrides: Partial<Pick<ReaderConfig, 'baseUrl' | 'userAgent'>> = {}
  if (values['base-url']) overrides.baseUrl = values['base-url']
  if (values['user-agent']) overrides.userAgent = values['user-agent']
  return parseReaderConfig(raw, overrides)
}

async function run(command: string | undefined): Promise<void> {
  if (command !== 'crawl' && command !== 'build') {
    throw new Error('usage: cli.ts crawl|build --config <file> [options]')
  }
  const config = loadConfig()
  const dataDir = join(legacyDataDir(values['data-dir']), 'public-read')
  assertOutsideGit(dataDir)
  const cache = new ResponseCache(join(dataDir, 'cache'))
  const inventoryOut = values['inventory-out']
    ? resolveFromInvocation(values['inventory-out'])
    : null
  let stopping = false
  process.on('SIGINT', () => {
    if (stopping) process.exit(130)
    stopping = true
    log('stopping after the current request (Ctrl-C again to quit now)')
  })

  if (command === 'crawl') {
    const fetcher = new PoliteFetcher({ config, cache, log })
    log(`reading ${config.baseUrl} as "${config.userAgent}", ${config.minIntervalMs} ms apart`)
    const maxRequests = values['max-requests'] ? Number(values['max-requests']) : undefined
    try {
      const result = await crawl({ config, fetcher, log, maxRequests, shouldStop: () => stopping })
      const summary = writeInventory(
        result,
        config.baseUrl,
        join(dataDir, 'urls.tsv'),
        inventoryOut,
      )
      log(`network requests this run: ${JSON.stringify(fetcher.stats)}`)
      log(`inventory: ${JSON.stringify(summary)}`)
    } catch (error) {
      if (error instanceof ReadAborted) log(`ABORTED: ${error.message}`)
      throw error
    }
  }

  const offline = new PoliteFetcher({ config, cache, log, offline: true })
  const built = await buildRecords({ config, fetcher: offline, outDir: dataDir, log })
  const summary = writeInventory(
    built.crawl,
    config.baseUrl,
    join(dataDir, 'urls.tsv'),
    inventoryOut,
  )
  log(`built: ${JSON.stringify(built.counts)}`)
  log(`inventory: ${JSON.stringify(summary)}`)
}

run(positionals[0]).catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
