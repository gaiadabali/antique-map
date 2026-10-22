/**
 * Runs `./ops.ts` as its own `payload run` process and answers the JSON it wrote (`GATE_DB=local`
 * only) — split out of `./helpers.ts` so `./accounts.ts` can call it too (its own `accounts` op,
 * 7.4-r2) without importing `./helpers.ts`, which imports `./accounts.ts` for `quoteAsStaff`: that
 * the other way round would be a cycle.
 */
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { localDatabaseUrl, ROOT } from './env'

const here = dirname(fileURLToPath(import.meta.url))
const windows = process.platform === 'win32'
const opsScript = join(here, 'ops.ts')
const opsOutDir = join(here, '.ops-out')

export function runOps(op: Record<string, unknown>): Record<string, unknown> {
  if (!existsSync(opsOutDir)) mkdirSync(opsOutDir, { recursive: true })
  const out = join(opsOutDir, `out-${randomBytes(6).toString('hex')}.json`)
  execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', opsScript], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: windows,
    env: {
      ...process.env,
      DATABASE_URL: localDatabaseUrl(),
      NODE_ENV: 'development',
      SHOPFUL_OP: JSON.stringify(op),
      SHOPFUL_OUT: out,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (!existsSync(out)) throw new Error(`shop-fulfilment ops.ts (${op.op}) wrote no result file`)
  const result = JSON.parse(readFileSync(out, 'utf8')) as Record<string, unknown>
  rmSync(out, { force: true })
  return result
}

export function cleanupOpsOut(): void {
  rmSync(opsOutDir, { recursive: true, force: true })
}
