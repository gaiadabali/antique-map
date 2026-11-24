/**
 * The plan's K2 on a real, pushed Postgres (TASKS.md 27.3): checkout prices delivery from the
 * owner's bands, so an order inside them starts `pending_payment` with the fee in its integer total
 * and the buyer's payment window; an address past the last band starts `awaiting_quote` with no fee
 * and the staff's quote window. The total the review showed is the one the order keeps, the welcome
 * code (now picked as `welcomeOffer`) is counted once, and the buyer hears the matching email.
 *
 * The bands (`openShop`): ≤ 5 km Rp 15.000, ≤ 10 km Rp 25.000, ≤ 30 km Rp 40.000, free from
 * Rp 500.000 after the discount. Ubud's store to the Ubud pin is 1.4 km; to the Sanur pin, 19.4 km.
 */
import { invalidationBatch } from '@engine/cache'
import { getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { server, startStaffStack, type StaffStack } from '../../db/staff-stack.test-support'
import { setMailTransport, type MailMessage } from '../notify/transport'
import { createOrder } from './create-order'
import {
  BAG_KEY,
  EXPIRY_MINUTES,
  PIN,
  PRICE,
  bag,
  checkout,
  openShop,
  product,
  readers,
  type Readers,
  type Shop,
} from './orders-db.test-support'
import { quoteCheckout } from './quote-checkout'

const QUOTE_WINDOW_MINUTES = 120 // the field's default: `openShop` leaves it unset

describe.skipIf(!server)('K2: delivery priced at checkout, on a real database', () => {
  let stack: StaffStack
  let shop: Shop
  let read: Readers
  const at = new Date()
  const sent: MailMessage[] = []

  beforeAll(async () => {
    stack = await startStaffStack('cms_orders_start_test', (config, key) =>
      getPayload({ config, key }),
    )
    shop = await openShop(stack)
    read = readers(stack.pool)
    setMailTransport({ send: async (message) => void sent.push(message) })
  }, 180_000)
  afterAll(async () => {
    setMailTransport(null)
    await stack?.stop()
  }, 60_000)

  async function place(qty: number, pin: { lat: number; lng: number }, extra = {}) {
    const made = await product(stack, { [shop.ubud]: qty + 2 })
    const cookie = bag({ productId: made.id, variantSku: null, qty })
    const created = await createOrder(stack.payload, checkout(cookie, pin, extra), {
      bagKey: BAG_KEY,
      now: at,
    })
    if (!created.ok) throw new Error(`could not place the order: ${created.refusal}`)
    return { created, stockRow: made.stockRows[shop.ubud]!, cookie }
  }

  it('inside the first band: pending_payment, the fee in an integer total, the payment window', async () => {
    const { created, stockRow } = await place(1, PIN.ubud)
    expect(created.totals).toEqual({
      subtotalIdr: PRICE,
      discountIdr: 0,
      deliveryIdr: 15_000,
      totalIdr: PRICE + 15_000,
    })
    const row = await read.order(created.orderId)
    expect(row.status).toBe('pending_payment')
    expect(Number(row.totals_delivery_fee)).toBe(15_000)
    expect(Number(row.totals_total)).toBe(110_000)
    expect(new Date(row.expires_at as Date).getTime()).toBe(at.getTime() + EXPIRY_MINUTES * 60_000)
    expect(created.expiresAt.getTime()).toBe(at.getTime() + EXPIRY_MINUTES * 60_000)
    expect(await read.quantity(stockRow)).toBe(2)
    const history = await read.history(created.orderId)
    expect(history).toMatchObject([{ from: null, to: 'pending_payment', actor: 'system' }])
    expect(String(history[0]!.note)).toMatch(/distance bands/)
  })

  it('a farther band is that band’s fee (19.4 km → Rp 40.000)', async () => {
    const { created } = await place(2, PIN.sanur)
    expect(created.totals).toEqual({
      subtotalIdr: 2 * PRICE,
      discountIdr: 0,
      deliveryIdr: 40_000,
      totalIdr: 2 * PRICE + 40_000,
    })
    expect((await read.order(created.orderId)).status).toBe('pending_payment')
  })

  it('over the free-delivery threshold: a fee of 0, still pending_payment', async () => {
    const { created } = await place(6, PIN.ubud)
    expect(created.totals).toEqual({
      subtotalIdr: 6 * PRICE,
      discountIdr: 0,
      deliveryIdr: 0,
      totalIdr: 6 * PRICE,
    })
    const row = await read.order(created.orderId)
    expect(row).toMatchObject({ status: 'pending_payment' })
    expect(Number(row.totals_delivery_fee)).toBe(0)
  })

  it('past the last band: awaiting_quote, no fee, the quote window', async () => {
    const { created, stockRow } = await place(1, PIN.jakarta)
    expect(created.totals).toEqual({
      subtotalIdr: PRICE,
      discountIdr: 0,
      deliveryIdr: null,
      totalIdr: PRICE,
    })
    const row = await read.order(created.orderId)
    expect(row).toMatchObject({ status: 'awaiting_quote', totals_delivery_fee: null })
    expect(new Date(row.expires_at as Date).getTime()).toBe(
      at.getTime() + QUOTE_WINDOW_MINUTES * 60_000,
    )
    expect(await read.quantity(stockRow)).toBe(2)
    expect(await read.history(created.orderId)).toMatchObject([
      { from: null, to: 'awaiting_quote', actor: 'system' },
    ])
  })

  it('the review’s total includes delivery, and the order keeps exactly it', async () => {
    const made = await product(stack, { [shop.ubud]: 3 })
    const cookie = bag({ productId: made.id, variantSku: null, qty: 1 })
    const quoted = await quoteCheckout(
      stack.payload,
      { bagCookie: cookie, pin: PIN.ubud },
      { bagKey: BAG_KEY },
    )
    if (!quoted.ok) throw new Error(`quote refused: ${quoted.refusal}`)
    expect(quoted.delivery).toEqual({ kind: 'priced', feeIdr: 15_000, isFree: false })
    expect(quoted.quote.totalIdr).toBe(PRICE + 15_000)

    // The items-only total of before K2 is now a changed price: nothing is created.
    const stale = await createOrder(
      stack.payload,
      checkout(cookie, PIN.ubud, { expectedTotalIdr: PRICE }),
      { bagKey: BAG_KEY },
    )
    expect(stale).toMatchObject({ ok: false, refusal: 'price_changed' })
    expect(await read.ordersFor(made.id)).toBe(0)

    const honest = await createOrder(
      stack.payload,
      checkout(cookie, PIN.ubud, { expectedTotalIdr: quoted.quote.totalIdr }),
      { bagKey: BAG_KEY },
    )
    if (!honest.ok) throw new Error(`refused: ${honest.refusal}`)
    expect(Number((await read.order(honest.orderId)).totals_total)).toBe(PRICE + 15_000)

    // Past the last band the review promises a staff quote and shows the items total.
    const far = await quoteCheckout(
      stack.payload,
      { bagCookie: cookie, pin: PIN.jakarta },
      { bagKey: BAG_KEY },
    )
    if (!far.ok) throw new Error(`quote refused: ${far.refusal}`)
    expect(far.delivery).toEqual({ kind: 'staff_quote' })
    expect(far.quote.totalIdr).toBe(PRICE)
  })

  it('the buyer gets the order-received email for a priced order, the waiting one otherwise', async () => {
    sent.length = 0
    const priced = await place(1, PIN.ubud)
    const quoted = await place(1, PIN.jakarta)
    const toBuyer = sent.filter((m) => m.to === 'made@example.test')
    const subjects = toBuyer.map((m) => m.subject)
    expect(subjects).toContain(`Order #${priced.created.number} — ready to pay`)
    expect(subjects).toContain(`Order #${quoted.created.number} — update`)
    const received = toBuyer.find((m) => m.subject.includes(String(priced.created.number)))!
    expect(received.text).toMatch(/Rp\s?15\.000/)
    expect(received.text).toMatch(/Rp\s?110\.000/)
    expect(received.text).toContain('/order/')
  })

  it('the welcome code picked as welcomeOffer is applied once, and counted once', async () => {
    const offer = (await stack.payload.create({
      collection: 'discounts',
      data: { code: 'OFFER15', kind: 'percent', value: 15, active: true } as never,
    })) as unknown as { id: number }
    await invalidationBatch().operation((context) =>
      stack.payload.updateGlobal({
        context,
        slug: 'site-settings',
        data: { shop: { welcomeOffer: offer.id } } as never,
      }),
    )
    const { created } = await place(2, PIN.ubud, { welcomeCode: 'offer15' })
    // 15% of 190.000 = 28.500, once, on the items; the 1.4 km fee is not discounted.
    expect(created.totals).toEqual({
      subtotalIdr: 2 * PRICE,
      discountIdr: 28_500,
      deliveryIdr: 15_000,
      totalIdr: 2 * PRICE - 28_500 + 15_000,
    })
    const row = await read.order(created.orderId)
    expect(row).toMatchObject({ status: 'pending_payment', discount_code: 'OFFER15' })
    expect(await read.usedCount('OFFER15')).toBe(1)
  })
})
