/**
 * @contract C13 — the HTTP handler manifest · owner: ARC · consumers: WEB, UXG, UXE, HAR, handler lanes
 *
 * Every engine route an app mounts, and the proxy matcher every app declares
 * (ARCHITECTURE.md §11). An app mounts a route with one file, `src/app{path}/route.ts`,
 * exporting exactly `methods` — `export { GET, POST } from '@engine/http/commerce/cart'`.
 * Route parity (TASKS.md 2.2.d) fails CI on a missing file, a missing or extra method, a
 * first segment after `/api/` equal to a collection slug, `payload-jobs` or `graphql`, or a
 * matcher that differs from `PROXY_MATCHER`. Engine routes live under `/api/x/` so none
 * shadows Payload's REST API; `/api/health` and `/brand-assets/…` are the named exceptions.
 * Every app mounts every route whatever the brand's modules: a handler whose `module` is off
 * answers 404, so parity never depends on config. Every C6 operation has its address in
 * `COMMERCE_OPERATIONS`.
 *
 * Handlers log a request's path without its query string, and a credential never travels in
 * a query string at all, except in the one-hop links an email carries (`ORDER_ACCESS.link`,
 * one-click unsubscribe). Tooling reads this file through Node's type stripping, so it holds
 * type imports only and erasable syntax.
 */
import type { ModuleKey } from '@engine/config/schema'
import type { CommerceOperation } from '@engine/domain/api'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Lane = 'WEB' | 'DOM' | 'PAY' | 'LOG' | 'MED' | 'SRC' | 'SIS' | 'SEO'

/** How a caller proves itself. The handler enforces it; the manifest makes it reviewable. */
export type RouteAuth =
  | 'public' // anyone: rate-limited where it writes; a guest bag is the hashed-token cart cookie
  | 'customer' // the customer session under its own cookie (ARCHITECTURE.md §12)
  | 'token' // an opaque token: a pay link or quote in its path, an order's lookupToken in a cookie
  | 'signature' // a provider's signature over the raw body; failure → 401 and an alert
  | 'sister' // a request signed with the sister's shared secret (C12)
  | 'cron' // Authorization: Bearer CRON_SECRET; 503 while it is unset
  | 'revalidate' // Authorization: Bearer REVALIDATE_SECRET
  | 'staff' // a Payload staff session

export type EngineRoute = {
  /** The mount path: the app's folder under `src/app`, in Next.js dynamic-segment syntax. */
  readonly path: string
  /** The `@engine/http` subpath the route file re-exports; `src/<area>/route.ts` in the package. */
  readonly handler: string
  readonly methods: readonly HttpMethod[]
  readonly owner: Lane
  readonly auth: readonly RouteAuth[]
  /**
   * CSRF: a cookie can authenticate a write here, so the handler refuses a non-GET request a
   * cookie authenticates unless `Origin` is this site's (or `Sec-Fetch-Site: same-origin`). A
   * request carrying its own token (a one-click unsubscribe) is not a forgery target.
   */
  readonly sameOrigin: boolean
  /** The module whose absence makes the handler answer 404 (the file is mounted regardless). */
  readonly module?: ModuleKey
}

/**
 * The handler specifier for a mount path: the static segments after `/api/x/`, `/api/` or
 * `/`, under `@engine/http/`. `/api/x/commerce/cart/[[...path]]` → `@engine/http/commerce/cart`;
 * `/api/health` → `@engine/http/health`; `/brand-assets/[...path]` → `@engine/http/brand-assets`.
 */
export function handlerOf(path: string): string {
  const rest = path.replace(/^\/api\/x\/|^\/api\/|^\//, '')
  const area = rest.split('/').filter((segment) => segment !== '' && !segment.startsWith('['))
  return `@engine/http/${area.join('/')}`
}

const GET = ['GET'] as const
const POST = ['POST'] as const
const GET_POST = ['GET', 'POST'] as const
const COOKIE_AUTH: readonly RouteAuth[] = ['public', 'customer', 'token']

function route(
  path: string,
  owner: Lane,
  auth: RouteAuth | readonly RouteAuth[],
  methods: readonly HttpMethod[],
  module?: ModuleKey,
): EngineRoute {
  const auths = typeof auth === 'string' ? [auth] : auth
  const writes = methods.some((method) => method !== 'GET')
  const sameOrigin = writes && auths.some((each) => COOKIE_AUTH.includes(each))
  const gated = module === undefined ? {} : { module }
  return { path, handler: handlerOf(path), methods, owner, auth: auths, sameOrigin, ...gated }
}

type CommerceRoute = {
  readonly auth: readonly RouteAuth[]
  readonly methods: readonly HttpMethod[]
  readonly module?: ModuleKey
}

/**
 * The commerce API (C6, `@engine/domain/api`) — DOM's handlers, one route file per area at
 * `/api/x/commerce/<area>/[[...path]]`, each operation at a sub-path of its catch-all. A
 * request never carries a price (C6 `IsServerPriced`); every answer is priced again.
 */
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
  enquiries: { auth: ['public'], methods: POST }, // every topic, wholesale and framing included
  consignments: { auth: ['public', 'customer'], methods: POST, module: 'services.consignment' },
  appointments: {
    auth: ['public', 'customer', 'token'],
    methods: ['GET', 'POST', 'PATCH'],
    module: 'services.appointments',
  },
  returns: { auth: ['customer', 'token'], methods: POST },
  'order-lookup': { auth: ['public'], methods: POST }, // number + email or WhatsApp; sets the cookie
  quotes: { auth: ['public', 'token'], methods: GET_POST, module: 'purchase.invoices' },
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
 * Every C6 operation's address. A GET reads its request from the query string — so no GET
 * operation takes a credential — the others from the body: JSON, or a form post when
 * JavaScript is off. `satisfies` makes the map total over `CommerceOperation`, and each
 * method one its area's route exports.
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

const commerceRoutes = Object.entries(COMMERCE_AREAS).map(([area, spec]: [string, CommerceRoute]) =>
  route(`/api/x/commerce/${area}/[[...path]]`, 'DOM', spec.auth, spec.methods, spec.module),
)

export const ENGINE_ROUTES: readonly EngineRoute[] = [
  // Platform
  route('/api/health', 'WEB', 'public', GET), // app, DB, storage, queue lag; initialises Payload
  route('/brand-assets/[...path]', 'WEB', 'public', GET), // BRAND_ROOT assets, immutable
  route('/api/x/well-known/[...path]', 'WEB', 'public', GET), // brand files for /.well-known/*
  route('/api/x/legacy/[...path]', 'WEB', 'public', GET), // legacy URLs: 301 · 404 · 410
  route('/api/x/revalidate', 'WEB', 'revalidate', POST), // invalidate(tags) from outside a request
  route('/api/x/auth/[...path]', 'WEB', ['public', 'customer'], GET_POST), // customer accounts
  route('/api/x/privacy/[...path]', 'WEB', ['customer', 'token'], GET_POST), // export · erase
  // uploads (C6 photos), newsletter (double opt-in, one-click unsubscribe), alerts, saved items
  route('/api/x/forms/[...path]', 'WEB', ['public', 'customer', 'token'], GET_POST),

  // Scheduled — the site user's crontab (DEPLOYMENT.md §5)
  route('/api/x/cron/jobs', 'WEB', 'cron', POST), // the Payload jobs queue, a per-run limit
  route('/api/x/cron/sweeps', 'DOM', 'cron', POST), // C8 DomainSweeps: expiry, notices, lapses
  route('/api/x/cron/reconcile', 'PAY', 'cron', POST), // retrieve() attempts past their window
  route('/api/x/cron/outbox', 'DOM', 'cron', POST), // dispatch committed domain events

  // Provider webhooks: parse → verify → retrieve where advised → the domain (PAYMENTS.md §4).
  // Payment and courier accounts are a seller's, so their secrets are too: the route names the
  // seller whose secret verifies it, and events dedupe on (provider, seller_id, provider_event_id).
  route('/api/x/webhooks/payments/[provider]/[seller]', 'PAY', 'signature', POST),
  route('/api/x/webhooks/shipping/[provider]/[seller]', 'LOG', 'signature', POST),
  route('/api/x/webhooks/fulfilment/[provider]', 'LOG', 'signature', POST, 'fulfilment.pod'),

  // Commerce — `COMMERCE_AREAS` above
  ...commerceRoutes,

  // Discovery, media, sister, SEO
  route('/api/x/search/[[...path]]', 'SRC', 'public', GET), // results, facet counts, suggestions
  route('/api/x/media/[...path]', 'MED', ['public', 'staff'], GET), // IIIF manifests; staff full-res
  route('/api/x/sister/[...path]', 'SIS', 'sister', GET_POST, 'sister.links'), // archive API, work.*
  route('/api/x/collect', 'SEO', 'public', POST), // the beacon: paths only, query strings stripped
  route('/api/x/sitemap/[[...path]]', 'SEO', 'public', GET), // index and per-locale sitemaps
  route('/api/x/robots', 'SEO', 'public', GET), // per environment: staging disallows all
  route('/api/x/feeds/[...path]', 'SEO', 'public', GET), // merchant and catalogue feeds
  route('/api/x/og/[...path]', 'SEO', 'public', GET), // request-time Open Graph images
]

/**
 * Root files the proxy rewrites to engine routes, so each keeps its conventional public
 * URL (a sitemap may list only URLs at or below its own path). `:favicon` is the brand's
 * `assets.favicon` (C1), read at runtime. The proxy applies these before C10's parser.
 */
export const ROOT_REWRITES = [
  { from: '/robots.txt', to: '/api/x/robots' },
  { from: '/sitemap.xml', to: '/api/x/sitemap' },
  { from: '/sitemap-:name.xml', to: '/api/x/sitemap/:name' },
  { from: '/.well-known/:path*', to: '/api/x/well-known/:path*' },
  { from: '/favicon.ico', to: '/brand-assets/:favicon' },
] as const

/**
 * The request headers the proxy sets on every request it rewrites — overwriting whatever a
 * client sent — so a page that gets no params (`not-found.tsx`, `error.tsx`) still knows the
 * public path asked for and its locale: the not-found loader tells a removed item (Gone) from
 * a legacy slug to search for (C2 `Loaders.notFound`).
 */
export const PROXY_REQUEST_HEADERS = { publicPath: 'x-public-path', locale: 'x-locale' } as const

/**
 * The literal each app's `src/proxy.ts` declares — Next reads `config.matcher` statically,
 * so it is copied, never imported, and route parity compares the copy with this:
 *
 *   export { proxy } from '@engine/http/proxy'
 *   export const config = { matcher: ['/((?!api/|_next/|brand-assets/).*)'] }
 *
 * Everything but `/api/…` (Payload and the routes above), Next's `/_next/…` and brand
 * assets reaches the proxy: pages, `/admin` (English by default), legacy prefixes (brand
 * config, so knowable only at runtime) and `ROOT_REWRITES`. The proxy only rewrites and sets
 * headers — `PROXY_REQUEST_HEADERS`, and C10's `sensitive` answer headers; it never touches
 * the database.
 */
export const PROXY_MATCHER = ['/((?!api/|_next/|brand-assets/).*)'] as const
