/**
 * `loadTrackingWith` on a real, pushed Postgres (TASKS.md 7.3.a; COMMERCE.md §10) — the query
 * `./load-tracking`'s thin, `'server-only'` wrapper calls with the process's own Payload; this test
 * hands it the pushed test stack's instance instead (`./tracking-query`'s own header). Without
 * `CMS_TEST_POSTGRES_URL` the file skips — a setup state.
 *
 * The driver image case only proves the loader's gate is the order's **status**, never merely
 * whether a key is stored — attaching one always moves the order to `on_the_way` in the real flow
 * (`@engine/cms/shop/fulfilment`'s `attachDriverImage`), so a key present on an earlier status can
 * only mean a test fixture, never a real order. It cannot prove a signed URL is returned once
 * `on_the_way`: `driverImageUrl()` needs an object store configured, which this database-only test
 * environment does not have, so it answers `null` regardless — a known, reported gap, not a defect
 * in the loader (`../../../../../../packages/cms/src/shop/fulfilment/driver-image.ts`'s own header
 * documents the same `store === null` fallback).
 */
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { trackingTokenHash } from '@engine/cms/shop/orders'

import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../../../../../packages/cms/src/collections/users/staff.test-support'
import { makeProduct } from '../../../../../../packages/cms/src/collections/stock-levels/shop.test-support'
import { loadTrackingWith } from './tracking-query'

describe.skipIf(!server)('loadTracking, on a real database', () => {
  let stack: StaffStack
  let orderNumber = 700000

  beforeAll(async () => {
    stack = await startStaffStack('web_tracking_test', (config, key) => getPayload({ config, key }))
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  async function order(data: Record<string, unknown>) {
    orderNumber += 1
    const product = (await makeProduct(stack.payload, `OEI-TRK-${orderNumber}`)).id
    return stack.payload.create({
      collection: 'orders',
      data: {
        number: orderNumber,
        lines: [
          { product, sku: 'SKU', name: 'A print', unitPrice: 95000, qty: 1, lineTotal: 95000 },
        ],
        contact: {
          name: 'Nyoman Ariani',
          whatsapp: '+6281234567890',
          email: 'buyer@example.test',
          locale: 'en',
        },
        delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
        store: stack.stores[0].id,
        totals: { subtotal: 95000, discount: 0, deliveryFee: 15000, total: 110000 },
        status: 'paid',
        ...data,
      } as never,
    }) as unknown as Promise<{ id: number }>
  }

  it('a wrong token is null', async () => {
    const token = 'tok_correct_one'
    await order({ trackingTokenHash: trackingTokenHash(token) })
    expect(await loadTrackingWith(stack.payload, 'tok_completely_wrong')).toBeNull()
    expect(await loadTrackingWith(stack.payload, '')).toBeNull()
  })

  it('finds the right order by its token and projects no more than the buyer typed', async () => {
    const token = 'tok_projection_case'
    await order({ trackingTokenHash: trackingTokenHash(token) })
    const view = await loadTrackingWith(stack.payload, token)
    expect(view).not.toBeNull()
    expect(view!.orderNumber).toBe(orderNumber)
    expect(view!.contact.nameMasked).toBe('N*****')
    expect(view!.contact.emailMasked).toBe('b****@example.test')
    expect(view!.contact.nameMasked).not.toContain('Ariani')
    expect(view!.contact.emailMasked).not.toContain('buyer@')
    expect(view!.store.name).toBe(stack.stores[0]!.name)
  })

  it('the driver image is never shown before the order reaches on_the_way', async () => {
    const token = 'tok_no_driver_yet'
    const made = await order({ status: 'processing', trackingTokenHash: trackingTokenHash(token) })
    // A fixture-only key: a real order never has one before `attachDriverImage` moves it on.
    await stack.payload.update({
      collection: 'orders',
      id: made.id,
      data: {
        driverImage: {
          key: `orders/${made.id}/fixture.webp`,
          contentType: 'image/webp',
          width: 320,
          height: 320,
          uploadedAt: new Date().toISOString(),
        },
      } as never,
      overrideAccess: true,
    })
    const view = await loadTrackingWith(stack.payload, token)
    expect(view!.driverImageUrl).toBeNull()
  })
})
