/**
 * @contract C13 — the HTTP handler manifest · owner: ARC · consumers: WEB, UXG, UXE, HAR, handler lanes
 *
 * Every engine route an app mounts, and the proxy matcher every app declares
 * (ARCHITECTURE.md §11). An app mounts a route with one file, `src/app{path}/route.ts`:
 *
 *   export { GET, POST } from '@engine/http/commerce/cart'
 *
 * exporting exactly `methods` — route parity (TASKS.md 0.3.d) fails CI on a missing file, a
 * missing or extra method, a first segment after `/api/` equal to a collection slug,
 * `payload-jobs` or `graphql`, or a matcher that differs from `PROXY_MATCHER`. Engine routes
 * live under `/api/x/` so none shadows Payload's REST API; `/api/health` and
 * `/brand-assets/…` are the two named exceptions. Every app mounts every route whatever
 * the brand's modules: a handler whose `module` is off answers 404, so parity never
 * depends on config. Tooling reads this file through Node's type stripping, so it holds
 * type imports only and erasable syntax.
 */
import type { ModuleKey } from '@engine/config/schema'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type Lane = 'WEB' | 'DOM' | 'PAY' | 'LOG' | 'MED' | 'SRC' | 'SIS' | 'SEO'

/** How a caller proves itself. The handler enforces it; the manifest makes it reviewable. */
export type RouteAuth =
  | 'public' // anyone: rate-limited where it writes; a guest cart is a hashed-token cookie
  | 'customer' // the customer session under its own cookie (ARCHITECTURE.md §12)
  | 'token' // a signed token in the URL: payment links, quotes, order access, unsubscribe
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
const ALL = ['GET', 'POST', 'PATCH', 'DELETE'] as const

function route(
  path: string,
  owner: Lane,
  auth: RouteAuth | readonly RouteAuth[],
  methods: readonly HttpMethod[],
  module?: ModuleKey,
): EngineRoute {
  const auths = typeof auth === 'string' ? [auth] : auth
  const gated = module === undefined ? {} : { module }
  return { path, handler: handlerOf(path), methods, owner, auth: auths, ...gated }
}

/** The commerce API — request and response shapes are C6 (`@engine/domain/api`). */
const commerce = (
  area: string,
  auth: RouteAuth | readonly RouteAuth[],
  methods: readonly HttpMethod[],
  module?: ModuleKey,
) => route(`/api/x/commerce/${area}/[[...path]]`, 'DOM', auth, methods, module)

export const ENGINE_ROUTES: readonly EngineRoute[] = [
  // Platform
  route('/api/health', 'WEB', 'public', GET), // app, DB, storage, queue lag; initialises Payload
  route('/brand-assets/[...path]', 'WEB', 'public', GET), // BRAND_ROOT assets, immutable
  route('/api/x/well-known/[...path]', 'WEB', 'public', GET), // brand files for /.well-known/*
  route('/api/x/legacy/[...path]', 'WEB', 'public', GET), // legacy URLs: 301 · 404 · 410 (11.5)
  route('/api/x/revalidate', 'WEB', 'revalidate', POST), // invalidate(tags) from outside a request
  route('/api/x/auth/[...path]', 'WEB', ['public', 'customer'], GET_POST), // customer accounts
  route('/api/x/privacy/[...path]', 'WEB', ['customer', 'token'], GET_POST), // export · erase
  // newsletter (double opt-in, one-click unsubscribe), alerts, saved items, reviews
  route('/api/x/forms/[...path]', 'WEB', ['public', 'customer', 'token'], GET_POST),

  // Scheduled — the site user's crontab (DEPLOYMENT.md §5)
  route('/api/x/cron/jobs', 'WEB', 'cron', POST), // the Payload jobs queue, a per-run limit
  route('/api/x/cron/reservations', 'DOM', 'cron', POST), // sweep lapsed locks: housekeeping
  route('/api/x/cron/reconcile', 'PAY', 'cron', POST), // retrieve() attempts past their window
  route('/api/x/cron/outbox', 'DOM', 'cron', POST), // dispatch committed domain events

  // Provider webhooks: parse → verify → retrieve where advised → the domain (PAYMENTS.md §4)
  route('/api/x/webhooks/payments/[provider]', 'PAY', 'signature', POST),
  route('/api/x/webhooks/shipping/[provider]', 'LOG', 'signature', POST),
  route('/api/x/webhooks/fulfilment/[provider]', 'LOG', 'signature', POST, 'fulfilment.pod'),

  // Commerce — one route file per area; sub-resources under its optional catch-all
  commerce('destination', 'public', ['GET', 'PUT']), // the shipTo cookie: the only market input
  commerce('cart', 'public', ALL), // lines, codes, gift options — a cart never reserves
  commerce('checkout', 'public', GET_POST), // steps as data; the payment step locks and pays
  commerce('orders', ['customer', 'token'], GET_POST), // status, retry another method, documents
  commerce('pay', 'token', GET_POST), // a staff-sent payment link
  commerce('offers', ['public', 'customer'], GET_POST, 'purchase.offers'),
  commerce('holds', ['public', 'customer'], POST, 'purchase.holds'),
  commerce('price-requests', 'public', POST, 'purchase.requestPrice'),
  commerce('enquiries', 'public', POST), // every topic, wholesale and framing quotes included
  commerce('consignments', ['public', 'customer'], GET_POST, 'services.consignment'),
  commerce('appointments', ['public', 'customer'], ALL, 'services.appointments'),
  commerce('returns', ['customer', 'token'], GET_POST),
  commerce('order-lookup', 'public', POST), // order number + email or WhatsApp number
  commerce('quotes', ['public', 'token'], GET_POST, 'purchase.invoices'),

  // Discovery, media, sister, SEO
  route('/api/x/search/[[...path]]', 'SRC', 'public', GET), // results, facet counts, suggestions
  route('/api/x/media/[...path]', 'MED', ['public', 'staff'], GET), // IIIF manifests; staff full-res
  route('/api/x/sister/[...path]', 'SIS', 'sister', GET_POST, 'sister.links'), // archive API, work.*
  route('/api/x/collect', 'SEO', 'public', POST), // the analytics beacon
  route('/api/x/sitemap/[[...path]]', 'SEO', 'public', GET), // index and per-locale sitemaps
  route('/api/x/robots', 'SEO', 'public', GET), // per environment: staging disallows all
  route('/api/x/feeds/[...path]', 'SEO', 'public', GET), // merchant and catalogue feeds
  route('/api/x/og/[...path]', 'SEO', 'public', GET), // request-time Open Graph images
]

/**
 * Root files the proxy rewrites to engine routes, so each keeps its conventional public
 * URL (a sitemap may list only URLs at or below its own path). `:favicon` is the brand's
 * `assets.favicon` (C1), read at runtime.
 */
export const ROOT_REWRITES = [
  { from: '/robots.txt', to: '/api/x/robots' },
  { from: '/sitemap.xml', to: '/api/x/sitemap' },
  { from: '/sitemap-:name.xml', to: '/api/x/sitemap/:name' },
  { from: '/.well-known/:path*', to: '/api/x/well-known/:path*' },
  { from: '/favicon.ico', to: '/brand-assets/:favicon' },
] as const

/**
 * The literal each app's `src/proxy.ts` declares — Next reads `config.matcher` statically,
 * so it is copied, never imported, and route parity compares the copy with this:
 *
 *   export { proxy } from '@engine/http/proxy'
 *   export const config = { matcher: ['/((?!api/|_next/|brand-assets/).*)'] }
 *
 * Everything but `/api/…` (Payload and the routes above), Next's `/_next/…` and brand
 * assets reaches the proxy: pages, `/admin` (English by default), legacy prefixes (brand
 * config, so knowable only at runtime) and `ROOT_REWRITES`. The proxy only rewrites; it
 * never touches the database.
 */
export const PROXY_MATCHER = ['/((?!api/|_next/|brand-assets/).*)'] as const
