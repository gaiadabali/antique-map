#!/usr/bin/env node
// `pnpm check:routes` — TASKS.md 2.2.d.
import { checkRouteParity } from './route-parity.mjs'

const repoRoot = process.cwd()
const { violations, degraded, routeCount, collectionSlugs } = await checkRouteParity(repoRoot)

for (const note of degraded) {
  console.log(`route-parity: nothing to check yet: ${note}`)
}

if (violations.length === 0) {
  console.log(
    `route-parity: ok, ${routeCount} manifest route(s) checked against ${collectionSlugs.length} collection slug(s)`,
  )
  process.exit(0)
}

console.error(`route-parity: ${violations.length} violation(s)`)
for (const v of violations) {
  console.error(`  ${JSON.stringify(v)}`)
}
process.exit(1)
