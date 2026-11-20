/**
 * Who reaches `stores` (CONTENT-MODEL.md §7; SECURITY.md §2.2), without a database: the owner
 * manages stores, an editor reads every store, a store user reads only their own — by a `Where`,
 * so lists and counts are scoped too — and the public reads active, listed stores alone. The
 * database proof is `./stores.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { PUBLIC_STORES, readStores, Stores, STORES_ACCESS } from './index'

const as = (user: unknown) => ({ req: { user } }) as never
const owner = { id: 1, collection: 'users', role: 'owner' }
const editor = { id: 2, collection: 'users', role: 'editor' }
const storeUser = { id: 3, collection: 'users', role: 'store', store: 7 }

describe('reading stores', () => {
  it('shows the owner and an editor every store', () => {
    expect(readStores(as(owner))).toBe(true)
    expect(readStores(as(editor))).toBe(true)
  })

  it('shows a store user their own store alone, by its id, the relation stored or populated', () => {
    expect(readStores(as(storeUser))).toEqual({ id: { equals: 7 } })
    expect(readStores(as({ ...storeUser, store: { id: 7, code: 'UBD-01' } }))).toEqual({
      id: { equals: 7 },
    })
  })

  it('shows a store user without a store nothing', () => {
    expect(readStores(as({ ...storeUser, store: null }))).toBe(false)
  })

  it('shows the public, an unknown role or another collection only active, listed stores', () => {
    for (const user of [
      null,
      { id: 4, collection: 'users', role: 'admin' },
      { id: 5, collection: 'customers', role: 'owner' },
    ]) {
      expect(readStores(as(user))).toEqual(PUBLIC_STORES)
    }
    expect(PUBLIC_STORES).toEqual({
      and: [{ active: { equals: true } }, { listed: { equals: true } }],
    })
  })
})

describe('writing stores', () => {
  it('is the owner’s alone: no editor, store user or visitor creates, updates or deletes one', () => {
    expect(Stores.access).toBe(STORES_ACCESS)
    for (const operation of ['create', 'update', 'delete'] as const) {
      expect(STORES_ACCESS[operation](as(owner))).toBe(true)
      for (const user of [editor, storeUser, null]) {
        expect(STORES_ACCESS[operation](as(user))).toBe(false)
      }
    }
  })
})
