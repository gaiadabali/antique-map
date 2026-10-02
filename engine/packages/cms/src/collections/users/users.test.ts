import { Forbidden, ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  ADMINS_LOCK_KEY,
  firstUserIsOwner,
  keepAnOwnerInBulk,
  keepAnOwnerOnDelete,
  keepAnOwnerOnUpdate,
} from './guards'
import { LOCK_TIME_MS, MAX_LOGIN_ATTEMPTS, Users } from './index'
import { roleField, storeField } from './roles-field'
import { USER_ROLES } from './roles'

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
const anOwner = { id: 9, collection: 'users', role: 'owner' }

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

  it('offers exactly owner, editor and store, one per person, editor by default, only the owner setting them', async () => {
    expect(USER_ROLES).toEqual(['owner', 'editor', 'store'])
    expect(roleField).toMatchObject({ name: 'role', type: 'select', required: true })
    expect((roleField as { hasMany?: boolean }).hasMany).toBeUndefined()
    const field = roleField as {
      options: Array<{ value: string }>
      defaultValue: (args: { req: PayloadRequest }) => Promise<unknown>
    }
    expect(field.options.map((option) => option.value)).toEqual([...USER_ROLES])
    expect(await field.defaultValue({ req: fakeReq([1]).req })).toBe('editor')
    // Truthful on the create-first-user screen: that account becomes an owner.
    expect(await field.defaultValue({ req: fakeReq([0]).req })).toBe('owner')
    const as = (user: unknown) => ({ req: { user } }) as never
    for (const guarded of [roleField, storeField]) {
      const access = (guarded as { access: Record<string, (a: never) => boolean> }).access
      expect(access.update!(as({ collection: 'users', role: 'editor' }))).toBe(false)
      expect(access.update!(as({ collection: 'users', role: 'store', store: 1 }))).toBe(false)
      expect(access.create!(as({ collection: 'users', role: 'owner' }))).toBe(true)
      expect(access.update!(as({ collection: 'users', role: 'owner' }))).toBe(true)
    }
    expect(storeField).toMatchObject({ name: 'store', type: 'relationship', relationTo: 'stores' })
  })

  it('lets staff see themselves and the owner see everyone; the public nobody', () => {
    const read = Users.access!.read!
    const as = (user: unknown) => ({ req: { user } }) as never
    expect(read(as(null))).toBe(false)
    expect(read(as({ id: 4, collection: 'customers' }))).toBe(false)
    expect(read(as({ id: 4, collection: 'users', role: 'editor' }))).toEqual({
      id: { equals: 4 },
    })
    expect(read(as({ id: 5, collection: 'users', role: 'store', store: 1 }))).toEqual({
      id: { equals: 5 },
    })
    expect(read(as({ id: 1, collection: 'users', role: 'owner' }))).toBe(true)
    const create = Users.access!.create!
    expect(create(as({ id: 4, collection: 'users', role: 'editor' }))).toBe(false)
    expect(create(as({ id: 1, collection: 'users', role: 'owner' }))).toBe(true)
    expect(Users.access!.admin!(as({ collection: 'customers' }))).toBe(false)
  })
})

describe('the first user', () => {
  it('is an owner, counted under a transaction-scoped lock', async () => {
    const { req, execute } = fakeReq([0])
    const data = await call(firstUserIsOwner, {
      data: { role: 'editor' },
      operation: 'create',
      req,
    })
    expect(data).toEqual({ role: 'owner' })
    expect(execute).toHaveBeenCalledWith({
      db: 'the-transaction',
      raw: expect.stringMatching(/^SELECT pg_advisory_xact_lock\(-?\d+\)$/),
    })
  })

  it('is the only one: later accounts the owner or the Local API makes keep what they were given', async () => {
    for (const as of [{ user: anOwner }, { payloadAPI: 'local' }]) {
      const { req } = fakeReq([1], {}, as)
      const data = await call(firstUserIsOwner, {
        data: { role: 'editor' },
        operation: 'create',
        req,
      })
      expect(data).toEqual({ role: 'editor' })
    }
  })

  it('refuses the loser of a first-register race: a user exists, and nobody asked who may add one', async () => {
    const { req, execute } = fakeReq([1])
    await expect(
      call(firstUserIsOwner, { data: { role: 'owner' }, operation: 'create', req }),
    ).rejects.toBeInstanceOf(Forbidden)
    expect(execute).toHaveBeenCalledWith({
      db: 'the-transaction',
      raw: `SELECT pg_advisory_xact_lock(${ADMINS_LOCK_KEY})`,
    })
    const signedInEditor = fakeReq(
      [1],
      {},
      { user: { id: 2, collection: 'users', role: 'editor' } },
    )
    await expect(
      call(firstUserIsOwner, { data: {}, operation: 'create', req: signedInEditor.req }),
    ).rejects.toBeInstanceOf(Forbidden)
  })

  it('does not apply to updates', async () => {
    const { req, count } = fakeReq([0])
    await call(firstUserIsOwner, { data: { role: 'editor' }, operation: 'update', req })
    expect(count).not.toHaveBeenCalled()
  })
})

describe('the last owner', () => {
  const originalDoc = { id: 1, role: 'owner' }

  it('cannot lose the owner role', async () => {
    const { req } = fakeReq([0])
    await expect(
      call(keepAnOwnerOnUpdate, {
        data: { role: 'editor' },
        operation: 'update',
        originalDoc,
        req,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('can, while another owner remains', async () => {
    const { req } = fakeReq([1])
    const data = { role: 'editor' }
    expect(await call(keepAnOwnerOnUpdate, { data, operation: 'update', originalDoc, req })).toBe(
      data,
    )
  })

  it('takes the owners lock for any save of an owner’s role, even one keeping it (R1)', async () => {
    const { req, execute, count } = fakeReq([0])
    const data = { role: 'owner' }
    expect(await call(keepAnOwnerOnUpdate, { data, operation: 'update', originalDoc, req })).toBe(
      data,
    )
    expect(execute).toHaveBeenCalledWith({
      db: 'the-transaction',
      raw: `SELECT pg_advisory_xact_lock(${ADMINS_LOCK_KEY})`,
    })
    expect(count).not.toHaveBeenCalled()
    const editor = fakeReq([0])
    await call(keepAnOwnerOnUpdate, {
      data: { role: 'store' },
      operation: 'update',
      originalDoc: { id: 3, role: 'editor' },
      req: editor.req,
    })
    expect(editor.execute).not.toHaveBeenCalled()
  })

  it('is not consulted for an update that leaves the role alone', async () => {
    const { req, count } = fakeReq([0])
    await call(keepAnOwnerOnUpdate, {
      data: { name: 'New name' },
      operation: 'update',
      originalDoc,
      req,
    })
    expect(count).not.toHaveBeenCalled()
  })

  it('cannot be deleted; a non-owner can', async () => {
    await expect(
      call(keepAnOwnerOnDelete, { id: 1, req: fakeReq([0], { role: 'owner' }).req }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      call(keepAnOwnerOnDelete, { id: 2, req: fakeReq([0], { role: 'editor' }).req }),
    ).resolves.toBeUndefined()
  })
})

describe('the last owner, in bulk', () => {
  const where = { role: { equals: 'owner' } }

  it('refuses a bulk demotion or delete that would leave no owner', async () => {
    const docs = [
      { id: 1, role: 'owner' },
      { id: 2, role: 'owner' },
    ]
    for (const [operation, data] of [
      ['update', { role: 'editor' }],
      ['delete', undefined],
    ] as const) {
      const { req, count, execute } = fakeReq([0], {}, { docs })
      await expect(
        call(keepAnOwnerInBulk, { args: { where, data }, operation, req }),
      ).rejects.toBeInstanceOf(ValidationError)
      expect(execute).toHaveBeenCalled()
      expect(count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { and: [{ role: { equals: 'owner' } }, { id: { not_in: [1, 2] } }] },
        }),
      )
    }
  })

  it('lets it through while an owner outside the set remains', async () => {
    const { req } = fakeReq([1], {}, { docs: [{ id: 1, role: 'owner' }] })
    const args = { where, data: { role: 'editor' } }
    expect(await call(keepAnOwnerInBulk, { args, operation: 'update', req })).toBe(args)
  })

  it('leaves single-document operations and role-less updates to the other hooks', async () => {
    const { req, find } = fakeReq([0])
    const byId = { id: 1, data: { role: 'editor' } }
    expect(await call(keepAnOwnerInBulk, { args: byId, operation: 'update', req })).toBe(byId)
    const renames = { where, data: { name: 'x' } }
    expect(await call(keepAnOwnerInBulk, { args: renames, operation: 'update', req })).toBe(renames)
    const keepsOwner = { where, data: { role: 'owner' } }
    expect(await call(keepAnOwnerInBulk, { args: keepsOwner, operation: 'update', req })).toBe(
      keepsOwner,
    )
    expect(find).not.toHaveBeenCalled()
  })

  it('is wired as the collection’s beforeOperation hook', () => {
    expect(Users.hooks?.beforeOperation).toContain(keepAnOwnerInBulk)
  })
})
