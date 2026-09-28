/**
 * @contract C13 — the HTTP handler manifest: the commerce API · owner: ARC · entry: `@engine/http/manifest`
 *
 * The commerce API (C6, `@engine/domain/api`) — DOM's handlers, one route file per area at
 * `/api/x/commerce/<area>/[[...path]]`, each operation at a sub-path of its catch-all. A
 * request never carries a price (C6 `IsServerPriced`); every answer is priced again. A form
 * posted without JavaScript comes back to its page through `FORM_RESULT` (`./forms`).
 */
import type { ModuleKey } from '@engine/config/schema'
import type { CommerceOperation } from '@engine/domain/api'

import { GET, GET_POST, POST, type HttpMethod, type RouteAuth } from './types'

export type CommerceRoute = {
  readonly auth: readonly RouteAuth[]
  readonly methods: readonly HttpMethod[]
  readonly module?: ModuleKey
}

export const COMMERCE_AREAS = {
  destination: { auth: ['public'], methods: ['PUT'] }, // the shipTo cookie: the only market input
  cart: { auth: ['public'], methods: ['GET', 'POST', 'PATCH', 'DELETE'] }, // never reserves
  // A checkout id is bound to the cart cookie or the session: on its own it opens nothing.
  checkout: { auth: ['public', 'customer'], methods: POST },
  // Its scope — a checkout, a pay link, an order's access — is a credential: body only.
  payments: { auth: ['public', 'customer', 'token'], methods: POST },
  // No C6 operation: `ORDER_ACCESS.link`, and `documents/{kind}?number=…` (PDFs).
  orders: { auth: ['customer', 'token'], methods: GET },
  pay: { auth: ['token'], methods: GET_POST }, // a staff-sent payment link, read and paid
  'gift-cards': { auth: ['public'], methods: POST, module: 'commerce.giftCards' }, // balance
  offers: { auth: ['public', 'customer', 'token'], methods: POST, module: 'purchase.offers' },
  holds: { auth: ['public', 'customer'], methods: POST, module: 'purchase.holds' },
  'price-requests': { auth: ['public'], methods: POST, module: 'purchase.requestPrice' },
  enquiries: { auth: ['public'], methods: POST }, // every topic, framing included
  consignments: { auth: ['public', 'customer'], methods: POST, module: 'services.consignment' },
  appointments: {
    auth: ['public', 'customer', 'token'],
    methods: ['GET', 'POST', 'PATCH'],
    module: 'services.appointments',
  },
  returns: { auth: ['customer', 'token'], methods: POST },
  'order-lookup': { auth: ['public'], methods: POST }, // number + email or WhatsApp; sets the cookie
  // A quote opens by the token in its URL, or by session for the retailer it was issued to. A
  // request with `contact: null` — a partner's brief or reorder — needs an approved retailer's
  // session, and answers `invalid` without one.
  quotes: { auth: ['public', 'customer', 'token'], methods: GET_POST, module: 'purchase.invoices' },
  // A business's application (D31, D36): the same receipt whoever applies, so it admits no one.
  retailers: { auth: ['public'], methods: POST, module: 'accounts.retailers' },
} as const satisfies Record<string, CommerceRoute>
export type CommerceArea = keyof typeof COMMERCE_AREAS

/** Where one C6 operation is served: an area, one of that area's methods, a sub-path. */
type OperationAddress = {
  [A in CommerceArea]: {
    readonly area: A
    readonly method: (typeof COMMERCE_AREAS)[A]['methods'][number]
    readonly path: string
  }
}[CommerceArea]

/**
 * Every C6 operation's address. A GET reads its request from the query string — where only
 * a page's own capability (a pay-link or quote token) may ride — the others from the body:
 * JSON, or a form post when JavaScript is off. `satisfies` makes the map total over
 * `CommerceOperation`, and each method one its area's route exports.
 */
export const COMMERCE_OPERATIONS = {
  'cart.get': { area: 'cart', method: 'GET', path: '' },
  'cart.addLines': { area: 'cart', method: 'POST', path: 'lines' },
  'cart.updateLine': { area: 'cart', method: 'PATCH', path: 'lines' },
  'cart.removeLine': { area: 'cart', method: 'DELETE', path: 'lines' },
  'cart.applyCode': { area: 'cart', method: 'POST', path: 'codes' },
  'cart.removeCode': { area: 'cart', method: 'DELETE', path: 'codes' },
  'cart.setGiftOptions': { area: 'cart', method: 'PATCH', path: 'gift-options' },
  'shipTo.set': { area: 'destination', method: 'PUT', path: '' },
  'giftCard.balance': { area: 'gift-cards', method: 'POST', path: 'balance' },
  'checkout.start': { area: 'checkout', method: 'POST', path: '' },
  'checkout.contact': { area: 'checkout', method: 'POST', path: 'contact' },
  'checkout.delivery': { area: 'checkout', method: 'POST', path: 'delivery' },
  'checkout.shipping': { area: 'checkout', method: 'POST', path: 'shipping' },
  'checkout.continue': { area: 'checkout', method: 'POST', path: 'continue' },
  'payment.start': { area: 'checkout', method: 'POST', path: 'payment' },
  'payment.status': { area: 'payments', method: 'POST', path: 'status' },
  'payLink.get': { area: 'pay', method: 'GET', path: '' },
  'payLink.start': { area: 'pay', method: 'POST', path: '' },
  'offer.submit': { area: 'offers', method: 'POST', path: '' },
  'offer.respond': { area: 'offers', method: 'POST', path: 'respond' },
  'hold.request': { area: 'holds', method: 'POST', path: '' },
  'priceRequest.submit': { area: 'price-requests', method: 'POST', path: '' },
  'enquiry.submit': { area: 'enquiries', method: 'POST', path: '' },
  'consignment.submit': { area: 'consignments', method: 'POST', path: '' },
  'appointment.slots': { area: 'appointments', method: 'GET', path: 'slots' },
  'appointment.book': { area: 'appointments', method: 'POST', path: '' },
  'appointment.change': { area: 'appointments', method: 'PATCH', path: '' },
  'orderLookup.find': { area: 'order-lookup', method: 'POST', path: '' },
  'return.request': { area: 'returns', method: 'POST', path: '' },
  'quote.proforma': { area: 'quotes', method: 'POST', path: 'proforma' },
  'quote.request': { area: 'quotes', method: 'POST', path: '' },
  'quote.get': { area: 'quotes', method: 'GET', path: '' },
  'quote.accept': { area: 'quotes', method: 'POST', path: 'accept' },
  // A partner's one-click reorder `{ fromOrder }`, its session the only credential: the server
  // copies the order's lines (D32).
  'quote.reorder': { area: 'quotes', method: 'POST', path: 'reorder' },
  'retailer.apply': { area: 'retailers', method: 'POST', path: 'applications' },
} as const satisfies { readonly [O in CommerceOperation]: OperationAddress }

/** The URL an app's client calls for a C6 operation. */
export function commerceUrl(operation: CommerceOperation): string {
  const { area, path } = COMMERCE_OPERATIONS[operation]
  return `/api/x/commerce/${area}${path === '' ? '' : `/${path}`}`
}

/**
 * Order access without a session (C6 `OrderAccess`; C10 `order` is `sensitive`). A
 * lookupToken never rides in a page URL: `orderLookup.find`, the confirmation after checkout
 * or a pay link, and `link` — which an email or WhatsApp message carries as
 * `?number=…&token=…` — store it in `cookie` (HttpOnly, Secure, SameSite=Lax, as short-lived
 * as the token), and `link` answers 303 to the clean order page. The order page and the
 * `orders`, `returns` and `payments` handlers read it there.
 */
export const ORDER_ACCESS = {
  cookie: 'order_access',
  link: '/api/x/commerce/orders/access',
} as const
