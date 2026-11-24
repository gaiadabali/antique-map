/**
 * Fresh `paid` orders for the order screens' specs (`store-panel.spec.ts`, `orders-door.spec.ts`):
 * one at each fixture store, made by `store-panel-fixtures.ts` through the CMS's own Local API on
 * this worktree's database, the way `fixtures.ts` runs. Not idempotent: each call makes two more.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readEnvFile } from '../../../engine/tooling/worktree/env-file.mjs'
import { localPort } from './local.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '../../..')
const windows = process.platform === 'win32'

/** A fresh `paid` order at store A (`mine`) and at store B (`other`). */
export function paidOrders(storeAId: number, storeBId: number): { mine: number; other: number } {
  const script = join(here, 'store-panel-fixtures.ts')
  const port = localPort()
  const envFile = join(root, '.env.local')
  const local = existsSync(envFile) ? readEnvFile(envFile) : new Map<string, string>()
  const suffix = process.env.DB_SUFFIX ?? local.get('DB_SUFFIX')
  const url =
    process.env.E2E_DATABASE_URL ??
    `postgres://postgres:postgres@127.0.0.1:5432/indies_${suffix ?? ''}`
  const out = execFileSync(
    'pnpm',
    ['--filter', '@engine/cms', 'payload', 'run', script, String(storeAId), String(storeBId)],
    {
      cwd: root,
      encoding: 'utf8',
      shell: windows,
      env: { ...process.env, DATABASE_URL: url, NODE_ENV: 'development', E2E_PORT: port },
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  )
  const line = out.split('\n').find((each) => each.startsWith('E2E_STORE_PANEL '))
  if (!line) throw new Error(`store-panel-fixtures.ts printed no result:\n${out}`)
  return JSON.parse(line.slice('E2E_STORE_PANEL '.length)) as { mine: number; other: number }
}
