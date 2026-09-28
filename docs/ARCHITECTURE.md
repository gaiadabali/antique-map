# Architecture

Decisions, and the reasoning behind them. If you disagree with one, argue with
the reasoning — it is written down so it can be challenged (KOI's rule).

---

## 1. Principles

1. **A brand is configuration, data and assets — never code.** No brand literal
   under `engine/`, enforced in CI; a synthetic third brand runs every build
   (BRANDS.md). NOW!'s principle 7, applied to commerce.
2. **Works are first-class; products are how works are sold.** A 1726 Valentijn
   map of Bali exists whether or not it is for sale, sold, or reproduced as a
   poster. Separating the object (`works`) from the offer (`products`) is what
   lets the gallery keep a sold archive, the merch shop sell forty products from
   one engraving, and both link to each other — from one model.
3. **A one-of-one object is sold once.** The guarantee is a database constraint
   inside one transaction, not an application convention (§6).
4. **Money is priced on the server and moves in one transaction.** The browser
   sends ids and quantities. Payment, reservation and order change state
   together or not at all.
5. **The DOM carries the meaning.** Every fact a buyer, a search engine or a
   screen reader needs is real HTML. The deep-zoom viewer, the frame
   configurator and the room view are enhancements over complete pages (KOI).
6. **Copy with provenance; never join across brand databases** on a request
   path (NOW!'s syndication rule).
7. **Deterministic code decides, the model drafts.** AI-assisted cataloguing
   proposes titles, regions and descriptions from a scan; a cataloguer verifies
   every field before it can publish. Nothing about a price, a date or an
   attribution is asserted on a model's authority (NOW! principle 4, KOI's
   `aiGenerated` flag).
8. **The admin is half the product.** 9,500 originals to catalogue and an archive
   to turn into merchandise: if those screens are slow, neither site fills up.

## 2. Topology

```
                         ┌──────────────── engine/ (one repo, one CI) ────────────────┐
                         │ packages: config · cms · domain · payments · shipping ·    │
                         │ fulfilment · media · search · loaders · view-models · ui · │
                         │ http · i18n · seo · analytics · mail · sister · migrate    │
                         └───────────────┬───────────────────────────┬────────────────┘
                                         │                           │
                         engine/apps/gallery               engine/apps/emporium
                         (Next 16 + Payload /admin)        (Next 16 + Payload /admin)
                                         │                           │
       BRAND=indies-gallery ─ pm2 uig ───┤                           ├─── pm2 uoei ─ BRAND=old-east-indies
                                         │                           │
                               ┌─────────▼────────┐        ┌─────────▼────────┐
                               │ ig_db (PG 18)    │        │ oei_db (PG 18)   │   SAME SCHEMA
                               │ works · products │        │ works (copies) · │   one migration set
                               │ orders · people  │        │ products · orders│   hash-checked in CI
                               └─────────┬────────┘        └─────────▲────────┘
                                         │  sister API + webhooks    │
                                         └──── work snapshots ───────┘   (copy with provenance)

   object storage (R2): ig-media · oei-media (public, CDN) · archive-masters (private, shared)
   providers per brand: payment gateways · couriers · print-on-demand · SMTP · WhatsApp
```

**Payload binds one database per instance**, so each brand is its own process
(NOW! §3.5). The multi-tenant plugin was rejected for the same reason: it puts
every tenant in one database behind a `tenant` column, which is precisely what
"different database per brand" rules out — and the brands may be different
legal entities holding each other's customers' data.

**The Payload config must not depend on the brand for anything that reaches the
schema or the import map.** Payload stores `_locale` as a Postgres enum, adds
storage fields only when a plugin is enabled, and writes admin components into a
generated import map — so a config shaped by `BRAND` would silently give two
brands two schemas. `BRAND` may set only the server URL, CSRF/CORS, email sender,
admin branding, and `admin.hidden` / access by module flag. Locales are the
**superset** (`en`, `id`, `nl`) in every database, with each brand's own locales
enforced by routing; the S3 storage plugin runs with `alwaysInsertFields: true`.
CI regenerates the migration snapshot and the import map **with `BRAND` unset**
and fails on any diff (TASKS.md 0.3.g).

## 3. Stack — and why these pins

KOI's line, because it is the team's newest and it is in production:

| | Pin | Reason |
| - | --- | ------ |
| Next.js | **16.3.x** (exact patch pinned) | App Router + React 19; Payload 3.9x's peer range is `>=16.3.3 <17`. Next 16 renamed `middleware` → `proxy`. |
| React | 19.3 | |
| Payload | **3.90.x**, exact | Payload 4 is canary (`4.0.0-canary.37`); adopt only after it is stable and ships a migration guide. |
| TypeScript | 5.9 | typescript-eslint 8 declares `<6.1`; TS 7 (native) has no support in this stack. |
| ESLint | 9 | `eslint-config-next` still pulls a plugin that crashes on ESLint 10 (KOI). |
| Tailwind | 4.3 | `@theme inline` token registration (DESIGN-SYSTEM.md §4). |
| Postgres | 18 (Helios has 18.6) | local dev matches production — KOI authored migrations on 16 and ran them on 18. |
| Node | 22 (Helios) | |
| pnpm | 11 | `allowBuilds` in `pnpm-workspace.yaml` (PARALLEL-TRACKS.md §2). |
| Tests | Vitest 5 · Playwright 1.6x + axe · Lighthouse CI | KOI's harness, unchanged. |
| Images | sharp 0.35 | derivatives **and** IIIF tiling in one library (§7). |

## 4. Repository layout

```
antique-map/
  engine/
    apps/
      gallery/         storefront for one-of-one catalogues   — UI + route tree + /admin mount
      emporium/        storefront for variant merchandise     — UI + route tree + /admin mount
    packages/
      config/          BrandConfig schema (zod), loader, module flags, route map (C1, C10)
      cms/             ONE Payload config factory, instantiated per brand; ONE migration set
      domain/          pure commerce: money, fx, pricing, tax, inventory, reservations,
                       cart, checkout, orders, offers, holds — state machines (C5, C6, C8)
      payments/        PaymentGateway contract + adapters: manual, bank-transfer, stripe,
                       midtrans, paypal, and xendit / doku if chosen (C7)
      shipping/        ShippingProvider contract + flat, quote, collect, biteship, dhl-express
      fulfilment/      FulfilmentProvider contract + own-stock, prodigi, gelato
      media/           derivative ladder, IIIF tiling jobs, manifests, masters access (C9)
      search/          SearchPort + Postgres FTS, trigram, gazetteer synonyms, facet counts
      loaders/         Payload Local API → view models, one per surface
      view-models/     every VM type + typed fixtures + the block union (C2, C4)
      ui/              headless accessible primitives + token contract (C3)
      http/            route handlers every app re-exports under /api/x/…; proxy helpers;
                       the brand-assets route; manifest (C13)
      i18n/            locales, messages, formatters for money, dates, dimensions
      seo/             JSON-LD builders, sitemaps, hreflang, merchant feeds
      analytics/       beacon, events table, consent, GA4/Meta mapping (C11)
      mail/            transactional email + WhatsApp templates and senders
      documents/       PDF order documents: confirmation, proforma, certificate of
                       authenticity, commercial invoice, packing slip
      sister/          archive API client/server, work snapshots, webhooks (C12)
      migrate/         source adapters (laravel-catalogue, csv-products), loaders, reports
      testing/         fixtures, contract suites, concurrency harness
    tooling/           check-file-size · lint-brand-literals · schema-hash · db-fresh ·
                       brand-create · route-parity · config-drift · tasks-lint
  indies-gallery/  old-east-indies/  test/     config · assets · content — zero code
  tests/           e2e/ · contract/ · load/
  docs/  manual/  scripts/ops/
```

**Hard rule: no file over 300 lines** (CONVENTIONS.md §2).

## 5. Commerce: Payload-native, with our own checkout

Researched 2026-09-25 against live registries and by reading the published
plugin source. Weighted on the brief's hardest requirements (one-of-one items,
offers, editorial, migration, operations for a small team, the team's stack),
the options scored: **Payload-native 81**, Shopify headless 76, Medusa 2 + Payload
72, Vendure 69, Saleor 65 (RESEARCH.md §4).

**Decision: commerce is built natively on Payload, in our own packages.** We own
the collections, the reservation service, checkout totals, the order and payment
state machines, and every provider adapter.

**Why not `@payloadcms/plugin-ecommerce` (3.90.2), even for its collections?**
It is labelled beta, and reading its source showed it is unsafe for this shop:

- the amount charged is `cart.subtotal` — no shipping, tax, discount or gift card;
- stock is read at payment start with **no reservation**, and decremented at
  confirmation with an unguarded `$inc: -qty` — stock can go negative, so **a
  one-of-one map can be sold twice**;
- the variant stock/price check sits in a branch that never runs for variants;
- it uses APIs marked `@deprecated … removed in v4`, and has no Indonesian admin
  translations.

Its collection shapes (products, variants, variant types/options, carts,
addresses; per-currency price inputs) are good and MIT-licensed, so we **borrow
the shapes and own the code** — no plugin endpoint is ever mounted, which
removes the risk of an agent or a future upgrade wiring checkout through a path
that skips the reservation.

**Why not Medusa?** It is stronger for merchandise at scale (regions, price
lists, promotions, returns, stock locations), but reservations are created at
order placement with no built-in expiry, an oversell race fix was still unmerged
(PR #16575) when checked, and production needs Postgres + Redis + separate server
and worker processes **per brand** on top of the storefront — for a team that
runs one pm2 process per site. No Xendit or Midtrans provider exists for either
platform, so it saves nothing on payments. **Revisit** if Old East Indies needs,
in its first year, returns/exchanges at volume, multi-location stock transfers,
POS and marketplaces together; the provider contracts keep that door open.

**Why not Shopify?** Shopify Payments is not available to an Indonesian entity,
third-party gateways add a 0.6–2% platform fee, customer passwords cannot be
migrated, and holds, offers and price-on-request become draft orders and apps.

## 6. The one-of-one guarantee

Every channel — web checkout, accepted offer, staff hold, institutional invoice,
a manual showroom sale — reserves through **one service**,
`domain/reservations/reserve.ts` (`reserve`, `extend`, `release`, `convert`,
`reverse`; its signature is contract C8), and nothing else writes a reservation.

- **A scalar key, not a relation.** Payload stores polymorphic relationships in
  a `_rels` table, which has no column to index. So `reserve()` writes a
  **`targetKey`** (`product:123`, `unit:9`) on every reservation, and nothing else
  writes it.
- **The index guards sold items too.** For exclusive targets (unique items and
  numbered edition units) a partial unique index on `target_key WHERE status IN
  ('active', 'converted')` makes a second reservation impossible while one is
  live **or after the sale**. A refund or an accepted return moves the row
  `converted → reversed`, which releases the item. A second checkout gets a typed
  conflict, never an order. The index is declared through the Postgres adapter's
  `afterSchemaInit` / `extendTable` hook (a drizzle `uniqueIndex().on().where()`),
  so migrations **and** a dev push both carry it — a raw-SQL index would be
  dropped by a dev push and let concurrency tests pass without it.
- **Counted stock:** `UPDATE stock_levels SET reserved = reserved + $q WHERE id =
  $1 AND on_hand - reserved >= $q` — the row count is the answer.
- **Expiry happens inside the next reservation.** `reserve()` first moves any
  expired `active` rows for its target to `expired` (and returns their quantity to
  `stock_levels.reserved`) in the same transaction, so an expired-but-unswept
  lock can never block a buyer. The minute sweeper is housekeeping, not
  correctness.
- **The lock outlives the payment window.** A checkout lock starts at 15 minutes
  when the buyer continues to payment; when the buyer picks a method it is
  **extended** to that method's session lifetime plus a margin
  (`extend()`) — Stripe Checkout sessions last at least 30 minutes and a
  virtual-account transfer can take hours. Card and wallet payments that support
  it are **authorised, then captured only while the reservation is live**;
  cash-at-retail methods are never offered for unique items. No payment completes
  against an expired reservation without going through the late-payment path.
- **Payment and sale in one transaction.** A verified webhook's dedupe row, the
  payment, the reservation's conversion and the order's move to `paid` are
  written in **one** transaction; if any step fails, all roll back — including
  the dedupe row — and the webhook answers 5xx so the provider retries
  (PAYMENTS.md §4).
- **Late payment:** a payment that arrives after its reservation expired is
  re-reserved and sold to that buyer if the item is still available, and
  otherwise refunded automatically (or its authorisation voided) with the reason
  in words, the same minute.
- **Availability is a state machine too** (COMMERCE.md §6): an item is
  `available`, `reserved`, `sold` or `withdrawn`, derived from reservations and
  product status — never a field an admin types.
- IG items are **never** synced to marketplaces.

Concurrency tests — fifty parallel checkouts on one item → exactly one order; a
sold item → conflict; an expired-unswept lock → the next buyer succeeds; one
webhook delivered twice → one payment; the index survives a dev push — are part
of Phase 5's "Done when".

## 7. Media, deep zoom and print files

| Tier | What | Where |
| ---- | ---- | ----- |
| **Masters** | original scans (TIFF/JPEG), colour profile, checksum | private `archive-masters` bucket; a plain `masters` collection holds the record (storage key, pixels, ppi, colour profile, checksum, owning brand) — **not** a Payload upload collection |
| **Print files** | colour-managed, cropped design files for reproduction | the same private bucket under a `print-files/` prefix — the only prefix the shop's key may write |
| **Derivatives** | AVIF + WebP at 320 / 640 / 1024 / 1600 / 2400 px + blur placeholder | public brand bucket behind Cloudflare, immutable cache |
| **Deep zoom — public** | static **IIIF Level 0** tiles (`sharp().tile({ layout: 'iiif3' })`, 512 px) capped at the configured public resolution, plus an IIIF Presentation 3 manifest per work | public brand bucket (`iiif/<assetId>/…`) |
| **Deep zoom — full resolution** | the uncapped pyramid for staff and institutions | a **private** prefix, served through an authenticated route or a signed cookie |

- **Masters are uploaded straight to the bucket** through presigned URLs, never
  through the admin: a large TIFF exceeds Cloudflare's 100 MB request-body limit
  in front of `/admin`. The admin records the result.
- **A signed manifest would protect nothing** over public full-resolution tiles
  — IIIF Level 0 tile paths are predictable — so full resolution lives in a
  private prefix. The public bucket's CORS allows the viewer's origins, and each
  `info.json` `id` is its final public URL (both recorded in C9).
- **Provenance copies reference masters by storage key** (the sister snapshot
  carries it, C12) rather than re-uploading them.
- **Print-on-demand partners get presigned URLs that outlive their fetch
  window**, not a few minutes.

No image server to run: static tiles behind a CDN answer every zoom request.
The viewer is OpenSeadragon, loaded **on intent** (first tap or hover on the
image, or idle after LCP) so it never costs the PDP's JavaScript budget.

**Print-size ceiling.** A reproduction variant is offered only if the master
supports it at the product type's minimum resolution — **240 ppi** by default
(D26). The current site's images are 3543 × 2840 px: about **300 mm** on the long
edge at 300 ppi (≈ A4), **375 mm at 240 ppi**, 450 mm at 200 ppi. So larger sizes
wait on true master scans (MIGRATION.md §9). The ceiling is computed from the
master's pixels, stored on the design, and enforced when variants are generated.

## 8. Search

Postgres full text, per brand, per locale, in a derived `engine.search_documents`
table rebuilt on publish (its DDL, like every engine table, is written by the SCH
lead):

- a text-search configuration chaining `unaccent` and `simple` for proper names
  (Blaeu, Valentijn) — `unaccent()` is not IMMUTABLE, so indexes use that
  configuration or an IMMUTABLE wrapper — and language configurations for
  descriptions; `pg_trgm` for fuzzy maker and title matching (`Valentyn` →
  Valentijn);
- **availability is computed at query time** from live reservations, never
  stored in the index — holds change without a publish;
- **per-market price columns** are refreshed by the FX job, so a price facet in
  rupiah and one in dollars are both exact;
- **the gazetteer is the differentiator** — historical ↔ modern names expand the
  query: Batavia ⇄ Jakarta, Celebes ⇄ Sulawesi, Iava ⇄ Java, Moluccas ⇄ Maluku,
  Borneo ⇄ Kalimantan, Nieuw-Guinea ⇄ Papua, Macassar ⇄ Makassar, Siam ⇄
  Thailand, Ceylon ⇄ Sri Lanka, Formosa ⇄ Taiwan. A collector searching
  "Celebes" and a tourist searching "Sulawesi" find the same maps;
- **facet counts use the commerce rule**: counts for facet *F* apply every
  filter except *F* (NOW! §9) — otherwise unselected options all read zero;
- behind a `SearchPort` interface, so Meilisearch or Typesense can replace it if
  relevance or volume demands (NOW!'s threshold: not before ~100k documents).

## 9. Rendering and caching

The model is **Next 16 Cache Components** (`cacheComponents: true`), used the way
its rules require — checked against the 16.3 docs:

- **No route-segment config anywhere.** With Cache Components on, a segment that
  exports `dynamic`, `revalidate` or `fetchCache` fails the build, and
  `generateStaticParams` returning `[]` is an error. (This replaces KOI's
  `force-dynamic` rule, which belongs to the older model.)
- **The brand is read only at request time.** The `(site)` root layout awaits
  `connection()`, so no static shell is prerendered at `next build` — a
  prerendered shell would either need the database at build or bake a brand-less
  masthead into the HTML (NOW!'s incident, BRANDS.md §3). The artifact is still
  built with no database and no secrets.
- **Content is cached; runtime data streams.** Loaders for content use
  `'use cache'` + `cacheTag` (the process serves one brand, so the brand is part
  of every key by construction); cookies, headers, search params, availability,
  the ship-to market, the cart and the account are read **inside `<Suspense>`**
  and never enter a shared cache. The purchase panel's dynamic part streams into a
  placeholder of reserved height ("Checking availability…"); no purchase control
  renders until availability is known (DESIGN-SYSTEM.md §7).
- **Invalidation:** editorial content with `revalidateTag(tag, 'max')`
  (stale-while-revalidate), availability and price tags with
  `revalidateTag(tag, { expire: 0 })`. The single-argument form is deprecated.
  Code that runs outside a request (jobs, webhooks' after-commit dispatch) calls
  one `invalidate(tags)` helper, which posts to an internal revalidate route
  (`REVALIDATE_SECRET`).
- **The admin lives under the same flag** — Payload's Cache Components support is
  still "initial" (≥ 3.81) — so **Phase 0 proves it** (TASKS.md 0.8): a production
  build with the admin mounted and no database, brand or secrets, then one
  gallery build serving the `test` brand and Indies Gallery with different
  mastheads. **Fallback if the spike fails:** Cache Components off, request-time
  rendering throughout (KOI's model), with content caching through
  `unstable_cache`-style tagged helpers — decided once, in Phase 0, never mixed.
- **Currency follows the ship-to destination, never the IP or the language.** One
  `shipTo` cookie (defaulted from Cloudflare's `CF-IPCountry`, changed by the
  ship-to selector) plus the routed seller decide the market; a display currency
  can differ from the charge currency **only for non-Indonesian destinations**
  (COMMERCE.md §3). Price facets and price-named curations ("Gifts under $350")
  exist per market currency, so an Indonesian-delivery page never shows a
  foreign amount.

## 10. Jobs

Payload's jobs queue holds the work — derivatives, IIIF tiling, manifests,
certificates, sister sync, want-list matching, emails, FX refresh — but it is
**run by a cron-called route** (`/api/x/cron/jobs`, behind `CRON_SECRET`, with a
per-run limit), not by `autoRun` inside page renders: `autoRun` starts on the
first `getPayload()` call rather than at boot, and tiling a scan in the render
process competes with page renders and with the thread pool that password
hashing uses. Revalidation from a job goes through `invalidate(tags)` (§9).

- **Bulk work runs off-box.** The migration's tiling of ~2,090 items (and later
  the rest of the archive) runs as a CLI on a workstation or CI runner that
  writes tiles straight to the bucket and updates records through the API —
  not on Helios, whose disk hit 93% in September 2026.
- **Migrations run in exactly one process**, the web process, gated by
  `RUN_MIGRATIONS=1` and a Postgres advisory lock; `/api/health` calls
  `getPayload()`, so the deploy agent's first health check initialises Payload
  and applies pending migrations. A second pm2 app (`payload jobs:run`, Payload's
  recommended worker) is the documented escape hatch and never migrates.
- Sweepers — reservation expiry, payment reconciliation — are cron-called routes
  too (DEPLOYMENT.md §5).

## 11. Locales

Per brand in config. Payload localization on content fields — the superset
`en`, `id`, `nl` in every database (§2), each brand's own locales enforced by
routing.

**The default locale is served unprefixed at the root; every other locale is
prefixed** (`/product/1706-…` in English, `/id/produk/1706-…` in Indonesian),
with reciprocal `hreflang` and one canonical per page. This departs from KOI,
where every URL carries its locale, for one reason: the gallery's existing
product URLs are unprefixed, and keeping them byte-identical means thousands of
inbound links need no redirect at all (MIGRATION.md §6). The unprefixed root is
always the default locale — never negotiated from `Accept-Language` (crawlers
must see one answer); a dismissible banner offers the visitor's language instead.
The admin starts in English unless the user picks otherwise (KOI).

**The proxy only rewrites.** It maps public paths to the app's internal routes
through the route map (C10) — which carries per-locale segments **and** facet
vocabularies, so `/antique-maps/java/batavia` resolves to a browse with object
type and place selected — and it never touches the database (Next's proxy runs
apart from render code and cannot call `revalidateTag`). Internal paths
(`/en/item/…`) are never served directly: the proxy answers 404 for them, so no
page exists at two addresses. The mapping is C10's `parsePublicPath()`, the
inverse of `href()`, and the internal route's query carries a listing's whole
canonical state. Legacy patterns (`/category/…`, `/storage/…`) rewrite to an
engine handler, `/api/x/legacy/…`, which reads the `redirects` collection under
`'use cache'` + `cacheTag` and answers 301, 404 or 410. Product URLs never need
it: the item route resolves `/product/{id}-{slug}` **by public id** and calls
`permanentRedirect()` when the slug part has changed. Besides rewriting, the
proxy sets headers and nothing else: `x-public-path` and `x-locale` on the
request it passes on (C13 `PROXY_REQUEST_HEADERS`, overwriting any a client
sent), so a page with no params — the designed 404 — knows what was asked; and
`Referrer-Policy: no-referrer` with `X-Robots-Tag: noindex` on the order,
payment-link and quote pages (C10 `sensitive`). Each app's `src/proxy.ts`
re-exports the engine's proxy handler but declares its `matcher` literally,
because Next analyses it statically.

**Engine routes live under `/api/x/`**, so no engine handler can shadow Payload's
REST API (`/api/media/file/…` and the admin's lookups); the route-parity check
fails if an engine route's first segment equals a collection slug, `payload-jobs`
or `graphql`. A write that a cookie authenticates — the cart, the customer
session, order access, each `HttpOnly`, `Secure` and `SameSite=Lax` — is refused
unless it comes from the site itself (`Origin` or `Sec-Fetch-Site`; C13
`sameOrigin`), and a credential never travels in a query string, except in the
one-hop links an email carries (order access, one-click unsubscribe).

## 12. Identity

- **Staff** are Payload `users` in each brand's database, roles `admin` ·
  `manager` · `cataloguer` · `editor` · `fulfilment` · `analyst` · `contributor`
  (drafts only). A shared staff identity across brands (NOW!'s platform-user
  pattern) is a later option, not v1.
- **Customers** are a separate `customers` auth collection, never the staff
  collection (KOI Members rule): a buyer must never be one wrong role value away
  from an admin session.
- **Customers have their own session cookie.** Payload issues one `payload-token`
  cookie for every auth collection on a domain, so a member of staff signing in
  as a customer would lose their admin session. Customer sessions are issued by
  `@engine/http/auth` through a custom auth strategy on the `customers`
  collection, under their own cookie; staff keep Payload's.
- Migrated customers are created with a random, unusable password (Payload
  requires one) and set their own through the claim flow (MIGRATION.md §5).
- Customers, carts and consents are per brand — different companies under UU PDP
  / PDPA (BRANDS.md §5).
- **Loaders and the sister API read as the public, never as the system.** The
  Local API defaults to `overrideAccess: true`, which ignores field-level access
  (acquisition cost, consignor) and does not filter unpublished documents — so
  about 7,400 migrated drafts that were never meant to be online would render and
  sync. Every public read passes `overrideAccess: false`, filters
  `_status: 'published'` and selects only the fields its view model needs; tests
  prove a draft 404s on the site, is absent from the archive API, and that
  `physical` never appears in a view model or a snapshot.

## 13. Security

Security headers from the app (tested); the **CSP is built per request in the
proxy from brand config** — its analytics and payment-provider origins are
runtime values, because `NEXT_PUBLIC_*` variables and a build-time CSP would bake
one brand's (or no brand's) settings into a shared build; hashes or
`strict-dynamic`, not nonces. Rate limits on auth, forms, offers and checkout,
webhook signature verification with replay protection, hosted payment fields or
redirects only (PCI SAQ-A), PII minimised on orders shown in the admin list
views, admin on a public path with lockout and rate-limited sign-in (NOW!'s
ADMIN-CONSOLIDATION risk note). The boot check refuses `LOADERS_SOURCE=fixtures`
in production, so fixture content can never ship.

## 14. Things we deliberately are not using

| Not used | Why |
| -------- | --- |
| `@payloadcms/plugin-ecommerce` at runtime | beta; oversells unique items as shipped (§5) — shapes borrowed, code owned |
| Payload multi-tenant plugin | one database with a tenant column — the opposite of the requirement |
| Medusa / Saleor / Vendure | a second commerce system, admin and deploy per brand for features we must build anyway (§5) |
| Shopify | no Shopify Payments for an Indonesian entity; platform fees; no password migration |
| An image server (IIPImage, Cantaloupe) | static IIIF Level 0 tiles behind a CDN do the job with nothing to run |
| Elasticsearch / Algolia / Meilisearch | Postgres FTS is ample at ~10–20k documents; the port keeps the option |
| Redis | one process per brand; Postgres covers locks, queues and rate limits at this scale |
| Docker in production | Helios is CloudPanel + pm2 (KOI); Docker is for local dev only |
| GSAP / an animation library | CSS + View Transitions + small client components (DESIGN-SYSTEM.md §8) |
| A separate API service | the App Router is the API; splitting it doubles the deploy surface (KOI) |
