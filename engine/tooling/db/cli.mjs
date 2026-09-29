#!/usr/bin/env node
// Local database lifecycle (TASKS.md 2.1.b, 3.5.c, DEPLOYMENT.md §1).
//
//   pnpm db:fresh --brand <slug> [--storefront <app>] [--suffix <lane>] [--no-migrate]
//     Creates <brand>_<suffix> if missing (unaccent/pg_trgm included, 2.1.a),
//     then migrates it with the CMS package's own `migrate` (migrate.mjs, 3.5.c)
//     and runs the seed hook (a no-op until 10.2). A brand with one config per
//     storefront (site/brand.<storefront>.json — the synthetic brand) may name
//     one: its database is then <brand>_<suffix>_<storefront>, migrated as that
//     storefront's process runs (TEST_STOREFRONT=<storefront>). Named none, it
//     is <brand>_<suffix> as before, migrated with BRAND unset — the schema is
//     the same either way (ARCHITECTURE.md §2); CI's e2e job still calls it so.
//     --no-migrate leaves a new database empty, for a schema author whose dev
//     push fails on a database that has tables (PARALLEL-TRACKS.md §3.2); it
//     refuses a database that already holds tables rather than leave it as is.
//
//   pnpm db:drop --brand <slug> [--storefront <app>] [--suffix <lane>]
//     Drops that database if it exists, terminating other connections first.
//
//   pnpm db:list
//     Lists every lane database on the shared Postgres, annotated with the
//     (brand, storefront, suffix) it was created for.
//
// --suffix defaults to DB_SUFFIX in this worktree's .env.local (written by
// `pnpm worktree`/`worktree:env`, TASKS.md 1.3); outside a worktree it must be
// passed explicitly. --brand is always required and is checked against the
// brand folders actually on disk (brands.mjs) — never a hard-coded list.
import { brandLayout, discoverBrands } from './brands.mjs'
import { runMigrations } from './migrate.mjs'
import {
  ArgError,
  databaseName,
  parseBrandSlug,
  parseDatabaseName,
  parseStorefront,
  parseSuffix,
} from './naming.mjs'
import { countTables, createDatabase, dropDatabase, listDatabases } from './psql.mjs'
import { runSeed } from './seed.mjs'
import { readEnvFile } from '../worktree/env-file.mjs'
import { topLevel } from '../worktree/git.mjs'

const USAGE = `usage:
  pnpm db:fresh --brand <slug> [--storefront <app>] [--suffix <lane>] [--no-migrate]
  pnpm db:drop  --brand <slug> [--storefront <app>] [--suffix <lane>]
  pnpm db:list

  --brand       a brand folder's slug at the repo root (e.g. test, fixture-atlas)
  --storefront  for a brand with one config per storefront
                (site/brand.<storefront>.json) only; refused for any other
  --suffix      defaults to DB_SUFFIX in .env.local (written by \`pnpm worktree\`)
  --no-migrate  db:fresh only: leave the new database empty, for a schema
                author's dev push (PAYLOAD_DEV_PUSH=1, PARALLEL-TRACKS.md §3.2)`

class UsageError extends Error {}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = {
    command,
    brand: null,
    storefront: null,
    suffix: null,
    migrate: true,
    help: false,
  }
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--brand') args.brand = rest.shift()
    else if (arg === '--storefront') args.storefront = rest.shift()
    else if (arg === '--no-migrate') args.migrate = false
    else if (arg === '--suffix') args.suffix = rest.shift()
    else if (arg === '-h' || arg === '--help') args.help = true
    else throw new UsageError(`unknown option ${arg}`)
  }
  return args
}

/** --suffix, or DB_SUFFIX from this worktree's .env.local; throws (via parseSuffix) when neither is set. */
function resolveSuffix(explicit, repoRoot) {
  if (explicit != null) return parseSuffix(explicit)
  const env = readEnvFile(`${repoRoot}/.env.local`)
  return parseSuffix(env.get('DB_SUFFIX'))
}

function resolveBrand(explicit, repoRoot) {
  const brand = parseBrandSlug(explicit)
  const known = discoverBrands(repoRoot)
  if (known.length > 0 && !known.includes(brand)) {
    throw new ArgError(
      `--brand "${brand}" has no folder at the repo root (found: ${known.join(', ')})`,
    )
  }
  return brand
}

/**
 * --storefront, checked against the brand folder (brandLayout): one of the
 * brand's own storefronts, or omitted; refused for a brand with one config.
 * `{ storefront, brandless }` — `brandless` when a per-storefront brand names
 * none, so the migrate hook runs with BRAND unset (no config to choose).
 */
function resolveStorefront(brand, explicit, repoRoot) {
  const { single, storefronts } = brandLayout(repoRoot, brand)
  if (single) {
    if (explicit == null) return { storefront: null, brandless: false }
    throw new ArgError(
      `--storefront applies only to a brand with one config per storefront; ${brand} has site/brand.config.json`,
    )
  }
  if (storefronts.length === 0) {
    throw new ArgError(`${brand}/site has no brand.config.json and no brand.<storefront>.json`)
  }
  if (explicit == null) return { storefront: null, brandless: true }
  const storefront = parseStorefront(explicit)
  if (!storefronts.includes(storefront)) {
    throw new ArgError(
      `--storefront "${storefront}" has no ${brand}/site/brand.${storefront}.json (found: ${storefronts.join(', ')})`,
    )
  }
  return { storefront, brandless: false }
}

/** What the migrate hook reads to reach Postgres: this process's env over .env.local's POSTGRES_ and PG keys. */
function toolEnv(repoRoot) {
  const local = readEnvFile(`${repoRoot}/.env.local`)
  const postgres = [...local].filter(([key]) => /^(POSTGRES_|PG)[A-Z_]+$/.test(key))
  return { ...Object.fromEntries(postgres), ...process.env }
}

async function fresh({ brand, storefront, brandless, suffix, migrate, repoRoot, log }) {
  const database = databaseName(brand, suffix, storefront)
  log(`[db] fresh ${database}`)
  createDatabase(database, { cwd: repoRoot })
  if (migrate) {
    const env = toolEnv(repoRoot)
    await runMigrations({ database, brand, storefront, brandless, repoRoot, env, log })
  } else {
    const tables = countTables(database, { cwd: repoRoot })
    if (tables > 0) {
      throw new ArgError(
        `--no-migrate wants an empty database, and ${database} already holds ${tables} table(s): db:drop it first`,
      )
    }
    log(`[db] migrate ${database}: skipped (--no-migrate) — empty, for a schema author's dev push`)
  }
  await runSeed({ database, brand, log })
  log(`[db] ${database} ready`)
  return database
}

function drop({ brand, storefront, suffix, repoRoot, log = console.log }) {
  const database = databaseName(brand, suffix, storefront)
  dropDatabase(database, { cwd: repoRoot })
  log(`[db] dropped ${database}`)
  return database
}

function list({ repoRoot, log = console.log }) {
  const brands = discoverBrands(repoRoot)
  const names = listDatabases({ cwd: repoRoot })
  if (names.length === 0) {
    log('(no lane databases)')
    return names
  }
  const storefrontsOf = (brand) => brandLayout(repoRoot, brand).storefronts
  for (const name of names) {
    const parsed = parseDatabaseName(name, brands, storefrontsOf)
    const storefront = parsed?.storefront ? ` storefront=${parsed.storefront}` : ''
    log(
      parsed
        ? `${name}  (brand=${parsed.brand}${storefront} suffix=${parsed.suffix})`
        : `${name}  (unrecognised name)`,
    )
  }
  return names
}

async function main(argv) {
  const args = parseArgs(argv)
  if (args.help || !args.command) {
    console.log(USAGE)
    return
  }
  const repoRoot = topLevel(process.cwd())

  if (args.command === 'list') {
    list({ repoRoot })
    return
  }
  if (args.command !== 'fresh' && args.command !== 'drop') {
    throw new UsageError(`unknown command "${args.command}"`)
  }

  const brand = resolveBrand(args.brand, repoRoot)
  const { storefront, brandless } = resolveStorefront(brand, args.storefront, repoRoot)
  const suffix = resolveSuffix(args.suffix, repoRoot)
  if (args.command === 'fresh') {
    const { migrate } = args
    await fresh({ brand, storefront, brandless, suffix, migrate, repoRoot, log: console.log })
  } else {
    if (!args.migrate) throw new UsageError('--no-migrate applies to db:fresh only')
    drop({ brand, storefront, suffix, repoRoot })
  }
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  console.error(`db: ${error.message}`)
  if (error instanceof UsageError) {
    console.error(USAGE)
    process.exitCode = 2
  } else {
    process.exitCode = 1
  }
}
