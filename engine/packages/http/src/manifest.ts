/**
 * @contract C13 — the HTTP handler manifest · consumers: the apps, the proxy, route parity
 *
 * Every engine route an app mounts, and the proxy matcher every app declares
 * (ARCHITECTURE.md §11). An app mounts a route with one file, `src/app{path}/route.ts`,
 * exporting exactly `methods` — `export { POST } from '@engine/http/revalidate'`.
 * A route whose first segment after `/api/` — `x` for every engine route, `health` for the
 * health route — equals a collection slug, `payload-jobs` or `graphql` would be shadowed:
 * Payload's catch-all REST mount reads a collection from that segment and a static route there
 * wins, so no collection may be named `x` or `health`. Engine routes live under `/api/x/` so none
 * shadows Payload's REST API; `/api/health` and `/brand-assets/…` (outside `/api/`) are the named
 * exceptions. Payload's own mounts, in each app's `(payload)` group, are its admin
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
import type { RootFile } from '@engine/config/routes'
import type { ModuleKey } from '@engine/config/schema'

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
 * `/api/health` → `@engine/http/health`; `/brand-assets/[...path]` → `@engine/http/brand-assets`.
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
  module?: ModuleKey,
): EngineRoute {
  const auths = typeof auth === 'string' ? [auth] : auth
  const writes = methods.some((method) => method !== 'GET')
  const sameOrigin = writes && auths.some((each) => COOKIE_AUTH.includes(each))
  const gated = module === undefined ? {} : { module }
  return { path, handler: handlerOf(path), methods, owner, auth: auths, sameOrigin, ...gated }
}

export const ENGINE_ROUTES: readonly EngineRoute[] = [
  // app, DB, storage, queue lag (reported, never gating); initialises Payload through @engine/cms
  route('/api/health', 'WEB', 'public', GET),
  // BRAND_ROOT assets — `immutable` only at a versioned URL (`BRAND_ASSET_URL`), never a root file
  route('/brand-assets/[...path]', 'WEB', 'public', GET),
  route('/api/x/legacy/[...path]', 'WEB', 'public', GET), // legacy URLs: 301 · 404 · 410
  route('/api/x/revalidate', 'WEB', 'revalidate', POST), // `REVALIDATE_REQUEST`: invalidate(tags) from outside a request
  // the site user's crontab (DEPLOYMENT.md §5): the Payload jobs queue, a per-run limit
  route('/api/x/cron/jobs', 'WEB', 'cron', POST),
  // Root files (`ROOT_REWRITES`), each on its placeholder until its handler is built.
  // staging disallows all; until its handler is built, `UNBUILT_HANDLER.byPath` does everywhere
  route('/api/x/robots', 'SEO', 'public', GET),
  route('/api/x/sitemap/[[...path]]', 'SEO', 'public', GET), // index and per-locale sitemaps
  route('/api/x/well-known/[...path]', 'WEB', 'public', GET), // brand files for /.well-known/*
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
