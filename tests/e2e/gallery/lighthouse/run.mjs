#!/usr/bin/env node
/**
 * The gallery's Lighthouse runner (TASKS.md 5.5.c, local half).
 *
 *   node tests/e2e/gallery/lighthouse/run.mjs --base <origin> --out <dir> [--runs 3] <path> [<path>…]
 *
 * For each path it runs the `lighthouse` CLI `--runs` times (default 3), mobile emulation, the four
 * public categories, JSON only, and reads the JSON each run writes. It prints one Markdown table —
 * page · perf median · a11y · LCP · CLS · TBT · script KB · pass/fail — and exits 1 when any page
 * misses a budget. Every number comes from a JSON file the CLI wrote; nothing here is guessed.
 *
 * Why the CLI and not `lhci collect`: on this Windows host chrome-launcher's post-run cleanup
 * (`fs.rmSync` of its `%TEMP%\lighthouse.*` profile) throws EPERM *after* the JSON is written,
 * killing the `lhci` wrapper before it persists a report (docs/gates/shop-payment.md Finding 2).
 * Calling the CLI with our own `--user-data-dir` lets the JSON write complete first — the EPERM
 * then only affects the throwaway profile, which `os.tmpdir()` owns. A non-zero exit is therefore
 * accepted *only* when the JSON file exists and parses.
 *
 * Budgets come from `lighthouserc.web.json` (LCP, CLS, TBT, script bytes), never hard-coded here.
 */
/* global process, console, URL */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '../../../..')

const USAGE =
  'usage: node tests/e2e/gallery/lighthouse/run.mjs --base <origin> --out <dir> [--runs 3] <path> [<path>…]'

function parseArgs(argv) {
  const out = { base: null, out: null, runs: 3, paths: [] }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--base') out.base = argv[++i]
    else if (arg === '--out') out.out = argv[++i]
    else if (arg === '--runs') out.runs = Number(argv[++i])
    else if (arg === '-h' || arg === '--help') out.help = true
    else if (arg.startsWith('--')) throw new Error(`unknown option ${arg}\n${USAGE}`)
    else out.paths.push(arg)
  }
  if (out.help) return out
  if (!out.base || !out.out || out.paths.length === 0) throw new Error(USAGE)
  if (!Number.isInteger(out.runs) || out.runs < 1)
    throw new Error(`--runs must be a positive integer\n${USAGE}`)
  return out
}

/**
 * The installed `lighthouse` CLI's entry script. It ships as @lhci/cli's own dependency, so it sits
 * under pnpm's store rather than the workspace root's `.bin` (where `pnpm exec lighthouse` looks and
 * fails). Resolve it deliberately: an explicit `LIGHTHOUSE_CLI`, then pnpm's hoisted
 * `node_modules/.pnpm/node_modules`, then any `lighthouse@*` store folder.
 */
function resolveLighthouseCli() {
  const candidates = []
  if (process.env.LIGHTHOUSE_CLI) candidates.push(process.env.LIGHTHOUSE_CLI)
  const hoisted = join(
    REPO_ROOT,
    'node_modules',
    '.pnpm',
    'node_modules',
    'lighthouse',
    'cli',
    'index.js',
  )
  candidates.push(hoisted)
  const store = join(REPO_ROOT, 'node_modules', '.pnpm')
  if (existsSync(store)) {
    for (const entry of readdirSync(store)) {
      if (entry.startsWith('lighthouse@')) {
        candidates.push(join(store, entry, 'node_modules', 'lighthouse', 'cli', 'index.js'))
      }
    }
  }
  const found = candidates.find((file) => existsSync(file))
  if (!found) {
    throw new Error(
      'the lighthouse CLI is not installed: no cli/index.js under node_modules/.pnpm (TASKS.md 5.5.c). ' +
        'Install it as a devDependency of @lhci/cli, or set LIGHTHOUSE_CLI to its cli/index.js.',
    )
  }
  return found
}

/** The budgets the gallery's Check names, read from lighthouserc.web.json — never literals here. */
function readBudgets() {
  const file = join(REPO_ROOT, 'lighthouserc.web.json')
  const config = JSON.parse(readFileSync(file, 'utf8'))
  const matrix = config?.ci?.assert?.assertMatrix ?? []
  const budgets = {}
  for (const { assertions } of matrix) {
    for (const [key, [, options]] of Object.entries(assertions ?? {})) {
      budgets[key] = options.maxNumericValue
    }
  }
  return budgets
}

const slugOf = (path) =>
  path
    .replace(/[/?#]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase() || 'home'

function runOnce(cli, url, outputPath, profileDir) {
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
    ]
    const child = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error) => done({ code: -1, stderr: error.message }))
    child.on('close', (code) => done({ code, stderr }))
  })
}

/** Read the JSON a run wrote; null when it is missing or does not parse (a real failure). */
function readReport(file) {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const scoreOf = (report, category) => report?.categories?.[category]?.score
const auditValue = (report, audit) => report?.audits?.[audit]?.numericValue

function scriptBytes(report) {
  const items = report?.audits?.['resource-summary']?.details?.items ?? []
  return items.find((item) => item.resourceType === 'script')?.transferSize ?? 0
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const kb = (bytes) => Math.round(bytes / 1024)

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(USAGE)
    return
  }
  const cli = resolveLighthouseCli()
  const budgets = readBudgets()
  const outDir = isAbsolute(args.out) ? args.out : resolve(REPO_ROOT, args.out)
  mkdirSync(outDir, { recursive: true })

  const rows = []
  let failed = false

  for (const path of args.paths) {
    const url = new URL(path, args.base).href
    const slug = slugOf(path)
    const reports = []
    for (let n = 1; n <= args.runs; n += 1) {
      const outputPath = join(outDir, `${slug}-${n}.json`)
      const profileDir = join(tmpdir(), `lh-gallery-${slug}-${n}-${Date.now()}`)
      const { code, stderr } = await runOnce(cli, url, outputPath, profileDir)
      const report = readReport(outputPath)
      // The known cleanup EPERM is tolerated only because the JSON is there and parsed.
      if (report === null) {
        failed = true
        rows.push({
          path,
          url,
          error: `run ${n} wrote no parseable JSON (exit ${code}): ${stderr.trim().split('\n').slice(-3).join(' ')}`,
        })
        break
      }
      reports.push(report)
      rmSync(profileDir, { recursive: true, force: true })
    }
    if (reports.length === 0) continue

    const perf = median(reports.map((report) => scoreOf(report, 'performance')))
    const a11yEveryRun = reports.map((report) => scoreOf(report, 'accessibility'))
    const a11yMin = Math.min(...a11yEveryRun)
    const lcp = median(reports.map((report) => auditValue(report, 'largest-contentful-paint')))
    const cls = median(reports.map((report) => auditValue(report, 'cumulative-layout-shift')))
    const tbt = median(reports.map((report) => auditValue(report, 'total-blocking-time')))
    const script = median(reports.map(scriptBytes))

    const checks = [
      ['perf', perf >= 0.9],
      ['a11y', a11yMin === 1],
      ['lcp', lcp <= budgets['largest-contentful-paint']],
      ['cls', cls <= budgets['cumulative-layout-shift']],
      ['tbt', tbt <= budgets['total-blocking-time']],
      ['script', script <= budgets['resource-summary:script:size']],
    ]
    const pass = checks.every(([, ok]) => ok)
    if (!pass) failed = true
    rows.push({
      path,
      url,
      perf: Math.round(perf * 100),
      a11y: Math.round(a11yMin * 100),
      lcp: Math.round(lcp),
      cls: cls.toFixed(3),
      tbt: Math.round(tbt),
      script: kb(script),
      pass,
    })
  }

  console.log('| Page | Perf (median) | A11y | LCP ms | CLS | TBT ms | Script KB | Result |')
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
  for (const row of rows) {
    if (row.error) {
      console.log(`| ${row.path} | — | — | — | — | — | — | FAIL: ${row.error} |`)
      continue
    }
    console.log(
      `| ${row.path} | ${row.perf} | ${row.a11y} | ${row.lcp} | ${row.cls} | ${row.tbt} | ${row.script} | ${row.pass ? 'PASS' : 'FAIL'} |`,
    )
  }
  console.log(
    `\nbudgets: LCP ≤ ${budgets['largest-contentful-paint']} ms, CLS ≤ ${budgets['cumulative-layout-shift']}, ` +
      `TBT ≤ ${budgets['total-blocking-time']} ms, script ≤ ${kb(budgets['resource-summary:script:size'])} KB; ` +
      `performance ≥ 90, accessibility 100 every run.`,
  )
  process.exitCode = failed ? 1 : 0
}

try {
  await main()
} catch (error) {
  console.error(`lighthouse: ${error.message}`)
  process.exitCode = 2
}
