/**
 * Test support only — imported by the schema lead's `*.db.test.ts`, never by runtime code.
 *
 * A **migrated** database of its own (TASKS.md 3.5.e): made on the server `CMS_TEST_POSTGRES_URL`
 * names, built by the one migration set — so the hand-written SQL (the last-owner backstop, the
 * payment ledger's trigger, the order number's sequence) is there, which a pushed database lacks —
 * and dropped afterwards. Payload runs the config every process runs (`buildEngineConfig`, with
 * the locks collection's access), and holds two stores and one user of each role plus a second
 * store's staff member, each signed in over REST through Payload's own handler, so access, hooks
 * and the query parser are the real ones. Without `CMS_TEST_POSTGRES_URL` the tests skip.
 */
import { createTestDatabase } from './test-database.test-support'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { handleEndpoints, type Payload, type SanitizedConfig } from 'payload'

import { migrations } from '../migrations'
import { buildEngineConfig, engineConfig } from '../payload.config'

export const server = process.env.CMS_TEST_POSTGRES_URL
const PASSWORD = 'migrated-db-test-password-1'
/** `store` works in `stores[0]`; `otherStore` in `stores[1]`. The owner first (`users/guards`). */
export const CALLERS = ['owner', 'editor', 'store', 'otherStore'] as const
export type Caller = (typeof CALLERS)[number]

export type Pool = {
  on?: (event: 'error', listener: () => void) => unknown
  query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
  end: () => Promise<void>
}
type Doc = Record<string, unknown> & { id: number }
export type Answer = { status: number; body: Record<string, unknown> | null }

export type MigratedStack = {
  payload: Payload
  config: SanitizedConfig
  pool: Pool
  users: Record<Caller, Doc & { collection: 'users' }>
  stores: [Doc, Doc]
  rest(method: string, route: string, init?: { as?: Caller; json?: unknown }): Promise<Answer>
  stop(): Promise<void>
}

/** db-postgres's own `pg` (a dependency of it, not of cms), for creating and dropping. */
function adminPool(): Pool {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dbPostgres = realpathSync(path.join(here, '../../node_modules/@payloadcms/db-postgres'))
  const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
    Pool: new (o: object) => Pool
  }
  return new pg.Pool({ connectionString: server })
}

/** How a test file boots Payload on the stack's config: its own `getPayload`, under `key`. */
export type Connect = (config: SanitizedConfig, key: string) => Promise<Payload>

export async function startMigratedStack(prefix: string, connect: Connect): Promise<MigratedStack> {
  const database = `${prefix}_${process.pid}_${Date.now()}`
  const url = new URL(server!)
  url.pathname = `/${database}`
  const env = { DATABASE_URL: url.toString(), PAYLOAD_SECRET: 'm'.repeat(48) }
  const config = await buildEngineConfig(engineConfig(env))
  const admin = adminPool()
  await createTestDatabase(admin, database, 'migrated')
  await admin.end()
  const payload = await connect(config, database)
  await payload.db.migrate({ migrations: [...migrations] } as never)
  const pool = (payload.db as unknown as { pool: Pool }).pool
  const tokens = new Map<Caller, string>()

  const rest: MigratedStack['rest'] = async (method, route, init = {}) => {
    const headers = new Headers()
    const token = init.as ? tokens.get(init.as) : undefined
    if (token) headers.set('authorization', `JWT ${token}`)
    let body: string | undefined
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(init.json)
    }
    const response = await handleEndpoints({
      config,
      payloadInstanceCacheKey: database,
      request: new Request(`http://localhost${route}`, { method, headers, body }),
    })
    const text = await response.text()
    return {
      status: response.status,
      body: text ? (JSON.parse(text) as Record<string, unknown>) : null,
    }
  }

  const make = (data: Record<string, unknown>) =>
    payload.create({ collection: 'stores', data: data as never }) as unknown as Promise<Doc>
  const stores: [Doc, Doc] = [
    await make({ code: 'UBD-01', name: 'Ubud' }),
    await make({ code: 'SNR-01', name: 'Sanur' }),
  ]
  const users = {} as MigratedStack['users']
  for (const caller of CALLERS) {
    const email = `${caller.toLowerCase()}@migrated.test`
    const role = caller === 'otherStore' ? 'store' : caller
    const store = caller === 'store' ? stores[0].id : caller === 'otherStore' ? stores[1].id : null
    const created = (await payload.create({
      collection: 'users',
      data: { email, password: PASSWORD, name: caller, role, ...(store ? { store } : {}) } as never,
    })) as unknown as Doc
    users[caller] = { ...created, collection: 'users' }
    const login = await rest('POST', '/api/users/login', { json: { email, password: PASSWORD } })
    const token = login.body?.token
    if (typeof token !== 'string') throw new Error(`could not sign ${caller} in: ${login.status}`)
    tokens.set(caller, token)
  }

  return {
    payload,
    config,
    pool,
    users,
    stores,
    rest,
    async stop() {
      // Dropping the database ends whatever connection the pool is still closing: expected.
      pool.on?.('error', () => {})
      await payload.destroy()
      const dropper = adminPool()
      await dropper.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
      await dropper.end()
    },
  }
}

/** The first field error of a refused REST answer: `{ path, message }`, or null. */
export function fieldError(answer: Answer): { path?: string; message?: string } | null {
  const errors = answer.body?.errors as
    Array<{ data?: { errors?: Array<{ path?: string; message?: string }> } }> | undefined
  return errors?.[0]?.data?.errors?.[0] ?? null
}

/** The ids of the documents a REST list answered with. */
export const idsOf = (answer: Answer): number[] =>
  ((answer.body?.docs as Array<{ id: number }> | undefined) ?? []).map((doc) => doc.id)
