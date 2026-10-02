// How `psql.mjs` reaches Postgres (TASKS.md 2.1.b,
// 2.2.c, 2.3.a's follow-up). Two transports, chosen by environment, never by
// an argument a caller has to know to pass:
//
//   compose (default) — `docker compose exec` against the local dev stack
//   (docker-compose.dev.yml), matching `indies-platform-dev`'s project name
//   so every worktree reaches the one shared Postgres regardless of which
//   directory it runs from.
//
//   direct — plain `psql`/`pg_dump` on PATH, talking to PGHOST/PGPORT
//   directly. Selected whenever PGHOST is set, or PG_TRANSPORT=direct is
//   forced explicitly. CI's e2e job's Postgres is a bare GitHub Actions
//   `services:` container: there is no compose project for `exec` to find,
//   only a plain server on a host/port (TASKS.md 2.3.a's e2e job).
//
// PGPASSWORD is read by `psql`/`pg_dump` themselves from the environment —
// never placed on a command line or logged (CONVENTIONS.md §13).
//
// Pure: builds argv only, so transport selection is unit-tested
// (transport.test.mjs) without Docker or Postgres running.
const COMPOSE_FILE_DEFAULT = 'docker-compose.dev.yml'
const PROJECT_DEFAULT = 'indies-platform-dev'
const SERVICE = 'postgres'

/** 'direct' when PGHOST is set or PG_TRANSPORT is forced to it; 'compose' otherwise (today's unchanged default). Takes `env` explicitly so callers (and tests) never read `process.env` themselves. */
export function resolveTransport(env) {
  if (env.PG_TRANSPORT === 'direct') return 'direct'
  if (env.PG_TRANSPORT === 'compose') return 'compose'
  return env.PGHOST ? 'direct' : 'compose'
}

/**
 * `{ bin, args }` to run `binary` ('psql' | 'pg_dump') with `binArgs`
 * appended after the connection flags this function adds (`--username`,
 * plus `-h`/`-p` under the direct transport). `binArgs` carries everything
 * transport-independent: `-v ON_ERROR_STOP=1`, `--dbname`, `--command`,
 * `--schema-only`, a positional database name, and so on — callers never
 * branch on transport themselves.
 */
export function buildCommand(binary, binArgs, env) {
  const user = env.POSTGRES_USER ?? 'postgres'
  if (resolveTransport(env) === 'direct') {
    const host = env.PGHOST ?? '127.0.0.1'
    const port = env.PGPORT ?? '5432'
    return { bin: binary, args: ['-h', host, '-p', port, '--username', user, ...binArgs] }
  }
  const composeFile = env.DOCKER_COMPOSE_FILE ?? COMPOSE_FILE_DEFAULT
  const project = env.COMPOSE_PROJECT_NAME ?? PROJECT_DEFAULT
  return {
    bin: 'docker',
    args: [
      'compose',
      '-p',
      project,
      '-f',
      composeFile,
      'exec',
      '-T',
      SERVICE,
      binary,
      '--username',
      user,
      ...binArgs,
    ],
  }
}
