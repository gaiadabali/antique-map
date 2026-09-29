// Talks to the local Postgres through `docker compose exec`, never a Node
// Postgres client — DEVOPS is told to prefer shelling to
// `docker compose exec postgres psql` over adding a dependency, and this is
// the one place that does it (TASKS.md 2.1.b).
import { execFileSync } from 'node:child_process'

const DEFAULT_USER = process.env.POSTGRES_USER ?? 'postgres'
const COMPOSE_FILE = process.env.DOCKER_COMPOSE_FILE ?? 'docker-compose.dev.yml'
// Matches docker-compose.dev.yml's top-level `name:` — pinned so every
// worktree's `docker compose` reaches the one shared stack regardless of
// which directory it runs from (a project name otherwise defaults to the
// current directory's name, which is different in every worktree).
const PROJECT = process.env.COMPOSE_PROJECT_NAME ?? 'indies-platform-dev'
const SERVICE = 'postgres'

export class PsqlError extends Error {}

/** Runs one SQL statement against `database` as the superuser and returns trimmed stdout. Rejects with the container's stderr on failure — never swallowed, so a stopped stack fails loudly rather than looking like an empty result. */
export function psql(database, sql, { cwd } = {}) {
  const args = [
    'compose',
    '-p',
    PROJECT,
    '-f',
    COMPOSE_FILE,
    'exec',
    '-T',
    SERVICE,
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '--username',
    DEFAULT_USER,
    '--dbname',
    database,
    '--tuples-only',
    '--no-align',
    '--command',
    sql,
  ]
  try {
    return execFileSync('docker', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message
    throw new PsqlError(
      `postgres (via docker compose) rejected the query — is the stack up? ` +
        `(\`docker compose -f ${COMPOSE_FILE} up -d\`)\n${detail}`,
    )
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
  return out === '' ? [] : out.split('\n')
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
