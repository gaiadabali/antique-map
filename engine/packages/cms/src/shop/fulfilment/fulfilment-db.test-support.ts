/**
 * Test support only — the fulfilment `*.db.test.ts` on the staff stack (`collections/users/
 * staff.test-support`: a pushed database, stores UBD-01 and SNR-01, an owner, an editor and a
 * store user of UBD-01), with the two stores opened as the shop's (`../orders/orders-db.test-
 * support`). Here: an order written as the order code writes one — its units already taken from
 * its store's `quantity` — the actors as `req.user` carries them, an in-memory image store, and
 * readers for what the tests assert.
 */
import type { StaffStack } from '../../collections/users/staff.test-support'
import { tokenHash } from '../../collections/stock-levels/shop.test-support'
import type { OrderStatus } from '../../collections/orders/statuses'
import { product } from '../orders/orders-db.test-support'
import type { DriverImageStore } from './image-store'
import type { FulfilmentActor } from './types'

let orderNumber = 700000

export type Placed = {
  id: number
  /** The stock-levels row id per store id, per line, in line order. */
  stock: Array<Record<number, number>>
  products: number[]
}

/**
 * An order at `store` in `status`, one line per entry of `lines`: a fresh product per line whose
 * stock rows hold `stock[storeId]` — what is left after this order took its units.
 */
export async function placeOrder(
  stack: StaffStack,
  input: {
    store: number
    status: OrderStatus
    lines: ReadonlyArray<{ qty: number; stock: Record<number, number> }>
  },
): Promise<Placed> {
  const made: Array<Awaited<ReturnType<typeof product>>> = []
  for (const line of input.lines) made.push(await product(stack, line.stock))
  orderNumber += 1
  const lines = input.lines.map((line, i) => ({
    product: made[i]!.id,
    sku: `FUL-${orderNumber}-${i}`,
    name: 'A batik scarf',
    unitPrice: 95000,
    qty: line.qty,
    lineTotal: 95000 * line.qty,
  }))
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
  const order = (await stack.payload.create({
    collection: 'orders',
    data: {
      number: orderNumber,
      lines,
      contact: { name: 'Buyer', whatsapp: '+6281234567890', email: 'b@example.test', locale: 'en' },
      delivery: { address: 'Jl. Bisma 5, Ubud', lat: -8.5193, lng: 115.2633 },
      store: input.store,
      totals: { subtotal, discount: 0, deliveryFee: 15000, total: subtotal + 15000 },
      status: input.status,
      trackingTokenHash: tokenHash(),
    } as never,
  })) as unknown as { id: number }
  return { id: order.id, stock: made.map((m) => m.stockRows), products: made.map((m) => m.id) }
}

/** The stack's users as `req.user` carries them: with `collection: 'users'`. */
export function actors(stack: StaffStack) {
  const as = (role: 'owner' | 'editor' | 'store'): FulfilmentActor => ({
    ...stack.users[role],
    collection: 'users',
  })
  return { owner: as('owner'), editor: as('editor'), store: as('store') }
}

/** An image store in memory, counting what it was asked to do. */
export function memoryStore() {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>()
  const calls = { put: 0, remove: 0 }
  const store: DriverImageStore = {
    async put(key, bytes, contentType) {
      calls.put += 1
      objects.set(key, { bytes, contentType })
    },
    async remove(key) {
      calls.remove += 1
      objects.delete(key)
    },
    list: async (prefix) => [...objects.keys()].filter((key) => key.startsWith(prefix)),
    presignGet: async (key, ttl) => `memory://${key}?ttl=${ttl}`,
  }
  return { store, objects, calls, deps: { store: () => store } }
}

export function readers(stack: StaffStack) {
  const query = async (text: string) => (await stack.pool.query(text)).rows
  return {
    quantity: async (id: number) =>
      Number((await query(`SELECT quantity FROM stock_levels WHERE id = ${id}`))[0]!.quantity),
    order: async (id: number) => (await query(`SELECT * FROM orders WHERE id = ${id}`))[0]!,
    history: (id: number) =>
      query(
        `SELECT "from"::text AS "from", "to"::text AS "to", actor::text AS actor, by_id, note
           FROM orders_history WHERE _parent_id = ${id} ORDER BY _order`,
      ),
    /** Back-dates every history row of the order by `days`. */
    age: (id: number, days: number) =>
      query(`UPDATE orders_history SET at = at - interval '${days} days' WHERE _parent_id = ${id}`),
  }
}
