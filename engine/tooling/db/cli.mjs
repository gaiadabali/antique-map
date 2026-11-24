#!/usr/bin/env node
// Local database lifecycle (DEPLOYMENT.md §1, PLAN-V2 §4.4): one database per app per worktree.
//
//   pnpm db:fresh [--app shop|gallery] [--suffix <lane>] [--no-migrate]
//     Creates the app's database if missing (unaccent/pg_trgm included), then migrates it with
//     that app's CMS package's own `migrate` (migrate.mjs) and runs the seed hook (a no-op; the
//     seed is `pnpm data:seed [--app shop]`). --no-migrate leaves a new database empty, for a
//     schema author whose dev push fails on a database that has tables; it refuses a database
//     that already holds tables rather than leave it as is.
//
//   pnpm db:drop [--app shop|gallery] [--suffix <lane>]
//     Drops that database if it exists, terminating other connections first.
//
//   pnpm db:list [--app shop|gallery]
//     Lists the databases on the Postgres, annotated with the app and suffix each was made for;
//     with --app, only that app's.
//
// --app: `shop` is `indies_shop_<suffix>` (@engine/cms-shop); `gallery` — or no --app, today's
// behaviour — is today's app, `indies_<suffix>` (@engine/cms), until phase 25 (naming.mjs).
// --suffix defaults to DB_SUFFIX in the app's own .env.local (engine/apps/<app>/.env.local), then
// in the worktree's root .env.local (both written by `pnpm worktree`/`worktree:env`).
//
// Postgres: PG*/POSTGRES_* from the shell, else from those .env.local files. PGHOST set anywhere
// selects a native server through `psql` on PATH (transport.mjs) — the no-Docker path.
import { join } from 'node:path'

import { runMigrations } from './migrate.mjs'
import {
  APPS,
  ArgError,
  databaseName,
  parseApp,
  parseDatabaseName,
  parseSuffix,
} from './naming.mjs'
import { countTables, createDatabase, dropDatabase, listDatabases } from './psql.mjs'
import { runSeed } from './seed.mjs'
import { readEnvFile } from '../worktree/env-file.mjs'
import { topLevel } from '../worktree/git.mjs'

const USAGE = `usage:
  pnpm db:fresh [--app shop|gallery] [--suffix <lane>] [--no-migrate]
  pnpm db:drop  [--app shop|gallery] [--suffix <lane>]
  pnpm db:list  [--app shop|gallery]

  --app         shop: indies_shop_<suffix>, migrated by @engine/cms-shop;
                gallery (or none): today's app, indies_<suffix>, by @engine/cms
  --suffix      defaults to DB_SUFFIX in engine/apps/<app>/.env.local, then
                .env.local (written by \`pnpm worktree\`)
  --no-migrate  db:fresh only: leave the new database empty, for a schema
                author's dev push (PAYLOAD_DEV_PUSH=1)`

class UsageError extends Error {}

function parseArgs(argv) {
  const [command, ...rest] = argv
  const args = { command, suffix: null, app: null, migrate: true, help: false }
  while (rest.length > 0) {
    const arg = rest.shift()
    if (arg === '--no-migrate') args.migrate = false
    else if (arg === '--suffix') args.suffix = rest.shift()
    else if (arg === '--app') {
      const value = rest.shift()
      if (!value) throw new UsageError('--app needs shop or gallery')
      args.app = value
    } else if (arg === '-h' || arg === '--help') args.help = true
    else if (arg === '--brand' || arg === '--storefront') {
      throw new UsageError(`${arg} is gone: use --app shop|gallery`)
    } else throw new UsageError(`unknown option ${arg}`)
  }
  return args
}

/** The env files the tool reads, nearest first: the app's own, then the worktree's root. */
function envFiles(repoRoot, app) {
  return [
    readEnvFile(join(repoRoot, APPS[app].dir, '.env.local')),
    readEnvFile(join(repoRoot, '.env.local')),
  ]
}

/** --suffix, or DB_SUFFIX from the app's .env.local, then the root's; throws (parseSuffix) when none. */
function resolveSuffix(explicit, files) {
  if (explicit != null) return parseSuffix(explicit)
  const found = files.map((env) => env.get('DB_SUFFIX')).find((value) => value?.trim())
  return parseSuffix(found)
}

/**
 * Fills this process's environment with the Postgres keys (PG*, POSTGRES_*) the env files name and
 * the shell does not, so psql.mjs picks the transport (PGHOST: native) and the migrate child its URL.
 */
function adoptPostgresEnv(files, env = process.env) {
  for (const file of files) {
    for (const [key, value] of file) {
      if (/^(POSTGRES_|PG)[A-Z_]+$/.test(key) && value !== '') env[key] ??= value
    }
  }
}

async function fresh({ suffix, app, migrate, repoRoot, log }) {
  const database = databaseName(suffix, app)
  log(`[db] fresh ${database} (${app})`)
  createDatabase(database, { cwd: repoRoot })
  if (migrate) {
    await runMigrations({ database, repoRoot, cmsPackage: APPS[app].cms, env: process.env, log })
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

function drop({ suffix, app, repoRoot, log = console.log }) {
  const database = databaseName(suffix, app)
  dropDatabase(database, { cwd: repoRoot })
  log(`[db] dropped ${database}`)
  return database
}

function list({ app, repoRoot, log = console.log }) {
  const names = listDatabases({ cwd: repoRoot }).filter(
    (name) => app === null || parseDatabaseName(name)?.app === app,
  )
  if (names.length === 0) {
    log('(no databases)')
    return names
  }
  for (const name of names) {
    const parsed = parseDatabaseName(name)
    log(
      parsed
        ? `${name}  (app=${parsed.app} suffix=${parsed.suffix})`
        : `${name}  (not made by db:fresh)`,
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
  const app = args.app === null ? null : parseApp(args.app)
  const repoRoot = topLevel(process.cwd())
  const files = envFiles(repoRoot, app ?? parseApp(undefined))
  adoptPostgresEnv(files)

  if (args.command === 'list') {
    list({ app, repoRoot })
    return
  }
  if (args.command !== 'fresh' && args.command !== 'drop') {
    throw new UsageError(`unknown command "${args.command}"`)
  }

  const target = app ?? parseApp(undefined)
  const suffix = resolveSuffix(args.suffix, files)
  if (args.command === 'fresh') {
    await fresh({ suffix, app: target, migrate: args.migrate, repoRoot, log: console.log })
  } else {
    if (!args.migrate) throw new UsageError('--no-migrate applies to db:fresh only')
    drop({ suffix, app: target, repoRoot })
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
