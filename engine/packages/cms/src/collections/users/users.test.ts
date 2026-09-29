import { ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import { STAFF_ROLES } from '../../access/roles'
import { firstUserIsAdmin, keepAnAdminOnDelete, keepAnAdminOnUpdate } from './guards'
import { LOCK_TIME_MS, MAX_LOGIN_ATTEMPTS, Users } from './index'
import { rolesField } from './roles-field'

type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)

/** A request whose Local API answers `count` with `counts` in turn, `findByID` with `doc`. */
function fakeReq(counts: number[], doc: Record<string, unknown> = {}) {
  const execute = vi.fn(async () => ({ rows: [] }))
  const count = vi.fn(async () => ({ totalDocs: counts.shift() ?? 0 }))
  const req = {
    transactionID: 'tx-1',
    payload: {
      count,
      findByID: vi.fn(async () => doc),
      db: { sessions: { 'tx-1': { db: 'the-transaction' } }, execute },
    },
    t: (key: string) => key,
  } as unknown as PayloadRequest
  return { req, count, execute }
}

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

  it('offers exactly C1 STAFF_ROLES, several at once, contributor by default, only an admin setting them', () => {
    expect(rolesField).toMatchObject({
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
    })
    const field = rolesField as { options: Array<{ value: string }>; defaultValue: unknown }
    expect(field.options.map((option) => option.value)).toEqual([...STAFF_ROLES])
    expect(field.defaultValue).toEqual(['contributor'])
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

  it('is the only one: later accounts keep what they were given', async () => {
    const { req } = fakeReq([1])
    const data = await call(firstUserIsAdmin, {
      data: { roles: ['contributor'] },
      operation: 'create',
      req,
    })
    expect(data).toEqual({ roles: ['contributor'] })
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
