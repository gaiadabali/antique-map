#!/usr/bin/env node
// Local database lifecycle (TASKS.md 2.1.b, DEPLOYMENT.md §1).
//
//   pnpm db:fresh --brand <slug> [--suffix <lane>]
//     Creates <brand>_<suffix> if missing (unaccent/pg_trgm included, 2.1.a),
//     then runs the migrate and seed hooks (no-ops until 3.2 / 10.2).
//
//   pnpm db:drop --brand <slug> [--suffix <lane>]
//     Drops <brand>_<suffix> if it exists, terminating other connections first.
//
//   pnpm db:list
//     Lists every lane database on the shared Postgres, annotated with the
//     (brand, suffix) pair it was created for.
//
// --suffix defaults to DB_SUFFIX in this worktree's .env.local (written by
// `pnpm worktree`/`worktree:env`, TASKS.md 1.3); outside a worktree it must be
// passed explicitly. --brand is always required and is checked against the
// brand folders actually on disk (brands.mjs) — never a hard-coded list.
import { discoverBrands } from './brands.mjs'
import {
  ArgError,
  databaseName,
  parseBrandSlug,
  parseDatabaseName,
  parseSuffix,
} from './naming.mjs'
import { runMigrations } from './migrate.mjs'
import { createDatabase, dropDatabase, listDatabases } from './psql.mjs'
import { runSeed } from './seed.mjs'
import { readEnvFile } from '../worktree/env-file.mjs'
import { topLevel } from '../worktree/git.mjs'

const USAGE = `usage:
  pnpm db:fresh --brand <slug> [--suffix <lane>]
  pnpm db:drop  --brand <slug> [--suffix <lane>]
  pnpm db:list

  --brand   a brand folder's slug at the repo root (e.g. test, indies-gallery)
  --suffix  defaults to DB_SUFFIX in .env.local (written by \`pnpm worktree\`)`

class UsageError extends Error {}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = { command, brand: null, suffix: null, help: false }
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--brand') args.brand = rest.shift()
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

async function fresh({ brand, suffix, repoRoot, log = console.log }) {
  const database = databaseName(brand, suffix)
  log(`[db] fresh ${database}`)
  createDatabase(database, { cwd: repoRoot })
  await runMigrations({ database, brand, log })
  await runSeed({ database, brand, log })
  log(`[db] ${database} ready`)
  return database
}

function drop({ brand, suffix, repoRoot, log = console.log }) {
  const database = databaseName(brand, suffix)
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
  for (const name of names) {
    const parsed = parseDatabaseName(name, brands)
    log(
      parsed
        ? `${name}  (brand=${parsed.brand} suffix=${parsed.suffix})`
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
  const suffix = resolveSuffix(args.suffix, repoRoot)
  if (args.command === 'fresh') await fresh({ brand, suffix, repoRoot })
  else drop({ brand, suffix, repoRoot })
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
