#!/usr/bin/env node
// `pnpm check:seo-crawl` — TASKS.md 9.3.d. Fetches one site's /sitemap.xml (and any index children),
// then every URL in it under the limiter: each must answer 200 and carry a canonical, both hreflang
// alternates plus x-default, and a description; on the gallery, no JSON-LD block with a price or
// offers. `--expect <n>` compares the URL count with the published count the orchestrator supplies.
// Read-only and paced, resumable, and it never requests a sensitive path. Exit 0 only on a pass.
//
// The sitemap speaks the site's canonical origin (`--origin`), while the crawl is pointed at what it
// can reach (`--base`): every `<loc>` and index child is rewritten onto the base with `toBase`. A loc
// on any other origin is a failure ("sitemap lists another origin") and is never requested.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'

import { COMMON_OPTIONS, commonOptions } from './cli-args.mjs'
import { createLimiter } from './limiter.mjs'
import { createGet } from './paced.mjs'
import { collectSitemapUrls, crawlPages, localeCounts } from './seo-check.mjs'
import { createStateWriter, defaultStatePath, readState } from './state.mjs'

const USAGE = `usage: node engine/tooling/phase9-checks/seo-crawl.mjs --base <origin> --site <gallery|shop> [options]

  --base <origin>      the origin to request (e.g. https://staging.example, http://localhost:4372)
  --origin <origin>    the site's canonical origin (default: --base); sitemap locs are judged against it
  --site <key>         gallery or shop (which site's rules to apply)
  --host <header>      send this as the Host header (when --base is an IP or a tunnel)
  --expect <n>         the published URL count the crawl must match
  --out <path>         write the JSON report here (default: stdout only)
  --state <path>       JSONL resume file (default: a per-site file under the OS temp dir)
  --rate <n>           requests a second (default 5; lower is fine, above 5 needs --i-know)
  --i-know             allow a rate above 5 (you accept the load on the shared host)
  -h, --help           this text`

async function main(argv) {
  const { values } = parseArgs({
    args: argv,
    options: { ...COMMON_OPTIONS, expect: { type: 'string' } },
  })
  if (values.help) {
    console.log(USAGE)
    return 0
  }
  const { base, origin, site, rate } = commonOptions(values)
  const get = createGet({ limiter: createLimiter({ rate }), host: values.host })

  const collected = await collectSitemapUrls({ origin, base, get })
  const urls = collected.pages.map((page) => page.url)
  const statePath = values.state ?? defaultStatePath(site, 'seo')
  const { checked, skippedSensitive, failures } = await crawlPages(collected.pages, {
    get,
    site,
    origin,
    done: readState(statePath),
    write: createStateWriter(statePath),
  })

  const counts = localeCounts(urls)
  const expect = values.expect === undefined ? null : Number(values.expect)
  const countMatches = expect === null ? null : urls.length === expect
  const report = {
    site,
    base,
    origin,
    sitemaps: collected.sitemaps,
    urls: urls.length,
    checked,
    skippedSensitive,
    counts,
    expect,
    countMatches,
    failures: [...collected.failures, ...failures],
  }
  if (values.out) {
    mkdirSync(dirname(values.out), { recursive: true })
    writeFileSync(values.out, `${JSON.stringify(report, null, 2)}\n`)
  }
  logReport(report)
  return report.failures.length === 0 && countMatches !== false ? 0 : 1
}

function logReport(report) {
  console.log(`seo-crawl (${report.site}) against ${report.base} (canonical ${report.origin})`)
  console.log(
    `  ${report.sitemaps.length} sitemap file(s), ${report.urls} URLs (en ${report.counts.en}, id ${report.counts.id})`,
  )
  console.log(`  checked ${report.checked}, skipped ${report.skippedSensitive} sensitive`)
  if (report.expect !== null) {
    console.log(`  expected ${report.expect} URLs: ${report.countMatches ? 'matches' : 'MISMATCH'}`)
  }
  console.log(`  ${report.failures.length} page(s) with a problem`)
  for (const failure of report.failures) {
    console.log(`  FAIL ${failure.url}: ${failure.problems.join('; ')}`)
  }
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (error) {
  console.error(`seo-crawl: ${error.message}`)
  process.exitCode = 2
}
