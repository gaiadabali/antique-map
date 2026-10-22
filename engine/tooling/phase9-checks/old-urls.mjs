#!/usr/bin/env node
// `pnpm check:old-urls` — TASKS.md 9.4.c. Requests every legacy key from one site's inventory against
// a base (staging, or a local build) without following redirects, and reports each as itself (200), one
// 301 to a 200, 410, or a 404 the builder lists unresolved with its reason. Read-only and paced
// (GET/HEAD only, ≤5 a second, one in flight per host, backoff on 429/503 honouring Retry-After),
// resumable from a JSONL state file, and it never requests a sensitive path. Exit 0 only on a pass.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

import { COMMON_OPTIONS, commonOptions } from './cli-args.mjs'
import { readInventory } from './inventory.mjs'
import { createLimiter } from './limiter.mjs'
import { collectKeys } from './normalise.mjs'
import { KEPT_LIVE, checkKeys, reconciliation } from './old-urls-check.mjs'
import { createGet } from './paced.mjs'
import { createStateWriter, defaultStatePath, readState } from './state.mjs'

const USAGE = `usage: node engine/tooling/phase9-checks/old-urls.mjs --base <origin> --site <gallery|shop> [options]

  --base <origin>      the origin to request (e.g. https://staging.example, http://localhost:4372)
  --origin <origin>    the site's canonical origin (default: --base); the 301's Location is judged against it
  --site <key>         gallery or shop (which inventory to read)
  --host <header>      send this as the Host header (when --base is an IP or a tunnel)
  --out <path>         write the JSON report here (default: stdout only)
  --state <path>       JSONL resume file (default: a per-site file under the OS temp dir)
  --unresolved <path>  the builder's unresolved.<site>.json (a 404 here needs a reason in it)
  --rate <n>           requests a second (default 5; lower is fine, above 5 needs --i-know)
  --i-know             allow a rate above 5 (you accept the load on the shared host)
  -h, --help           this text`

/** Reads the builder's `unresolved.<site>.json` into a map from key to reason. */
function loadUnresolved(path) {
  if (!path) return {}
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const list = Array.isArray(raw) ? raw : (raw.unresolved ?? [])
  const map = {}
  for (const item of list)
    if (item && typeof item.from === 'string') map[item.from] = item.reason ?? ''
  return map
}

async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: { ...COMMON_OPTIONS, unresolved: { type: 'string' } },
  })
  if (values.help) {
    console.log(USAGE)
    return 0
  }
  const { base, origin, site, rate } = commonOptions(values)

  const rows = readInventory(site, '.')
  const { keys, skippedSensitive } = collectKeys(site, rows)
  const unresolved = loadUnresolved(values.unresolved)

  const statePath = values.state ?? defaultStatePath(site, 'old-urls')
  const done = readState(statePath)
  const write = createStateWriter(statePath)
  const get = createGet({ limiter: createLimiter({ rate }), host: values.host })

  const { counts, failures } = await checkKeys(base, keys, {
    get,
    unresolved,
    origin,
    keptLive: KEPT_LIVE[site] ?? [],
    done,
    onResult: (url, outcome) => write(url, outcome),
  })
  const recon = reconciliation(keys.length, counts)
  const report = {
    site,
    base,
    origin,
    inventoryRows: rows.length,
    skippedSensitive,
    keys: keys.length,
    counts,
    failures,
    reconciliation: recon,
  }
  if (values.out) {
    mkdirSync(dirname(values.out), { recursive: true })
    writeFileSync(values.out, `${JSON.stringify(report, null, 2)}\n`)
  }
  logReport(report)
  return failures.length === 0 && recon.matches ? 0 : 1
}

function logReport(report) {
  const c = report.counts
  const s = c.statuses
  console.log(`old-urls (${report.site}) against ${report.base} (canonical ${report.origin})`)
  console.log(
    `  ${report.keys} keys from ${report.inventoryRows} rows (${report.skippedSensitive} sensitive paths skipped)`,
  )
  console.log(
    `  200: ${c.ok}   301→200: ${c.redirected}   308 normalised: ${c.normalised}   308 kept live→200: ${c.keptLive}   410: ${c.gone}   unresolved: ${c.unresolved}   FAIL: ${c.fail}`,
  )
  console.log(`  redirect codes seen: 301 ${s[301]}, 302 ${s[302]}, 307 ${s[307]}, 308 ${s[308]}`)
  const r = report.reconciliation
  console.log(
    `  rows + gone + unresolved = ${r.rows} + ${r.gone} + ${r.unresolved} = ${r.sum} of ${r.total} (${r.matches ? 'matches' : 'MISMATCH'})`,
  )
  for (const failure of report.failures) {
    console.log(`  FAIL ${failure.url}${failure.to ? ` → ${failure.to}` : ''}: ${failure.reason}`)
  }
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (error) {
  console.error(`old-urls: ${error.message}`)
  process.exitCode = 2
}
