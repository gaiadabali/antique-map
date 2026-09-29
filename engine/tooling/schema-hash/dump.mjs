// Talks to Postgres the same way `engine/tooling/db/psql.mjs` does (TASKS.md
// 2.1.b) — never a Node Postgres client, and through the same transport
// selection (transport.mjs, 2.3.a's follow-up): `docker compose exec`
// against the local dev stack by default, or a direct `pg_dump`/`psql` on
// PATH against PGHOST/PGPORT (CI's bare Postgres service container). This is
// the one place that runs `pg_dump`.
import { execFileSync } from 'node:child_process'

import { buildCommand } from '../db/transport.mjs'

export class DumpError extends Error {}

function stackHint() {
  if (process.env.PGHOST) {
    return `is Postgres reachable at ${process.env.PGHOST}:${process.env.PGPORT ?? '5432'}?`
  }
  const composeFile = process.env.DOCKER_COMPOSE_FILE ?? 'docker-compose.dev.yml'
  return `is the stack up? (\`docker compose -f ${composeFile} up -d\`, \`pnpm db:fresh\`)`
}

/** `pg_dump --schema-only` for `database`. */
export function dumpSchema(database, { cwd } = {}) {
  const { bin, args } = buildCommand(
    'pg_dump',
    ['--schema-only', '--no-owner', '--no-privileges', '--no-tablespaces', database],
    process.env,
  )
  try {
    return execFileSync(bin, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message
    throw new DumpError(`pg_dump failed for "${database}" — ${stackHint()}\n${detail}`)
  }
}

/** Every non-template database in the running stack, sorted (`schema-hash --all`'s default set). */
export function listAllDatabases({ cwd } = {}) {
  const { bin, args } = buildCommand(
    'psql',
    [
      '--dbname',
      'postgres',
      '--tuples-only',
      '--no-align',
      '--command',
      "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> 'postgres' ORDER BY 1",
    ],
    process.env,
  )
  try {
    const out = execFileSync(bin, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    // See the identical note in engine/tooling/db/psql.mjs's listDatabases().
    return out === '' ? [] : out.split(/\r?\n/)
  } catch (error) {
    const detail = error.stderr ? String(error.stderr).trim() : error.message
    throw new DumpError(`could not list databases — ${stackHint()}\n${detail}`)
  }
}
