/**
 * Who reaches orders, stock rows and the payment ledger, without a database (CONTENT-MODEL.md §7;
 * SECURITY.md §2.2 R2): store staff get a `Where` on their own store for orders and stock, so
 * every list, count and lookup is scoped; nobody creates or deletes an order or a payment event
 * through the API; the ledger is the owner's to read. The database proofs are the collections'
 * `*.db.test.ts`.
 */
import { describe, expect, it } from 'vitest'

import { PAYMENT_EVENTS_ACCESS, PaymentEvents } from '../payment-events'
import { APPEND_ONLY_MESSAGE, refuseUpdateAndDelete } from '../payment-events/append-only'
import { STOCK_LEVELS_ACCESS } from '../stock-levels/access'
import { ORDERS_ACCESS, ownStoreOrders } from './access'
import { Orders } from './index'
import { HOLDING_STATUSES, ORDER_STATUSES } from './statuses'

const as = (user: unknown) => ({ req: { user } }) as never
const owner = { id: 1, collection: 'users', role: 'owner' }
const editor = { id: 2, collection: 'users', role: 'editor' }
const storeUser = { id: 3, collection: 'users', role: 'store', store: 7 }
const storeless = { ...storeUser, store: null }

describe('orders', () => {
  it('shows the owner and editors every order, store staff their store’s, others none', () => {
    expect(Orders.access).toBe(ORDERS_ACCESS)
    for (const user of [owner, editor]) expect(ownStoreOrders(as(user))).toBe(true)
    expect(ownStoreOrders(as(storeUser))).toEqual({ store: { equals: 7 } })
    expect(ownStoreOrders(as({ ...storeUser, store: { id: 7 } }))).toEqual({ store: { equals: 7 } })
    for (const user of [storeless, null, { id: 5, collection: 'customers', role: 'owner' }]) {
      expect(ownStoreOrders(as(user))).toBe(false)
    }
  })

  it('lets nobody create or delete one through the API', () => {
    for (const user of [owner, editor, storeUser, null]) {
      expect(ORDERS_ACCESS.create(as(user))).toBe(false)
      expect(ORDERS_ACCESS.delete(as(user))).toBe(false)
    }
  })

  it('holds stock from payment to the driver’s collection, and never after', () => {
    expect(HOLDING_STATUSES).toEqual(['pending_payment', 'paid', 'processing', 'waiting_driver'])
    expect(ORDER_STATUSES.slice(0, 4)).toEqual([...HOLDING_STATUSES])
  })
})

describe('stock levels', () => {
  it('scope store staff to their own store’s rows, for reading and counting', () => {
    for (const operation of ['read', 'update'] as const) {
      const access = STOCK_LEVELS_ACCESS[operation]
      expect(access(as(owner))).toBe(true)
      expect(access(as(editor))).toBe(true)
      expect(access(as(storeUser))).toEqual({ store: { equals: 7 } })
      expect(access(as(storeless))).toBe(false)
      expect(access(as(null))).toBe(false)
    }
  })

  it('are created and deleted by the owner alone', () => {
    for (const operation of ['create', 'delete'] as const) {
      expect(STOCK_LEVELS_ACCESS[operation](as(owner))).toBe(true)
      for (const user of [editor, storeUser, null]) {
        expect(STOCK_LEVELS_ACCESS[operation](as(user))).toBe(false)
      }
    }
  })
})

describe('payment events', () => {
  it('are read by the owner alone and written by nobody through the API', () => {
    expect(PaymentEvents.access).toBe(PAYMENT_EVENTS_ACCESS)
    expect(PAYMENT_EVENTS_ACCESS.read(as(owner))).toBe(true)
    for (const user of [editor, storeUser, null]) {
      expect(PAYMENT_EVENTS_ACCESS.read(as(user))).toBe(false)
    }
    for (const operation of ['create', 'update', 'delete'] as const) {
      for (const user of [owner, editor, storeUser, null]) {
        expect(PAYMENT_EVENTS_ACCESS[operation](as(user))).toBe(false)
      }
    }
  })

  it('refuse an update or a delete in a hook, whatever the access, and pass the rest', () => {
    const args = { id: 1 }
    for (const operation of ['update', 'delete'] as const) {
      expect(() => refuseUpdateAndDelete({ args, operation } as never)).toThrow(APPEND_ONLY_MESSAGE)
    }
    for (const operation of ['create', 'read', 'count'] as const) {
      expect(refuseUpdateAndDelete({ args, operation } as never)).toBe(args)
    }
  })
})
