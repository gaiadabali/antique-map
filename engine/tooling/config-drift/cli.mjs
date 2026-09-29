#!/usr/bin/env node
// `pnpm check:generated` — TASKS.md 2.2.g, 3.5.b: the CMS package's real
// generators, with BRAND unset and once per brand context, no DATABASE_URL.
import { runConfigDrift } from './config-drift.mjs'
import { brandContexts } from './contexts.mjs'
import { realGenerators } from './generators.mjs'

const repoRoot = process.cwd()
const contexts = brandContexts(repoRoot)
const started = Date.now()
console.log(`check-generated: contexts — ${contexts.map((c) => c.label).join('; ')}`)
const { violations, degraded, ran } = await runConfigDrift(
  repoRoot,
  realGenerators(repoRoot, { contexts }),
)
const seconds = ((Date.now() - started) / 1000).toFixed(1)

for (const note of degraded) {
  console.log(`check-generated: ${note}`)
}

if (violations.length === 0) {
  console.log(`check-generated: ok, no drift (${ran} generator run(s) compared, ${seconds} s)`)
  process.exit(0)
}

console.error(`check-generated: ${violations.length} drifted generator run(s)`)
for (const { name, path, detail } of violations) {
  console.error(`  ${name} — ${path}: ${detail}`)
}
console.error(
  'check-generated: a generated file is regenerated, never edited: the SCH lead runs migrate:create / generate:types / generate:importmap with BRAND unset (PARALLEL-TRACKS.md §3.2); a config that differs by BRAND is a bug in the config (ARCHITECTURE.md §2)',
)
process.exit(1)
