/**
 * The tracking page's words (TASKS.md 7.3.a): the keys and neutral defaults here, the values in
 * the shop's lexicon files (`../lexicon/{en,id}.json`, CONVENTIONS.md §6). This feature's own
 * status vocabulary (`tracking.status.*`) — not the generic `order.status.*` set in
 * `@/messages/lexicon/payment-and-order`, which names a different commerce ontology's statuses
 * (`shipped`, `ready-for-pickup`, …) than this shop's own (`paid`, `on_the_way`, …).
 */
import { createMessages, defineMessages } from '@engine/i18n'
import type { SiteLocale } from '@engine/config/sites'

import { SITE_COPY } from '../../../shell/copy'

export const TRACKING_KEYS = defineMessages({
  'tracking.title': 'Order #{number}',
  'tracking.status.paid': 'Payment received',
  'tracking.status.processing': 'Being packed',
  'tracking.status.waiting_driver': 'Waiting for a driver',
  'tracking.status.on_the_way': 'On the way',
  'tracking.status.delivered': 'Delivered',
  'tracking.status.cancelled': 'Cancelled',
  'tracking.status.expired': 'Payment window expired',
  'tracking.pendingNote':
    'We’re waiting for your payment. If you already paid, this updates in a moment — message us on WhatsApp if it does not.',
  'tracking.cancelledNote':
    'This order was cancelled. Message us on WhatsApp if that’s a surprise.',
  'tracking.expiredNote': 'The time to pay ran out. Message us on WhatsApp to place it again.',
  'tracking.itemsTitle': 'Items',
  'tracking.totalsSubtotal': 'Subtotal',
  'tracking.totalsDiscount': 'Discount',
  'tracking.totalsDelivery': 'Delivery',
  'tracking.totalsTotal': 'Total',
  'tracking.deliveryTitle': 'Delivering to',
  'tracking.storeTitle': 'Sending from',
  'tracking.driverTitle': 'Your driver',
  'tracking.whatsapp': 'Ask on WhatsApp',
  'tracking.whatsappMessage': 'Hi, I have a question about order #{number}.',
  'tracking.find.title': 'Find my order',
  'tracking.find.orderNumber': 'Order number',
  'tracking.find.contact': 'Email or WhatsApp number',
  'tracking.find.contactHint': 'The one you typed when you placed the order.',
  'tracking.find.submit': 'Send me the link',
  'tracking.find.sending': 'Sending…',
  'tracking.find.sent': 'If those details match an order, we’ve emailed the tracking link to it.',
  'tracking.find.rateLimited': 'Too many tries. Wait a minute and try again.',
})

export type TrackingMessageKey = keyof typeof TRACKING_KEYS

export type TrackingText = {
  (key: TrackingMessageKey, params?: Record<string, string | number>): string
}

/** The tracking page's words for one locale. */
export function trackingText(locale: SiteLocale): TrackingText {
  const messages = createMessages({
    defaults: TRACKING_KEYS,
    locale,
    defaultLocale: 'en',
    copy: SITE_COPY.shop,
  })
  return messages.t.bind(messages) as TrackingText
}
