#!/usr/bin/env node
/**
 * Compare Lighthouse CI artifacts (`lhr-*.json`): per run its URL, performance, LCP, FCP, the LCP
 * phases and the page's request total — to see what moved between a passing and a failing run.
 *
 *   node tests/e2e/a11y/lh-compare.mjs <dir> [<dir> …]
 */
/* global process, console */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

for (const dir of process.argv.slice(2)) {
  console.log(`== ${dir}`)
  for (const file of readdirSync(dir).filter((name) => /^lhr-.*\.json$/.test(name))) {
    const report = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    const audits = report.audits
    const metrics = audits.metrics.details.items[0]
    const requests = audits['network-requests'].details.items
    const total = requests.reduce((sum, r) => sum + r.transferSize, 0)
    const phases = (audits['lcp-phases-insight']?.details?.items?.[0]?.items ?? [])
      .map((p) => `${p.label.split(' ')[0]} ${Math.round(p.duration)}`)
      .join(' ')
    console.log(
      `${(report.finalDisplayedUrl ?? report.finalUrl).replace(/^https?:\/\//, '').padEnd(34)} ` +
        `perf ${Math.round(report.categories.performance.score * 100)} LCP ${Math.round(metrics.largestContentfulPaint)} ` +
        `FCP ${Math.round(metrics.firstContentfulPaint)} obsLCP ${Math.round(metrics.observedLargestContentfulPaint)} ` +
        `ttfb ${Math.round(metrics.timeToFirstByte)} req ${requests.length} bytes ${total} bench ${Math.round(report.environment.benchmarkIndex)} | ${phases}`,
    )
  }
}
