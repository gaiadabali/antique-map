#!/usr/bin/env node
// Local database lifecycle (DEPLOYMENT.md §1): one app, one database per worktree.
//
//   pnpm db:fresh [--suffix <lane>] [--no-migrate]
//     Creates indies_<suffix> if missing (unaccent/pg_trgm included), then migrates it with the
//     CMS package's own `migrate` (migrate.mjs) and runs the seed hook (a no-op until seeding
//     lands). --no-migrate leaves a new database empty, for a schema author whose dev push fails
//     on a database that has tables; it refuses a database that already holds tables rather than
//     leave it as is.
//
//   pnpm db:drop [--suffix <lane>]
//     Drops that database if it exists, terminating other connections first.
//
//   pnpm db:list
//     Lists every database on the shared Postgres, annotated with the suffix it was made for.
//
// --suffix defaults to DB_SUFFIX in this worktree's .env.local (written by
// `pnpm worktree`/`worktree:env`); outside a worktree it must be passed explicitly.
import { runMigrations } from './migrate.mjs'
import { ArgError, databaseName, parseDatabaseName, parseSuffix } from './naming.mjs'
import { countTables, createDatabase, dropDatabase, listDatabases } from './psql.mjs'
import { runSeed } from './seed.mjs'
import { readEnvFile } from '../worktree/env-file.mjs'
import { topLevel } from '../worktree/git.mjs'

const USAGE = `usage:
  pnpm db:fresh [--suffix <lane>] [--no-migrate]
  pnpm db:drop  [--suffix <lane>]
  pnpm db:list

  --suffix      defaults to DB_SUFFIX in .env.local (written by \`pnpm worktree\`);
                the database is indies_<suffix>
  --no-migrate  db:fresh only: leave the new database empty, for a schema
                author's dev push (PAYLOAD_DEV_PUSH=1)`

class UsageError extends Error {}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = { command, suffix: null, migrate: true, help: false }
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--no-migrate') args.migrate = false
    else if (arg === '--suffix') args.suffix = rest.shift()
    else if (arg === '-h' || arg === '--help') args.help = true
    else if (arg === '--brand' || arg === '--storefront') {
      throw new UsageError(`${arg} is gone: there is one database per worktree, indies_<suffix>`)
    } else throw new UsageError(`unknown option ${arg}`)
  }
  return args
}

/** --suffix, or DB_SUFFIX from this worktree's .env.local; throws (via parseSuffix) when neither is set. */
function resolveSuffix(explicit, repoRoot) {
  if (explicit != null) return parseSuffix(explicit)
  const env = readEnvFile(`${repoRoot}/.env.local`)
  return parseSuffix(env.get('DB_SUFFIX'))
}

/** What the migrate hook reads to reach Postgres: this process's env over .env.local's POSTGRES_ and PG keys. */
function toolEnv(repoRoot) {
  const local = readEnvFile(`${repoRoot}/.env.local`)
  const postgres = [...local].filter(([key]) => /^(POSTGRES_|PG)[A-Z_]+$/.test(key))
  return { ...Object.fromEntries(postgres), ...process.env }
}

async function fresh({ suffix, migrate, repoRoot, log }) {
  const database = databaseName(suffix)
  log(`[db] fresh ${database}`)
  createDatabase(database, { cwd: repoRoot })
  if (migrate) {
    await runMigrations({ database, repoRoot, env: toolEnv(repoRoot), log })
  } else {
    const tables = countTables(database, { cwd: repoRoot })
    if (tables > 0) {
      throw new ArgError(
        `--no-migrate wants an empty database, and ${database} already holds ${tables} table(s): db:drop it first`,
      )
    }
    log(`[db] migrate ${database}: skipped (--no-migrate) — empty, for a schema author's dev push`)
  }
  await runSeed({ database, log })
  log(`[db] ${database} ready`)
  return database
}

function drop({ suffix, repoRoot, log = console.log }) {
  const database = databaseName(suffix)
  dropDatabase(database, { cwd: repoRoot })
  log(`[db] dropped ${database}`)
  return database
}

function list({ repoRoot, log = console.log }) {
  const names = listDatabases({ cwd: repoRoot })
  if (names.length === 0) {
    log('(no databases)')
    return names
  }
  for (const name of names) {
    const parsed = parseDatabaseName(name)
    log(parsed ? `${name}  (suffix=${parsed.suffix})` : `${name}  (not made by db:fresh)`)
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

  const suffix = resolveSuffix(args.suffix, repoRoot)
  if (args.command === 'fresh') {
    await fresh({ suffix, migrate: args.migrate, repoRoot, log: console.log })
  } else {
    if (!args.migrate) throw new UsageError('--no-migrate applies to db:fresh only')
    drop({ suffix, repoRoot })
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
