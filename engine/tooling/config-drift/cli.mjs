#!/usr/bin/env node
// `pnpm check:generated` — TASKS.md 1.3.c: the CMS package's real generators in one context
// (no DATABASE_URL, no host allow-list), compared with the committed payload-types.ts and importMap.js.
import { runConfigDrift } from './config-drift.mjs'
import { realGenerators } from './generators.mjs'

const repoRoot = process.cwd()
const started = Date.now()
const { violations, degraded, ran } = await runConfigDrift(repoRoot, realGenerators(repoRoot))
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
  'check-generated: a generated file is regenerated, never edited: the wave lead runs generate:types and generate:importmap and commits the result (AGENTS.md)',
)
process.exit(1)
