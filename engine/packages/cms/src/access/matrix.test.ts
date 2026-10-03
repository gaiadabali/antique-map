/**
 * The role matrix (CONTENT-MODEL.md §7; SECURITY.md §2.2; TASKS.md 3.5.b), read off the built
 * config — the one every process runs (`buildEngineConfig`) — so a collection added, or an access
 * block loosened, without its line here fails. Each cell is what the access function answers for
 * a request: `all` (true), `none` (false) or `where` (a query constraint: the published-only read,
 * a store user's own store, a user's own account). `db/wave-3-1.db.test.ts` proves the `where`s
 * on a migrated database.
 */
import type { PayloadRequest, SanitizedConfig } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { buildEngineConfig, engineConfig } from '../payload.config'

type Cell = 'all' | 'none' | 'where'
type Who = 'owner' | 'editor' | 'store' | 'public'
/** One collection: per operation, the four answers in the order owner, editor, store, public. */
type Row = Partial<Record<'read' | 'create' | 'update' | 'delete' | 'readVersions', Cell[]>>

const ALL: Cell[] = ['all', 'all', 'none', 'none']
const OWNER: Cell[] = ['all', 'none', 'none', 'none']
const NOBODY: Cell[] = ['none', 'none', 'none', 'none']
/** The catalogue: drafts to the owner and editors, published to the public, nothing to stores. */
const CATALOGUE: Row = {
  read: ['all', 'all', 'none', 'where'],
  readVersions: ALL,
  create: ALL,
  update: ALL,
  delete: ALL,
}
const OWNERS_ALONE: Row = { read: OWNER, create: OWNER, update: OWNER, delete: OWNER }

const MATRIX: Record<string, Row> = {
  users: {
    read: ['all', 'where', 'where', 'none'],
    create: OWNER,
    update: ['all', 'where', 'where', 'none'],
    delete: OWNER,
  },
  works: CATALOGUE,
  makers: CATALOGUE,
  places: CATALOGUE,
  terms: CATALOGUE,
  pages: CATALOGUE,
  products: {
    read: ['all', 'all', 'all', 'where'],
    readVersions: ALL,
    create: ALL,
    update: ALL,
    delete: ALL,
  },
  // Over REST the public reads no media record; the loaders do, on the Local API.
  media: { read: ['all', 'all', 'where', 'none'], create: ALL, update: ALL, delete: ALL },
  masters: { read: ALL, create: ALL, update: ALL, delete: OWNER },
  redirects: { read: ALL, create: ALL, update: ALL, delete: ALL },
  stores: {
    read: ['all', 'all', 'where', 'where'],
    create: OWNER,
    update: OWNER,
    delete: OWNER,
  },
  'stock-levels': {
    read: ['all', 'all', 'where', 'none'],
    create: OWNER,
    update: ['all', 'all', 'where', 'none'],
    delete: OWNER,
  },
  orders: {
    read: ['all', 'all', 'where', 'none'],
    create: NOBODY,
    update: ['all', 'all', 'where', 'none'],
    delete: NOBODY,
  },
  'payment-events': { read: OWNER, create: NOBODY, update: NOBODY, delete: NOBODY },
  leads: OWNERS_ALONE,
  partners: OWNERS_ALONE,
  'chat-sessions': OWNERS_ALONE,
  discounts: OWNERS_ALONE,
  events: { read: OWNER, create: OWNER, update: NOBODY, delete: NOBODY },
  // Payload's key-value store: nobody, over any API.
  'payload-kv': { read: NOBODY, create: NOBODY, update: NOBODY, delete: NOBODY },
  'payload-locked-documents': {
    read: ['all', 'all', 'where', 'none'],
    create: ALL,
    update: ALL,
    delete: ['all', 'all', 'where', 'none'],
  },
}

/** Payload's own collections, whose access Payload scopes itself (each user's own rows). */
const PAYLOAD_OWN = ['payload-preferences', 'payload-migrations']

const USERS: Record<Who, Record<string, unknown> | null> = {
  owner: { id: 1, collection: 'users', role: 'owner' },
  editor: { id: 2, collection: 'users', role: 'editor' },
  store: { id: 3, collection: 'users', role: 'store', store: 7 },
  public: null,
}
const WHO: Who[] = ['owner', 'editor', 'store', 'public']

type AccessFn = (args: { req: PayloadRequest }) => unknown
const cell = async (fn: AccessFn | undefined, who: Who): Promise<Cell> => {
  if (!fn) return 'none'
  const req = { user: USERS[who], payloadAPI: 'REST', context: {} } as unknown as PayloadRequest
  const answer = await fn({ req })
  if (answer === true) return 'all'
  if (answer === false || answer === undefined || answer === null) return 'none'
  return 'where'
}

describe('the role matrix, on the config every process runs', () => {
  let config: SanitizedConfig
  beforeAll(async () => {
    config = await buildEngineConfig(engineConfig({ PAYLOAD_SECRET: 'm'.repeat(48) }))
  })

  it('has a row for every collection', () => {
    const slugs = config.collections.map((c) => c.slug).filter((s) => !PAYLOAD_OWN.includes(s))
    expect(slugs.sort()).toEqual(Object.keys(MATRIX).sort())
  })

  for (const [slug, row] of Object.entries(MATRIX)) {
    it(`${slug}: ${Object.keys(row).join(', ')}`, async () => {
      const access = config.collections.find((c) => c.slug === slug)!.access as Record<
        string,
        AccessFn | undefined
      >
      for (const [operation, expected] of Object.entries(row)) {
        const got = await Promise.all(WHO.map((who) => cell(access[operation], who)))
        expect(got, `${slug}.${operation} for ${WHO.join(' / ')}`).toEqual(expected)
      }
    })
  }

  it('site-settings: the owner alone reads and changes it', async () => {
    const access = config.globals.find((g) => g.slug === 'site-settings')!.access as Record<
      string,
      AccessFn
    >
    for (const operation of ['read', 'update']) {
      expect(await Promise.all(WHO.map((who) => cell(access[operation], who)))).toEqual(OWNER)
    }
  })

  it('scopes a store user’s orders, stock rows and store to their own store', async () => {
    const req = { user: USERS.store, payloadAPI: 'REST' } as unknown as PayloadRequest
    const access = (slug: string, op: string) =>
      (config.collections.find((c) => c.slug === slug)!.access as Record<string, AccessFn>)[op]!
    expect(await access('orders', 'read')({ req })).toEqual({ store: { equals: 7 } })
    expect(await access('orders', 'update')({ req })).toEqual({ store: { equals: 7 } })
    expect(await access('stock-levels', 'read')({ req })).toEqual({ store: { equals: 7 } })
    expect(await access('stock-levels', 'update')({ req })).toEqual({ store: { equals: 7 } })
    expect(await access('stores', 'read')({ req })).toEqual({ id: { equals: 7 } })
    expect(await access('payload-locked-documents', 'delete')({ req })).toEqual({
      and: [{ 'user.relationTo': { equals: 'users' } }, { 'user.value': { equals: 3 } }],
    })
  })

  it('gives a store user with no store nothing at all', async () => {
    const req = {
      user: { id: 9, collection: 'users', role: 'store', store: null },
      payloadAPI: 'REST',
    } as unknown as PayloadRequest
    for (const slug of ['orders', 'stock-levels', 'stores']) {
      const access = config.collections.find((c) => c.slug === slug)!.access as Record<
        string,
        AccessFn
      >
      expect(await access.read!({ req }), slug).toBe(false)
    }
  })
})

/** The first field named `name` anywhere in `fields` (through groups, rows, tabs, collapsibles). */
function fieldNamed(fields: readonly unknown[], name: string): Record<string, unknown> | undefined {
  for (const field of fields as Array<Record<string, unknown>>) {
    if (field.name === name) return field
    const nested = [
      ...((field.fields as unknown[]) ?? []),
      ...((field.tabs as Array<{ fields: unknown[] }>) ?? []).flatMap((tab) => tab.fields),
    ]
    const found = nested.length > 0 ? fieldNamed(nested, name) : undefined
    if (found) return found
  }
  return undefined
}

describe('field access the role matrix narrows', () => {
  let config: SanitizedConfig
  beforeAll(async () => {
    config = await buildEngineConfig(engineConfig({ PAYLOAD_SECRET: 'm'.repeat(48) }))
  })
  const fieldAccess = async (slug: string, name: string, operation: string) => {
    const fields = config.collections.find((c) => c.slug === slug)!.fields
    const access = (fieldNamed(fields, name)?.access ?? {}) as Record<string, AccessFn>
    return Promise.all(WHO.map((who) => cell(access[operation], who)))
  }

  it('works.askingPrice: the owner alone reads and sets it', async () => {
    for (const operation of ['read', 'create', 'update']) {
      expect(await fieldAccess('works', 'askingPrice', operation), operation).toEqual(OWNER)
    }
  })

  it('users.role and users.store: the owner alone sets them', async () => {
    for (const name of ['role', 'store']) {
      for (const operation of ['create', 'update']) {
        expect(await fieldAccess('users', name, operation), `${name}.${operation}`).toEqual(OWNER)
      }
    }
  })

  it('users.accessChanges: read by the owner alone, written by nobody', async () => {
    expect(await fieldAccess('users', 'accessChanges', 'read')).toEqual(OWNER)
    expect(await fieldAccess('users', 'accessChanges', 'create')).toEqual(NOBODY)
    expect(await fieldAccess('users', 'accessChanges', 'update')).toEqual(NOBODY)
  })

  it('orders.status: moved by any member of staff (which move is ./status-moves); set by nobody', async () => {
    expect(await fieldAccess('orders', 'status', 'update')).toEqual(['all', 'all', 'all', 'none'])
    expect(await fieldAccess('orders', 'status', 'create')).toEqual(NOBODY)
  })

  it('orders.store: reassigned by nobody over the API (the order code moves it)', async () => {
    expect(await fieldAccess('orders', 'store', 'update')).toEqual(NOBODY)
  })
})
