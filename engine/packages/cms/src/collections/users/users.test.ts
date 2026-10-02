import { Forbidden, ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { anOwner, call, fakeReq } from './fake-req.test-support'
import {
  ADMINS_LOCK_KEY,
  firstUserIsOwner,
  keepAnOwnerOnDelete,
  keepAnOwnerOnUpdate,
} from './guards'
import { LOCK_TIME_MS, MAX_LOGIN_ATTEMPTS, Users } from './index'
import { roleField, storeField } from './roles-field'
import { USER_ROLES } from './roles'

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
