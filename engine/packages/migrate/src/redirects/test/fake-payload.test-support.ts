/**
 * Test support only: an in-memory stand-in for the slice of Payload the redirect loader touches
 * (`find`, `create`, `update`, `delete` on `redirects` and `works`, and the db's transaction
 * calls), so the diff, the batches and the transactions are proven without a database. The real
 * database is `load.db.test.ts`'s.
 */
import type { Payload } from 'payload'

export type StoredRedirect = {
  id: number
  site: 'gallery' | 'shop'
  from: string
  to: string
  code: '301' | '302' | '410'
  source: 'legacy' | 'editor' | 'slug-change'
}

export type FakeLog = {
  begun: number
  committed: number[]
  rolledBack: number
  creates: number
  updates: number
  deletes: number
  finds: number
}

export type FakePayload = {
  payload: Payload
  table: Map<number, StoredRedirect>
  log: FakeLog
  /** Makes the n-th create (1-based, over the whole run) throw. */
  failCreateAt(n: number): void
}

type Args = Record<string, unknown>

export function fakePayload(
  seed: readonly Omit<StoredRedirect, 'id'>[] = [],
  works: readonly Record<string, unknown>[] = [],
  pageSize = 1000,
): FakePayload {
  const table = new Map<number, StoredRedirect>()
  let nextId = 1
  for (const row of seed) table.set(nextId, { ...row, id: nextId++ })
  const log: FakeLog = {
    begun: 0,
    committed: [],
    rolledBack: 0,
    creates: 0,
    updates: 0,
    deletes: 0,
    finds: 0,
  }
  let writesInTransaction = 0
  let failAt = 0

  const page = (docs: readonly unknown[], args: Args) => {
    const current = Number(args.page ?? 1)
    const slice = docs.slice((current - 1) * pageSize, current * pageSize)
    return { docs: slice, hasNextPage: current * pageSize < docs.length }
  }

  const api = {
    find(args: Args) {
      log.finds += 1
      if (args.collection === 'works') return Promise.resolve(page(works, args))
      const site = (args.where as { site: { equals: string } }).site.equals
      const docs = [...table.values()].filter((row) => row.site === site)
      return Promise.resolve(page(docs, args))
    },
    create(args: Args) {
      log.creates += 1
      writesInTransaction += 1
      if (failAt === log.creates) return Promise.reject(new Error('the database refused the row'))
      const data = args.data as Omit<StoredRedirect, 'id'>
      for (const row of table.values()) {
        if (row.site === data.site && row.from === data.from) {
          return Promise.reject(new Error('duplicate key (site, from)'))
        }
      }
      const row = { ...data, id: nextId++ }
      table.set(row.id, row)
      return Promise.resolve(row)
    },
    update(args: Args) {
      log.updates += 1
      writesInTransaction += 1
      const row = table.get(args.id as number)
      if (!row) return Promise.reject(new Error('no such row'))
      Object.assign(row, args.data)
      return Promise.resolve(row)
    },
    delete(args: Args) {
      log.deletes += 1
      writesInTransaction += 1
      table.delete(args.id as number)
      return Promise.resolve({})
    },
    db: {
      beginTransaction() {
        log.begun += 1
        writesInTransaction = 0
        return Promise.resolve(`tx-${log.begun}`)
      },
      commitTransaction() {
        log.committed.push(writesInTransaction)
        return Promise.resolve()
      },
      rollbackTransaction() {
        log.rolledBack += 1
        return Promise.resolve()
      },
    },
  }
  return {
    payload: api as unknown as Payload,
    table,
    log,
    failCreateAt: (n) => {
      failAt = n
    },
  }
}
