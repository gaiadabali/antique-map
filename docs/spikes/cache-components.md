# Spike — Cache Components on the item page (TASKS.md 4.1.e)

**Verdict: Cache Components confirmed** for the storefronts and the admin, on Next 16.3.6 and
Payload 3.90.2, with three settings the plan did not foresee — each the documented Next mechanism,
each in one place — and **per-request nonces** for the CSP. The fallback (Cache Components off) is
not needed. Recorded in ARCHITECTURE.md §9; the doc contradictions it finds are listed at the end
for ARC.

| Setting | Where | Why (evidence below) |
| --- | --- | --- |
| `export const instant = false` | `(site)/[locale]/layout.tsx` only | a `connection()` outside `<Suspense>` fails `next build` otherwise (§1) |
| `htmlLimitedBots: /.*/` | each app's `next.config.ts` | a prerendered — even empty — shell is served with the build's 200, so `notFound()` and `permanentRedirect()` could only reach the page as meta tags (§2) |
| `currentBrand()` awaits `connection()` | the app's `shell/brand.ts` | Next renders a layout and its page concurrently, so the layout's `connection()` does not stop the page reading the brand at build (§1) |

Run on Windows 11, Node 24.18, from the production builds in `engine/apps/{gallery,emporium}` (built
with `DATABASE_URL`, `PAYLOAD_SECRET`, `BRAND`, `BRAND_ROOT` unset), served with `next start` on
this worktree's ports 4206–4209. `src/spike/check.mjs` re-runs every HTTP-level proof below:

```sh
SPIKE_CONTROLS=1 SPIKE_PANEL_DELAY_MS=1500 BRAND=test TEST_STOREFRONT=gallery … next start -p 4206
node engine/apps/gallery/src/spike/check.mjs http://localhost:4206
```

## 1. The build touches no database, brand or secret — and what that took

`next build` of both apps, with the Payload admin mounted (`(payload)/admin/[[...segments]]`, the
REST `api/[...slug]`, no GraphQL route) and every C13 route mounted, succeeds with no database,
brand or secret. The only prerendered route is Next's own `/_not-found`; the admin is a partial
prerender (Payload's `RootLayout` wraps itself in `<Suspense fallback={null}>` when
`cacheComponents` is on); every storefront route and route handler is dynamic (`ƒ`).

Three build failures on the way, each a rule the apps now follow:

1. **A root parameter needs `generateStaticParams`.** `[locale]` sits in the root layout, and the
   build refused it without one: *"A required root parameter (locale) was not provided in
   generateStaticParams for /[locale]"*. The layout returns every engine locale (`LOCALE_CODES` —
   brand-independent); nothing prerenders, and the brand's own subset is checked per request.
2. **`connection()` outside `<Suspense>` fails the build** — *"Next.js encountered uncached or
   runtime data during prerendering … [block] Set `export const instant = false` to allow a
   blocking route"*. `instant = false` on the `(site)` root layout is Next's documented opt-out
   (route-segment-config/instant: "Setting `false` on the root layout disables static shell
   validation"). The alternative — a `<Suspense>` around the page in the root layout — was
   rejected: the response would flush a 200 and a fallback before the page could answer 404 or a
   redirect, and React's streamed content is hidden `<div hidden>` swapped in by an inline script,
   so a visitor without JavaScript would see only the fallback (§5).
3. **A layout's `connection()` does not hold back its page.** With the layout blocking, the build
   still prerendered `/en`'s page, which read `BRAND` and threw `BrandConfigError`. The brand read is
   now request-time by construction: `currentBrand()` awaits `connection()` before `loadBrand()`.

Two warnings fixed the same way: a module-level `readFileSync` of a runtime path made Turbopack
trace the whole project into the standalone output (`/*turbopackIgnore: true*/`), and
`instrumentation.ts` is compiled for the Edge runtime too, so the Node-only boot check lives in
`boot.ts`, imported only when `NEXT_RUNTIME === 'nodejs'`.

**A route handler that never reads its request is prerendered — it runs at `next build`.** The
first build printed `[health] boot check refused to start (production): BRAND is not set`: Next
had executed `GET /api/health` to bake its answer. With Payload wired, that call is `getPayload()`
at build — a database connection from the build. Every engine `GET` in `@engine/http` that does
real work reads the request first (`void request.headers.get('host')`), and the placeholder mount
target does too, so no 404 is baked in either.

## 2. Status codes need a full request-time render (`htmlLimitedBots`)

With `instant = false` alone, `/en/not-found` answered **200** with `x-nextjs-postponed: 1` and a
`noindex` meta: the build had stored an empty shell (`en/not-found.html`, 0 bytes) with
`"status": 200` in its `.meta`, and `next start` sends that status before resuming the render
(`app-page-runtime.js`: `res.statusCode = cachedData.status`, then the resume is piped after it).
A `notFound()` or `permanentRedirect()` in the resumed part can only become a meta tag.

Next bypasses the shell for "HTML-limited bots" — `shouldForceDynamicPPRRender`, which renders the
whole page per request with blocking metadata. `htmlLimitedBots: /.*/` (documented as "fully
disable streaming metadata") makes every user agent one. Measured after the change:

| Request | Before | After |
| --- | --- | --- |
| `GET /en/not-found` | 200, postponed | **404** |
| `GET /nope` (a page slug with no page) | 404 | 404 |
| `GET /product/1706-caf%C3%A9-java` | — | **308**, `Location` set (§3) |
| the same, with **no `User-Agent` header** | — | 200 + meta refresh: still the shell |

The last row is the one gap: a request without a `User-Agent` still takes the shell path. Browsers
and crawlers send one; the fix is for the proxy to set one when it is missing (a PLT change to C13's
proxy headers — Follow-ups). Caching is unaffected: it is per read (`'use cache'`), never per page.

## 3. The item route: one 200 address, one permanent redirect

The fixture route `(site)/[locale]/item/[idSlug]` resolves by public id and redirects to
`href()`'s URL whenever the address asked for is not exactly it. Item 1706's current slug is
`café-de-java` (outside ASCII, so its URL is percent-encoded); 1726's is `bali`.

| Asked for | Answer | `Location` → then |
| --- | --- | --- |
| `/product/1706-caf%C3%A9-de-java` | 200 | |
| `/product/1706-caf%C3%A9-java` (an old encoded slug) | 308 | `/product/1706-caf%C3%A9-de-java` → 200 |
| `/product/1706-van-t%27hoff` (an old link's odd slug) | 308 | `/product/1706-caf%C3%A9-de-java` → 200 |
| `/product/1706-van-t'hoff`, `/product/1706` | 308 | the same → 200 |
| `/product/1726-bali` | 200 | |
| `/product/1726-b%61li` | 308 | `/product/1726-bali` → 200 — never a second 200 |
| `/id/produk/1706-caf%C3%A9-de-java` | 308 | `/id/produk/1706-kafe-di-jawa` → 200 |
| `/product/1726-bali/`, `/product//1726-bali` | 308 **by Next, before the proxy** (no `x-middleware-rewrite`) | `/product/1726-bali` |
| `/product/9999-x`, `/product/01726-bali`, `/product/1726-bali%2F`, `/en/item/1726-bali` | 404 | |

- **Every `Location` is encoded once** — `%C3%A9`, never `%25C3%25A9` — so no redirect loops.
- **`permanentRedirect()` answers 308 Permanent Redirect, not 301** (Next's documented status for a
  Server Component). Both are permanent to search engines; MIGRATION.md §6 and the task say 301.
- **Next hands one param two ways within a request.** Logged: the page received `idSlug` =
  `1706-caf%C3%A9-de-java` (still percent-encoded) while `generateMetadata` received
  `1706-café-de-java` (decoded once); for the odd link, `1726-b%2561li` and `1726-b%61li`. Comparing
  the slug "as Next hands it" therefore redirected the canonical URL to itself — a loop — in the
  first build. The route now reads only the id from the param and compares the **public path the
  proxy passed on** (`x-public-path`, C13 `PROXY_REQUEST_HEADERS.publicPath`, which overwrites any a
  client sent) with `href()`'s spelling: byte for byte, so there is exactly one 200 address and no
  decode happens at all.
- **Lower-case escapes are normalised before the proxy.** `/product/1706-caf%c3%a9-de-java` reaches
  the proxy as `%C3%A9` (with or without `skipProxyUrlNormalize`) and answers 200. RFC 3986
  §6.2.2.1 makes the two spellings one URI, so this is not a second address — but MIGRATION.md §6
  and C10 list "a lower-case escape" among the spellings that must redirect.

## 4. Cached reads and their invalidation

- The record is `'use cache'` + `cacheTag('item:<id>')` + `cacheLife('max')`; availability is
  `'use cache'` + `cacheTag('availability:<id>')`. A Server Action stands in for an editor's publish
  (`revalidateTag('item:<id>', 'max')`) and for a sale (`revalidateTag('availability:<id>',
  { expire: 0 })`).
- **Availability is never stale:** six flips in a row, each followed by one request, and every
  request showed the new state (`check.mjs`, on the synthetic brand and on Indies Gallery).
- **The test discriminates:** the same run with availability invalidated by `'max'` failed at
  round 1 — *"availability is sold on the very next request"* was `available`.
- **The record is stale-while-revalidate:** after an edit the next request showed edition N, the
  one after N + 1.

## 5. The first flush holds the page and every form; only the panel streams

With the panel's live check delayed 1.5 s (`SPIKE_PANEL_DELAY_MS`), the item page's first bytes
arrived at 25–62 ms and held the title, a post's result, the ship-to form, the bag and its removal
forms and the panel's reserved placeholder (*Checking availability…*); the panel arrived at
~1,540 ms and carried no `<form>` and no post result (`check.mjs`, `firstFlush`). The panel reads
the `shipTo` cookie and the fake availability source inside `<Suspense>`.

**Without JavaScript**, in Chromium with `javaScriptEnabled: false`: the page body and forms render,
the panel stays on its placeholder (a streamed part is swapped in by script), and the ship-to form
and a bag-line removal each post, answer **303**, and come back with the result in the page body,
shown once (screens `ig-item-js-off-*`). The writes are Server Actions — POST forms that answer 303
without JavaScript; the engine's own forms will post to C13's `/api/x/` handlers (DOM's) and answer
303 the same way, their outcome kept under an opaque id (C13 `FORM_RESULT`), as the spike's is.

## 6. One gallery build, two brands

The same `.next` served `BRAND=test` on 4206 and `BRAND=indies-gallery` on 4207: different titles,
names, logos (each at its own `?v=`), contact addresses and databases; the emporium build served
Old East Indies (4208) and the synthetic emporium (4209, whose default locale is `id`, served
unprefixed). Both brands of the gallery build passed `check.mjs` in full.

## 7. The CSP: per-request nonces

A prototype CSP builder was passed to the engine's proxy (`createProxy({ contentSecurityPolicy })`)
for one build; `decide.ts` already copies it onto the request (C13
`PROXY_REQUEST_HEADERS.contentSecurityPolicy`), which is where Next reads a nonce from (Next's CSP
guide: "Next.js parses the Content-Security-Policy header and extracts the nonce"). Chromium, with
JavaScript on:

| `script-src` | Item page | Home | `/admin/login` |
| --- | --- | --- | --- |
| `'self' 'nonce-…' 'strict-dynamic'` (fresh per request) | 0 violations, 13/13 scripts nonced, hydrated, panel swapped in | 0, 9/9 | 0, 14/14 |
| `'self' 'strict-dynamic' 'sha256-…'` | 13 violations, not hydrated, panel stuck | 9 | 14 |
| `'self'` | 5 violations (every inline script), not hydrated, panel stuck | 2 | 3 |

Hashes cannot hold: Next's inline scripts carry the page's RSC payload, which changes with what the
request shows — the same page with `shipTo=NL` and `shipTo=ID` gave different hashes for its flight
script — and the proxy must set the policy before the page renders. **Adopted: a fresh nonce per
request**, set by the proxy on the answer and on the request; every page renders per request (§2),
so no cached HTML ever carries a stale nonce, and `'use cache'` output holds data, never scripts.
The prototype also allowed `style-src 'unsafe-inline'`: React renders `style` attributes, which a
nonce cannot cover — 41.1.a, which owns the builder, decides that line. The prototype, for 41.1.a:

```ts
createProxy({
  contentSecurityPolicy: () => {
    const nonce = randomBytes(16).toString('base64')
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:", // + the brand's media host and its sister's (ARCHITECTURE.md §13)
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  },
})
```

## 8. What else it showed

- **The designed 404 is rendered in the browser.** `notFound()` in a request-time render answers
  404, but Next's recovery document (`<html id="__next_error__">`) has an empty `<body>` and the
  not-found UI is built client-side from the RSC payload: without JavaScript the page is blank.
  Crawlers get the 404 and `noindex`. The NotFound and Gone surfaces (phase 22) need a decision.
- **Unbuilt surfaces** would fall to Next's unbranded 404; a `[...missing]` catch-all under
  `(site)/[locale]` sends them to the designed one inside the brand's layout.
- **Admin under Cache Components:** sign-in, the first-user flow and the dashboard work at 390 px on
  both databases; with the nonce CSP, `/admin/login` has no violation.

## For ARC — where the docs and the spike disagree

1. CONVENTIONS.md §12, AGENTS.md and TASKS.md 4.1.a: "no route segment config anywhere" — the
   `(site)` root layout needs `instant = false` (§1). The rule's reason (Cache Components rejects
   `dynamic`, `revalidate`, `fetchCache`) stands; `instant` is Cache Components' own.
2. ARCHITECTURE.md §9 / CONVENTIONS.md §12: the layout's `connection()` alone does not keep the build
   from prerendering — the page must be request-time too (§1.3), and a response's status needs
   `htmlLimitedBots: /.*/` (§2).
3. MIGRATION.md §6, TASKS.md 4.1.e and 37.1.b: "one 301" — `permanentRedirect()` answers 308.
4. MIGRATION.md §6, C10: a lower-case escape is normalised by Next before the proxy and served 200.
5. TASKS.md 4.1.e: "comparing the slug as Next hands it" — Next hands two spellings; the route
   compares the public path with `href()` instead (§3).
