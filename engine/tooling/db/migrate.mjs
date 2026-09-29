// The `db:fresh` migrate step (TASKS.md 2.1.b, 3.5.c): the CMS package's own
// `migrate` script — `payload migrate`, under the migration advisory lock
// (engine/packages/cms/src/db/adapter.ts) — against the database `db:fresh`
// just made, exactly as the SCH lead's one migration set reaches every
// database (PARALLEL-TRACKS.md §3.2). Never a dev push: schema reaches a
// database through migrations only (DEPLOYMENT.md §4.5).
//
// The Payload CLI, run from the package's folder, reads no repo-root
// `.env.local`, so the child is handed its environment whole:
//   DATABASE_URL     this database, on the Postgres the db tooling talks to
//                    (PGHOST/PGPORT/PGUSER/PGPASSWORD under the direct
//                    transport, else POSTGRES_HOST/PORT/USER/PASSWORD — the
//                    local stack's defaults, .env.example)
//   PAYLOAD_SECRET   a development placeholder: migrating signs nothing, and a
//                    real secret is never handed to a tool
//   BRAND, BRAND_ROOT, TEST_STOREFRONT
//                    the brand the database is for, as its process would run —
//                    the config loads and validates; the schema does not depend
//                    on it (ARCHITECTURE.md §2). None of the three when the
//                    brand keeps one config per storefront and none was named
//                    (`brandless`): the brand-independent config migrates, as
//                    `migrate:create` generates
// and never RUN_MIGRATIONS (the web process's mark), PAYLOAD_DEV_PUSH or
// NODE_ENV. The URL's password never reaches the log.
import { join } from 'node:path'

import { runPnpm, withoutKeys } from './pnpm.mjs'

export const CMS_PACKAGE = '@engine/cms'
export const DEV_PAYLOAD_SECRET = 'db-fresh-dev-only-never-signs-anything'

const WITHHELD = [
  'DATABASE_URL',
  'PAYLOAD_SECRET',
  'BRAND',
  'BRAND_ROOT',
  'TEST_STOREFRONT',
  'RUN_MIGRATIONS',
  'PAYLOAD_DEV_PUSH',
  'NODE_ENV',
  'PAYLOAD_TS_OUTPUT_PATH',
  'ROOT_DIR',
]

export class MigrateError extends Error {}

/** `postgres://user:password@host:port/<database>` for the Postgres `env` points the db tooling at. */
export function databaseUrl(database, env) {
  const user = env.PGUSER || env.POSTGRES_USER || 'postgres'
  const password = env.PGPASSWORD ?? env.POSTGRES_PASSWORD ?? 'postgres'
  const host = env.PGHOST || env.POSTGRES_HOST || 'localhost'
  const port = env.PGPORT || env.POSTGRES_PORT || '5432'
  const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
  return `postgres://${auth}@${host}:${port}/${encodeURIComponent(database)}`
}

/** `text` with the URL's password replaced — for anything that reaches a log. */
export function redactUrl(text, url) {
  const password = new URL(url).password
  if (password === '') return text
  return text.split(password).join('***')
}

/** The migrate child's environment: `env` minus WITHHELD, plus the database, the dev secret and the brand. */
export function migrateEnv({
  database,
  brand,
  storefront = null,
  brandless = false,
  repoRoot,
  env,
}) {
  const brandEnv = brandless
    ? {}
    : {
        BRAND: brand,
        BRAND_ROOT: join(repoRoot, brand),
        ...(storefront ? { TEST_STOREFRONT: storefront } : {}),
      }
  return {
    ...withoutKeys(env, WITHHELD),
    DATABASE_URL: databaseUrl(database, env),
    PAYLOAD_SECRET: DEV_PAYLOAD_SECRET,
    ...brandEnv,
  }
}

function brandNote({ brand, storefront, brandless }) {
  if (brandless) {
    return `BRAND unset (${brand} keeps one config per storefront and none was named; --storefront migrates as its process would)`
  }
  return storefront ? `BRAND=${brand} TEST_STOREFRONT=${storefront}` : `BRAND=${brand}`
}

/**
 * Runs `pnpm --filter @engine/cms migrate` against `database`. Resolves once
 * every pending migration is applied; throws `MigrateError` with Payload's
 * (redacted) last words otherwise, so `db:fresh` never reports a half-made
 * database ready. `run` is injectable for tests.
 */
export async function runMigrations({
  database,
  brand,
  storefront = null,
  brandless = false,
  repoRoot,
  env = process.env,
  log = console.log,
  run = runPnpm,
}) {
  const childEnv = migrateEnv({ database, brand, storefront, brandless, repoRoot, env })
  const url = childEnv.DATABASE_URL
  const note = brandNote({ brand, storefront, brandless })
  log(`[db] migrate ${database}: pnpm --filter ${CMS_PACKAGE} migrate, ${note}`)
  const { code, stdout, stderr } = await run(['--silent', '--filter', CMS_PACKAGE, 'migrate'], {
    cwd: repoRoot,
    env: childEnv,
  })
  const said = redactUrl(`${stdout}\n${stderr}`, url)
    .split(/\r?\n/)
    .map(payloadMessage)
    .filter((line) => line !== '')
  if (code !== 0) {
    throw new MigrateError(
      `migrate ${database} failed (exit ${code}):\n  ${said.slice(-8).join('\n  ')}`,
    )
  }
  for (const line of said) log(`[db]   ${line}`)
}

// eslint-disable-next-line no-control-regex -- terminal colour codes are exactly what it strips
const ANSI = /\u001b\[[0-9;]*m/g

/** Payload logs pretty lines on a terminal and JSON (pino) otherwise; the message is what a person reads. */
function payloadMessage(line) {
  const text = line.replace(ANSI, '').trim()
  if (!text.startsWith('{')) return text
  try {
    const { msg } = JSON.parse(text)
    return typeof msg === 'string' ? msg : text
  } catch {
    return text
  }
}
