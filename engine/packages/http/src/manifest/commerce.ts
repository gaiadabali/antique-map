/**
 * @contract C13 — the HTTP handler manifest: the commerce API · owner: ARC · entry: `@engine/http/manifest`
 *
 * The commerce API (C6, `@engine/domain/api`) — DOM's handlers, one route file per area at
 * `/api/x/commerce/<area>/[[...path]]`, each operation at a sub-path of its catch-all. A
 * request never carries a price (C6 `IsServerPriced`); every answer is priced again. Every
 * operation a page posts is reachable by a POST form, and comes back to its page through
 * `FORM_RESULT` (`./forms`).
 */
import type { ModuleKey } from '@engine/config/schema'
import type { CommerceOperation } from '@engine/domain/api'

import { GET, GET_POST, POST, type FormMethod, type RouteAuth } from './types'

export type CommerceRoute = {
  readonly auth: readonly RouteAuth[]
  /** A form's methods only: nothing here needs a script to be reached. */
  readonly methods: readonly FormMethod[]
  readonly module?: ModuleKey
}

export const COMMERCE_AREAS = {
  destination: { auth: ['public'], methods: POST }, // the shipTo cookie: the only market input
  // Buying online is a module (v1.5): a brand selling by invoice alone has no bag to post to and
  // no checkout, so neither area answers there (D50) — its pay links, orders and lookups do.
  cart: { auth: ['public'], methods: GET_POST, module: 'purchase.checkout' }, // never reserves
  // A checkout id is bound to the cart cookie or the session: on its own it opens nothing.
  checkout: { auth: ['public', 'customer'], methods: POST, module: 'purchase.checkout' },
  // Its scope — a checkout, a pay link, an order's access — is a credential: body only.
  payments: { auth: ['public', 'customer', 'token'], methods: POST },
  // No C6 operation: `ORDER_ACCESS.link`, and `documents/{kind}?number=…` (PDFs).
  orders: { auth: ['customer', 'token'], methods: GET },
  pay: { auth: ['token'], methods: GET_POST }, // a staff-sent payment link, read and paid
  'gift-cards': { auth: ['public'], methods: POST, module: 'commerce.giftCards' }, // balance
  // `offer.respond` by the session and the offer's id (the account), or by an email's token.
  offers: { auth: ['public', 'customer', 'token'], methods: POST, module: 'purchase.offers' },
  holds: { auth: ['public', 'customer'], methods: POST, module: 'purchase.holds' },
  'price-requests': { auth: ['public'], methods: POST, module: 'purchase.requestPrice' },
  enquiries: { auth: ['public'], methods: POST }, // every topic, framing included
  consignments: { auth: ['public', 'customer'], methods: POST, module: 'services.consignment' },
  // `appointment.change` by the session and the viewing's id, or by its confirmation's token
  // (`APPOINTMENT_ACCESS`'s cookie). No C6 operation: `APPOINTMENT_ACCESS.link`, and
  // `ics?appointment=<id>` (GET), a signed-in booker's own viewing as an `.ics`, by
  // session — never by a token, which no calendar URL carries: a guest's confirmation attaches its.
  appointments: {
    auth: ['public', 'customer', 'token'],
    methods: GET_POST,
    module: 'services.appointments',
  },
  returns: { auth: ['customer', 'token'], methods: POST },
  'order-lookup': { auth: ['public'], methods: POST }, // number + email or WhatsApp; sets the cookie
  // A quote opens by the token in its URL, or by session for the retailer it was issued to. A
  // request with `contact: null` — a partner's brief or reorder — needs an approved retailer's
  // session, and answers `invalid` without one. `quote.proforma`'s checkout id is bound to the
  // cart cookie or the session exactly as the `checkout` area binds it: alone it opens nothing.
  quotes: { auth: ['public', 'customer', 'token'], methods: GET_POST, module: 'purchase.invoices' },
  // A business's application (D31, D36): the same receipt whoever applies, so it admits no one.
  retailers: { auth: ['public'], methods: POST, module: 'accounts.retailers' },
  // Saved searches and item alerts (D39): an address's, confirmed from its email, or with
  // `retention.wantList` a signed-in buyer's (a holder whose module is off is `not-offered`).
  // GET is `WANT_LIST_ACCESS.link` alone. The one request the same-origin check lets through is
  // RFC 8058's, exactly as `ONE_CLICK_UNSUBSCRIBE` states it.
  'want-lists': {
    auth: ['public', 'customer', 'token'],
    methods: GET_POST,
    module: 'retention.emailWantList',
  },
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
 * Every C6 operation's address: one each, the same for a script's `fetch` and an HTML form.
 * Every operation a page posts is reachable by a POST form. A read is a GET and takes its
 * request from the query string, where only a page's own capability (a pay-link or quote token)
 * may ride. Every other operation is a POST at its own sub-path, a change or a removal included
 * (a form sends no other method: `FormMethod`), and takes its request from the body — JSON from
 * a script; without JavaScript a form post, answered 303 to its page under `FORM_RESULT`.
 * `satisfies` makes the map total over `CommerceOperation`, and each method one its area's route
 * exports.
 */
export const COMMERCE_OPERATIONS = {
  'cart.get': { area: 'cart', method: 'GET', path: '' },
  'cart.addLines': { area: 'cart', method: 'POST', path: 'lines' },
  'cart.updateLine': { area: 'cart', method: 'POST', path: 'lines/update' },
  'cart.removeLine': { area: 'cart', method: 'POST', path: 'lines/remove' },
  'cart.applyCode': { area: 'cart', method: 'POST', path: 'codes' },
  'cart.removeCode': { area: 'cart', method: 'POST', path: 'codes/remove' },
  'cart.setGiftOptions': { area: 'cart', method: 'POST', path: 'gift-options' },
  'shipTo.set': { area: 'destination', method: 'POST', path: '' },
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
  'appointment.change': { area: 'appointments', method: 'POST', path: 'change' },
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
  'wantList.subscribe': { area: 'want-lists', method: 'POST', path: '' },
  // The want-list page's button, by the page's cookie (`WANT_LIST_ACCESS`).
  'wantList.confirm': { area: 'want-lists', method: 'POST', path: 'confirm' },
  // The page's button, the account's, and the mail client's `…/unsubscribe?token=…` (RFC 8058).
  'wantList.unsubscribe': { area: 'want-lists', method: 'POST', path: 'unsubscribe' },
} as const satisfies { readonly [O in CommerceOperation]: OperationAddress }

/** The URL an app's client calls for a C6 operation. */
export function commerceUrl(operation: CommerceOperation): string {
  const { area, path } = COMMERCE_OPERATIONS[operation]
  return `/api/x/commerce/${area}${path === '' ? '' : `/${path}`}`
}

/**
 * Order access without a session (C6 `OrderAccess`; C10 `order` is `sensitive`). A
 * lookupToken — the order's derived capability link (C6 `links`, purpose `order`, valid
 * `LINK_WINDOW_DAYS.order` days after the order's link was last issued, by an email or a lookup,
 * and a lapse is final) — never rides in a page URL:
 * `orderLookup.find`, the confirmation after checkout or a pay link, and `link` — which an email
 * or WhatsApp message carries as `?number=…&token=…`, the token derived as NTF sends it — store it
 * in `cookie` (HttpOnly, Secure, SameSite=Lax, living as long as the token's window), and `link`
 * answers 303 to the clean order page. The order page and the `orders`, `returns` and `payments`
 * handlers read it there.
 */
export const ORDER_ACCESS = {
  cookie: 'order_access',
  link: '/api/x/commerce/orders/access',
} as const

/**
 * A booker's viewing without a session (C6 `AppointmentAccess` `token`; v1.5) — at launch every
 * booker's, since the gallery signs no one in (D54). Its confirmation and reminder carry
 * `link?token=…`, the appointment's derived capability link (C6 `links`, purpose `appointment`),
 * which stores it in `cookie` (HttpOnly, Secure, SameSite=Lax, Path=/, living as long as the
 * token's window) and answers 303 to the clean `appointment` form page (C10 `form`), which shows
 * that viewing with its reschedule and cancel buttons, each a POST: following the link changes
 * nothing. A handler logs the link's path without `?token=`, and a write the cookie authenticates
 * is refused from another origin.
 */
export const APPOINTMENT_ACCESS = {
  cookie: 'appointment_access',
  link: '/api/x/commerce/appointments/access',
} as const

/**
 * An address's want list, opened from its emails (C6 `WantListAccess`, C10 `wantList`, D39). The
 * confirmation and every alert carry `link?token=…` — the list's token, a derived capability link
 * (C6 `links`, purpose `want-list`) NTF computes for each email, stored nowhere and valid while the
 * list exists. The link stores it in `cookie` (HttpOnly, Secure, SameSite=Lax,
 * Path=/, for `maxAgeDays`) — a dead one too, so the page can say so — and answers 303 to the
 * clean want-list page, which shows that list with its buttons, each a POST, so following the link
 * changes nothing; a handler logs the link's path without `?token=`. A write the cookie
 * authenticates is refused from another origin, so a planted token only shows its own list.
 */
export const WANT_LIST_ACCESS = {
  cookie: 'want_list_access',
  link: '/api/x/commerce/want-lists/access',
  maxAgeDays: 30,
} as const

/**
 * RFC 8058's one-click unsubscribe: the mail client's own POST to the URL an email's
 * `List-Unsubscribe` header names, and the one request the same-origin check lets through from
 * outside the site (`EngineRoute.sameOrigin`). It is `wantList.unsubscribe` at `…/unsubscribe`
 * with `?token=`, and the newsletter's stop in the forms route, and it holds only if all this is:
 * - the query carries `tokenParam` and nothing else, and the body is exactly `body`, the only
 *   field — anything more is 400;
 * - `access` is `{ kind: 'token' }` with the URL's token — the one request built from its query
 *   rather than by `FORM_DECODING` — and the handler reads no cookie and no session, so a
 *   cross-site post can borrow nothing of the visitor's;
 * - it answers `200` with an empty body whatever `Accept` says: a mail client neither follows a
 *   303 nor reads JSON;
 * - the log keeps the path without `?token=`.
 * No other want-list operation takes a token; confirming is the page's cookie's alone.
 */
export const ONE_CLICK_UNSUBSCRIBE = {
  body: 'List-Unsubscribe=One-Click',
  tokenParam: 'token',
} as const
