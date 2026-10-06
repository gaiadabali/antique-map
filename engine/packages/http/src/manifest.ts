/**
 * @contract C13 — the HTTP handler manifest · consumers: the apps, the proxy, route parity
 *
 * Every engine route the app mounts, and the proxy matcher it declares (ARCHITECTURE.md §5).
 * The app mounts a route with one file, `src/app{path}/route.ts`,
 * exporting exactly `methods` — `export { POST } from '@engine/http/revalidate'`.
 * A route whose first segment after `/api/` — `x` for every engine route, `health` for the
 * health route — equals a collection slug, `payload-jobs` or `graphql` would be shadowed:
 * Payload's catch-all REST mount reads a collection from that segment and a static route there
 * wins, so no collection may be named `x` or `health`. Engine routes live under `/api/x/` so none
 * shadows Payload's REST API; `/api/health` is the named exception. Payload's own mounts, in the
 * app's `(payload)` group, are its admin
 * (`admin/[[...segments]]`) and that REST API (`api/[...slug]`) alone: GraphQL is off.
 * A route is mounted only once its handler exists, but for the targets of `ROOT_REWRITES`
 * (robots, the sitemaps, `.well-known`): each keeps a placeholder (`UNBUILT_HANDLER`) so its root
 * URL answers a plain 404 — robots fails closed — rather than reaching Payload's REST catch-all. What the proxy sets and answers is `./manifest/proxy`.
 *
 * A handler that reads the database reaches Payload through `@engine/cms` alone — never a
 * `payload` dependency of its own — from a `payload-*.ts` module it loads with `import()` after it
 * has read its request (ARCHITECTURE.md §15): so a mount, a unit test and `next build` load a
 * handler without loading Payload, and `@engine/cms` never imports `@engine/http`. Handlers log a
 * request's path without its query string. The files hold type imports of other packages only.
 */
import type { RootFile } from '@engine/config/sites'

import {
  GET,
  POST,
  type EngineRoute,
  type HttpMethod,
  type Lane,
  type RouteAuth,
} from './manifest/types'

export * from './manifest/proxy'
export * from './manifest/types'

/**
 * The handler specifier for a mount path: the static segments after `/api/x/`, `/api/` or
 * `/`, under `@engine/http/`. `/api/x/cron/jobs` → `@engine/http/cron/jobs`;
 * `/api/health` → `@engine/http/health`.
 */
export function handlerOf(path: string): string {
  const rest = path.replace(/^\/api\/x\/|^\/api\/|^\//, '')
  const area = rest.split('/').filter((segment) => segment !== '' && !segment.startsWith('['))
  return `@engine/http/${area.join('/')}`
}

/**
 * The placeholder a mount re-exports while its route's handler is unbuilt: a plain `no-store` 404
 * for every method (`http/src/unbuilt/`), kept only where a root file is rewritten (the sitemaps,
 * `.well-known`), since an unmounted `/api/x/*` path falls to Payload's REST catch-all, which
 * answers 500. Robots waits otherwise (`byPath`): it fails closed — `User-agent: *`, `Disallow: /`
 * — since a crawler reads a 404 as "allow everything" and staging is public (4.1 senior-be #2).
 * Every other unbuilt route is not mounted.
 */
export const UNBUILT_HANDLER = {
  specifier: '@engine/http/unbuilt',
  byPath: { '/api/x/robots': '@engine/http/unbuilt/robots' },
} as const satisfies { specifier: string; byPath: Readonly<Record<string, string>> }

/**
 * What answers an `/api/x/…` path no engine route serves: a plain 404 for every method, mounted at
 * `src/app/api/x/[...rest]` (`@engine/http/unrouted`). Every engine route is a more specific mount
 * and wins; without it such a path would fall through to Payload's REST catch-all, on any host.
 * It is no route of its own, so it is not in `ENGINE_ROUTES`.
 */
export const UNROUTED_HANDLER = {
  mount: '/api/x/[...rest]',
  specifier: '@engine/http/unrouted',
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
} as const

/** The placeholder a mount at `path` names while `handlerOf(path)` is unbuilt. */
export function unbuiltHandlerOf(path: string): string {
  const byPath: Readonly<Record<string, string>> = UNBUILT_HANDLER.byPath
  return byPath[path] ?? UNBUILT_HANDLER.specifier
}

/**
 * `POST /api/x/revalidate` — how `invalidate(tags)` (`@engine/cache`, ARCHITECTURE.md §9) expires
 * tags from outside a Next request: a `payload jobs:run` worker, a seed or an import run on the
 * host. The handler (WEB, TASKS.md 4.6.f) takes `Authorization: Bearer <REVALIDATE_SECRET>`,
 * compared in constant time as the cron routes compare theirs (503 while it is unset, 401 when it
 * is wrong), and a JSON body `{ "tags": [...] }` of at most `maxTags` tags within `maxBodyBytes`,
 * each one a tag `@engine/cache`'s builders make: anything else is a 400 and expires nothing. Each
 * tag's profile comes from its builder — editorial `'max'`, availability and price
 * `{ expire: 0 }` — never from the request, so no caller can make an availability tag go
 * stale-while-revalidate. It answers 204 `no-store`. Inside a request nothing posts:
 * `invalidate()` expires the tags itself, after the response, once the write has committed.
 */
export const REVALIDATE_REQUEST = { maxTags: 256, maxBodyBytes: 64 * 1024 } as const

const COOKIE_AUTH: readonly RouteAuth[] = ['public', 'customer', 'token']

function route(
  path: string,
  owner: Lane,
  auth: RouteAuth | readonly RouteAuth[],
  methods: readonly HttpMethod[],
): EngineRoute {
  const auths = typeof auth === 'string' ? [auth] : auth
  const writes = methods.some((method) => method !== 'GET')
  const sameOrigin = writes && auths.some((each) => COOKIE_AUTH.includes(each))
  return { path, handler: handlerOf(path), methods, owner, auth: auths, sameOrigin }
}

export const ENGINE_ROUTES: readonly EngineRoute[] = [
  // app, DB, storage, queue lag (reported, never gating); initialises Payload through @engine/cms
  route('/api/health', 'WEB', 'public', GET),
  route('/api/x/legacy/[...path]', 'WEB', 'public', GET), // legacy URLs: 301 · 404 · 410
  route('/api/x/revalidate', 'WEB', 'revalidate', POST), // `REVALIDATE_REQUEST`: invalidate(tags) from outside a request
  // the site user's crontab (DEPLOYMENT.md §5): the Payload jobs queue, a per-run limit
  route('/api/x/cron/jobs', 'WEB', 'cron', POST),
  route('/api/x/cron/retention', 'WEB', 'cron', POST), // daily retention sweep (TASKS.md 9.1.d)
  // payments (TASKS.md 6.4): the Midtrans notification, the expiry sweep (every minute), reconcile (every 10 min)
  route('/api/x/webhooks/midtrans', 'PAY', 'signature', POST),
  route('/api/x/cron/sweeps', 'PAY', 'cron', POST),
  route('/api/x/cron/reconcile', 'PAY', 'cron', POST),
  // Root files (`ROOT_REWRITES`), each on its placeholder until its handler is built.
  // staging disallows all; until its handler is built, `UNBUILT_HANDLER.byPath` does everywhere
  route('/api/x/robots', 'SEO', 'public', GET),
  route('/api/x/sitemap/[[...path]]', 'SEO', 'public', GET), // index and per-locale sitemaps
  route('/api/x/well-known/[...path]', 'WEB', 'public', GET), // brand files for /.well-known/*
]

/**
 * Each site's own files, by the name both sites give them, in `public/<site>/`: the favicon, the
 * home-screen icon (a 180 × 180 PNG), the web manifest, the logo and the Open Graph base. A page
 * links them at `/<site>/<file>` — the one path under a site's internal prefix the proxy passes
 * through, and only on that site's own host — and the root URLs below answer from them. No page
 * links one through Next's file conventions (`app/icon.*`, `app/manifest.ts`), which one build
 * would make for both sites.
 */
export const SITE_ASSETS = {
  favicon: 'favicon.ico',
  touchIcon: 'apple-touch-icon.png',
  manifest: 'site.webmanifest',
  logo: 'logo.svg',
  ogImage: 'og.png',
} as const

/**
 * Root files the proxy rewrites, so each keeps its conventional public URL (a sitemap may list
 * only URLs at or below its own path), per site: `:site` is the request host's site. The proxy
 * applies these before the site's route map, and their `from` patterns are exactly the routes'
 * `ROOT_FILES`, so no route-map segment or legacy rule is one.
 *
 * iOS asks for a home-screen icon at the root whatever a page links — `/apple-touch-icon.png`
 * and, older or sized, `-precomposed`, `-180x180`, `-180x180-precomposed` (one pattern takes every
 * suffix) — and crawlers probe `/site.webmanifest`; each site's manifest points its icon at
 * `/apple-touch-icon.png`, which this answers per host. A file a site lacks is a plain 404 from
 * Next's static files, never the designed not-found page and its loader.
 */
export const ROOT_REWRITES = [
  { from: '/robots.txt', to: '/api/x/robots' },
  { from: '/sitemap.xml', to: '/api/x/sitemap' },
  { from: '/sitemap-:name.xml', to: '/api/x/sitemap/:name' },
  { from: '/.well-known/:path*', to: '/api/x/well-known/:path*' },
  { from: '/favicon.ico', to: `/:site/${SITE_ASSETS.favicon}` },
  { from: '/apple-touch-icon.png', to: `/:site/${SITE_ASSETS.touchIcon}` },
  { from: '/apple-touch-icon-:size.png', to: `/:site/${SITE_ASSETS.touchIcon}` },
  { from: '/site.webmanifest', to: `/:site/${SITE_ASSETS.manifest}` },
] as const satisfies readonly { from: RootFile; to: string }[]
