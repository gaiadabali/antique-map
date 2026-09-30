#!/usr/bin/env node
// `pnpm check:client-safe` — TASKS.md 4.2.a.
import { checkClientSafe, formatViolation } from './check.mjs'

const repoRoot = process.cwd()
const { modules, violations } = checkClientSafe(repoRoot)

if (violations.length === 0) {
  console.log(
    modules.length === 0
      ? "check-client-safe: ok, no 'use client' module under engine/ yet"
      : `check-client-safe: ok, ${modules.length} 'use client' module(s) reach nothing server-only`,
  )
  process.exit(0)
}

console.error(
  `check-client-safe: ${violations.length} server-only reach(es) from ${modules.length} 'use client' module(s)`,
)
for (const violation of violations) console.error(`  ${formatViolation(repoRoot, violation)}`)
process.exit(1)
