// Talks to the local Postgres through `docker compose exec`, the same way
// `engine/tooling/db/psql.mjs` does (TASKS.md 2.1.b) — never a Node Postgres
// client. This is the one place that runs `pg_dump`.
import { execFileSync } from 'node:child_process'

const DEFAULT_USER = process.env.POSTGRES_USER ?? 'postgres'
const COMPOSE_FILE = process.env.DOCKER_COMPOSE_FILE ?? 'docker-compose.dev.yml'
const PROJECT = process.env.COMPOSE_PROJECT_NAME ?? 'indies-platform-dev'
const SERVICE = 'postgres'

export class DumpError extends Error {}

/** `pg_dump --schema-only` for `database`, run inside the compose stack's postgres container. */
export function dumpSchema(database, { cwd } = {}) {
  const args = [
    'compose',
    '-p',
    PROJECT,
    '-f',
    COMPOSE_FILE,
    'exec',
    '-T',
    SERVICE,
    'pg_dump',
    '--username',
    DEFAULT_USER,
    '--schema-only',
    '--no-owner',
    '--no-privileges',
    '--no-tablespaces',
    database,
  ]
  try {
    return execFileSync('docker', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message
    throw new DumpError(
      `pg_dump (via docker compose) failed for "${database}" — is the stack up and the database created? ` +
        `(\`docker compose -f ${COMPOSE_FILE} up -d\`, \`pnpm db:fresh\`)\n${detail}`,
    )
  }
}

/** Every non-template database in the running stack, sorted (`schema-hash --all`'s default set). */
export function listAllDatabases({ cwd } = {}) {
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
    '--username',
    DEFAULT_USER,
    '--dbname',
    'postgres',
    '--tuples-only',
    '--no-align',
    '--command',
    "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> 'postgres' ORDER BY 1",
  ]
  try {
    const out = execFileSync('docker', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
    return out === '' ? [] : out.split('\n')
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message
    throw new DumpError(`could not list databases — is the stack up?\n${detail}`)
  }
}
