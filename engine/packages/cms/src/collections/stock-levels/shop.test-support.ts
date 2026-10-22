/**
 * Test support only — imported by the shop collections' `*.db.test.ts`, never by runtime code.
 *
 * The staff stack (`../users/staff.test-support`: a pushed database, two stores, one user per role
 * signed in over REST) plus what the shop's tests share: the constraint SQL checker, products, and
 * orders written as the server's order code writes them — through the Local API with access
 * overridden. Without `CMS_TEST_POSTGRES_URL` the tests that use it skip — a setup state.
 */
import { createHash, randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import type { Pool } from '../places/pushed-database.test-support'

type Doc = Record<string, unknown> & { id: number }

/** The SHA-256 hex of a fresh token: what `orders.trackingTokenHash` holds. */
export const tokenHash = () => createHash('sha256').update(randomBytes(16)).digest('hex')

/** The Postgres error a statement fails with: its code and constraint, or null when it succeeds. */
export async function sqlError(
  pool: Pool,
  text: string,
): Promise<{ code?: string; constraint?: string; message: string } | null> {
  try {
    await pool.query(text)
    return null
  } catch (error) {
    const pg = error as { code?: string; constraint?: string; message: string }
    return { code: pg.code, constraint: pg.constraint, message: pg.message }
  }
}

/** A draft product (publishing needs a category and an image), with variant SKUs when given. */
export async function makeProduct(
  payload: Payload,
  sku: string,
  variants: readonly string[] = [],
): Promise<Doc> {
  return (await payload.create({
    collection: 'products',
    data: {
      sku,
      name: `Product ${sku}`,
      price: 95000,
      variants: variants.map((variantSku) => ({ sku: variantSku, label: variantSku })),
      _status: 'draft',
    } as never,
  })) as unknown as Doc
}

let orderNumber = 100000

/** An order as the order code would write it: priced, assigned to `store`, holding `qty` units. */
export async function makeOrder(
  payload: Payload,
  input: {
    store: number
    product: number
    qty: number
    status?: string
    variantSku?: string | null
    unitPrice?: number
  },
): Promise<Doc> {
  const unitPrice = input.unitPrice ?? 95000
  const subtotal = unitPrice * input.qty
  orderNumber += 1
  return (await payload.create({
    collection: 'orders',
    data: {
      number: orderNumber,
      lines: [
        {
          product: input.product,
          variantSku: input.variantSku ?? null,
          sku: 'SKU',
          name: 'A print',
          unitPrice,
          qty: input.qty,
          lineTotal: subtotal,
        },
      ],
      contact: { name: 'Buyer', whatsapp: '+6281234567890', email: 'b@example.test', locale: 'en' },
      delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
      store: input.store,
      totals: { subtotal, discount: 0, deliveryFee: 15000, total: subtotal + 15000 },
      status: input.status ?? 'paid',
      trackingTokenHash: tokenHash(),
    } as never,
  })) as unknown as Doc
}
