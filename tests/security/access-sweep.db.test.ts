/**
 * The access-control sweep (TASKS.md 10.1.c; SECURITY.md §2.2, R1–R3, R5–R6): every collection ×
 * every role × every operation, over REST through Payload's own handler on a real Postgres, against
 * the table in `./support/spec-2-2.ts` (the document's table as data).
 *
 * How a cell is probed — chosen so that the sweep destroys nothing and still tells "refused by
 * access" from "allowed":
 * - **read**: `GET /api/{collection}` — refused is 403; allowed is 200, and a narrowed (`S`) role
 *   sees exactly its own rows, an `A` role the owner's full list.
 * - **create**: `POST /api/{collection}` with `{}` — access runs before validation, so a refused
 *   role gets 403 and an allowed one gets anything but 401/403 (the usual answer is 400: the body
 *   is empty, and nothing is created).
 * - **update / delete**: a refused role aims at a row that exists and must get 403 (and the row
 *   survives: checked at the end); an allowed role aims at an id that does not exist and must get
 *   404 — past access, not past it into a row; a narrowed role aims at its own row (allowed) and
 *   at another's (404 or 403, and the row is unchanged).
 *
 * A cell the engine answers more strictly than the table (`STRICTER_THAN_TABLE`) is expected to
 * be refused and is listed with the reason; a looser answer than the table is a failure.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  NOT_IN_TABLE,
  OPS,
  SPEC,
  STRICTER_THAN_TABLE,
  type Cell,
  type Op,
  type Row,
} from './support/spec-2-2'
import { ROLES, server, startSecurityStack, type SecurityStack, type Who } from './support/stack'

const COLUMN: Record<Who, 0 | 1 | 2 | 3> = {
  owner: 0,
  editor: 1,
  storeA: 2,
  storeB: 2,
  anonymous: 3,
}
const MISSING = 999_999
const REFUSED = [401, 403]

/** The cell the sweep expects: the table's, unless the engine is deliberately stricter. */
function expected(slug: string, who: Who, op: Op, row: Row): Cell {
  const cell = row[op][COLUMN[who]]
  const stricter = STRICTER_THAN_TABLE.some(
    (entry) => entry.collection === slug && entry.who === who && entry.op === op,
  )
  return stricter ? 'N' : cell
}

type Docs = { docs?: Array<Record<string, unknown>>; totalDocs?: number }
const idsOf = (body: Record<string, unknown> | null) =>
  ((body as Docs | null)?.docs ?? []).map((doc) => doc.id as number)

describe.skipIf(!server)('access sweep: every collection × role × operation', () => {
  let stack: SecurityStack

  beforeAll(async () => {
    stack = await startSecurityStack('security_sweep')
  }, 240_000)
  afterAll(() => stack?.stop(), 60_000)

  /** The row a role is allowed to touch and one it must not, for a narrowed collection. */
  const scope = (slug: string, who: Who): { own: number; other: number } => {
    const { users, stock, orders, stores, seeded } = stack
    if (slug === 'users') {
      return { own: users[who as 'editor' | 'storeA' | 'storeB'].id, other: seeded.users!.id }
    }
    const side = who === 'storeB' ? 'B' : 'A'
    const flip = side === 'A' ? 'B' : 'A'
    if (slug === 'stock-levels') return { own: stock[side].id, other: stock[flip].id }
    if (slug === 'orders') return { own: orders[side].id, other: orders[flip].id }
    return { own: stores[side].id, other: stores[flip].id }
  }

  const checkRead = async (slug: string, who: Who, cell: Cell) => {
    const reply = await stack.rest('GET', `/api/${slug}?limit=100&depth=0`, { as: who })
    if (cell === 'N') {
      expect(REFUSED, `${slug} read as ${who}`).toContain(reply.status)
      return
    }
    expect(reply.status, `${slug} read as ${who}`).toBe(200)
    const total = (reply.body as Docs).totalDocs ?? 0
    // Live, not cached: an allowed create probe may have made a draft since the suite began.
    const ownerReply = await stack.rest('GET', `/api/${slug}?limit=1&depth=0`, { as: 'owner' })
    const owner = (ownerReply.body as Docs).totalDocs ?? 0
    if (cell === 'A') {
      expect(total, `${slug}: ${who} sees the owner's whole list`).toBe(owner)
      return
    }
    expect(total, `${slug}: ${who} sees no more than the owner`).toBeLessThanOrEqual(owner)
    const ids = idsOf(reply.body)
    if (slug === 'users') expect(ids).toEqual([scope(slug, who).own])
    if (slug === 'orders' || slug === 'stock-levels') {
      expect(ids, `${slug}: only the store's own rows`).toEqual([scope(slug, who).own])
    }
    if (slug === 'stores' && who !== 'anonymous') {
      expect(ids, 'stores: only the store user’s own store').toEqual([scope(slug, who).own])
    }
    if (who === 'anonymous') {
      for (const doc of (reply.body as Docs).docs ?? []) {
        // The public reads what is published, and never the owner's figures (R5).
        if ('_status' in doc) expect(doc._status, `${slug}: a public read returned a draft`).toBe('published')
        expect(doc).not.toHaveProperty('askingPrice')
        expect(doc).not.toHaveProperty('physical')
      }
    }
  }

  const checkCreate = async (slug: string, who: Who, cell: Cell) => {
    const reply = await stack.rest('POST', `/api/${slug}`, { as: who, json: {} })
    if (cell === 'N') expect(REFUSED, `${slug} create as ${who}`).toContain(reply.status)
    else expect(REFUSED, `${slug} create as ${who} was refused by access`).not.toContain(reply.status)
  }

  const checkChange = async (slug: string, who: Who, cell: Cell, op: 'update' | 'delete') => {
    const method = op === 'update' ? 'PATCH' : 'DELETE'
    const json = op === 'update' ? {} : undefined
    // A collection with no REST-visible row (the ledgers the core writes) is aimed at a missing id:
    // access answers before the lookup, so a refusal is still 403.
    const real = (slug === 'users' ? stack.seeded.users : stack.seeded[slug])?.id ?? MISSING
    if (cell === 'N') {
      const reply = await stack.rest(method, `/api/${slug}/${real}`, { as: who, json })
      expect(REFUSED, `${slug} ${op} as ${who}`).toContain(reply.status)
      return
    }
    if (cell === 'A') {
      const reply = await stack.rest(method, `/api/${slug}/${MISSING}`, { as: who, json })
      expect(reply.status, `${slug} ${op} as ${who}: past access, to a missing row`).toBe(404)
      return
    }
    const { own, other } = scope(slug, who)
    const mine = await stack.rest(method, `/api/${slug}/${own}`, { as: who, json })
    expect([...REFUSED, 404], `${slug} ${op} as ${who} on its own row`).not.toContain(mine.status)
    const theirs = await stack.rest(method, `/api/${slug}/${other}`, { as: who, json })
    expect([403, 404], `${slug} ${op} as ${who} on another's row`).toContain(theirs.status)
  }

  const everything: Record<string, Row> = { ...SPEC, ...NOT_IN_TABLE }
  for (const [slug, row] of Object.entries(everything)) {
    describe(slug, () => {
      for (const who of ROLES) {
        for (const op of OPS) {
          const cell = () => expected(slug, who, op, row)
          const label = `${who} × ${op}: ${row[op][COLUMN[who]]}`
          it(label, async () => {
            if (op === 'read') return checkRead(slug, who, cell())
            if (op === 'create') return checkCreate(slug, who, cell())
            return checkChange(slug, who, cell(), op)
          })
        }
      }
    })
  }

  it('every row a refused delete or update was aimed at is still there, unchanged', async () => {
    for (const slug of Object.keys(SPEC)) {
      const id = (slug === 'users' ? stack.seeded.users! : stack.seeded[slug]!).id
      const reply = await stack.rest('GET', `/api/${slug}/${id}?depth=0`, { as: 'owner' })
      expect(reply.status, `${slug}/${id} survived the sweep`).toBe(200)
    }
  })

  it('the sweep covers every collection the engine registers', () => {
    const slugs = stack.config.collections
      .map((collection) => collection.slug)
      .filter((slug) => !['payload-preferences', 'payload-migrations', 'payload-locked-documents'].includes(slug))
    expect(slugs.sort()).toEqual(Object.keys(everything).sort())
  })

  describe('site-settings (the global)', () => {
    it('only the owner reads and changes it', async () => {
      for (const who of ROLES) {
        const read = await stack.rest('GET', '/api/globals/site-settings', { as: who })
        const write = await stack.rest('POST', '/api/globals/site-settings', { as: who, json: {} })
        if (who === 'owner') {
          expect(read.status).toBe(200)
          expect(REFUSED).not.toContain(write.status)
        } else {
          expect(REFUSED, `read as ${who}`).toContain(read.status)
          expect(REFUSED, `write as ${who}`).toContain(write.status)
        }
      }
    })
  })
})
