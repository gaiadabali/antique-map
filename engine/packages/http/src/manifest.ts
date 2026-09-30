/**
 * @contract C13 — the HTTP handler manifest · owner: ARC · consumers: WEB, UXG, UXE, PLT, HAR, handler lanes
 *
 * Every engine route an app mounts, and the proxy matcher every app declares
 * (ARCHITECTURE.md §11). An app mounts a route with one file, `src/app{path}/route.ts`,
 * exporting exactly `methods` — `export { GET, POST } from '@engine/http/commerce/cart'`.
 * Route parity (TASKS.md 2.2.d) fails CI on a missing file, a missing or extra method, a
 * matcher that differs from `PROXY_MATCHER`, or a route whose first segment after `/api/` —
 * `x` for every engine route, `health` for the health route — equals a collection slug,
 * `payload-jobs` or `graphql`: Payload's catch-all REST mount reads a collection from that
 * segment and a static route there wins, so no collection may be named `x` or `health`.
 * Engine routes live under `/api/x/` so none shadows Payload's REST API; `/api/health` and
 * `/brand-assets/…` (outside `/api/`, compared with nothing) are the named exceptions.
 * Payload's own mounts, in each app's `(payload)` group, are its admin (`admin/[[...segments]]`)
 * and that REST API (`api/[...slug]`) alone: GraphQL is off (`graphQL.disable` — the loaders read
 * through the Local API and the sister API is REST), so no app mounts `api/graphql` or its
 * playground, and `graphql` stays a reserved first segment should it ever be switched on.
 * Every app mounts every route whatever the brand's modules: a handler whose `module` is off
 * answers 404 — so does an operation whose module is off, at a sub-path of a mounted route —
 * and parity never depends on config. Until its lane builds it, a route's mount names the
 * placeholder (`UNBUILT_HANDLER`). The parts: the commerce API and its addresses
 * (`./manifest/commerce`), customer accounts (`./manifest/auth`), form posts and saved items
 * (`./manifest/forms`), and what the proxy sets and answers (`./manifest/proxy`).
 *
 * A handler that reads the database reaches Payload through `@engine/cms` alone — never a
 * `payload` dependency of its own — from a `payload-*.ts` module it loads with `import()` after it
 * has read its request (TASKS.md 4.3.a, ARCHITECTURE.md §15): so a mount, route parity's runner, a
 * unit test and `next build` load a handler without loading Payload, and `@engine/cms` never
 * imports `@engine/http`.
 *
 * Handlers log a request's path without its query string. A lookupToken or a payment's scope
 * never travels in a URL (`ORDER_ACCESS`; `payment.status` is a POST). A pay-link or quote
 * token is the capability its page's own URL already carries (C10 `sensitive`), so
 * `payLink.get` and `quote.get` read it from the query; the one-hop links an email carries
 * (`ORDER_ACCESS.link`, `WANT_LIST_ACCESS.link`, the auth routes' GET links — `APPLICATION_ACCESS`,
 * `PASSWORD_LINK`, email verification — and one-click unsubscribe) are the only other credentials
 * in a URL, and each but the unsubscribe moves its token into a cookie and answers 303 to a clean
 * page. Every such token is a derived capability link (C6 `links`), stored nowhere and never in an
 * outbox row, but `PASSWORD_LINK`'s single-use nonce. RFC 8058's one-click unsubscribe — a want
 * list's (`wantList.unsubscribe`), the newsletter's — is the one POST that carries its token in its
 * URL, from the mail client, on `ONE_CLICK_UNSUBSCRIBE`'s terms. Every
 * operation a page calls is a GET or a POST (`FormMethod`), so a form reaches it without
 * JavaScript and comes back to its page through `FORM_RESULT`. The files hold
 * type imports of other packages only, and route parity reads them with the workspace's
 * TypeScript runner.
 */
import type { RootFile } from '@engine/config/routes'
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
export * from './manifest/proxy'
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

/**
 * The placeholder a mount re-exports while its route's handler is unbuilt (TASKS.md 4.3.b; 4.1
 * mounted 34 routes per app on it). A handler is its owning lane's to build, in its own folder,
 * and until it is, the mount names this with a comment naming the handler that replaces it: WEB's
 * module (`http/src/unbuilt/`), never a C13 route and never another route's handler — a plain
 * `no-store` 404 for every method, which reads its request first, so no mount is prerendered, and
 * never its body, so a write reaches nothing: what a route with nothing behind it answers, as one
 * whose module is off does. One route waits otherwise (`byPath`): robots fails closed —
 * `User-agent: *`, `Disallow: /` — since a crawler reads a 404 as "allow everything" and staging is
 * public (4.1 senior-be #2).
 *
 * The policy, which route parity checks (HAR): a mount names `handlerOf(path)`, or — only while
 * `handlerOf(path)` has no module (`src/<area>/route.ts`) — `unbuiltHandlerOf(path)`; and every app
 * names the same one. So the lane that lands a handler repoints both apps' mounts in the same
 * change, and a mount left on the placeholder once its handler exists fails CI rather than
 * answering 404 in production (4.1 senior-fe #16). A stub a lane keeps at `handlerOf(path)` — the
 * cron routes', which authenticate like the real ones — is that lane's own file, not a placeholder.
 */
export const UNBUILT_HANDLER = {
  specifier: '@engine/http/unbuilt',
  byPath: { '/api/x/robots': '@engine/http/unbuilt/robots' },
} as const satisfies { specifier: string; byPath: Readonly<Record<string, string>> }

/** The placeholder a mount at `path` names while `handlerOf(path)` is unbuilt. */
export function unbuiltHandlerOf(path: string): string {
  const byPath: Readonly<Record<string, string>> = UNBUILT_HANDLER.byPath
  return byPath[path] ?? UNBUILT_HANDLER.specifier
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
  // app, DB, storage, queue lag (reported, never gating); initialises Payload through @engine/cms
  route('/api/health', 'WEB', 'public', GET),
  // BRAND_ROOT assets — `immutable` only at a versioned URL (`BRAND_ASSET_URL`), never a root file
  route('/brand-assets/[...path]', 'WEB', 'public', GET),
  route('/api/x/well-known/[...path]', 'WEB', 'public', GET), // brand files for /.well-known/*
  route('/api/x/legacy/[...path]', 'WEB', 'public', GET), // legacy URLs: 301 · 404 · 410
  route('/api/x/revalidate', 'WEB', 'revalidate', POST), // invalidate(tags) from outside a request
  // customer accounts: `AUTH_OPERATIONS`, each 404 without its module
  route('/api/x/auth/[...path]', 'WEB', AUTH_ROUTE_AUTH, AUTH_ROUTE_METHODS),
  route('/api/x/privacy/[...path]', 'WEB', ['customer', 'token'], GET_POST), // export · erase
  // uploads (C6 photos), newsletter (double opt-in, one-click unsubscribe), back-in-stock
  // alerts, and `FORM_OPERATIONS` (saved items); want lists are C6's (`want-lists`)
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
  // per environment: staging disallows all; until SEO builds it, `UNBUILT_HANDLER.byPath` does too
  route('/api/x/robots', 'SEO', 'public', GET),
  route('/api/x/feeds/[...path]', 'SEO', 'public', GET), // merchant and catalogue feeds
  route('/api/x/og/[...path]', 'SEO', 'public', GET), // request-time Open Graph images
]

/**
 * The brand files a root URL is answered from, by the name every brand folder gives them: the
 * home-screen icon (a 180 × 180 PNG) and the web manifest — the favicon is C1's `assets.favicon`,
 * which may be any served type. `ROOT_REWRITES` points at them, and the shell's loader links each at
 * its versioned URL (C2 `ShellVM.assets.touchIcon`, `.manifest`), or `null` when the brand ships
 * none (v1.3, TASKS.md 4.3.b; 4.1 senior-fe #11: the names live here, never in an app).
 */
export const BRAND_ROOT_ASSETS = {
  touchIcon: 'apple-touch-icon.png',
  manifest: 'site.webmanifest',
} as const

/**
 * Root files the proxy rewrites to engine routes, so each keeps its conventional public
 * URL (a sitemap may list only URLs at or below its own path). `:favicon` is the brand's
 * `assets.favicon` (C1), read at runtime. The proxy applies these before C10's parser, and their
 * `from` patterns are exactly C10's `ROOT_FILES`, so no route-map segment or legacy rule is one.
 *
 * iOS asks for a home-screen icon at the root whatever a page links — `/apple-touch-icon.png`
 * and, older or sized, `-precomposed`, `-180x180`, `-180x180-precomposed` (one pattern takes every
 * suffix) — and crawlers probe `/site.webmanifest`. Each is answered from the brand's assets
 * folder by the file `BRAND_ROOT_ASSETS` names (the touch icon serving them all), and one a brand
 * lacks is a plain 404 from the brand-assets route, never the designed not-found page and its
 * loader (3.1 senior-fe #12, 3.4 senior-fe #7). A page links its icons and manifest through
 * `generateMetadata()` (`icons`, `manifest`) from C2 `ShellVM.assets` — never Next's file
 * conventions (`app/icon.*`, `app/apple-icon.*`, `app/favicon.ico`, `app/manifest.ts`), which are
 * made once per build, not per brand. Every file here keeps an unversioned public URL, so none is
 * served `immutable`.
 */
export const ROOT_REWRITES = [
  { from: '/robots.txt', to: '/api/x/robots' },
  { from: '/sitemap.xml', to: '/api/x/sitemap' },
  { from: '/sitemap-:name.xml', to: '/api/x/sitemap/:name' },
  { from: '/.well-known/:path*', to: '/api/x/well-known/:path*' },
  { from: '/favicon.ico', to: '/brand-assets/:favicon' },
  { from: '/apple-touch-icon.png', to: `/brand-assets/${BRAND_ROOT_ASSETS.touchIcon}` },
  { from: '/apple-touch-icon-:size.png', to: `/brand-assets/${BRAND_ROOT_ASSETS.touchIcon}` },
  { from: '/site.webmanifest', to: `/brand-assets/${BRAND_ROOT_ASSETS.manifest}` },
] as const satisfies readonly { from: RootFile; to: string }[]

/**
 * A brand file's public URL and how it is cached (TASKS.md 4.1.f, 3.4 senior-fe #2). A page links
 * the logo, a font, the OG base, the touch icon and the manifest at
 * `/brand-assets/<path>?v=<version>`, `<version>` the first 8
 * hex digits of the file's SHA-256, minted where the shell's view model is built (C2 `ShellVM`
 * carries every brand-asset URL a page links; no template writes one). The route answers
 * `versioned` only when `v` is the file's current version; with no `v` — a root file, whose
 * public URL is fixed — or another one — a page cached before the file changed — `unversioned`,
 * with a strong `ETag` (the full SHA-256) and a 304 on `If-None-Match`. It serves only C1's
 * `BRAND_ASSET_TYPES`, each with its type and `X-Content-Type-Options: nosniff`, an SVG under
 * `Content-Security-Policy: default-src 'none'`, and never a path outside the brand's assets
 * folder: a `..`, an absolute path or a link out is a 404.
 */
export const BRAND_ASSET_URL = {
  path: '/brand-assets/',
  version: { param: 'v', hexDigits: 8 },
  cacheControl: {
    versioned: 'public, max-age=31536000, immutable',
    unversioned: 'public, max-age=300',
  },
} as const
