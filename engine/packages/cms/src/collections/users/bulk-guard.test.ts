/**
 * The bulk last-owner guard without a database (`./guards` `keepAnOwnerInBulk`); its database and
 * REST proof is `./bulk-guard.db.test.ts`.
 */
import { ValidationError } from 'payload'
import { describe, expect, it } from 'vitest'

import { anOwner, call, fakeReq } from './fake-req.test-support'
import { keepAnOwnerInBulk } from './guards'
import { Users } from './index'

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
        call(keepAnOwnerInBulk, { args: { where, data }, operation, req, overrideAccess: true }),
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
    expect(
      await call(keepAnOwnerInBulk, { args, operation: 'update', req, overrideAccess: true }),
    ).toBe(args)
  })

  it('leaves single-document operations and role-less updates to the other hooks', async () => {
    const { req, find } = fakeReq([0])
    const byId = { id: 1, data: { role: 'editor' } }
    expect(
      await call(keepAnOwnerInBulk, { args: byId, operation: 'update', req, overrideAccess: true }),
    ).toBe(byId)
    const renames = { where, data: { name: 'x' } }
    expect(
      await call(keepAnOwnerInBulk, {
        args: renames,
        operation: 'update',
        req,
        overrideAccess: true,
      }),
    ).toBe(renames)
    const keepsOwner = { where, data: { role: 'owner' } }
    expect(
      await call(keepAnOwnerInBulk, {
        args: keepsOwner,
        operation: 'update',
        req,
        overrideAccess: true,
      }),
    ).toBe(keepsOwner)
    expect(find).not.toHaveBeenCalled()
  })

  it('hands a caller access will refuse straight on: no lock, no read (review of 2.4)', async () => {
    const callers = [
      null,
      { id: 2, collection: 'users', role: 'editor' },
      { id: 3, collection: 'users', role: 'store', store: 1 },
    ]
    for (const user of callers) {
      for (const [operation, data] of [
        ['update', { role: 'editor' }],
        ['delete', undefined],
      ] as const) {
        const { req, count, execute, find } = fakeReq(
          [0],
          {},
          { user, docs: [{ id: 1, role: 'owner' }] },
        )
        const args = { where, data }
        expect(await call(keepAnOwnerInBulk, { args, operation, req, overrideAccess: false })).toBe(
          args,
        )
        expect(execute).not.toHaveBeenCalled()
        expect(find).not.toHaveBeenCalled()
        expect(count).not.toHaveBeenCalled()
      }
    }
    // The owner, whom access lets through, is judged.
    const owner = fakeReq([0], {}, { user: anOwner, docs: [{ id: 9, role: 'owner' }] })
    await expect(
      call(keepAnOwnerInBulk, {
        args: { where, data: { role: 'editor' } },
        operation: 'update',
        req: owner.req,
        overrideAccess: false,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(owner.execute).toHaveBeenCalled()
  })

  it('is wired as the collection’s beforeOperation hook', () => {
    expect(Users.hooks?.beforeOperation).toContain(keepAnOwnerInBulk)
  })
})
