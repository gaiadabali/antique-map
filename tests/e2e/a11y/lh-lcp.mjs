#!/usr/bin/env node
/**
 * What a Lighthouse report says about its LCP: the element, the phases, and every request with its
 * start, end, size and priority — the page's critical path, read from the report.
 *
 *   node tests/e2e/a11y/lh-lcp.mjs <report.json>
 */
/* global process, console */
import { readFileSync } from 'node:fs'

const report = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const audits = report.audits
const metrics = audits.metrics.details.items[0]
console.log(
  `LCP ${Math.round(metrics.largestContentfulPaint)} ms (observed ${Math.round(
    metrics.observedLargestContentfulPaint,
  )}), FCP ${Math.round(metrics.firstContentfulPaint)} ms, bench ${Math.round(
    report.environment.benchmarkIndex,
  )}`,
)
const phases = audits['lcp-phases-insight']?.details?.items?.[0]?.items ?? []
console.log(`phases: ${phases.map((p) => `${p.label} ${Math.round(p.duration)}`).join(' · ')}`)
const node = audits['lcp-phases-insight']?.details?.items?.[1]
console.log(`element: ${node?.snippet ?? 'unknown'}`)
for (const r of audits['network-requests'].details.items) {
  console.log(
    `${String(Math.round(r.networkRequestTime)).padStart(5)} → ${String(
      Math.round(r.networkEndTime),
    ).padStart(
      5,
    )}  ${String(r.transferSize).padStart(7)} B  ${r.resourceType.padEnd(10)} ${r.priority.padEnd(8)} ${r.url.replace(/^https?:\/\/[^/]+/, '').slice(-70)}`,
  )
}
