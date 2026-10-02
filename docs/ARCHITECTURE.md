# Architecture

**Purpose:** how the platform is built and why — topology, stack, layout, routes, rendering and caching, writes,
the stock guarantee, media, search, jobs, locales and roles. It serves [PLAN.md](PLAN.md) (DR-1…DR-15). Fields are
[CONTENT-MODEL.md](CONTENT-MODEL.md), the shop's flows [COMMERCE.md](COMMERCE.md), controls
[SECURITY.md](SECURITY.md), the AI [AI.md](AI.md), data in [DATA.md](DATA.md), hosts [DEPLOYMENT.md](DEPLOYMENT.md).

## 1. Principles

1. **One app, one database, one owner** (DR-1, DR-2). The hostname picks the site; a record that belongs to one
   site carries `site`. Nothing is configured per brand.
2. **Payload and Next as they come**: a built-in (drafts, versions, access, uploads, jobs, localisation) before our
   own code, and our own code only where a built-in is unsafe or misses a target.
3. **Code and people decide; the model drafts.** Prices, stock, statuses and what is public are decided by code
   and staff; the AI reads what a visitor can and suggests fields a person verifies (DR-9).
4. **The last unit sells once**, by a database statement, not a convention (§7).
5. **The DOM carries the meaning.** Every page works without JavaScript; the viewer, the chat and the map pin
   enhance a complete page. Public reads are published-only and projected: the Local API's default,
   `overrideAccess: true`, would leak drafts, the owner-only asking price and other stores' orders.

## 2. Topology

```
 gallery hosts ─┐                                  ┌─ (gallery) tree: catalogue, deep zoom, enquiry
                ├─ nginx ─► ONE Next.js 16 process ─┼─ (shop) tree: catalogue, bag, checkout, tracking
 shop hosts ────┘  (TLS)   127.0.0.1:<port>, pm2    └─ (payload): /admin and Payload's REST, admin host only
                                 │            │
                     Postgres 18, one DB    RustFS (S3): media bucket, public only under derivatives/ and iiif/;
                                            private bucket: masters, driver images, import files
 outbound (allow-listed, SECURITY.md S1): Midtrans · Anthropic · Turnstile · SMTP · Google Maps (geocoding)
```

- **`src/proxy.ts` picks the site from `Host`** against `GALLERY_HOSTS` and `SHOP_HOSTS`; the first host of each
  is canonical and the others answer 301 to it. An unknown host gets a plain 404 and never picks a site or builds
  a URL. The proxy rewrites the public path into the site's internal tree (`/gallery/<locale>/…`,
  `/shop/<locale>/…`), sets `x-site`, `x-locale`, `x-public-path` and `x-public-search` (overwriting any a client
  sent; a rewrite drops the query), the security headers and the per-request CSP (SECURITY.md B2–B3), and never
  touches the database. Every public path is prefixed, so an internal path asked for directly is a 404.
- **The admin is Payload's** — `/admin`, and Payload's REST under `/api/` — on one host, `ADMIN_HOST` (Payload's
  `serverURL`: the shop's canonical host, Q1). Elsewhere the proxy answers both with 404 (it sees `/api/`
  for this check alone and never rewrites there), and staff cookies stay on that host.
- **Absolute URLs** (canonical, `hreflang`, Open Graph, emails, handoff links) come from the canonical hosts,
  never from a request's `Host`. Engine routes resolve the site with the same `siteFromHost()`.

## 3. Stack and pins

| | Pin | Why |
| --- | --- | --- |
| Next.js | **16.3.6**, exact | App Router, React 19, Cache Components; `middleware` is now `proxy`; Payload 3.90 needs `>=16.3.3 <17` |
| React | 19.3.0 | |
| Payload | **3.90.2**, exact, every `@payloadcms/*` alike | admin, Postgres adapter, S3 storage, nodemailer, jobs; Payload 4 only once stable with a migration guide |
| Postgres | 18 (local `postgres:18.0`, Helios 18.6) | `unaccent`, `pg_trgm`, `NULLS NOT DISTINCT`; local matches production |
| Node · pnpm | ≥ 22.13 (Helios 22) · 11.3 | `allowBuilds` in `pnpm-workspace.yaml` approves native builds |
| TypeScript · ESLint | 5.9.3 · 9.39 | typescript-eslint 8 supports TS < 6.1; `eslint-config-next` still breaks on ESLint 10 |
| Tests | Vitest 5 · Playwright 1.56 with axe · Lighthouse CI 0.15 | |
| Images · validation | sharp 0.35.5 · zod 4.6 | derivatives and tiles from one library; schemas on the server, never in a browser |
| AI | `@anthropic-ai/sdk` | server only; model ids are configuration (AI.md §1) |
| Styling · viewer | CSS Modules with custom-property tokens · OpenSeadragon | the design team's three-tier tokens, ported (DESIGN-SYSTEM.md); the viewer loads on intent (§8) |
| Maps | Google Maps Platform: the Maps JavaScript API with Places (browser, checkout only) · the Geocoding API (server) | the owner's choice (Q2); the browser key reaches the page as a server-rendered prop (SECURITY.md S4, B6) |

## 4. Repository layout

```
engine/apps/web/                  the one Next.js app
  src/proxy.ts                    Host → site, rewrite, headers, CSP
  src/app/(gallery)/gallery/[locale]/… · src/app/(shop)/shop/[locale]/…   each site's routes and root layout
  src/app/(payload)/…             /admin and Payload's REST, with the generated importMap.js
  src/app/api/x/**, api/health    engine routes (§5)
  src/server/**                   server-only: loaders, actions, the chat, collect
  src/sites/{gallery,shop}/       components, the palette (tokens/) and the lexicon (keys, en and id values) of each site
  src/shared/ · src/view-models/  styles/ (base tokens, fonts), components (link primitive, viewer) · view models + fixtures
  public/{gallery,shop}/          icons, logos, the Open Graph base
engine/packages/
  cms/      Payload config, collections, access, hooks, validators, the one migration set, and the jobs with the
            code they run: the shop's writes (orders, stock, payments), notifications, search, imports, seeds
  config/   constants (en, id, IDR exponent), SITES (hostnames, segments, legacy paths), siteFromHost(), href(), boot check
  http/     the proxy's pure decision, health, cron, revalidate, legacy redirects, the bearer check
  media/    storage keys, presigned uploads, type sniffing, derivative and tile jobs
  cache/    tag builders and invalidate(); a leaf importing no engine package
  i18n/     locales, message loading, the money, date and dimension formatters, the Money type
  migrate/  outside data in: the crawler, the dump restore, normalisers, spreadsheet readers; no Payload
engine/tooling/  check-file-size · config-drift · db · worktree · tasks-lint
scripts/ops/  Helios provisioning     tests/e2e/  status · smoke · a11y · checkout, on both hosts
```

- **Packages never import the app.** Code a Payload job runs lives in `cms` or a package beneath it; code only
  pages and routes use lives in `src/server/`.
- **Only `src/server/**` and `(payload)` import Payload or `@engine/cms`**, and each `src/server/` module starts
  with `import 'server-only'`, so a Client Component that reaches one fails the build. Components render view
  models; a page calls its loaders.
- *Reshape note:* today's two apps, brand folders and contract packages go; [CARRY-OVER.md](CARRY-OVER.md) lists
  every move and deletion.

## 5. Routes

English is unprefixed, Indonesian under `/id` (DR-12). Route segments are translated, record slugs are not
(CONTENT-MODEL.md §1). The segments live in `SITES`, with `href()` and its inverse `parsePublicPath()`; nothing
builds a URL by hand.

| Surface | Gallery (en · id) | Shop (en · id) |
| --- | --- | --- |
| Browse | one segment per object type (`/antique-maps`, `/antique-prints`, `/photographs` · `/id/peta-antik`, `/id/cetakan-antik`, `/id/foto`), optionally with a place path (`/antique-maps/java/batavia`); all types `/browse` · `/id/jelajah` | `/shop`, `/shop/{category}` · `/id/belanja/…`; `/collections/{slug}` · `/id/koleksi/…` |
| Search | `/search?q=` · `/id/cari` | the same |
| Item | `/product/{publicId}-{slug}` · `/id/produk/…` | `/product/{slug}` · `/id/produk/{slug}` |
| Makers · places | `/makers`, `/makers/{slug}` · `/id/pembuat/…`; `/places`, `/places/{path}` · `/id/tempat/…` | — |
| Bag · checkout | — | `/bag` · `/id/keranjang`; `/checkout` · `/id/checkout` |
| Tracking | — | `/track` (find my order), `/track/{token}` · `/id/lacak/…` |
| Contact | `/sell-to-us` · `/id/jual-ke-kami` | `/partnership` · `/id/kemitraan`; `/stores` · `/id/toko` |
| Stories · pages | `/stories/{slug}` · `/id/cerita/…`; `/{slug}` · `/id/{slug}` | `/{slug}` · `/id/{slug}` |

- **The gallery's item route resolves by `publicId`**: the old site's product id for a migrated work, so its old
  URL is its URL; for a new work, a number from a sequence starting at 100000. A differing slug part answers one
  308 to the current address, with the old link's query from `x-public-search` (DATA.md §6). The shop resolves by
  slug; a changed slug writes a `redirects` row.
- **A route reads only ASCII from `params`** (the locale, a numeric id). A slug or a place path comes from
  `parsePublicPath()` over `x-public-path`, decoded once: Next hands a page a segment still percent-encoded and
  `generateMetadata` the same segment decoded.
- **A path that names no page, or a slug with no record, is looked up in `redirects`** (one cached map per site)
  before the site's designed 404: a hit answers 308. Each tree ends in a `[...missing]` catch-all for the first
  case; a slug route makes the same lookup for the second.
- **Old addresses** of the previous sites: the proxy rewrites their prefixes (`SITES.*.legacy`) to
  `/api/x/legacy/{site}/…`, which answers 301 or 410 (DATA.md §6–§7). Root files (`/robots.txt`, `/sitemap.xml`,
  icons, the web manifest) are rewritten per site.

**Engine routes live under `/api/x/`.** Payload's catch-all `api/[...slug]` reads a collection from the first
segment and a static route there wins, so ours share one segment no collection may take; a unit test refuses a
collection slug `x` or `health`.

| Route | Called by | Notes |
| --- | --- | --- |
| `GET /api/health` | the deploy agent, monitors | database, storage, queue lag (reported, never gating), the environment judged |
| `POST /api/x/cron/{jobs,sweeps,reconcile,nightly}` | the site user's crontab | `Bearer $CRON_SECRET`, 503 when unset (§10) |
| `POST /api/x/revalidate` | jobs, imports, seeds, on loopback | `REVALIDATE_SECRET`; each tag parsed against the grammar |
| `POST /api/x/webhooks/midtrans` · `/api/x/orders/{id}/driver-image` | Midtrans · staff | COMMERCE.md §6, §9 |
| `/api/x/chat/{session,message,consent}` · `POST /api/x/leads` | the chat · lead forms | AI.md §2.2 · COMMERCE.md §14 |
| `POST /api/x/collect` · `GET /api/x/geocode` | the beacon · the checkout's pin | ANALYTICS.md §3 · Google's Geocoding API on the server key: checks a pin or a pasted Google Maps link, names the pin's area (SECURITY.md S1, S4) |
| `GET /api/x/legacy/{site}/…` · `/api/x/{sitemap,robots}/{site}` | the proxy's rewrites | DATA.md §6 |

## 6. Rendering and caching

The model is Next 16 **Cache Components** (`cacheComponents: true`), proven by the
[spike](spikes/cache-components.md) and used the way its rules require:

- **The build never touches a database**: it runs with no `DATABASE_URL` or `PAYLOAD_SECRET`, against a sentinel
  that refuses connections (CONVENTIONS.md §12), and nothing prerenders from the CMS. A `GET` handler reads its
  request first, or `next build` runs it to bake its answer, and loads Payload with `import()` only after that.
  Node-only boot code sits behind `NEXT_RUNTIME === 'nodejs'`.
- **One route segment config:** `export const instant = false` on each site's root `[locale]` layout, which also
  lists `en` and `id` in `generateStaticParams`. No `dynamic`, `revalidate` or `fetchCache`: Cache Components
  refuses them. The site and its settings are read at request time, after `connection()`.
- **Every page renders in full per request.** `htmlLimitedBots: /.*/` stops Next serving a prerendered shell
  under its build-time status, so `notFound()` is a 404 and `permanentRedirect()` a 308. Next treats a request
  with no `User-Agent` as no bot, so the proxy sets one. The status spec (`tests/e2e/status`) fails the day a
  release changes this. Caching is per read, never per page.
- **Cached reads** are `'use cache'` + `cacheTag(…)` + an explicit `cacheLife`, tags made by `@engine/cache`'s
  builders, never by hand. The cache key carries the site and locale, as loader arguments; a tag names a record
  (`work:<id>`, `product:<id>`, `settings:<site>`…), so one invalidation reaches every site that shows it. A
  `cacheTag()` call takes at most 128 tags. Per-visitor data (the bag, a tracking token, a form's result) never
  enters a shared cache.
- **Invalidation runs after the write commits.** Payload runs `afterChange` before it commits, so `invalidate()`
  never revalidates on the spot: inside a request it schedules `revalidateTag()` with `after()`; outside one (a
  job, an import, a seed) a collector on `req.context` gathers the tags and is flushed once the operation returns,
  by a post to `/api/x/revalidate` on loopback. Editorial tags expire `'max'`; stock, price and status tags expire
  `{ expire: 0 }`.
- **What decides a purchase is read live, never cached**: the stock check of the bag, checkout and the buy panel,
  one indexed read each. A cached "In stock" or "Sold" on a card carries its record's tag and declares as its own
  `cacheLife` the one-minute backstop `AVAILABILITY_STATUS_LIFE` (an outer `cacheLife` wins over an inner one), so
  a missed invalidation heals itself. No purchase acts on a cached status: the order's decrement refuses (§7).
- **The first flush carries the page and every form.** A form, its current value, a post's result and the buy
  panel are read in the page body: a streamed part stays hidden until a script swaps it in. Only slow reads no form
  depends on (related works, a rail) stream inside `<Suspense>`. `generateMetadata` reads cached data only.
- **Storefront links never prefetch**: a prefetch is a full render with the page's reads. A link is an `<a>` or
  the link primitive (`next/link`, `prefetch={false}`); ESLint refuses `next/form` and `router.prefetch()`.
  `withPayload`'s client hints stay on `/admin/:path*`: on a storefront `Critical-CH` doubles every first visit.

## 7. Writes and the stock guarantee

- **Every visitor write is a POST** that works without JavaScript: a Server Action for a page's own forms (bag,
  checkout), an `/api/x/` route for script and machine callers. A form post answers 303 to its page, its outcome
  kept server-side under an HttpOnly cookie holding an opaque id (never personal data) and shown in the page body.
  Writes refuse a foreign `Origin` (SECURITY.md B4); a double tap carries an idempotency key.
- **Business writes** (orders, stock, payments, leads, imports) are `cms` functions taking the request's `req`, in
  one Payload transaction, with raw SQL through the Postgres adapter where Payload cannot say it. Domain
  transactions run READ COMMITTED, with `lock_timeout` and `statement_timeout` set by `SET LOCAL`.
- **The atomic decrement** (COMMERCE.md §4): per line, `UPDATE stock_levels SET quantity = quantity - $qty WHERE
  … AND quantity >= $qty`; the row count is the answer, and a short line rolls the order back. The schema backs it
  through the adapter's hook, so a dev-pushed test database has it too: `CHECK (quantity >= 0)` and a unique
  `(store, product, variant_sku) NULLS NOT DISTINCT`, one row per product per store even without a variant.
- **One lock order, so no two writers deadlock:** the `payment-events` dedupe row, the order, stock rows by (store,
  product, variant SKU), discount counters last. A release is a compare-and-set on the order's status, so it
  happens once; a reassignment moves the stock between stores in one transaction.
- **A payment and its order change commit together**: the dedupe row, the move to `paid` and the notification
  jobs, or nothing; on error the webhook answers 500 and Midtrans retries (COMMERCE.md §6). Fifty parallel orders
  for the last unit create exactly one (SECURITY.md P5).

## 8. Media and deep zoom

| Tier | What | Where |
| --- | --- | --- |
| Masters | captures as received (TIFF, RAW, JPEG), checksum, the object's box and measured ppi | private bucket `masters/`; the record is a plain `masters` collection |
| Uploads | a `media` record's processed image, full size, perhaps with camera metadata | media bucket, private `uploads/`; staff only, through Payload |
| Derivatives | AVIF and WebP at 320, 640, 1024, 1600 and 2400 px, a blur placeholder; metadata stripped | media bucket, public `derivatives/`, content-addressed, immutable |
| Deep zoom | IIIF Image API 3 Level 0 static tiles, 512 px, capped at the public long edge (4,096 px) | media bucket, public `iiif/` |
| Order files | driver images | private bucket `orders/{id}/` (COMMERCE.md §9) |

- **Masters go straight to the bucket** by presigned PUT, checked by length and SHA-256, never through `/admin`:
  a large TIFF exceeds a CDN's request limit and Payload's memory. Staff open one by a short-lived signed link.
- **Public means two prefixes.** The media bucket is anonymous-readable only under `derivatives/` and `iiif/`
  (the slash included) and lists nothing; the private bucket admits no anonymous request. A public read of
  `media` goes through the published record that places it (CONTENT-MODEL.md §5).
- **Tiles only where they add detail.** An image no longer than the largest derivative (2,400 px, as most legacy
  images are) opens in the viewer from that derivative; a larger one gets tiles capped at the public long edge,
  since Level 0 tile paths are predictable and a signed manifest over public tiles would protect nothing.
- **No image server**: static files behind the media origin answer every zoom. OpenSeadragon loads on intent
  (first tap or hover, or idle after LCP), so it never costs the item page's JavaScript budget.

## 9. Search

Postgres full text in a derived `search_documents` table (site, record, locale, `tsvector`, filter columns),
declared through the adapter's hook rather than as a collection, refreshed per record by a job on change.

- Names and titles use a configuration chaining `unaccent` and `simple` (Blaeu, Valentijn); descriptions use
  `english` and `indonesian`; `pg_trgm` catches misspellings (Valentyn → Valentijn) for one "Did you mean".
  `unaccent()` is not IMMUTABLE, so indexes use the configuration or an IMMUTABLE wrapper.
- **The gazetteer is the differentiator**: a query term matching a place's name or historical name (Batavia,
  Celebes, Buitenzorg) adds that place and those within it, so "Celebes" and "Sulawesi" find the same maps. A
  stock number (`M.0500`) jumps to its item.
- **Facet counts** apply every filter but their own; otherwise unselected options all read zero.
- **Moving availability is not indexed**: the shop's "in stock" is computed at query time from `stock-levels`;
  the gallery's `status` is a staff field, re-indexed with its record.
- One search function serves the pages and the chat's `search_catalogue` tool, published-only and projected,
  behind a small interface; a search server is not worth running below about 100,000 documents.

## 10. Jobs

Payload's jobs queue holds the work and cron-called routes run it, never `autoRun`, which starts on the first
`getPayload()` inside a page render and competes with renders for CPU and the thread pool password hashing uses.

| Route | Every | Runs |
| --- | --- | --- |
| `cron/jobs` | minute | queued jobs, a per-run limit, one run at a time: emails (queued in the transaction of their change), derivatives and tiles, search refresh, imports, AI drafts |
| `cron/sweeps` | minute | each `pending_payment` order past `expiresAt` + 5 min: ask Midtrans, apply its answer, else expire and release the stock (COMMERCE.md §6) |
| `cron/reconcile` | 10 min | asks Midtrans about pending orders still in their window, so a lost notification shows sooner (SECURITY.md W6) |
| `cron/nightly` | 02:00 WITA | the retention purge (chat sessions, leads, driver images, tracking links, raw events, import files; COMPLIANCE.md §1 sets each period), analytics and AI-cost roll-ups |

Bulk image work (the legacy set, a large handover) runs off-box, a workstation CLI writing straight to the
bucket (DATA.md §5). Migrations run in the web process alone (DEPLOYMENT.md §4).

## 11. Locales

- `en` is the default, unprefixed; `id` lives under `/id`. Payload localises content fields in `en` and `id`, `id`
  falling back to `en`. British spelling, the *Anda* register (DR-12).
- The unprefixed root is always English, never negotiated from `Accept-Language` (crawlers must see one answer); a
  dismissible banner offers Indonesian. Each page has one canonical and reciprocal `hreflang`, `x-default` English.
- Interface words are lexicon keys per site with an `en` and an `id` value; marketing text lives in the CMS
  (DESIGN-SYSTEM.md §11, CONVENTIONS.md §6). The admin speaks each user's `language` (G15).

## 12. Identity and roles

- **Only staff sign in**, as Payload `users`: `owner`, `editor`, `store` (DR-10), a `store` user tied to one store.
  No customer, partner or visitor account exists. Sessions, lockout and passwords are SECURITY.md §2.1.
- **Access lives in collection and field access functions**, never in hidden admin fields. A `store` user's reads
  carry a `Where` on their store, so lists, counts and relationships are scoped in the query (SECURITY.md R2–R3).
- **Request paths read as the caller** (`user`, `overrideAccess: false`). System writers (the webhook, sweeps,
  jobs, imports, seeds) set `overrideAccess: true` explicitly and are listed (SECURITY.md R4).

## 13. The AI and security

- **The chat** (`src/server/chat`) calls the pages' own loaders and search, so it reads exactly what a visitor can:
  no draft, no asking price, no order. Its one write is a lead, behind the visitor's consent click. **The drafting
  tool** is an admin action in `cms` filling empty fields marked unverified, which the server refuses to publish.
  The rest is AI.md.
- **SECURITY.md is the checklist.** Two of its controls shape this design: the CSP nonce holds only because every
  page renders per request (§6), and rate limits key on the address nginx sets, sound only while the app binds
  loopback (DEPLOYMENT.md §3).

## 14. Deliberately not used

| Not used | Why |
| --- | --- |
| `@payloadcms/plugin-ecommerce` | beta; it reads stock at payment start and decrements with an unguarded `$inc`, so the last unit can sell twice |
| Payload's multi-tenant plugin, a database per site | one owner; a `site` field is enough (DR-1) |
| Shopify, Medusa, Saleor, Vendure | a second system and admin to run for one small store, which would still need our own store assignment and tracking |
| A courier or WhatsApp API · customer or partner accounts | staff book the driver and WhatsApp is click-to-chat (DR-6, DR-7) · only staff sign in (DR-8, DR-10) |
| GraphQL · IIIF Presentation manifests, an image server | off for every collection (SECURITY.md R6) · static Level 0 tiles and the page's own image list do the job |
| Elasticsearch, Algolia, Meilisearch · Redis | Postgres full text is ample (§9) · one process: Postgres holds locks and the queue, rate limits are in-process |
| GA4, Meta Pixel, any third-party tag | DR-13 |
| Docker in production · a separate API service | Helios is CloudPanel and pm2 · the App Router is the API, and a second service doubles the deploy surface |
| Tailwind, CSS-in-JS, an animation library | tokens are custom properties and components are few; CSS and View Transitions carry the motion |

## Open

- **The public deep-zoom cap** — default 4,096 px long edge: more lets collectors inspect, less protects captures
  from reproduction. *Owner.*
- **The production media origin** — a CDN host or the sites' own `/_media/` path (DEPLOYMENT.md). *Owner, DevOps.*
