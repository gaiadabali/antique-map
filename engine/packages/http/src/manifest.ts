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
 * answers 404 — so does an operation whose module is off, at a sub-path of a mounted route —
 * and parity never depends on config. The parts: the commerce API and its addresses
 * (`./manifest/commerce`), customer accounts (`./manifest/auth`), form posts and saved items
 * (`./manifest/forms`).
 *
 * Handlers log a request's path without its query string. A lookupToken or a payment's scope
 * never travels in a URL (`ORDER_ACCESS`; `payment.status` is a POST). A pay-link or quote
 * token is the capability its page's own URL already carries (C10 `sensitive`), so
 * `payLink.get` and `quote.get` read it from the query; the one-hop links an email carries
 * (`ORDER_ACCESS.link`, the auth routes' GET links — `APPLICATION_ACCESS`, `PASSWORD_LINK`,
 * email verification — and one-click unsubscribe) are the only other credentials in a URL, and
 * each but the unsubscribe moves its token into a cookie and answers 303 to a clean page. A
 * form posted without JavaScript comes back to its page through `FORM_RESULT`. The files hold
 * type imports of other packages only, and route parity reads them with the workspace's
 * TypeScript runner.
 */
import type { ModuleKey } from '@engine/config/schema'

import { AUTH_ROUTE_AUTH, AUTH_ROUTE_METHODS } from './manifest/auth'
import { COMMERCE_AREAS, type CommerceRoute } from './manifest/commerce'
import {
  GET,
  GET_POST,
  POST,
  type EngineRoute,
  type HttpMethod,
  type Lane,
  type RouteAuth,
} from './manifest/types'

export * from './manifest/auth'
export * from './manifest/commerce'
export * from './manifest/forms'
export * from './manifest/types'

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
  // customer accounts: `AUTH_OPERATIONS`, each 404 without its module
  route('/api/x/auth/[...path]', 'WEB', AUTH_ROUTE_AUTH, AUTH_ROUTE_METHODS),
  route('/api/x/privacy/[...path]', 'WEB', ['customer', 'token'], GET_POST), // export · erase
  // uploads (C6 photos), newsletter (double opt-in, one-click unsubscribe), alerts, and
  // `FORM_OPERATIONS` (saved items)
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

  // Commerce — `COMMERCE_AREAS`
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
