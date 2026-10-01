#!/usr/bin/env node
// Points git at the repo's hooks (.githooks/), so the pre-commit hook keeps TASKS.md
// in sync. Run by `pnpm install` (the root `prepare` script). Leaves alone a checkout
// that is not a git repository, or one whose hooksPath someone has set elsewhere.
import { execFileSync } from 'node:child_process'

const git = (...args) =>
  execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()

try {
  git('rev-parse', '--git-dir')
} catch {
  process.exit(0)
}
let current = ''
try {
  current = git('config', '--get', 'core.hooksPath')
} catch {
  // unset
}
if (current && current !== '.githooks') {
  console.warn(
    `install-hooks: core.hooksPath is ${current}; leaving it (TASKS.md will not auto-sync on commit)`,
  )
  process.exit(0)
}
if (!current) git('config', 'core.hooksPath', '.githooks')
