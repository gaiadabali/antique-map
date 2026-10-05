/**
 * The order page's words (6.5.a; EXPERIENCE-SHOP.md §7–§8): the keys and neutral defaults here,
 * the values in the shop's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6).
 */
import { createMessages, defineMessages, type Messages, type PluralBase } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { lexiconMessages, type LexiconMessageKey } from '../../../messages/keys'
import { SITE_COPY } from '../../../shell/copy'

export const PAYMENT_KEYS = defineMessages({
  'order.title': 'Order {number}',
  'order.payBy': 'Pay by {time}',
  'order.pay': 'Pay {total}',
  'order.testPayment': 'Test payment — no money moves.',
  'order.pendingText':
    'Pay any time before the deadline. The link in your confirmation email returns here.',
  'order.confirmingTitle': 'Confirming your payment',
  'order.confirmingText':
    "We're confirming your payment with the bank — this usually takes under a minute.",
  'order.checkAgain': 'Check again',
  'order.paidTitle': 'Payment received',
  'order.paidBody': '{store} is getting your order ready.',
  'order.trackingLink': 'Track your order',
  'order.failedTitle': "The payment didn't go through. Nothing was charged.",
  'order.tryAgain': 'Try again',
  'order.expiredTitle': 'The time to pay ran out at {time}.',
  'order.expiredBody': 'Nothing was charged, and the items went back on the shelf.',
  'order.putBackInBag': 'Put these back in my bag',
  'order.lateChargeTitle':
    "We received a payment after the order expired — we'll contact you on WhatsApp today.",
  'order.serverErrorTitle': 'Something went wrong on our side. Your bag is safe.',
  'order.reference': 'Reference: {id}',
  'order.outOfStockTitle': '{item} sold out a moment ago. Nothing was charged.',
  'order.statusUnavailable': 'Message us on WhatsApp and we will sort it out.',
  'order.total': 'Total',
  'order.cancelledTitle': 'This order was cancelled.',
})

export type PaymentMessageKey = keyof typeof PAYMENT_KEYS

export type PaymentText = {
  (
    key: PaymentMessageKey | PluralBase<PaymentMessageKey>,
    params?: Record<string, string | number>,
  ): string
  shared(key: LexiconMessageKey, params?: Record<string, string | number>): string
}

/** The shop's order-page words for one locale: this module's keys plus the shared lexicon's. */
export function paymentText(locale: SiteLocale): PaymentText {
  const mine: Messages<PaymentMessageKey> = createMessages({
    defaults: PAYMENT_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  const shared = lexiconMessages('shop', locale)
  const t = mine.t.bind(mine)
  return Object.assign(t, { shared: shared.t.bind(shared) }) as PaymentText
}
