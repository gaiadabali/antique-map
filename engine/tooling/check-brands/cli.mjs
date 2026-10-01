#!/usr/bin/env node
// `pnpm check:brands` — TASKS.md 4.7.b. Every committed brand config, against the real
// `supports` of the app that renders it; exit 0 when all pass, 1 on any problem.
import { checkBrands, loadBrandChecks } from './check-brands.mjs'

let checks
try {
  checks = await loadBrandChecks()
} catch (error) {
  console.error(
    `check-brands: cannot load the checks: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exit(1)
}

const { ok, passed, problems } = checkBrands(process.cwd(), checks)
for (const line of passed) console.log(`check-brands: ok ${line}`)
if (ok) process.exit(0)

console.error(`check-brands: ${problems.length} problem(s)`)
for (const line of problems) console.error(`  ${line}`)
process.exit(1)
