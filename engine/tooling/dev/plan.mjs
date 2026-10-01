// What `pnpm dev --brand <slug> [--storefront <app>]` runs (TASKS.md 5.6.a, gate F1), as a pure
// plan, so it is unit-tested without starting a server (plan.test.mjs). The brand is read from
// its folder on disk (db/brands.mjs), never named here (CONVENTIONS.md §1); its config's
// `storefront` picks the app, and the child gets the brand's environment whole:
//
//   BRAND, BRAND_ROOT  the brand and its folder at the repository root
//   TEST_STOREFRONT    the storefront a brand with one config per storefront was given
//   PORT, SITE_URL     this worktree's port (.env.local, written by `pnpm worktree:env`), or
//                      --port; SITE_URL is always http://localhost:<port>, the server's own origin
//   DATABASE_URL       <brand>_<DB_SUFFIX>[_<storefront>] — the database `pnpm db:fresh` made with
//                      the same arguments — on the Postgres the db tooling talks to
//   PAYLOAD_SECRET     .env.local's, or a development placeholder (a dev server signs only dev
//                      sessions)
//
// over this process's environment and .env.local's other keys (S3_*, LINK_TOKEN_KEYS …), which
// Next would not read itself: it reads `.env*` from the app's folder, not the repository root.
// NODE_ENV, HOSTNAME and RUN_MIGRATIONS never reach `next dev` (Next sets the first; a machine
// name or loopback IP in HOSTNAME is the boot check's refusal, 5.3.d; the third is a web
// process's mark that a dev server ignores).
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { brandLayout, discoverBrands } from '../db/brands.mjs'
import { databaseUrl } from '../db/migrate.mjs'
import {
  ArgError,
  databaseName,
  parseBrandSlug,
  parseStorefront,
  parseSuffix,
} from '../db/naming.mjs'
import { withoutKeys } from '../db/pnpm.mjs'

export { ArgError }

export const DEV_PAYLOAD_SECRET = 'pnpm-dev-only-never-a-real-secret'
const WITHHELD = ['NODE_ENV', 'HOSTNAME', 'RUN_MIGRATIONS']

/** `{ brand, storefront, port, suffix, nextArgs }` from argv; everything after `--` goes to `next dev`. */
export function parseDevArgs(argv) {
  const args = {
    brand: null,
    storefront: null,
    port: null,
    suffix: null,
    nextArgs: [],
    help: false,
  }
  const rest = [...argv]
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--') {
      args.nextArgs = rest.splice(0)
    } else if (arg === '--brand') args.brand = rest.shift()
    else if (arg === '--storefront') args.storefront = rest.shift()
    else if (arg === '--port') args.port = rest.shift()
    else if (arg === '--suffix') args.suffix = rest.shift()
    else if (arg === '-h' || arg === '--help') args.help = true
    else throw new ArgError(`unknown option ${arg}`)
  }
  return args
}

function parsePort(value) {
  const text = String(value ?? '').trim()
  const port = Number(text)
  if (!/^\d+$/.test(text) || port < 1 || port > 65535) {
    throw new ArgError(
      text === ''
        ? 'no port: set PORT in .env.local (`pnpm worktree:env <phase> <lane>`) or pass --port'
        : `--port must be a TCP port, got "${text}"`,
    )
  }
  return port
}

/** The brand's config file and parsed config, with the storefront it was asked for checked. */
function brandConfig(repoRoot, brand, explicit) {
  const { single, storefronts } = brandLayout(repoRoot, brand)
  const site = join(repoRoot, brand, 'site')
  if (single) {
    const config = JSON.parse(readFileSync(join(site, 'brand.config.json'), 'utf8'))
    if (explicit != null && parseStorefront(explicit) !== config.storefront) {
      throw new ArgError(
        `--storefront "${explicit}": ${brand} has one config, whose storefront is "${config.storefront}"`,
      )
    }
    return { config, perStorefront: null }
  }
  if (storefronts.length === 0) {
    throw new ArgError(`${brand}/site has no brand.config.json and no brand.<storefront>.json`)
  }
  if (explicit == null) {
    throw new ArgError(
      `${brand} keeps one config per storefront: pass --storefront ${storefronts.join('|')}`,
    )
  }
  const storefront = parseStorefront(explicit)
  if (!storefronts.includes(storefront)) {
    throw new ArgError(
      `--storefront "${storefront}" has no ${brand}/site/brand.${storefront}.json (found: ${storefronts.join(', ')})`,
    )
  }
  const config = JSON.parse(readFileSync(join(site, `brand.${storefront}.json`), 'utf8'))
  return { config, perStorefront: storefront }
}

/**
 * `{ app, appDir, port, database, env, nextArgs }` for one dev server. `local` is .env.local's
 * map (worktree/env-file.mjs), `env` this process's environment, which wins over it.
 */
export function devPlan({ repoRoot, argv, local = new Map(), env = {} }) {
  const args = parseDevArgs(argv)
  const brand = parseBrandSlug(args.brand)
  const known = discoverBrands(repoRoot)
  if (!known.includes(brand)) {
    throw new ArgError(
      `--brand "${brand}" has no folder at the repo root (found: ${known.join(', ')})`,
    )
  }
  const { config, perStorefront } = brandConfig(repoRoot, brand, args.storefront)
  const app = String(config.storefront ?? '')
  const appDir = join(repoRoot, 'engine', 'apps', app)
  if (app === '' || !existsSync(join(appDir, 'package.json'))) {
    throw new ArgError(
      `${brand}'s config names storefront "${app}", which is no app under engine/apps/`,
    )
  }

  const merged = { ...Object.fromEntries(local), ...env }
  const port = parsePort(args.port ?? merged.PORT)
  const suffix = parseSuffix(args.suffix ?? merged.DB_SUFFIX)
  const database = databaseName(brand, suffix, perStorefront)
  const childEnv = {
    ...withoutKeys(merged, [...WITHHELD, 'TEST_STOREFRONT']),
    BRAND: brand,
    BRAND_ROOT: join(repoRoot, brand),
    ...(perStorefront ? { TEST_STOREFRONT: perStorefront } : {}),
    PORT: String(port),
    SITE_URL: `http://localhost:${port}`,
    DATABASE_URL: databaseUrl(database, merged),
    PAYLOAD_SECRET: merged.PAYLOAD_SECRET || DEV_PAYLOAD_SECRET,
  }
  return {
    brand,
    app,
    appDir,
    port,
    database,
    env: childEnv,
    nextArgs: ['dev', '--port', String(port), ...args.nextArgs],
  }
}
