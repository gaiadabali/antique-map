#!/usr/bin/env node
// `pnpm check:generated` — TASKS.md 2.2.g.
import { runConfigDrift } from './config-drift.mjs'
import { REAL_GENERATORS } from './generators.mjs'

const repoRoot = process.cwd()
const { violations, degraded } = await runConfigDrift(repoRoot, REAL_GENERATORS)

for (const note of degraded) {
  console.log(`check-generated: ${note}`)
}

if (violations.length === 0) {
  console.log(`check-generated: ok, no drift (${REAL_GENERATORS.length - degraded.length} generator(s) actually ran)`)
  process.exit(0)
}

console.error(`check-generated: ${violations.length} drifted generator(s)`)
for (const { name, path } of violations) {
  console.error(`  ${name} — ${path} does not match what BRAND-unset regeneration produces`)
}
process.exit(1)
