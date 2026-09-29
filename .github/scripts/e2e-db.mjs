#!/usr/bin/env node
/* global process, console */
// `.github/**` isn't in eslint.config.mjs's "node scripts and tooling" globs
// (engine/tooling/**, scripts/**, root-level *.{js,mjs,cjs}) — reported to
// the orchestrator to extend there; declared per-file here instead, since
// this task owns .github/** only, not the shared eslint config.
//
// CI-only companion to `pnpm db:fresh` / `pnpm schema-hash --all` (TASKS.md
// 2.3.a, 2.1.d's CI clause). It is NOT a third implementation: it imports the
// same pure logic those tools use (naming, the migrate/seed hooks,
// schema-hash's normaliser) and only replaces *how a query reaches Postgres*.
//
// Why this file exists at all: `engine/tooling/db/psql.mjs` and
// `engine/tooling/schema-hash/dump.mjs` (2.1.b, 2.2.c — not owned by this
// task) both shell out through `docker compose exec postgres …` unconditionally.
// That is correct for a laptop, where `docker-compose.dev.yml` is the running
// stack, but this job's Postgres is a bare GitHub Actions `services:`
// container — there is no compose project for `docker compose exec` to find,
// so `pnpm db:fresh` and `pnpm schema-hash --all` both fail outright here.
// Reported to the orchestrator (see the task report) with the minimal fix
// proposed: teach `psql.mjs`/`dump.mjs` a direct-connection transport
// (`PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`, or a `DOCKER_COMPOSE_FILE=`
// opt-out) so CI can call the real scripts unmodified. Until that lands,
// this script is the equivalent sequence: same database names, same
// migrate/seed no-ops, same schema-hash comparison, a `docker run
// postgres:18.0 psql|pg_dump --network host` transport instead of
// `docker compose exec`.
import { execFileSync } from 'node:child_process'

import { databaseName } from '../../engine/tooling/db/naming.mjs'
import { runMigrations } from '../../engine/tooling/db/migrate.mjs'
import { runSeed } from '../../engine/tooling/db/seed.mjs'
import { normalizeSchema, sha256 } from '../../engine/tooling/schema-hash/schema-hash.mjs'

// The four databases 2.3.a names: `ig`, `oei`, and the synthetic `test`
// brand's two storefront configs (CONVENTIONS.md §1) — same brand slug,
// two suffixes, so they never collide (naming.mjs).
const TARGETS = [
  { brand: 'indies-gallery', suffix: 'ci' },
  { brand: 'old-east-indies', suffix: 'ci' },
  { brand: 'test', suffix: 'ci_gallery' },
  { brand: 'test', suffix: 'ci_emporium' },
]

const PG_IMAGE = 'postgres:18.0' // pinned identically to docker-compose.dev.yml
const PGUSER = process.env.POSTGRES_USER ?? 'postgres'
const PGPASSWORD = process.env.POSTGRES_PASSWORD ?? 'postgres'
const PGHOST = process.env.POSTGRES_HOST ?? '127.0.0.1'
const PGPORT = process.env.POSTGRES_PORT ?? '5432'

function dockerRun(args) {
  return execFileSync(
    'docker',
    ['run', '--rm', '--network', 'host', '-e', `PGPASSWORD=${PGPASSWORD}`, PG_IMAGE, ...args],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
  )
}

function psql(database, sql) {
  return dockerRun([
    'psql',
    '-h',
    PGHOST,
    '-p',
    PGPORT,
    '-U',
    PGUSER,
    '-d',
    database,
    '-v',
    'ON_ERROR_STOP=1',
    '--tuples-only',
    '--no-align',
    '--command',
    sql,
  ]).trim()
}

function createDatabase(database) {
  const exists = psql('postgres', `SELECT 1 FROM pg_database WHERE datname = '${database}'`) === '1'
  if (!exists) psql('postgres', `CREATE DATABASE "${database}"`)
  psql(database, 'CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;')
}

function dumpSchema(database) {
  return dockerRun([
    'pg_dump',
    '-h',
    PGHOST,
    '-p',
    PGPORT,
    '-U',
    PGUSER,
    '--schema-only',
    '--no-owner',
    '--no-privileges',
    '--no-tablespaces',
    database,
  ])
}

console.log(
  `[e2e-db] creating ${TARGETS.length} database(s) directly (docker compose exec is unreachable — see this file's header)`,
)

const databases = []
for (const { brand, suffix } of TARGETS) {
  const database = databaseName(brand, suffix)
  console.log(`[e2e-db] fresh ${database}`)
  createDatabase(database)
  await runMigrations({ database, brand })
  await runSeed({ database, brand })
  databases.push(database)
}

// schema-hash --all's own comparison (2.2.c), reusing its exact normaliser
// and hash function — only `dumpSchema` above differs from dump.mjs.
const hashes = databases.map((database) => ({
  database,
  hash: sha256(normalizeSchema(dumpSchema(database))),
}))
for (const { database, hash } of hashes) console.log(`${database}  ${hash}`)

const distinct = new Set(hashes.map((h) => h.hash))
if (distinct.size > 1) {
  console.error(`[e2e-db] schema-hash: drift across ${hashes.length} database(s)`)
  process.exit(1)
}
console.log(`[e2e-db] schema-hash: ok, ${hashes.length} database(s) share one schema`)
