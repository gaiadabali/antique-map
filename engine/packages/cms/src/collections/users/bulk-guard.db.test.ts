/**
 * The bulk last-owner guard on a real Postgres, over REST (senior-be review of 2.4, MUST-FIX):
 * Payload 3.90 runs `beforeOperation` before collection access on a bulk update or delete, so the
 * guard must hand a caller access will refuse straight on. An anonymous visitor, an editor and a
 * store user each send a bulk PATCH and a bulk DELETE whose `where` matches every owner, while
 * another connection holds `ADMINS_LOCK_KEY`: each is answered at once by access — never a 400
 * that says the `where` covered every owner, and never a wait on the lock. Access answers a
 * DELETE 403 (owner-only) and an anonymous PATCH 403; an editor's or a store user's PATCH is
 * scoped by `selfOrOwner` to their own row, which no owner `where` matches: 200, nothing changed.
 * Then the owner's own bulk demotion of every owner is still judged (400), so the guard was not
 * simply switched off.
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { ADMINS_LOCK_KEY } from './guards'
import { server, startStaffStack, type StaffStack } from './staff.test-support'

type Client = { query: (text: string) => Promise<unknown>; release: () => void }
type PgPool = { connect: () => Promise<Client>; end: () => Promise<void> }

/** Every owner, as a REST `where`. */
const EVERY_OWNER = '/api/users?where[role][equals]=owner'
/** Longer than any refusal takes, far shorter than a wait on a held lock (the test's own budget). */
const PROMPT_MS = 3_000

const within = <T>(ms: number, run: Promise<T>) =>
  Promise.race([run, new Promise<'waited'>((resolve) => setTimeout(() => resolve('waited'), ms))])

type Answer = Awaited<ReturnType<StaffStack['rest']>>

/** Access's own answer, never the guard's: 403, or an editor's or store user's empty PATCH. */
function expectAccessAnswer(answer: Answer, method: 'PATCH' | 'DELETE', as?: string): void {
  const who = `${method} as ${as ?? 'anonymous'}`
  if (method === 'DELETE' || as === undefined) {
    expect(answer.status, who).toBe(403)
    return
  }
  expect(answer.status, who).toBe(200)
  expect(answer.body?.docs, who).toEqual([])
}

describe.skipIf(!server)('the bulk owner guard refuses before it locks or reads', () => {
  let stack: StaffStack
  let holder: PgPool
  let held: Client

  beforeAll(async () => {
    stack = await startStaffStack('cms_users_bulk_test', (config, key) =>
      getPayload({ config, key }),
    )
    // A second connection to the test's own database, to hold the lock the guard would take.
    const db = stack.payload.db as unknown as {
      pg: { Pool: new (o: object) => PgPool }
      poolOptions: { connectionString: string }
    }
    holder = new db.pg.Pool({ connectionString: db.poolOptions.connectionString })
  }, 180_000)
  afterAll(async () => {
    held?.release()
    await holder?.end()
    await stack?.stop()
  }, 60_000)

  const owners = async () =>
    Number(
      (
        (await stack.pool.query(`SELECT count(*) AS n FROM users WHERE role = 'owner'`)) as {
          rows: Array<{ n: string }>
        }
      ).rows[0]!.n,
    )

  it('answers anonymous, editor and store callers by access at once, while the owners lock is held', async () => {
    held = await holder.connect()
    await held.query(`SELECT pg_advisory_lock(${ADMINS_LOCK_KEY})`)
    try {
      for (const as of [undefined, 'editor', 'store'] as const) {
        for (const [method, json] of [
          ['PATCH', { role: 'editor' }],
          ['DELETE', undefined],
        ] as const) {
          const answer = await within(PROMPT_MS, stack.rest(method, EVERY_OWNER, { as, json }))
          // `waited`: the guard took the lock for a caller access then refuses.
          expect(answer, `${method} as ${as ?? 'anonymous'}`).not.toBe('waited')
          expectAccessAnswer(answer as Answer, method, as)
        }
      }
    } finally {
      await held.query(`SELECT pg_advisory_unlock(${ADMINS_LOCK_KEY})`)
    }
    expect(await owners()).toBe(1)
  }, 60_000)

  it('still never answers them 400 once the lock is free — the 400 is the owner’s alone', async () => {
    for (const as of [undefined, 'editor', 'store'] as const) {
      expectAccessAnswer(await stack.rest('DELETE', EVERY_OWNER, { as }), 'DELETE', as)
      const patch = await stack.rest('PATCH', EVERY_OWNER, { as, json: { role: 'store' } })
      expectAccessAnswer(patch, 'PATCH', as)
    }
    const own = await stack.rest('PATCH', EVERY_OWNER, { as: 'owner', json: { role: 'editor' } })
    expect(own.status).toBe(400)
    expect(JSON.stringify(own.body)).toMatch(/only owner/)
    expect(await owners()).toBe(1)
  }, 60_000)
})
