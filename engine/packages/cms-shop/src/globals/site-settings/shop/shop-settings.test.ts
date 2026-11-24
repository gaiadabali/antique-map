/**
 * The shop's settings without a database (TASKS.md 27.1.b): each email's default subject and
 * opening are what the notifier sends today, a social link's platform is found from a typed name,
 * and the checkout's welcome code follows the picked discount.
 */
import { networkAndName, networkOfName } from '@engine/cms-core/globals/site-settings'
import { describe, expect, it } from 'vitest'

import type { OrderStatus } from '../../../collections/orders/statuses'
import {
  buyerStatusEmail,
  quoteReadyEmail,
  resendTrackingEmail,
  storeNewOrderEmail,
  storeReassignedEmail,
} from '../../../shop/notify/templates'
import { keepCodeInStep, ORDER_EMAILS, PRODUCT_PAGE_COPY, type OrderEmail } from '.'

const LOCALES = ['en', 'id'] as const
const fill = (text: string, number: number, store = '') =>
  text.replaceAll('{number}', String(number)).replaceAll('{store}', store)

const STATUS_OF: Partial<Record<OrderEmail, OrderStatus>> = {
  awaitingQuote: 'awaiting_quote',
  paid: 'paid',
  processing: 'processing',
  waitingDriver: 'waiting_driver',
  onTheWay: 'on_the_way',
  delivered: 'delivered',
  cancelled: 'cancelled',
  expired: 'expired',
}

describe('the shop’s emails', () => {
  it('give every email a subject and an opening in both languages', () => {
    for (const [name, email] of Object.entries(ORDER_EMAILS)) {
      for (const locale of LOCALES) {
        expect(email.subject[locale].trim(), `${name}.subject.${locale}`).not.toBe('')
        expect(email.opening[locale].trim(), `${name}.opening.${locale}`).not.toBe('')
      }
    }
  })

  it('default to what the notifier sends a buyer today', () => {
    for (const [name, status] of Object.entries(STATUS_OF) as [OrderEmail, OrderStatus][]) {
      for (const locale of LOCALES) {
        const mail = buyerStatusEmail({
          to: 'buyer@example.com',
          locale,
          orderNumber: 1042,
          status,
          trackingUrl: 'https://shop.example/track/t',
        })!
        expect(mail.subject, `${name}.${locale}`).toBe(
          fill(ORDER_EMAILS[name].subject[locale], 1042),
        )
        expect(mail.text, `${name}.${locale}`).toContain(ORDER_EMAILS[name].opening[locale])
      }
    }
    for (const locale of LOCALES) {
      const ready = quoteReadyEmail({
        to: 'buyer@example.com',
        locale,
        orderNumber: 7,
        itemsTotalIdr: 100_000,
        deliveryFeeIdr: 15_000,
        totalIdr: 115_000,
        payBy: null,
        payUrl: 'https://shop.example/order/t',
      })
      expect(ready.subject).toBe(fill(ORDER_EMAILS.priceReady.subject[locale], 7))
      expect(ready.text).toContain(ORDER_EMAILS.priceReady.opening[locale])
      const link = resendTrackingEmail({ to: 'b@example.com', locale, trackingUrl: 'https://x/t' })
      expect(link.subject).toBe(ORDER_EMAILS.trackingLink.subject[locale])
      expect(link.text).toContain(ORDER_EMAILS.trackingLink.opening[locale])
    }
  })

  it('default to what the notifier sends a store today', () => {
    const input = {
      to: 'store@example.com',
      orderNumber: 9,
      storeName: 'Ubud',
      itemSummary: '1× Map',
      totalIdr: 95_000,
      adminUrl: 'https://admin.example/admin/collections/orders/9',
    }
    const paid = storeNewOrderEmail(input)
    const moved = storeReassignedEmail(input)
    expect(paid.subject).toBe(fill(ORDER_EMAILS.storeNewOrder.subject.en, 9, 'Ubud'))
    expect(moved.subject).toBe(fill(ORDER_EMAILS.storeReassigned.subject.en, 9, 'Ubud'))
    for (const locale of LOCALES) {
      expect(paid.text).toContain(fill(ORDER_EMAILS.storeNewOrder.opening[locale], 9, 'Ubud'))
      expect(moved.text).toContain(fill(ORDER_EMAILS.storeReassigned.opening[locale], 9, 'Ubud'))
    }
  })
})

describe('the product page’s words', () => {
  it('are given in both languages, the delivery line naming the free-delivery amount', () => {
    for (const [name, words] of Object.entries(PRODUCT_PAGE_COPY)) {
      for (const locale of LOCALES) expect(words[locale].trim(), `${name}.${locale}`).not.toBe('')
    }
    expect(PRODUCT_PAGE_COPY.deliveryLine.en).toContain('{freeOver}')
    expect(PRODUCT_PAGE_COPY.deliveryLine.id).toContain('{freeOver}')
  })
})

describe('a social link’s platform', () => {
  it('is found from a typed name, ignoring case and spaces', () => {
    expect(networkOfName(' Instagram ')).toBe('instagram')
    expect(networkOfName('Tik Tok')).toBe('tiktok')
    expect(networkOfName('Twitter')).toBe('x')
    expect(networkOfName('Myspace')).toBeNull()
    expect(networkOfName(undefined)).toBeNull()
  })

  it('writes the name the sites show from the pick, or the pick from an older name', () => {
    const picked: Record<string, unknown> = { platform: 'old words' }
    expect(networkAndName({ value: 'youtube', siblingData: picked } as never)).toBe('youtube')
    expect(picked.platform).toBe('YouTube')
    const older: Record<string, unknown> = { platform: 'facebook' }
    expect(networkAndName({ value: null, siblingData: older } as never)).toBe('facebook')
    expect(older.platform).toBe('Facebook')
    const unknown: Record<string, unknown> = { platform: 'Myspace' }
    expect(networkAndName({ value: undefined, siblingData: unknown } as never)).toBeUndefined()
    expect(unknown.platform).toBe('Myspace')
  })
})

describe('the welcome discount', () => {
  const run = async (
    value: unknown,
    before: unknown,
    stored: { code?: string } | null = { code: 'WELCOME10' },
  ) => {
    const sibling: Record<string, unknown> = { welcomeDiscount: 'LEGACY5' }
    const req = { payload: { findByID: async () => stored } }
    await keepCodeInStep({
      value,
      siblingData: sibling,
      originalDoc: { shop: { welcomeOffer: before } },
      req,
    } as never)
    return sibling.welcomeDiscount
  }

  it('writes the picked discount’s code for the checkout', async () => {
    expect(await run(3, null)).toBe('WELCOME10')
    expect(await run({ id: 3, code: 'WELCOME10' }, null)).toBe('WELCOME10')
    expect(await run(4, 3, null)).toBe('')
  })

  it('clears the code when the pick is cleared, and leaves it when the pick was never made', async () => {
    expect(await run(null, 3)).toBe('')
    expect(await run(null, null)).toBe('LEGACY5')
    expect(await run(undefined, 3)).toBe('LEGACY5')
  })
})
