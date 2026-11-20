/**
 * Vitest `globalSetup` for the real-database project (`pnpm test:db`): builds two template
 * databases once — one **migrated** by the CMS's migration set, one with the schema **pushed** from
 * its config (each CMS binds its own: `@engine/cms/src/db`, `@engine/cms-shop/src/db`) — so each test file's own database is a fast `CREATE DATABASE … TEMPLATE`
 * (`./test-database.test-support.ts`) instead of a schema built from scratch. Both are dropped when
 * the run ends. Without `CMS_TEST_POSTGRES_URL` it does nothing (the tests skip). If a template
 * cannot be built it says so and sets nothing, and the tests fall back to building their own.
 *
 * Each template is closed (Payload destroyed, its pool ended) before any clone: Postgres refuses to
 * copy a database that has a connection to it.
 */
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildConfig, getPayload } from 'payload'

import type { TestCms } from './test-cms.test-support'
import { TEMPLATE_ENV, type TemplateKind } from './test-database.test-support'

type Pool = { query: (text: string) => Promise<unknown>; end: () => Promise<void> }

function pgPool(connectionString: string): Pool {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dbPostgres = realpathSync(path.join(here, '../../node_modules/@payloadcms/db-postgres'))
  const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
    Pool: new (o: object) => Pool
  }
  return new pg.Pool({ connectionString })
}

/** Ends every session still connected to `database`; Postgres will not copy a database in use. */
async function closeSessions(server: string, database: string): Promise<void> {
  const admin = pgPool(server)
  try {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${database}' AND pid <> pg_backend_pid()`,
    )
  } finally {
    await admin.end()
  }
}

async function build(
  cms: TestCms,
  prefix: string,
  server: string,
  kind: TemplateKind,
): Promise<string> {
  const database = `${prefix}_tpl_${kind}_${process.pid}_${Date.now()}`
  const url = new URL(server)
  url.pathname = `/${database}`
  const env = {
    DATABASE_URL: url.toString(),
    PAYLOAD_SECRET: 'template-db-only-never-signs-anything'.padEnd(48, 'x'),
    ...(kind === 'pushed' ? { PAYLOAD_DEV_PUSH: '1' } : {}),
  }
  const config =
    kind === 'pushed' ? await buildConfig(cms.config(env)) : await cms.build(cms.config(env))
  const admin = pgPool(server)
  await admin.query(`CREATE DATABASE "${database}"`)
  await admin.end()
  const payload = await getPayload({ config, key: database, disableOnInit: true })
  if (kind === 'migrated') await payload.db.migrate({ migrations: [...cms.migrations] } as never)
  // `destroy()` leaves idle sessions behind: end them, or the template cannot be copied.
  const pool = (payload.db as unknown as { pool?: { on?: (e: 'error', l: () => void) => unknown } })
    .pool
  pool?.on?.('error', () => {})
  await payload.destroy()
  await closeSessions(server, database)
  return database
}

/** A Vitest `globalSetup` for `cms`: its templates' databases named `<prefix>_tpl_…`. */
export async function templatesSetup(
  cms: TestCms,
  prefix: string,
): Promise<(() => Promise<void>) | undefined> {
  const server = process.env.CMS_TEST_POSTGRES_URL
  if (!server) return undefined
  const made: string[] = []
  for (const kind of ['migrated', 'pushed'] as const) {
    try {
      const database = await build(cms, prefix, server, kind)
      made.push(database)
      process.env[TEMPLATE_ENV[kind]] = database
    } catch (error) {
      console.warn(`db templates: the ${kind} template could not be built:`, error)
    }
  }
  return async () => {
    const admin = pgPool(server)
    for (const database of made) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    }
    await admin.end()
  }
}
