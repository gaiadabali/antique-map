#!/usr/bin/env node
// The admin roles drive's local harness (TASKS.md 3.6.d): this worktree's database and port, read
// from its `.env.local` (`pnpm worktree:env`), for the three things `roles.spec.ts` needs besides a
// browser.
//
//   node tests/e2e/admin/local.mjs start      the production build (`pnpm build` first) on PORT, both
//                                             hostnames, the shop's the admin's — as start-server.sh
//                                             runs it in CI, with a fresh PAYLOAD_SECRET per start
//   node tests/e2e/admin/local.mjs fixtures   the accounts, orders, leads and antiques (fixtures.ts)
//   node tests/e2e/admin/local.mjs sql "<q>"  one SQL answer, unaligned, from the same database
//
// E2E_DATABASE_URL overrides the database (CI's); SQL then runs through `psql` on PATH. Locally it
// runs in the dev stack's Postgres container, `indies-platform-dev-postgres-1` (worker rules).
/* global process, console */
import { execFileSync, spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readEnvFile } from '../../../engine/tooling/worktree/env-file.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const CONTAINER = 'indies-platform-dev-postgres-1'
const windows = process.platform === 'win32'

/** This worktree's settings: `.env.local` under the process's own environment. */
function settings() {
  const file = join(root, '.env.local')
  const local = existsSync(file) ? readEnvFile(file) : new Map()
  const get = (key) => process.env[key] ?? local.get(key)
  const suffix = get('DB_SUFFIX')
  const database = suffix ? `indies_${suffix}` : undefined
  const url =
    process.env.E2E_DATABASE_URL ??
    (database ? `postgres://postgres:postgres@127.0.0.1:5432/${database}` : undefined)
  if (!url) throw new Error('No database: run `pnpm worktree:env` or set E2E_DATABASE_URL.')
  return { url, database, port: localPort(), get }
}

/** The server's port: E2E_PORT, else this worktree's PORT, else CI's 4200. */
export function localPort() {
  const file = join(root, '.env.local')
  const local = existsSync(file) ? readEnvFile(file) : new Map()
  return process.env.E2E_PORT ?? local.get('PORT') ?? '4200'
}

/** One SQL answer as text: `psql -tA` on the worktree's database. */
export function sql(query) {
  const { url, database } = settings()
  if (process.env.E2E_DATABASE_URL || !database) {
    return execFileSync('psql', ['-tAc', query, url], { encoding: 'utf8' }).trim()
  }
  const args = ['exec', CONTAINER, 'psql', '-U', 'postgres', '-d', database, '-tAc', query]
  return execFileSync('docker', args, { encoding: 'utf8' }).trim()
}

/**
 * Runs fixtures.ts with `payload run` and answers the JSON it printed. Tried three times: the
 * shared dev Postgres sometimes drops a new connection under other worktrees' load, and the
 * script is idempotent.
 */
export function fixtures() {
  const { url } = settings()
  const script = join(here, 'fixtures.ts')
  const run = () =>
    execFileSync('pnpm', ['--filter', '@engine/cms', 'payload', 'run', script], {
      cwd: root,
      encoding: 'utf8',
      shell: windows,
      env: { ...process.env, DATABASE_URL: url, NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
  let out = ''
  for (let attempt = 1; ; attempt += 1) {
    try {
      out = run()
      break
    } catch (error) {
      if (attempt === 3) throw error
    }
  }
  const line = out.split('\n').find((each) => each.startsWith('E2E_FIXTURES '))
  if (!line) throw new Error(`fixtures.ts printed no result:\n${out}`)
  return JSON.parse(line.slice('E2E_FIXTURES '.length))
}

/** The dev stack's storage and mail (MinIO, Mailpit), as `.env.example` sets them: uploads work. */
const LOCAL_STACK = [
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'MEDIA_PUBLIC_URL',
  'MASTERS_BUCKET',
  'MASTERS_ACCESS_KEY_ID',
  'MASTERS_SECRET_ACCESS_KEY',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_FROM_ADDRESS',
]

function start() {
  const { url, port, get } = settings()
  const example = readEnvFile(join(root, '.env.example'))
  const stack = Object.fromEntries(
    LOCAL_STACK.map((key) => [key, get(key) ?? example.get(key)]).filter(([, value]) => value),
  )
  const env = {
    ...stack,
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    PORT: port,
    HOSTNAME: '0.0.0.0',
    GALLERY_HOSTS: 'gallery.localhost',
    SHOP_HOSTS: 'shop.localhost',
    DATABASE_URL: url,
    PAYLOAD_SECRET: randomBytes(32).toString('base64url'),
    LINK_TOKEN_KEYS: get('LINK_TOKEN_KEYS') ?? `dev:${randomBytes(32).toString('base64url')}`,
    // 6.6: the boot check requires it. A fresh key per start means an earlier run's email links
    // stop opening, so set ORDER_LINK_KEY in .env.local to keep them across restarts.
    ORDER_LINK_KEY: get('ORDER_LINK_KEY') ?? randomBytes(32).toString('base64url'),
    LOCAL_PRODUCTION_BUILD: '1',
  }
  const child = spawn('pnpm', ['--filter', '@engine/web', 'start', '--port', port], {
    cwd: root,
    env,
    shell: windows,
    stdio: 'inherit',
  })
  child.on('exit', (code) => process.exit(code ?? 1))
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const [command, ...rest] = process.argv.slice(2)
  if (command === 'start') start()
  else if (command === 'fixtures') console.log(JSON.stringify(fixtures()))
  else if (command === 'sql') console.log(sql(rest.join(' ')))
  else {
    console.error('usage: node tests/e2e/admin/local.mjs <start|fixtures|sql "<query>">')
    process.exit(2)
  }
}
