/**
 * Environment for the shop fulfilment gate (TASKS.md 7.4.a), the same shape `tests/e2e/shop/gate.spec.ts`
 * reads: `E2E_BASE_URL` (a full origin) switches every page and API call to staging; unset, it runs
 * against this worktree's own production build on `E2E_PORT`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

type EnvMap = Map<string, string>

function readEnvFile(path: string): EnvMap {
  if (!existsSync(path)) return new Map()
  const values: EnvMap = new Map()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (/^\s*#/.test(line)) continue
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (match) values.set(match[1]!, match[2]!.replace(/^(['"])(.*)\1$/, '$2'))
  }
  return values
}

const LOCAL_ENV = readEnvFile(join(root, '.env.local'))
export const envVar = (key: string): string | undefined => process.env[key] ?? LOCAL_ENV.get(key)

export const PORT = process.env.E2E_PORT ?? envVar('PORT') ?? '4200'
const STAGING_ORIGIN = process.env.E2E_BASE_URL?.replace(/\/$/, '') ?? null
export const SHOP_ORIGIN = STAGING_ORIGIN ?? `http://shop.localhost:${PORT}`
export const API_BASE = STAGING_ORIGIN ?? `http://127.0.0.1:${PORT}`
export const HOST_HEADER = STAGING_ORIGIN ? {} : { Host: `shop.localhost:${PORT}` }

/** Local-only: the e2e gate makes its own fixtures and reads the database directly. */
export const GATE_DB = (process.env.GATE_DB ?? envVar('GATE_DB')) === 'local'
export const MAILPIT_URL =
  process.env.MAILPIT_URL ?? envVar('MAILPIT_URL') ?? 'http://localhost:8025'
export const CRON_SECRET =
  process.env.CRON_SECRET ?? envVar('CRON_SECRET') ?? 'dev-only-not-a-secret'
export const SHOTS = process.env.GATE_SHOTS ?? 'docs/gates/shop'

function parsePin(text: string): { readonly lat: number; readonly lng: number } {
  const [lat, lng] = text.split(',').map(Number)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`E2E_PIN must be "lat,lng": got "${text}"`)
  }
  return { lat: lat!, lng: lng! }
}

/** Denpasar, the pin picker's own default centre — the same default `gate.spec.ts` drives on. */
export const PIN = parsePin(process.env.E2E_PIN ?? '-8.6705,115.2126')

export function localDatabaseUrl(): string {
  const suffix = envVar('DB_SUFFIX')
  const url =
    process.env.E2E_DATABASE_URL ??
    (suffix ? `postgres://postgres:postgres@127.0.0.1:5432/indies_${suffix}` : undefined)
  if (!url)
    throw new Error('GATE_DB=local needs DB_SUFFIX (`pnpm worktree:env`) or E2E_DATABASE_URL.')
  return url
}

export const ROOT = root
