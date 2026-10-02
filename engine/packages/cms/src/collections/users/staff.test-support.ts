/**
 * Test support only — imported by `*.db.test.ts` beside `users` and `stores`, never by runtime code.
 *
 * A pushed database of its own (`../places/pushed-database.test-support`) holding two stores and
 * one user of each role — the owner, an editor, and a store user of the first store — each signed
 * in over REST through Payload's own handler, so access, hooks and the query parser are the real
 * ones. Requests carry the JWT in `Authorization`, so no `Origin` is needed. Without
 * `CMS_TEST_POSTGRES_URL` the tests that use it skip — a setup state.
 */
import { handleEndpoints, type Payload, type SanitizedConfig } from 'payload'

import { createPushedDatabase, type Pool } from '../places/pushed-database.test-support'

export const server = process.env.CMS_TEST_POSTGRES_URL
export const PASSWORD = 'staff-db-test-password-1'
export const CALLERS = ['owner', 'editor', 'store'] as const
export type Caller = (typeof CALLERS)[number]

type Doc = Record<string, unknown> & { id: number }

export type StaffStack = {
  payload: Payload
  pool: Pool
  /** The users by role, and the two stores: `stores[0]` is the store user's own. */
  users: Record<Caller, Doc>
  stores: [Doc, Doc]
  /** A REST request through Payload's handler, signed in as `as` when given. */
  rest(
    method: string,
    route: string,
    init?: { as?: Caller; json?: unknown },
  ): Promise<{ status: number; body: Record<string, unknown> | null }>
  stop(): Promise<void>
}

/** How a test file boots Payload on the stack's config: its own `getPayload`, under `key`. */
export type Connect = (config: SanitizedConfig, key: string) => Promise<Payload>

export async function startStaffStack(prefix: string, connect: Connect): Promise<StaffStack> {
  const pushed = await createPushedDatabase(server!, prefix)
  const payload = await connect(pushed.config, pushed.database)
  const pool = (payload.db as unknown as { pool: Pool }).pool
  const tokens = new Map<Caller, string>()

  const rest: StaffStack['rest'] = async (method, route, init = {}) => {
    const headers = new Headers()
    const token = init.as ? tokens.get(init.as) : undefined
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
  const users = {} as Record<Caller, Doc>
  // The owner first: the first account is made an owner whatever it asks (`./guards`).
  for (const role of CALLERS) {
    const email = `${role}@staff.test`
    users[role] = (await payload.create({
      collection: 'users',
      data: {
        email,
        password: PASSWORD,
        name: role,
        role,
        ...(role === 'store' ? { store: stores[0].id } : {}),
      } as never,
    })) as unknown as Doc
    const login = await rest('POST', '/api/users/login', { json: { email, password: PASSWORD } })
    const token = login.body?.token
    if (typeof token !== 'string') throw new Error(`could not sign ${role} in: ${login.status}`)
    tokens.set(role, token)
  }

  return {
    payload,
    pool,
    users,
    stores,
    rest,
    async stop() {
      pool.on?.('error', () => {})
      await payload.destroy()
      await pushed.drop()
    },
  }
}
