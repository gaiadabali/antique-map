/**
 * Test support only — the fake request the users hooks' unit tests run against, never imported by
 * runtime code.
 */
import type { PayloadRequest } from 'payload'
import { vi } from 'vitest'

type Hook = (args: never) => unknown
export const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)

/**
 * A request whose Local API answers `count` with `counts` in turn, `findByID` with `doc` and `find`
 * with `docs`; `as` sets who is asking and through which API.
 */
export function fakeReq(
  counts: number[],
  doc: Record<string, unknown> = {},
  as: { user?: unknown; payloadAPI?: string; docs?: Array<Record<string, unknown>> } = {},
) {
  const execute = vi.fn(async () => ({ rows: [] }))
  const count = vi.fn(async () => ({ totalDocs: counts.shift() ?? 0 }))
  const find = vi.fn(async () => ({ docs: as.docs ?? [] }))
  const req = {
    transactionID: 'tx-1',
    user: as.user ?? null,
    payloadAPI: as.payloadAPI ?? 'REST',
    payload: {
      count,
      find,
      findByID: vi.fn(async () => doc),
      db: { sessions: { 'tx-1': { db: 'the-transaction' } }, execute },
    },
    t: (key: string) => key,
  } as unknown as PayloadRequest
  return { req, count, execute, find }
}
export const anOwner = { id: 9, collection: 'users', role: 'owner' }
