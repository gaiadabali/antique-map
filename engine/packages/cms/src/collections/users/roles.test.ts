/**
 * The role vocabulary (`./roles`) and the one-store rule (`./store-rule`), without a database.
 */
import { ValidationError, type PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { firstUserIsOwner, keepAnOwnerOnUpdate } from './guards'
import { Users } from './index'
import { roleOf, storeOf } from './roles'
import { oneStoreForStoreStaff } from './store-rule'

type Hook = (args: never) => unknown
const call = (hook: Hook, args: Record<string, unknown>) => hook(args as never)
const req = { t: (key: string) => key } as unknown as PayloadRequest

describe('a role and a store', () => {
  it('reads a role and a store only off a staff user, and only known values', () => {
    expect(roleOf({ collection: 'users', role: 'owner' })).toBe('owner')
    expect(roleOf({ collection: 'users', role: 'admin' })).toBeNull()
    expect(roleOf({ collection: 'customers', role: 'owner' })).toBeNull()
    expect(storeOf({ collection: 'users', role: 'store', store: 7 })).toBe(7)
    expect(storeOf({ collection: 'users', role: 'store', store: { id: 8 } })).toBe(8)
    expect(storeOf({ collection: 'users', role: 'editor', store: 7 })).toBeNull()
    expect(storeOf({ collection: 'users', role: 'store' })).toBeNull()
  })
})

describe('a store user has exactly one store', () => {
  const run = async (data: object, originalDoc?: object) =>
    call(oneStoreForStoreStaff, { data, originalDoc, req })

  it('refuses a store user without a store, naming the field', async () => {
    await expect(run({ role: 'store' })).rejects.toBeInstanceOf(ValidationError)
    await expect(run({ store: null }, { role: 'store', store: 3 })).rejects.toBeInstanceOf(
      ValidationError,
    )
    expect(await run({ role: 'store', store: 3 })).toEqual({ role: 'store', store: 3 })
    expect(await run({ name: 'Ayu' }, { role: 'store', store: 3 })).toEqual({ name: 'Ayu' })
  })

  it('clears the store of anyone else, so none waits to come back with the role', async () => {
    expect(await run({ role: 'editor', store: 3 })).toEqual({ role: 'editor', store: null })
    expect(await run({ role: 'editor' }, { role: 'store', store: 3 })).toEqual({
      role: 'editor',
      store: null,
    })
    expect(await run({ role: 'owner' })).toEqual({ role: 'owner' })
  })

  it('runs after the first-user rule, before the last-owner rule', () => {
    expect(Users.hooks?.beforeChange).toEqual([
      firstUserIsOwner,
      oneStoreForStoreStaff,
      keepAnOwnerOnUpdate,
    ])
  })
})
