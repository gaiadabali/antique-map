// Starts the built standalone server for this worktree the way .github/scripts/start-server.sh
// does on a host — `node engine/apps/web/server.js` with the two local hostnames and this
// worktree's own port/database. Reads .env.local so no secret is passed on a command line.
// Self-locating (repo root = four levels up from this file) so it also runs from the fresh clone.
/* global process */
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const root = resolve(HERE, '../../../..')
const server = join(root, 'engine/apps/web/.next/standalone/engine/apps/web/server.js')

function envFile(file) {
  if (!existsSync(file)) return new Map()
  const values = new Map()
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (match && !/^\s*#/.test(line)) values.set(match[1], match[2].trim())
  }
  return values
}

const local = envFile(join(root, '.env.local'))
const suffix = local.get('DB_SUFFIX') ?? 'p5_wds5c'
const port = local.get('PORT') ?? '4255'
const user = local.get('POSTGRES_USER') ?? 'postgres'
const password = local.get('POSTGRES_PASSWORD') ?? 'postgres'
const host = local.get('POSTGRES_HOST') ?? 'localhost'
const pgPort = local.get('POSTGRES_PORT') ?? '5432'

const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_TELEMETRY_DISABLED: '1',
  PORT: port,
  HOSTNAME: '0.0.0.0',
  GALLERY_HOSTS: 'gallery.localhost',
  SHOP_HOSTS: 'shop.localhost',
  DATABASE_URL: `postgres://${user}:${password}@${host}:${pgPort}/indies_${suffix}`,
  PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? randomBytes(32).toString('base64url'),
  LINK_TOKEN_KEYS: local.get('LINK_TOKEN_KEYS') ?? `dev:${randomBytes(32).toString('base64url')}`,
  LOCAL_PRODUCTION_BUILD: '1',
}

const child = spawn(process.execPath, [server], {
  cwd: join(root, 'engine/apps/web'),
  env,
  stdio: 'inherit',
})
child.on('exit', (code) => process.exit(code ?? 1))
