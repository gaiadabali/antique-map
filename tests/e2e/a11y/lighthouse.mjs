#!/usr/bin/env node
/**
 * Lighthouse mobile over a list of named pages, with budgets from `lighthouserc.json` (TASKS.md
 * 10.2.a). It drives the installed `lighthouse` CLI directly — `lhci collect` crashes on this
 * Windows host's profile cleanup (docs/gates/shop-payment.md finding 2) — and reads every number
 * from the JSON the CLI wrote.
 *
 *   node tests/e2e/a11y/lighthouse.mjs --out <dir> [--runs 3] [--cookie "name=value"] \
 *        <name>=<url> [<name>=<url> …]
 *
 * `--cookie` is sent on every request of every page (the bag and checkout need the bag cookie).
 * Budgets: the `assertMatrix` entry whose `matchingUrlPattern` matches the URL, plus its
 * `categories:*` min scores. Exit 1 when any page misses one; the table says which.
 */
/* global process, console, setTimeout */
import { spawn } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
/** Lighthouse's own CPU benchmark: this workstation idle reads about 3,800-4,100. */
const MIN_BENCH = 2500
const MAX_ATTEMPTS = 3
const USAGE =
  'usage: node tests/e2e/a11y/lighthouse.mjs --out <dir> [--runs 3] [--cookie "n=v"] <name>=<url> …'

function parseArgs(argv) {
  const out = { out: null, runs: 3, cookie: null, pages: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--out') out.out = argv[++i]
    else if (arg === '--runs') out.runs = Number(argv[++i])
    else if (arg === '--cookie') out.cookie = argv[++i]
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}\n${USAGE}`)
    else {
      const at = arg.indexOf('=')
      if (at < 1) throw new Error(`a page is <name>=<url>: ${arg}\n${USAGE}`)
      out.pages.push({ name: arg.slice(0, at), url: arg.slice(at + 1) })
    }
  }
  if (!out.out || out.pages.length === 0) throw new Error(USAGE)
  return out
}

function lighthouseCli() {
  const candidates = [
    process.env.LIGHTHOUSE_CLI,
    join(REPO_ROOT, 'node_modules/.pnpm/node_modules/lighthouse/cli/index.js'),
  ].filter(Boolean)
  const store = join(REPO_ROOT, 'node_modules/.pnpm')
  if (existsSync(store)) {
    for (const entry of readdirSync(store)) {
      if (entry.startsWith('lighthouse@')) {
        candidates.push(join(store, entry, 'node_modules/lighthouse/cli/index.js'))
      }
    }
  }
  const found = candidates.find((file) => existsSync(file))
  if (!found) throw new Error('the lighthouse CLI is not installed (set LIGHTHOUSE_CLI)')
  return found
}

/** The budgets that apply to a URL, from `lighthouserc.json`'s assertMatrix. */
function budgetsFor(url) {
  const config = JSON.parse(readFileSync(join(REPO_ROOT, 'lighthouserc.json'), 'utf8'))
  const budgets = {}
  for (const entry of config.ci.assert.assertMatrix) {
    if (!new RegExp(entry.matchingUrlPattern).test(url)) continue
    for (const [key, [, options]] of Object.entries(entry.assertions)) {
      budgets[key] = options.maxNumericValue ?? options.minScore
    }
  }
  return budgets
}

function runOnce(cli, url, outputPath, profileDir, headersFile) {
  return new Promise((done) => {
    const args = [
      cli,
      url,
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--output=json',
      `--output-path=${outputPath}`,
      `--chrome-flags=--headless=new --user-data-dir=${profileDir}`,
      ...(headersFile ? [`--extra-headers=${headersFile}`] : []),
    ]
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) => done({ stderr: error.message }))
    child.on('close', () => done({ stderr }))
  })
}

const read = (file) => {
  try {
    return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  } catch {
    return null
  }
}
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
const scriptBytes = (report) =>
  (report.audits['resource-summary']?.details?.items ?? []).find((i) => i.resourceType === 'script')
    ?.transferSize ?? 0

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const cli = lighthouseCli()
  const outDir = isAbsolute(args.out) ? args.out : resolve(REPO_ROOT, args.out)
  mkdirSync(outDir, { recursive: true })
  let headersFile = null
  if (args.cookie) {
    headersFile = join(tmpdir(), `lh-headers-${Date.now()}.json`)
    writeFileSync(headersFile, JSON.stringify({ Cookie: args.cookie }))
  }
  console.log(
    '| Page | Perf (median) | A11y (worst) | LCP ms | CLS | TBT ms | Script KB | Weight KiB | CPU bench | Result |',
  )
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  let failed = false
  for (const { name, url } of args.pages) {
    const reports = []
    for (let n = 1; n <= args.runs; n += 1) {
      const file = join(outDir, `${name}-${n}.json`)
      // The host is shared: a run made while it is saturated reads TBT and LCP several times too
      // high (Lighthouse records the CPU benchmark it ran at). Retry a slow host up to three
      // times and keep the run made at the best benchmark, so the table is never a load reading.
      let best = null
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        const tryFile = join(outDir, `.attempt-${name}-${n}-${attempt}.json`)
        const profile = join(tmpdir(), `lh-a11y-${name}-${n}-${Date.now()}`)
        await runOnce(cli, url, tryFile, profile, headersFile)
        rmSync(profile, { recursive: true, force: true, maxRetries: 3 })
        const report = read(tryFile)
        if (report?.audits?.metrics?.details === undefined) {
          rmSync(tryFile, { force: true })
          // A tracking page answers 429 past ten requests a minute: wait before another.
          if (/\/track\//.test(url)) await new Promise((r) => setTimeout(r, 65000))
          continue
        }
        const bench = report.environment?.benchmarkIndex ?? 0
        if (best === null || bench > best.bench) {
          if (best !== null) rmSync(best.file, { force: true })
          best = { bench, file: tryFile, report }
        } else rmSync(tryFile, { force: true })
        if (bench >= MIN_BENCH) break
      }
      if (best === null) {
        console.log(`| ${name} | no report for run ${n} | | | | | | | | FAIL |`)
        failed = true
        continue
      }
      renameSync(best.file, file)
      reports.push(best.report)
    }
    if (reports.length === 0) continue
    const budgets = budgetsFor(url)
    const perf = reports.map((r) => Math.round(r.categories.performance.score * 100))
    const a11y = reports.map((r) => Math.round(r.categories.accessibility.score * 100))
    const lcp = median(reports.map((r) => r.audits['largest-contentful-paint'].numericValue))
    const cls = Math.max(...reports.map((r) => r.audits['cumulative-layout-shift'].numericValue))
    const tbt = median(reports.map((r) => r.audits['total-blocking-time'].numericValue))
    const script = median(reports.map(scriptBytes))
    const weight = median(reports.map((r) => r.audits['total-byte-weight'].numericValue))
    const misses = []
    if (budgets['categories:performance'] && median(perf) < budgets['categories:performance'] * 100)
      misses.push('perf')
    if (
      budgets['categories:accessibility'] &&
      Math.min(...a11y) < budgets['categories:accessibility'] * 100
    )
      misses.push('a11y')
    if (budgets['largest-contentful-paint'] && lcp > budgets['largest-contentful-paint'])
      misses.push('LCP')
    if (budgets['cumulative-layout-shift'] && cls > budgets['cumulative-layout-shift'])
      misses.push('CLS')
    if (budgets['total-blocking-time'] && tbt > budgets['total-blocking-time']) misses.push('TBT')
    if (budgets['resource-summary:script:size'] && script > budgets['resource-summary:script:size'])
      misses.push('script')
    if (misses.length > 0) failed = true
    console.log(
      `| ${name} | ${median(perf)} (${perf.join(' · ')}) | ${Math.min(...a11y)} | ${Math.round(lcp)} | ` +
        `${cls.toFixed(3)} | ${Math.round(tbt)} | ${Math.round(script / 1024)} | ${Math.round(weight / 1024)} | ` +
        `${Math.round(median(reports.map((r) => r.environment?.benchmarkIndex ?? 0)))} | ` +
        `${misses.length === 0 ? 'pass' : `FAIL (${misses.join(', ')})`} |`,
    )
  }
  if (headersFile) rmSync(headersFile, { force: true })
  process.exit(failed ? 1 : 0)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(2)
})
