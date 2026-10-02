#!/usr/bin/env node
process.env.CMS_TEST_POSTGRES_URL = 'postgres://postgres:postgres@localhost:5432/postgres'
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
const log = 'db-test-run.log'
const result = spawnSync(
  'pnpm',
  ['exec', 'vitest', 'run', '--project', 'packages', ...process.argv.slice(2)],
  { encoding: 'utf8', shell: true },
)
writeFileSync(log, result.stdout + '\n' + result.stderr)
console.log(`EXIT:${result.status}; log in ${log}`)
