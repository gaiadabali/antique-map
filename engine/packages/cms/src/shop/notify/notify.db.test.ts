/**
 * `notifyOrderEvent` and the orders `afterChange` hook, on a real Postgres (TASKS.md 7.3.b): a
 * status move sends the buyer one email, a newly `paid` order also emails the store's users, and
 * replaying the same move — `from === to`, same as a retried hook — sends nothing. A fake
 * transport stands in for SMTP throughout; `setMailTransport(null)` in `afterEach` returns the
 * real one so no other file in the run is affected. Without `CMS_TEST_POSTGRES_URL` it skips.
 */
import { createHash, randomBytes } from 'node:crypto'

import { getPayload } from 'payload'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { makeProduct, tokenHash } from '../../collections/stock-levels/shop.test-support'
import {
  server,
  startStaffStack,
  type StaffStack,
} from '../../collections/users/staff.test-support'
import { orderLinkKeyFromEnv, sealToken } from '../orders/link-key'
import { setMailTransport, type MailMessage } from './transport'

// `notifyOrderEvent` opens `trackingTokenEnc` unconditionally once it is set (`../orders/link-key`):
// a fixed test key, same as `../orders/orders-db.test-support`, unless the worktree's own is set.
process.env.ORDER_LINK_KEY ??= createHash('sha256')
  .update('notify-db-test-order-link-key')
  .digest()
  .toString('base64url')
// The emails' origin (siteOrigin reads the hosts): never a relative link, so a host is needed.
process.env.GALLERY_HOSTS ??= 'gallery.localhost'
process.env.SHOP_HOSTS ??= 'shop.localhost'

describe.skipIf(!server)('order notifications, on a real database', () => {
  let stack: StaffStack
  let sent: MailMessage[]

  beforeAll(async () => {
    stack = await startStaffStack('cms_notify_test', (config, key) => getPayload({ config, key }))
  }, 180_000)
  afterAll(() => stack?.stop(), 60_000)

  afterEach(() => setMailTransport(null))

  let orderNumber = 800000
  async function pendingOrder() {
    orderNumber += 1
    const product = (await makeProduct(stack.payload, `OEI-NOTIFY-${orderNumber}`)).id
    const token = randomBytes(32).toString('base64url')
    const order = (await stack.payload.create({
      collection: 'orders',
      data: {
        number: orderNumber,
        lines: [
          {
            product,
            sku: `OEI-NOTIFY-${orderNumber}`,
            name: 'A tote bag',
            unitPrice: 95000,
            qty: 1,
            lineTotal: 95000,
          },
        ],
        contact: {
          name: 'Buyer',
          whatsapp: '+6281234567890',
          email: 'buyer@example.test',
          locale: 'en',
        },
        delivery: { address: 'Jl. Raya Ubud 1', lat: -8.5, lng: 115.26 },
        store: stack.stores[0].id,
        totals: { subtotal: 95000, discount: 0, deliveryFee: 15000, total: 110000 },
        status: 'pending_payment',
        expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        trackingTokenHash: tokenHash(),
        // The link the buyer's every email reopens (orchestrator decision A: no rotation).
        trackingTokenEnc: sealToken(token, orderLinkKeyFromEnv()),
      } as never,
    })) as unknown as { id: number }
    return order.id
  }

  function fakeTransport() {
    sent = []
    setMailTransport({
      async send(message: MailMessage) {
        sent.push(message)
      },
    })
  }

  it('sends the buyer exactly one email on paid, and nothing on a replay', async () => {
    fakeTransport()
    const id = await pendingOrder()
    await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
    const toBuyer = sent.filter((m) => m.to === 'buyer@example.test')
    expect(toBuyer).toHaveLength(1)
    expect(toBuyer[0]!.text).toContain('/track/')

    // A replay — the same write again — moves nothing (`from === to`) and sends nothing more.
    const before = sent.length
    await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
    expect(sent).toHaveLength(before)
  })

  it('emails the store’s users on a newly paid order, never the other store’s', async () => {
    fakeTransport()
    const id = await pendingOrder()
    await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
    const toStoreUser = sent.filter((m) => m.to === stack.users.store.email)
    expect(toStoreUser).toHaveLength(1)
    expect(toStoreUser[0]!.subject).toContain(String(await orderNumberOf(id)))
  })

  it('sends a later status’s email too, each exactly once', async () => {
    fakeTransport()
    const id = await pendingOrder()
    await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
    sent.length = 0
    await stack.payload.update({
      collection: 'orders',
      id,
      data: { status: 'processing' } as never,
    })
    expect(sent.filter((m) => m.to === 'buyer@example.test')).toHaveLength(1)
  })

  it('sends exactly one email per status, even when two writers race for the same move', async () => {
    fakeTransport()
    const id = await pendingOrder()
    // Two concurrent writers land the same move (the admin's `afterChange` hook racing a retry, or
    // an explicit call racing the hook) — the once-per-(order, status) claim lets exactly one win.
    await Promise.all([
      stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never }),
      stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never }),
    ])
    expect(sent.filter((m) => m.to === 'buyer@example.test')).toHaveLength(1)
  })

  it('every email’s link opens the same order — no rotation', async () => {
    fakeTransport()
    const id = await pendingOrder()
    await stack.payload.update({ collection: 'orders', id, data: { status: 'paid' } as never })
    await stack.payload.update({
      collection: 'orders',
      id,
      data: { status: 'processing' } as never,
    })
    const toBuyer = sent.filter((m) => m.to === 'buyer@example.test')
    expect(toBuyer).toHaveLength(2)
    const links = toBuyer.map((m) => m.text.match(/\/track\/(\S+)/)?.[1])
    expect(links[0]).toBeTruthy()
    expect(links[1]).toBe(links[0])
  })

  async function orderNumberOf(id: number): Promise<number> {
    const order = (await stack.payload.findByID({
      collection: 'orders',
      id,
      depth: 0,
    })) as unknown as { number: number }
    return order.number
  }
})
