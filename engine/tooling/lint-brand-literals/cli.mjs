#!/usr/bin/env node
// `pnpm lint:brand-literals` — TASKS.md 2.2.b.
import { lintBrandLiterals } from './lint-brand-literals.mjs'

const repoRoot = process.cwd()
const { violations, terms, gaps } = lintBrandLiterals(repoRoot)

if (gaps.length > 0) {
  console.log(
    `lint-brand-literals: nothing to check yet for domains of: ${gaps.join(', ')} — ` +
      `no site/brand.config.json (0.6.d / 3.1 not landed); slug and derived name are still checked`,
  )
}

if (violations.length === 0) {
  console.log(
    `lint-brand-literals: ok, no brand literal under engine/ (${terms.length} banned term(s) checked)`,
  )
  process.exit(0)
}

console.error(`lint-brand-literals: ${violations.length} violation(s)`)
for (const { path, line, term } of violations) {
  console.error(`  ${path}:${line} — contains "${term}"`)
}
process.exit(1)
