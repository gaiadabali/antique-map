/**
 * The security suite's real stack (TASKS.md 10.1): a pushed Postgres of its own, the engine's own
 * Payload config, two stores, and one signed-in user per role — the owner, an editor, and a store
 * user of each store — over REST through Payload's own handler (`handleEndpoints`, the one Next's
 * `/api/[...slug]` route calls), so access functions, hooks and the query parser are the real ones.
 *
 * Requests carry the JWT in `Authorization`, so no `Origin` is needed. Without
 * `CMS_TEST_POSTGRES_URL` the suites that use it skip: a setup state, never a pass.
 *
 * Every collection holds a record to probe, so a role that may not touch a collection is refused
 * against a row that exists, and a store-scoped role is shown a row of another store it must not
 * reach. The records are written through the Local API (access overridden: this is the server's
 * own hand), the two upload collections straight through the adapter (their files and buckets are
 * 8.3's, proven there).
 */
import {
  createTestDatabase,
  pushEnv,
} from '../../../engine/packages/cms/src/db/test-database.test-support'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildConfig,
  getPayload,
  handleEndpoints,
  type Payload,
  type SanitizedConfig,
} from 'payload'

import { engineConfig } from '../../../engine/packages/cms/src/payload.config'
import {
  collectingWrites,
  type Pool,
} from '../../../engine/packages/cms/src/collections/places/pushed-database.test-support'
import { type Api } from '../../../engine/packages/cms/src/collections/works/works.test-support'
import { seedRecords, type Doc } from './seed'

export const server = process.env.CMS_TEST_POSTGRES_URL
export const PASSWORD = 'security-suite-password-1'
/** The admin host the suite's Payload trusts for CSRF and CORS (`ADMIN_HOST`, SECURITY.md X2). */
export const ADMIN_ORIGIN = 'http://shop.localhost:4170'
const SITE_ENV = {
  GALLERY_HOSTS: 'gallery.localhost',
  SHOP_HOSTS: 'shop.localhost',
  ADMIN_HOST: 'shop.localhost',
  PORT: '4170',
}

/** db-postgres's own `pg` (a dependency of it, not of cms), for creating and dropping. */
function pgPool(connectionString: string): Pool {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const dbPostgres = realpathSync(
    path.join(here, '../../../engine/packages/cms/node_modules/@payloadcms/db-postgres'),
  )
  const pg = createRequire(path.join(dbPostgres, 'x.js'))('pg') as {
    Pool: new (options: object) => Pool
  }
  return new pg.Pool({ connectionString })
}

/** A database of its own, the schema pushed from the engine's config under the admin host's env. */
async function createDatabase(serverUrl: string, prefix: string) {
  const database = `${prefix}_${process.pid}_${Date.now()}`
  const url = new URL(serverUrl)
  url.pathname = `/${database}`
  const env = {
    DATABASE_URL: url.toString(),
    PAYLOAD_SECRET: 'v'.repeat(48),
    ...pushEnv(),
    ...SITE_ENV,
  }
  const config = await buildConfig(engineConfig(env))
  const admin = pgPool(serverUrl)
  await createTestDatabase(admin, database, 'pushed')
  await admin.end()
  const drop = async () => {
    const dropper = pgPool(serverUrl)
    await dropper.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`)
    await dropper.end()
  }
  return { database, config, drop }
}

/** The people the suite signs in as. `anonymous` carries no token. */
export const ROLES = ['owner', 'editor', 'storeA', 'storeB', 'anonymous'] as const
export type Who = (typeof ROLES)[number]

export type Reply = {
  status: number
  body: Record<string, unknown> | null
  /** The response's headers, and its `Set-Cookie` lines apart. */
  headers: Headers
  cookies: string[]
}

export type SecurityStack = {
  payload: Payload
  /** The Local API with the cache collector the hooks need outside a request. */
  api: Api
  pool: Pool
  config: SanitizedConfig
  stores: { A: Doc; B: Doc }
  users: Record<Exclude<Who, 'anonymous'>, Doc>
  /** One record per collection (and a second of the store-scoped ones), by collection slug. */
  seeded: Record<string, Doc>
  /** Orders, stock rows and the work of each store, for the scoping proofs. */
  orders: { A: Doc; B: Doc }
  stock: { A: Doc; B: Doc }
  work: { published: Doc; draft: Doc }
  rest(
    method: string,
    route: string,
    init?: { as?: Who; json?: unknown; headers?: Record<string, string>; token?: string },
  ): Promise<Reply>
  /** A signed-in user's JWT, for the cookie and logout proofs. */
  tokenOf(who: Exclude<Who, 'anonymous'>): string
  stop(): Promise<void>
}

export async function startSecurityStack(prefix: string): Promise<SecurityStack> {
  const saved = { ...process.env }
  // The leads and chat code read the site list from the process.
  Object.assign(process.env, SITE_ENV, { SITE_URL: ADMIN_ORIGIN })
  const pushed = await createDatabase(server!, prefix)
  const raw = await getPayload({ config: pushed.config, key: pushed.database })
  const payload = collectingWrites(raw)
  const api = payload as unknown as Api
  const pool = (raw.db as unknown as { pool: Pool }).pool
  const tokens = new Map<string, string>()

  const rest: SecurityStack['rest'] = async (method, route, init = {}) => {
    const headers = new Headers(init.headers)
    const token =
      init.token ?? (init.as && init.as !== 'anonymous' ? tokens.get(init.as) : undefined)
    if (token) headers.set('authorization', `JWT ${token}`)
    let body: string | undefined
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(init.json)
    }
    const response = await handleEndpoints({
      config: pushed.config,
      payloadInstanceCacheKey: pushed.database,
      request: new Request(`http://localhost${route}`, { method, headers, body }),
    })
    const text = await response.text()
    let parsed: Record<string, unknown> | null = null
    try {
      parsed = text ? (JSON.parse(text) as Record<string, unknown>) : null
    } catch {
      parsed = null
    }
    return {
      status: response.status,
      body: parsed,
      headers: response.headers,
      cookies: response.headers.getSetCookie(),
    }
  }

  const make = async (collection: string, data: Record<string, unknown>): Promise<Doc> =>
    (await api.create({ collection, data })) as unknown as Doc

  const stores = {
    A: await make('stores', { code: 'UBD-01', name: 'Ubud' }),
    B: await make('stores', { code: 'SNR-01', name: 'Sanur' }),
  }
  const users = {} as SecurityStack['users']
  // The owner first: the first account is made an owner whatever it asks (`users/guards`).
  const people: Array<[Exclude<Who, 'anonymous'>, Record<string, unknown>]> = [
    ['owner', { role: 'owner' }],
    ['editor', { role: 'editor' }],
    ['storeA', { role: 'store', store: stores.A.id }],
    ['storeB', { role: 'store', store: stores.B.id }],
  ]
  for (const [who, extra] of people) {
    const email = `${who.toLowerCase()}@security.test`
    users[who] = await make('users', { email, password: PASSWORD, name: who, ...extra })
    const login = await rest('POST', '/api/users/login', { json: { email, password: PASSWORD } })
    const token = login.body?.token
    if (typeof token !== 'string') throw new Error(`could not sign ${who} in: ${login.status}`)
    tokens.set(who, token)
  }

  const { seeded, work, stock, orders } = await seedRecords({
    raw,
    api,
    make,
    stores,
    password: PASSWORD,
  })

  return {
    payload,
    api,
    pool,
    config: pushed.config,
    stores,
    users,
    seeded,
    orders,
    stock,
    work,
    rest,
    tokenOf: (who) => tokens.get(who)!,
    async stop() {
      pool.on?.('error', () => {})
      await raw.destroy()
      await pushed.drop()
      process.env = saved
    },
  }
}
