// 24.2.a — an `.env.local` per app (PLAN-V2 §4.4): two apps, two databases, two ports per
// worktree. Next reads each app's own folder's `.env.local`, never the repo root's, so each app
// gets a file of its own with its PORT, its DATABASE_URL and its hosts, and secrets generated here
// on this machine — never copied from another file, never printed.
//
//   gallery  engine/apps/web/.env.local   today's app (both sites until phase 26), indies_<suffix>
//   shop     engine/apps/shop/.env.local  the shop app, indies_shop_<suffix>, SITE_HOSTS only
//
// Plain keys (PORT, DB_SUFFIX, DATABASE_URL, hosts) follow env-file.mjs's rules: an existing value
// that differs is kept unless forced. A secret is added when absent or blank and never replaced,
// not even by --force: it signs or seals what the app's database already holds.
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { databaseUrl } from '../db/migrate.mjs'
import { APPS, databaseName } from '../db/naming.mjs'
import { readEnvFile, writeEnvFile } from './env-file.mjs'
import { ensureLinkTokenKeys, ensureOrderLinkKey } from './link-keys.mjs'
import { ensureLocalProductionBuild } from './local-build.mjs'

/** The local hosts each app answers on (`*.localhost` resolves to loopback). */
export const LOCAL_HOSTS = Object.freeze({ gallery: 'gallery.localhost', shop: 'shop.localhost' })

const HEADER = [
  "# This app's local settings (gitignored), written by `pnpm worktree:env`: its PORT,",
  '# database and hosts, and dev secrets generated on this machine. Add other values by',
  '# hand (S3_*, SMTP_* — without them uploads go to local disk and mail to the console);',
  '# never commit this file.',
]

/** Postgres keys, the shell's over the worktree root file's — what DATABASE_URL is built from. */
export function postgresEnv(rootEnv, shellEnv = process.env) {
  const keys = (map) => [...map].filter(([key]) => /^(POSTGRES_|PG)[A-Z_]+$/.test(key))
  const fromShell = Object.entries(shellEnv).filter(([key]) => /^(POSTGRES_|PG)[A-Z_]+$/.test(key))
  return { ...Object.fromEntries(keys(rootEnv)), ...Object.fromEntries(fromShell) }
}

/**
 * The plain (non-secret) keys each app's file wants: `{ gallery: { file, wanted }, shop: … }`.
 * Pure. `ports` is `allocateAppPorts()`'s answer, `pg` `postgresEnv()`'s.
 */
export function appEnvPlan({ suffix, ports, pg }) {
  const common = (app) => ({
    PORT: String(ports[app]),
    DB_SUFFIX: suffix,
    DATABASE_URL: databaseUrl(databaseName(suffix, app), pg),
  })
  return {
    gallery: {
      file: join(APPS.gallery.dir, '.env.local'),
      wanted: {
        ...common('gallery'),
        // Today's app serves both sites until phase 26: the two-site lists.
        GALLERY_HOSTS: LOCAL_HOSTS.gallery,
        SHOP_HOSTS: LOCAL_HOSTS.shop,
      },
    },
    shop: {
      file: join(APPS.shop.dir, '.env.local'),
      wanted: {
        ...common('shop'),
        // One app, one site: its own hosts, and the gallery's origin for the sister link.
        SITE_HOSTS: LOCAL_HOSTS.shop,
        GALLERY_ORIGIN: `http://${LOCAL_HOSTS.gallery}:${ports.gallery}`,
      },
    },
  }
}

/** A secret of `bytes` random bytes, base64url: long enough for every STRONG rule (boot-check). */
function secret(bytes = 32, random = randomBytes) {
  return Buffer.from(random(bytes)).toString('base64url')
}

/** Adds `name` with a generated value when the file has none (absent or blank). 'added' | 'kept'. */
export function ensureSecret(path, name, generate) {
  const existing = readEnvFile(path).get(name)
  if (existing !== undefined && existing.trim() !== '') return 'kept'
  writeEnvFile(path, { [name]: generate() }, { force: true })
  return 'added'
}

/** The generated secrets each app's file gets, by name; each outcome is logged, no value ever. */
export function ensureAppSecrets(path, random = randomBytes) {
  return {
    PAYLOAD_SECRET: ensureSecret(path, 'PAYLOAD_SECRET', () => secret(32, random)),
    BAG_COOKIE_KEY: ensureSecret(path, 'BAG_COOKIE_KEY', () => secret(32, random)),
    ORDER_LINK_KEY: ensureOrderLinkKey(path, random),
    LINK_TOKEN_KEYS: ensureLinkTokenKeys(path, random),
    LOCAL_PRODUCTION_BUILD: ensureLocalProductionBuild(path),
  }
}

/** What reaches the log for a plain key: DATABASE_URL by its database only (it carries a password). */
export function loggable(key, value) {
  if (key !== 'DATABASE_URL') return value
  return `…/${new URL(value).pathname.slice(1)}`
}

/**
 * Writes each app's file under `root` (the worktree, or a scratch folder to look before writing).
 * Returns `{ gallery: { file, outcome }, shop: … }`.
 */
export function writeAppEnvs({ root, plan, force = false, log = console.log }) {
  const result = {}
  for (const [app, { file, wanted }] of Object.entries(plan)) {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    const outcome = writeEnvFile(path, wanted, { force, header: HEADER })
    log(`${path}  (${app})`)
    for (const [key, value] of Object.entries(wanted)) {
      const note =
        outcome[key] === 'kept' ? ' (existing value differs, kept; --force overwrites)' : ''
      log(`  ${key}=${loggable(key, value)}  ${outcome[key]}${note}`)
    }
    const secrets = ensureAppSecrets(path)
    for (const [key, what] of Object.entries(secrets)) {
      log(
        `  ${key}=…  ${what}${what === 'kept' ? ' (an existing value is never overwritten)' : ''}`,
      )
    }
    result[app] = { file: path, outcome: { ...outcome, ...secrets } }
  }
  return result
}
