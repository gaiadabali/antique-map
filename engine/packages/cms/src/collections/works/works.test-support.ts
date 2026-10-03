/**
 * Test support only — imported by `*.db.test.ts` here, never by runtime code.
 *
 * A works database for the real-database tests (TASKS.md 8.2.f): a pushed database of its own
 * (`../places/pushed-database.test-support`; the wave's migration is generated after the merge),
 * a user of each role — the store user with a store — signed in over REST through Payload's own
 * handler, and the records a work points at. Media and master records
 * are written straight through the adapter — their files and buckets are 8.3's, proven there — so
 * a work's image rules read real rows without an upload.
 */
import { handleEndpoints, type Payload, type SanitizedConfig } from 'payload'

import { createPushedDatabase, type Pool } from '../places/pushed-database.test-support'

export const server = process.env.CMS_TEST_POSTGRES_URL
export const PASSWORD = 'works-db-test-password-1'
/** The owner first: the first account is made an owner whatever it asks (`users/guards`). */
export const ROLES = ['owner', 'editor', 'store'] as const
export type Role = (typeof ROLES)[number]

/** Untyped Local API calls: the works types are generated after the wave merges (10.3.b). */
export type Api = {
  create: (args: object) => Promise<Record<string, unknown> & { id: number }>
  update: (args: object) => Promise<Record<string, unknown> & { id: number }>
  findByID: (args: object) => Promise<Record<string, unknown>>
  find: (args: object) => Promise<{ docs: Array<Record<string, unknown>> }>
  delete: (args: object) => Promise<unknown>
}

export type WorksStack = {
  payload: Payload
  api: Api
  pool: Pool
  /** A REST request through Payload's handler, as `role` when given. */
  rest(method: string, route: string, init?: { role?: Role; json?: unknown }): Promise<Response>
  /** A media row of `role` and `provenance`, alt in English; its master's verdict if given. */
  media(
    role: string,
    provenance?: string,
    extra?: { alt?: string; altSource?: string; verdict?: string; subject?: string },
  ): Promise<number>
  stop(): Promise<void>
}

let masterCount = 0

/** How a test file boots Payload on the stack's config: its own `getPayload`, under `key`. */
export type Connect = (config: SanitizedConfig, key: string) => Promise<Payload>

export async function startWorksStack(prefix: string, connect: Connect): Promise<WorksStack> {
  const saved = { ...process.env }
  const pushed = await createPushedDatabase(server!, prefix)
  const payload = await connect(pushed.config, pushed.database)
  const api = payload as unknown as Api
  const pool = (payload.db as unknown as { pool: Pool }).pool
  const tokens = new Map<Role, string>()

  const rest: WorksStack['rest'] = async (method, route, init = {}) => {
    const headers = new Headers()
    const token = init.role ? tokens.get(init.role) : undefined
    if (token) headers.set('authorization', `JWT ${token}`)
    let body: string | undefined
    if (init.json !== undefined) {
      headers.set('content-type', 'application/json')
      body = JSON.stringify(init.json)
    }
    const request = new Request(`http://localhost${route}`, { method, headers, body })
    return handleEndpoints({
      config: pushed.config,
      payloadInstanceCacheKey: pushed.database,
      request,
    })
  }

  const shop = await api.create({ collection: 'stores', data: { code: 'UBD-01', name: 'Ubud' } })
  for (const role of ROLES) {
    const email = `${role}@works.test`
    await api.create({
      collection: 'users',
      data: {
        email,
        password: PASSWORD,
        name: role,
        role,
        ...(role === 'store' ? { store: shop.id } : {}),
      },
    })
    const response = await rest('POST', '/api/users/login', { json: { email, password: PASSWORD } })
    const { token } = (await response.json()) as { token?: string }
    if (!token) throw new Error(`could not sign ${role} in: ${response.status}`)
    tokens.set(role, token)
  }

  const media: WorksStack['media'] = async (role, provenance = 'photograph', extra = {}) => {
    let master: number | undefined
    if (extra.verdict) {
      masterCount += 1
      const checksum = String(masterCount).padStart(64, '0')
      const row = (await payload.db.create({
        collection: 'masters',
        data: {
          kind: 'capture',
          storageKey: `masters/intake/batch/${checksum}.tif`,
          checksum,
          role,
          provenance,
          intake: { verdict: extra.verdict },
        },
      })) as { id: number }
      master = row.id
    }
    const row = (await payload.db.create({
      collection: 'media',
      data: {
        alt: { en: extra.alt ?? `A ${role} of the map` },
        altSource: { en: extra.altSource ?? 'cataloguer' },
        subject: extra.subject ?? (role === 'flat' ? 'product' : 'work'),
        role,
        provenance,
        filename: `${role}-${Date.now()}-${Math.random()}.jpg`,
        mimeType: 'image/jpeg',
        ...(master === undefined ? {} : { master }),
      },
    })) as { id: number }
    return row.id
  }

  return {
    payload,
    api,
    pool,
    rest,
    media,
    async stop() {
      pool.on?.('error', () => {})
      await payload.destroy()
      await pushed.drop()
      process.env = saved
    },
  }
}

/** The records a complete work points at: a maker, a place, a published grade and a subject. */
export async function vocabulary(api: Api) {
  const maker = await api.create({
    collection: 'makers',
    data: { name: 'François Valentijn', sortName: 'VALENTIJN, François' },
  })
  const place = await api.create({ collection: 'places', data: { name: 'Bali' } })
  const grade = await api.create({
    collection: 'terms',
    data: { kind: 'grade', label: 'VG+', definition: 'Very good, nearly fine.', equivalent: 'A' },
  })
  const subject = await api.create({ collection: 'terms', data: { kind: 'subject', label: 'VOC' } })
  return {
    maker: maker.id,
    place: place.id,
    grade: grade.id,
    subject: subject.id,
  }
}
