import { Forbidden, ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { STAFF_ROLES } from '../../access/roles'
import {
  ADMINS_LOCK_KEY,
  firstUserIsAdmin,
  keepAnAdminInBulk,
  keepAnAdminOnDelete,
  keepAnAdminOnUpdate,
} from './guards'
import { LOCK_TIME_MS, MAX_LOGIN_ATTEMPTS, Users } from './index'
import { rolesField } from './roles-field'

type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)

/**
 * A request whose Local API answers `count` with `counts` in turn, `findByID` with `doc` and `find`
 * with `docs`; `as` sets who is asking and through which API.
 */
function fakeReq(
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
const anAdmin = { id: 9, collection: 'users', roles: ['admin'] }

describe('the users collection', () => {
  it('is staff, with sessions and a lockout after five failures', () => {
    expect(Users.slug).toBe('users')
    expect(Users.auth).toMatchObject({
      maxLoginAttempts: MAX_LOGIN_ATTEMPTS,
      lockTime: LOCK_TIME_MS,
      useSessions: true,
    })
    expect(MAX_LOGIN_ATTEMPTS).toBe(5)
    expect(LOCK_TIME_MS).toBe(15 * 60 * 1000)
  })

  it('offers exactly C1 STAFF_ROLES, several at once, contributor by default, only an admin setting them', async () => {
    expect(rolesField).toMatchObject({
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
    })
    const field = rolesField as {
      options: Array<{ value: string }>
      defaultValue: (args: { req: PayloadRequest }) => Promise<unknown>
    }
    expect(field.options.map((option) => option.value)).toEqual([...STAFF_ROLES])
    expect(await field.defaultValue({ req: fakeReq([1]).req })).toEqual(['contributor'])
    // Truthful on the create-first-user screen: that account becomes an admin.
    expect(await field.defaultValue({ req: fakeReq([0]).req })).toEqual(['admin'])
    const access = (rolesField as { access: Record<string, (a: never) => boolean> }).access
    const as = (user: unknown) => ({ req: { user } }) as never
    expect(access.update!(as({ collection: 'users', roles: ['manager'] }))).toBe(false)
    expect(access.update!(as({ collection: 'users', roles: ['admin'] }))).toBe(true)
  })

  it('lets staff see themselves and an admin see everyone; the public nobody', () => {
    const read = Users.access!.read!
    const as = (user: unknown) => ({ req: { user } }) as never
    expect(read(as(null))).toBe(false)
    expect(read(as({ id: 4, collection: 'customers' }))).toBe(false)
    expect(read(as({ id: 4, collection: 'users', roles: ['editor'] }))).toEqual({
      id: { equals: 4 },
    })
    expect(read(as({ id: 1, collection: 'users', roles: ['admin'] }))).toBe(true)
    expect(Users.access!.admin!(as({ collection: 'customers' }))).toBe(false)
  })
})

describe('the first user', () => {
  it('is an admin, counted under a transaction-scoped lock', async () => {
    const { req, execute } = fakeReq([0])
    const data = await call(firstUserIsAdmin, {
      data: { roles: ['contributor'] },
      operation: 'create',
      req,
    })
    expect(data).toEqual({ roles: ['admin'] })
    expect(execute).toHaveBeenCalledWith({
      db: 'the-transaction',
      raw: expect.stringMatching(/^SELECT pg_advisory_xact_lock\(-?\d+\)$/),
    })
  })

  it('is the only one: later accounts an admin or the Local API makes keep what they were given', async () => {
    for (const as of [{ user: anAdmin }, { payloadAPI: 'local' }]) {
      const { req } = fakeReq([1], {}, as)
      const data = await call(firstUserIsAdmin, {
        data: { roles: ['contributor'] },
        operation: 'create',
        req,
      })
      expect(data).toEqual({ roles: ['contributor'] })
    }
  })

  it('refuses the loser of a first-register race: a user exists, and nobody asked who may add one', async () => {
    const { req, execute } = fakeReq([1])
    await expect(
      call(firstUserIsAdmin, { data: { roles: ['admin'] }, operation: 'create', req }),
    ).rejects.toBeInstanceOf(Forbidden)
    expect(execute).toHaveBeenCalledWith({
      db: 'the-transaction',
      raw: `SELECT pg_advisory_xact_lock(${ADMINS_LOCK_KEY})`,
    })
    const signedInEditor = fakeReq(
      [1],
      {},
      { user: { id: 2, collection: 'users', roles: ['editor'] } },
    )
    await expect(
      call(firstUserIsAdmin, { data: {}, operation: 'create', req: signedInEditor.req }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('does not apply to updates', async () => {
    const { req, count } = fakeReq([0])
    await call(firstUserIsAdmin, { data: { roles: ['editor'] }, operation: 'update', req })
    expect(count).not.toHaveBeenCalled()
  })
})

describe('the last admin', () => {
  const originalDoc = { id: 1, roles: ['admin'] }

  it('cannot lose the admin role', async () => {
    const { req } = fakeReq([0])
    await expect(
      call(keepAnAdminOnUpdate, {
        data: { roles: ['editor'] },
        operation: 'update',
        originalDoc,
        req,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('can, while another admin remains', async () => {
    const { req } = fakeReq([1])
    const data = { roles: ['editor'] }
    expect(await call(keepAnAdminOnUpdate, { data, operation: 'update', originalDoc, req })).toBe(
      data,
    )
  })

  it('is not consulted for an update that leaves roles alone', async () => {
    const { req, count } = fakeReq([0])
    await call(keepAnAdminOnUpdate, {
      data: { name: 'New name' },
      operation: 'update',
      originalDoc,
      req,
    })
    expect(count).not.toHaveBeenCalled()
  })

  it('cannot be deleted; a non-admin can', async () => {
    await expect(
      call(keepAnAdminOnDelete, { id: 1, req: fakeReq([0], { roles: ['admin'] }).req }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      call(keepAnAdminOnDelete, { id: 2, req: fakeReq([0], { roles: ['editor'] }).req }),
    ).resolves.toBeUndefined()
  })
})

describe('the last admin, in bulk', () => {
  const where = { roles: { in: ['admin'] } }

  it('refuses a bulk demotion or delete that would leave no admin', async () => {
    const docs = [
      { id: 1, roles: ['admin'] },
      { id: 2, roles: ['admin', 'editor'] },
    ]
    for (const [operation, data] of [
      ['update', { roles: ['editor'] }],
      ['delete', undefined],
    ] as const) {
      const { req, count, execute } = fakeReq([0], {}, { docs })
      await expect(
        call(keepAnAdminInBulk, { args: { where, data }, operation, req }),
      ).rejects.toBeInstanceOf(ValidationError)
      expect(execute).toHaveBeenCalled()
      expect(count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { and: [{ roles: { in: ['admin'] } }, { id: { not_in: [1, 2] } }] },
        }),
      )
    }
  })

  it('lets it through while an admin outside the set remains', async () => {
    const { req } = fakeReq([1], {}, { docs: [{ id: 1, roles: ['admin'] }] })
    const args = { where, data: { roles: ['editor'] } }
    expect(await call(keepAnAdminInBulk, { args, operation: 'update', req })).toBe(args)
  })

  it('leaves single-document operations and role-less updates to the other hooks', async () => {
    const { req, find } = fakeReq([0])
    const byId = { id: 1, data: { roles: ['editor'] } }
    expect(await call(keepAnAdminInBulk, { args: byId, operation: 'update', req })).toBe(byId)
    const renames = { where, data: { name: 'x' } }
    expect(await call(keepAnAdminInBulk, { args: renames, operation: 'update', req })).toBe(renames)
    const keepsAdmin = { where, data: { roles: ['admin'] } }
    expect(await call(keepAnAdminInBulk, { args: keepsAdmin, operation: 'update', req })).toBe(
      keepsAdmin,
    )
    expect(find).not.toHaveBeenCalled()
  })

  it('is wired as the collection’s beforeOperation hook', () => {
    expect(Users.hooks?.beforeOperation).toContain(keepAnAdminInBulk)
  })
})
