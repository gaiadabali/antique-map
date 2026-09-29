// Talks to Postgres through `psql` — never a Node Postgres client (DEVOPS is
// told to prefer shelling to `psql` over adding a dependency, TASKS.md
// 2.1.b). Two transports, chosen by environment (transport.mjs, 2.3.a's
// follow-up): `docker compose exec` against the local dev stack by default,
// or a direct `psql` on PATH against PGHOST/PGPORT — CI's Postgres is a bare
// service container with no compose project for `exec` to reach.
import { execFileSync } from 'node:child_process'

import { buildCommand, resolveTransport } from './transport.mjs'

export class PsqlError extends Error {}

/** Runs one SQL statement against `database` as the superuser and returns trimmed stdout. Rejects with the failure's stderr on failure — never swallowed, so an unreachable Postgres fails loudly rather than looking like an empty result. */
export function psql(database, sql, { cwd } = {}) {
  const { bin, args } = buildCommand(
    'psql',
    [
      '-v',
      'ON_ERROR_STOP=1',
      '--dbname',
      database,
      '--tuples-only',
      '--no-align',
      '--command',
      sql,
    ],
    process.env,
  )
  try {
    return execFileSync(bin, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message
    const hint =
      resolveTransport(process.env) === 'direct'
        ? `is Postgres reachable at ${process.env.PGHOST}:${process.env.PGPORT ?? '5432'}?`
        : `is the stack up? (\`docker compose -f ${process.env.DOCKER_COMPOSE_FILE ?? 'docker-compose.dev.yml'} up -d\`)`
    throw new PsqlError(`postgres rejected the query — ${hint}\n${detail}`)
  }
}

/** True when `database` already exists. */
export function databaseExists(database, opts) {
  const row = psql(
    'postgres',
    `SELECT 1 FROM pg_database WHERE datname = '${escape(database)}'`,
    opts,
  )
  return row === '1'
}

/** Every non-template, non-administrative database name, sorted. */
export function listDatabases(opts) {
  const out = psql(
    'postgres',
    "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> 'postgres' ORDER BY 1",
    opts,
  )
  // `\r\n` under the direct transport with a native Windows `psql` client
  // (found running this against one locally) — `docker compose exec`'s
  // Linux `psql` never emits `\r`, but splitting on `\r?\n` costs nothing
  // there and keeps a database name from silently carrying a stray `\r`.
  return out === '' ? [] : out.split(/\r?\n/)
}

/** Creates `database` if it does not exist (idempotent — `db:fresh` is safe to re-run). New databases inherit `unaccent`/`pg_trgm` from `template1` (init script, 2.1.a); this re-asserts both so a database created against a different template still has them. */
export function createDatabase(database, opts) {
  if (!databaseExists(database, opts)) {
    psql('postgres', `CREATE DATABASE "${escapeIdentifier(database)}"`, opts)
  }
  psql(
    database,
    'CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS pg_trgm;',
    opts,
  )
}

/** Drops `database` if it exists, terminating other connections first (a lingering session otherwise blocks `DROP DATABASE`). */
export function dropDatabase(database, opts) {
  if (!databaseExists(database, opts)) return
  psql(
    'postgres',
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${escape(database)}' AND pid <> pg_backend_pid()`,
    opts,
  )
  psql('postgres', `DROP DATABASE IF EXISTS "${escapeIdentifier(database)}"`, opts)
}

function escape(value) {
  return value.replace(/'/g, "''")
}

function escapeIdentifier(value) {
  // Both naming.mjs's SUFFIX_PATTERN/SLUG_PATTERN already forbid `"` and
  // whitespace, so this only ever fires on a name that bypassed validation.
  if (/["\s;]/.test(value)) throw new PsqlError(`unsafe database name "${value}"`)
  return value
}
