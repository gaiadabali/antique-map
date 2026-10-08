#!/usr/bin/env node
/**
 * Summarise a folder of Lighthouse JSON reports: score, the simulated metrics the budgets read,
 * and the observed (unthrottled) paint times that show whether a run is noisy.
 *
 *   node tests/e2e/a11y/lh-summary.mjs <dir-or-json> [<dir-or-json> …]
 *
 * Every number is read from the report; the median per page is over the files whose names share a
 * prefix up to the trailing `-<n>.json`.
 */
/* global process, console */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const medianOf = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const files = process.argv.slice(2).flatMap((arg) =>
  statSync(arg).isDirectory()
    ? readdirSync(arg)
        .filter((name) => name.endsWith('.json'))
        .sort()
        .map((name) => join(arg, name))
    : [arg],
)

const pages = new Map()
for (const file of files) {
  const report = JSON.parse(readFileSync(file, 'utf8'))
  const metrics = report.audits.metrics.details.items[0]
  const row = {
    perf: Math.round(report.categories.performance.score * 100),
    a11y: Math.round(report.categories.accessibility.score * 100),
    lcp: Math.round(metrics.largestContentfulPaint),
    fcp: Math.round(metrics.firstContentfulPaint),
    tbt: Math.round(metrics.totalBlockingTime),
    cls: metrics.cumulativeLayoutShift,
    obsLcp: Math.round(metrics.observedLargestContentfulPaint ?? 0),
    kb: Math.round((report.audits['total-byte-weight']?.numericValue ?? 0) / 1024),
  }
  const key = file.replace(/-\d+\.json$/, '')
  pages.set(key, [...(pages.get(key) ?? []), row])
}

console.log('| Page | Perf (runs) | A11y | LCP ms (median) | FCP | TBT | CLS | Weight KiB |')
console.log('| --- | --- | --- | --- | --- | --- | --- | --- |')
for (const [key, rows] of pages) {
  console.log(
    `| ${key} | ${medianOf(rows.map((r) => r.perf))} (${rows.map((r) => r.perf).join(' · ')}) | ` +
      `${Math.min(...rows.map((r) => r.a11y))} | ${medianOf(rows.map((r) => r.lcp))} | ` +
      `${medianOf(rows.map((r) => r.fcp))} | ${medianOf(rows.map((r) => r.tbt))} | ` +
      `${Math.max(...rows.map((r) => r.cls))} | ${medianOf(rows.map((r) => r.kb))} |`,
  )
}
