/**
 * Test support only — the orders `*.db.test.ts` on the staff stack (`collections/users/
 * staff.test-support`: a pushed database with two stores, UBD-01 and SNR-01). Here: the two stores
 * made active with real pins (Ubud and Sanur), the owner's delivery table and welcome code in
 * `site-settings`, published products with stock where a test puts it, a signed bag cookie, and
 * a buyer's checkout details.
 */
import { invalidationBatch } from '@engine/cache'
import { makeProduct } from '../../collections/stock-levels/shop.test-support'
import type { StaffStack } from '../../collections/users/staff.test-support'
import { createBagCookieKey, serialiseBag, type BagLine } from '../pricing/bag'
import type { CreateOrderRequest } from './create-order'
import type { Pin } from './geo'

export const BAG_KEY = createBagCookieKey('orders-db-test-bag-cookie-key-0123456789')
export const PRICE = 95000
export const EXPIRY_MINUTES = 45
export const BANDS = [
  { upToKm: 5, feeIdr: 15000 },
  { upToKm: 10, feeIdr: 25000 },
  { upToKm: 30, feeIdr: 40000 },
]

/** Pins: the two stores, a buyer in central Ubud, one in Sanur, and places past the shop's reach. */
export const UBUD_STORE: Pin = { lat: -8.5069, lng: 115.2625 }
export const SANUR_STORE: Pin = { lat: -8.6913, lng: 115.2633 }
export const PIN = {
  ubud: { lat: -8.5193, lng: 115.2633 },
  sanur: { lat: -8.6801, lng: 115.2635 },
  /** Darwin: south of the Indonesia box. */
  darwin: { lat: -12.4634, lng: 130.8456 },
  /** Jakarta: inside Indonesia, far past the last band. */
  jakarta: { lat: -6.2088, lng: 106.8456 },
} as const

export type Shop = { ubud: number; sanur: number }

/** The stack's stores as the shop's two stores, the delivery table and the welcome code. */
export async function openShop(stack: StaffStack): Promise<Shop> {
  const { payload } = stack
  const [ubud, sanur] = stack.stores
  for (const [store, pin, area] of [
    [ubud, UBUD_STORE, 'Ubud'],
    [sanur, SANUR_STORE, 'Sanur'],
  ] as const) {
    await payload.update({
      collection: 'stores',
      id: store.id,
      data: { active: true, address: `Jl. Raya ${area} 1`, area, ...pin } as never,
    })
  }
  // A write outside a request hands its cache tags to a collector (`@engine/cache`'s invalidate()).
  await invalidationBatch().operation((context) =>
    payload.updateGlobal({
      context,
      slug: 'site-settings',
      data: {
        shop: {
          checkoutEnabled: true,
          delivery: { bands: BANDS, freeOverIdr: 500000 },
          welcomeDiscount: 'WELCOME10',
          orderExpiryMinutes: EXPIRY_MINUTES,
        },
      } as never,
    }),
  )
  await payload.create({
    collection: 'discounts',
    data: { code: 'WELCOME10', kind: 'percent', value: 10, active: true } as never,
  })
  return { ubud: ubud.id, sanur: sanur.id }
}

let sku = 0

/**
 * A published product (publishing through the API needs a category and an image, which these
 * tests do not exercise, so the status is set in SQL) with stock per store id.
 */
export async function product(
  stack: StaffStack,
  stock: Record<number, number>,
  variants: readonly string[] = [],
): Promise<{ id: number; stockRows: Record<number, number> }> {
  sku += 1
  const created = await makeProduct(stack.payload, `OEI-ORD-${sku}`, variants)
  await stack.pool.query(`UPDATE products SET _status = 'published' WHERE id = ${created.id}`)
  const stockRows: Record<number, number> = {}
  for (const [store, quantity] of Object.entries(stock)) {
    for (const variantSku of variants.length > 0 ? variants : [null]) {
      const row = (await stack.payload.create({
        collection: 'stock-levels',
        data: { store: Number(store), product: created.id, variantSku, quantity } as never,
      })) as unknown as { id: number }
      stockRows[Number(store)] = row.id
    }
  }
  return { id: created.id, stockRows }
}

/** The signed `cart` cookie for `lines`. */
export const bag = (...lines: BagLine[]) => serialiseBag(lines, BAG_KEY)

/** A buyer's checkout at `pin`. */
export function checkout(
  bagCookie: string,
  pin: Pin,
  extra: Partial<CreateOrderRequest> = {},
): CreateOrderRequest {
  return {
    bagCookie,
    details: {
      contact: {
        name: 'Made Buyer',
        whatsapp: '0812 3456 7890',
        email: ' Made@Example.test ',
        locale: 'en',
      },
      delivery: { address: 'Villa Kecil, Jl. Bisma 5', notes: 'Blue gate', ...pin },
    },
    expectedTotalIdr: null,
    ...extra,
  }
}

/** Readers for what the tests assert (ids are integers, interpolated safely). */
export function readers(pool: StaffStack['pool']) {
  const query = async (text: string) => (await pool.query(text)).rows
  return {
    quantity: async (id: number) =>
      Number((await query(`SELECT quantity FROM stock_levels WHERE id = ${id}`))[0]!.quantity),
    ordersFor: async (productId: number) =>
      Number(
        (
          await query(
            `SELECT count(DISTINCT _parent_id) AS n FROM orders_lines WHERE product_id = ${productId}`,
          )
        )[0]!.n,
      ),
    order: async (id: number) => (await query(`SELECT * FROM orders WHERE id = ${id}`))[0]!,
    lines: (id: number) =>
      query(`SELECT * FROM orders_lines WHERE _parent_id = ${id} ORDER BY _order`),
    history: (id: number) =>
      query(`SELECT * FROM orders_history WHERE _parent_id = ${id} ORDER BY _order`),
    usedCount: async (code: string) =>
      Number(
        (await query(`SELECT used_count FROM discounts WHERE code = '${code}'`))[0]!.used_count,
      ),
  }
}

export type Readers = ReturnType<typeof readers>
