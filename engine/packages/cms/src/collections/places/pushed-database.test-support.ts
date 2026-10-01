/**
 * Test support: a throwaway database for a test of collections that reach a migration only after
 * their wave merges (TASKS.md 10.3) — so the test **pushes** the schema onto it
 * (`PAYLOAD_DEV_PUSH=1`, PARALLEL-TRACKS.md §3.2). Made on the server `CMS_TEST_POSTGRES_URL`
 * names and dropped afterwards. The test itself calls `getPayload()` with the config this builds:
 * only `instance.ts`, the CLI and test files open Payload (`instance.test.ts`).
 */
import { buildConfig, ValidationError, type SanitizedConfig } from 'payload'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { engineConfig } from '../../payload.config'

export type Pool = {
  on?: (event: 'error', listener: () => void) => unknown
  query: (text: string) => Promise<{ rows: Array<Record<string, unknown>> }>
  end: () => Promise<void>
}

/** db-postgres's own `pg` (a dependency of it, not of cms), for creating and dropping. */
function pgPool(connectionString: string): Pool {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dbPostgres = realpathSync(path.join(here, '../../../node_modules/@payloadcms/db-postgres'))
  const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
    Pool: new (o: object) => Pool
  }
  return new pg.Pool({ connectionString })
}

/** Creates the database (Payload never creates one, `db/adapter`) and the config that pushes to it. */
export async function createPushedDatabase(
  server: string,
  prefix: string,
): Promise<{ database: string; config: SanitizedConfig; drop: () => Promise<void> }> {
  const database = `${prefix}_${process.pid}_${Date.now()}`
  const url = new URL(server)
  url.pathname = `/${database}`
  const env = {
    DATABASE_URL: url.toString(),
    PAYLOAD_SECRET: 'v'.repeat(48),
    PAYLOAD_DEV_PUSH: '1',
  }
  const config = await buildConfig(engineConfig(env))
  const admin = pgPool(server)
  await admin.query(`CREATE DATABASE "${database}"`)
  await admin.end()
  const drop = async () => {
    const dropper = pgPool(server)
    await dropper.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    await dropper.end()
  }
  return { database, config, drop }
}

/** The field errors a refused save carries, as `path: message`; throws if the save went through. */
export async function refusedWith(run: () => Promise<unknown>): Promise<Record<string, string>> {
  try {
    await run()
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error
    return Object.fromEntries(error.data.errors.map((e) => [e.path, e.message]))
  }
  throw new Error('the save went through')
}
