/**
 * @contract C2 — fixtures `order-lookup` (empty, found, not found, rate-limited, invalid) · owner: ARC
 *
 * Guest tracking with the courier timeline. A found order's link is its clean page: the lookup
 * set the order-access cookie it opens with. A miss never says which of the two was wrong.
 */
import type { FormPostVM } from '../surfaces/form'
import type { OrderLookupVM } from '../surfaces/order'
import { PRINT, TOTE } from './_commerce'
import { entry, hidden, optional } from './_forms'
import { money, seo } from './_shared'

const page = { ...seo('Track an order', '/track'), noindex: true }

/** C6 `orderLookup.find`'s own names; either contact is enough, so neither is required. */
function lookupForm(values: { orderNumber?: string; whatsapp?: string } = {}): FormPostVM {
  return {
    fields: [
      entry('orderNumber', 'text', { value: values.orderNumber ?? null, maxLength: 20 }),
      optional('email', 'email', { autocomplete: 'email', inputMode: 'email' }),
      optional('whatsapp', 'tel', {
        autocomplete: 'tel',
        inputMode: 'tel',
        value: values.whatsapp ?? null,
      }),
      hidden('returnTo', '/track'),
    ],
    action: '/api/x/commerce/order-lookup',
  }
}

export const orderLookup: OrderLookupVM = {
  surface: 'orderLookup',
  form: lookupForm(),
  result: null,
  seo: page,
}

export const orderLookupFound: OrderLookupVM = {
  surface: 'orderLookup',
  form: lookupForm({ orderNumber: 'ID-000456', whatsapp: '+6281200000002' }),
  result: {
    kind: 'found',
    order: {
      number: 'ID-000456',
      placedAt: '2026-09-25T10:40:00+08:00',
      status: 'shipped',
      total: money(1640000, 'IDR'),
      items: [PRINT, TOTE],
      href: '/orders/ID-000456',
      reorder: null,
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

/** Sent with no contact: the rule across the two fields reports on the first of them. */
export const orderLookupInvalid: OrderLookupVM = {
  ...orderLookup,
  form: lookupForm({ orderNumber: 'ID-000456' }),
  result: { kind: 'invalid', fields: [{ path: 'email', reason: 'required' }] },
}
