#!/usr/bin/env node
// `pnpm check:filesize` — TASKS.md 2.2.a.
import { checkFileSize, LIMIT } from './check-file-size.mjs'

const repoRoot = process.cwd()
const roots = process.argv.slice(2).filter((arg) => !arg.startsWith('-'))
const violations = checkFileSize(repoRoot, roots.length > 0 ? roots : undefined)

if (violations.length === 0) {
  console.log(`check-file-size: ok, no file over ${LIMIT} lines`)
  process.exit(0)
}

console.error(`check-file-size: ${violations.length} file(s) over ${LIMIT} lines`)
for (const { path, lines } of violations) {
  console.error(`  ${path} — ${lines} lines`)
}
process.exit(1)
