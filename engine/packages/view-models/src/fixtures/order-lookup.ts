/**
 * @contract C2 — fixtures `order-lookup` (empty, found, not found, rate-limited) · owner: ARC
 *
 * Guest tracking with the courier timeline. A found order's link is its clean page: the lookup
 * set the order-access cookie it opens with. A miss never says which of the two was wrong.
 */
import type { OrderLookupVM } from '../surfaces/order'
import { PRINT, TOTE } from './_commerce'
import { money, seo } from './_shared'

const page = { ...seo('Track an order', '/track'), noindex: true }

export const orderLookup: OrderLookupVM = {
  surface: 'orderLookup',
  form: { orderNumber: null, channel: 'whatsapp', contact: null },
  result: null,
  seo: page,
}

export const orderLookupFound: OrderLookupVM = {
  surface: 'orderLookup',
  form: { orderNumber: 'ID-000456', channel: 'whatsapp', contact: '+6281200000002' },
  result: {
    kind: 'found',
    order: {
      number: 'ID-000456',
      placedAt: '2026-09-25T10:40:00+08:00',
      status: 'fulfilling',
      payment: 'paid',
      total: money(1640000, 'IDR'),
      items: [PRINT, TOTE],
      href: '/orders/ID-000456',
    },
    shipments: [
      {
        carrier: 'JNE',
        service: 'REG',
        trackingNumber: 'JNE0000000000',
        trackingUrl: 'https://tracking.example.test/JNE0000000000',
        status: 'in-transit',
        events: [
          {
            at: '2026-09-26T01:10:00.000Z',
            status: 'picked-up',
            description: 'Picked up in Denpasar',
          },
          {
            at: '2026-09-26T09:30:00.000Z',
            status: 'in-transit',
            description: 'At the sorting centre',
          },
        ],
        pickupCode: null,
      },
    ],
  },
  seo: page,
}

export const orderLookupNotFound: OrderLookupVM = {
  ...orderLookupFound,
  result: { kind: 'notFound' },
}

export const orderLookupRateLimited: OrderLookupVM = {
  ...orderLookupFound,
  result: { kind: 'rateLimited', retryAfterSeconds: 600 },
}
