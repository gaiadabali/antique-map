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
and fails on any diff (TASKS.md 2.2.g).

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
`domain/reservations/reserve.ts` (`reserve` for one target, `reserveAll` for
several at once — a bag at "Continue to payment" — `extend`, `release`,
`convert` and `reverse` taking ids in bulk; its signature is contract C8), and
nothing else writes a reservation.

- **A scalar key, not a relation.** Payload stores polymorphic relationships in
  a `_rels` table, which has no column to index. So `reserve()` writes a
  **`targetKey`** (`product:123`, `unit:9`) on every reservation, and nothing else
  writes it.
- **The index guards sold items too.** For exclusive targets (unique items and
  numbered edition units) a partial unique index on `target_key WHERE status IN
  ('active', 'converted')` makes a second reservation impossible while one is
  live **or after the sale**. Only an order cancelled after payment, or an
  accepted return, moves the row `converted → reversed`, releasing the item — a
  **refund alone never does**: a refund issued at the provider (in its own
  dashboard, never in the admin) leaves the item sold until staff cancel the
  order or accept a return. A second checkout gets a typed conflict, never an
  order. The index is declared through the Postgres adapter's `afterSchemaInit`
  / `extendTable` hook (a drizzle `uniqueIndex().on().where()`), so the wave's
  migration **and** a schema author's dev push (PARALLEL-TRACKS.md §3.2) both
  carry it — a raw-SQL index would be missing from a pushed database and let
  concurrency tests pass without it.
- **Counted stock:** `UPDATE stock_levels SET reserved = reserved + $q WHERE id =
  $1 AND on_hand - reserved >= $q` — the row count is the answer.
- **Expiry happens inside the next reservation.** `reserve()` first moves any
  expired `active` rows for its target to `expired` (and returns their quantity to
  `stock_levels.reserved`) in the same transaction, so an expired-but-unswept
  lock can never block a buyer. The minute sweeper is housekeeping, not
  correctness — it takes its rows with `FOR UPDATE SKIP LOCKED`, so it never
  waits behind a buyer.
- **The lock outlives the payment window.** A checkout lock starts at 15 minutes
  when the buyer continues to payment; when the buyer picks a method it is
  **extended** to that method's session lifetime plus a margin
  (`extend()`) — Stripe Checkout sessions last at least 30 minutes and a
  virtual-account transfer can take hours. Card and wallet payments that support
  it are **authorised, then captured only while the reservation is live**;
  cash-at-retail methods are never offered for unique items. No payment completes
  against an expired reservation without going through the late-payment path.
- **One isolation level, one lock order, so no two writers deadlock or abort
  each other.** Every domain write runs READ COMMITTED (`DOMAIN_TX_ISOLATION`)
  — never REPEATABLE READ or SERIALIZABLE, where the same race raises a
  serialization failure instead of waiting — and takes rows in one fixed order:
  the dedupe row (`idempotency_keys`, `payment_events` or
  `payment_events_unmatched`), the request being answered, the order, its
  payment attempts, their refunds, reservations by `target_key`, stock levels
  by `(variant, location)`, then counters, the document sequence last
  (`domain/contracts/transactions.ts` `LOCK_ORDER`). Named timeouts —
  `lock_timeout`, `statement_timeout`, a provider call's own budget, an idle
  ceiling that outlasts it, and a whole-transaction ceiling that outlasts all
  three — are set with `SET LOCAL` as each transaction begins, so a server
  default can never undercut them.
- **Payment and sale in one transaction.** A verified webhook's dedupe row, the
  payment, the reservation's conversion and the order's move to `paid` are
  written in **one** transaction; if any step fails, all roll back — including
  the dedupe row — and the webhook answers 5xx so the provider retries
  (PAYMENTS.md §4).
- **Late payment:** a payment that arrives after its reservation expired is
  re-reserved and sold to that buyer if the item is still available, and
  otherwise refunded automatically (or its authorisation voided) with the reason
  in words, the same minute. A second payment settling on an order another
  attempt already paid is given back whole the same way
  (`duplicate-payment-refused`), and the order and its own payment stand
  untouched.
- **Availability is a state machine too** (COMMERCE.md §6): an item is
  `available`, `reserved`, `sold` or `withdrawn`, derived from reservations and
  product status — never a field an admin types.
- IG items are **never** synced to marketplaces.

Concurrency tests — fifty parallel checkouts on one item → exactly one order; a
sold item → conflict; an expired-unswept lock → the next buyer succeeds; one
webhook delivered twice → one payment; the index is in a pushed database as in a
migrated one — are part of the Commerce stage's gate (TASKS.md 21.2).

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

Postgres full text, per brand, per locale, in a derived `search_documents`
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
its rules require — checked against the 16.3 docs, and **confirmed by the phase 4
spike** (TASKS.md 4.1.e, 2026-09-30; the evidence is `docs/spikes/cache-components.md`):

- **No route-segment config but one.** With Cache Components on, a segment that
  exports `dynamic`, `revalidate` or `fetchCache` fails the build, and
  `generateStaticParams` returning `[]` is an error. (This replaces KOI's
  `force-dynamic` rule, which belongs to the older model.) The one exception is
  Cache Components' own: the `(site)` root layout exports `instant = false`, since
  a `connection()` outside `<Suspense>` otherwise fails the build (the spike, §1).
  Its root parameter, `[locale]`, lists every engine locale in
  `generateStaticParams` — brand-independent, and prerendering nothing. No other
  segment exports anything of the kind, `prefetch` included.
- **The brand is read only at request time.** The `(site)` root layout awaits
  `connection()`, so no static shell is prerendered at `next build` — a
  prerendered shell would either need the database at build or bake a brand-less
  masthead into the HTML (NOW!'s incident, BRANDS.md §3). The artifact is still
  built with no database and no secrets. Next renders a layout and its page
  concurrently, so the brand read itself awaits `connection()` (the app's
  `currentBrand()`), and an engine `GET` handler reads its request before anything
  else — one that never does is run at `next build` to bake its answer.
- **Every page renders in full per request.** Next 16.3 serves a Cache Components
  route's prerendered shell — even an empty one — with the status it had at build,
  so a `notFound()` or `permanentRedirect()` resumed after it could only become a
  meta tag. Each app's `next.config.ts` sets `htmlLimitedBots: /.*/`, the setting
  under which Next renders the whole page per request with blocking metadata: a
  404 is a 404 and a slug change a real permanent redirect (308, Next's status for
  `permanentRedirect()`). Caching is per read, never per page. Next counts a request
  with no `User-Agent` as no bot and serves it the shell's 200, so the proxy sets one
  on such a request (C13 `PROXY_USER_AGENT`). And the proxy answers its own
  not-found — a path that names no page — with a 404 on its rewrite (C13
  `PROXY_NOT_FOUND_STATUS`), which Next keeps through a normal render, so the
  not-found route renders the designed page in its own body without JavaScript,
  where a request-time `notFound()` gets Next's empty recovery document
  (DESIGN-SYSTEM.md §2; measured on 16.3.6, TASKS.md 4.3.d).
  What it costs, measured by the 4.1 review (senior-fe #1): the body still streams,
  but **no prerendered or ISR page is ever served** — free today, every shell being
  empty, and ruled out for good; **every `generateMetadata` gates the first byte**
  for every visitor, so it reads only cached data; **every router prefetch is a full
  render** with the page's reads, so storefront links are plain `<a>` or
  `<Link prefetch={false}>` (the destination-side `prefetch = 'force-disabled'` was
  rejected: a second segment config, and it still prefetches the route's metadata),
  and only the visitor's own document navigation consumes a post's result (C13
  `FORM_RESULT`); and **the nonce CSP depends on it** (a served shell would carry no
  nonce). The shell bypass is Next's implementation, not a documented promise, so
  the status spec (`engine/apps/gallery/e2e/status.spec.ts`, moving to
  `tests/e2e/`) asserts the 404s and permanent redirects on a production build, and
  fails the day a Next release changes it.
- **Content is cached; what the first flush must carry is read in the page body;
  only slow or live reads stream.** Loaders for content use `'use cache'` +
  `cacheTag` + `cacheLife` (the process serves one brand, so the brand is part of
  every key by construction). Per-visitor data — cookies, headers, the ship-to
  market, the cart, the account — never enters a shared cache. What a visitor
  without JavaScript must see and use — a form, its current value, a post's result,
  the canonical check — is read at request time in the page's own body, since a
  streamed part stays hidden until a script swaps it in; slow or live reads —
  availability, a live price, cart totals — run inside `<Suspense>`, and a streamed
  part carries no form (the spike, §5). The purchase panel's dynamic part streams
  into a placeholder of reserved height ("Checking availability…"); no purchase
  control renders until availability is known (DESIGN-SYSTEM.md §7).
- **The availability that decides a purchase is read live, never cached**
  (TASKS.md 4.3.c; the spike cached it under `cacheLife('max')`, correct only while
  every writer invalidates). It changes with no write to announce it — a checkout
  lock or a hold lapses at its `expiresAt` — so no tag could expire a cached copy in
  time; it is one indexed read, inside the panel's `<Suspense>`, where its latency
  delays nothing else. A status merely shown from cached content (a listing card's
  *Sold*, a catalogue's *on hold*) is tagged `availability:<id>`, expired at once by
  every write and bounded by a one-minute backstop,
  `cacheLife({ stale: 30, revalidate: 30, expire: 60 })`, so a missed invalidation
  or a lapsed lock heals by itself (senior-fe #8); no purchase control acts on it,
  and `reserve()` refuses a sold item whatever a page showed.
- **Invalidation:** editorial content with `revalidateTag(tag, 'max')`
  (stale-while-revalidate), availability and price tags with
  `revalidateTag(tag, { expire: 0 })`. The single-argument form is deprecated.
  Code that runs outside a request (jobs, webhooks' after-commit dispatch) calls
  one `invalidate(tags)` helper, which posts to an internal revalidate route
  (`REVALIDATE_SECRET`). The helper and the tag builders live in a leaf package,
  `@engine/cache`, outside `@engine/http` (which reaches Payload through
  `@engine/cms`), so Payload's hooks call it without cms ever importing http (§15).
- **The admin lives under the same flag** — Payload's Cache Components support is
  still "initial" (≥ 3.81) — so **phase 4 proved it** (TASKS.md 4.1): a production
  build with the admin mounted and no database, brand or secrets, then one
  gallery build serving the `test` brand and Indies Gallery with different
  mastheads. **Verdict: Cache Components confirmed** — both builds made with no
  database, brand or secret and the admin mounted; one gallery build served both
  brands; `revalidateTag(tag, { expire: 0 })` never served availability stale over
  six flips while `'max'` served the record stale once; the page body and every
  form arrived in the first flush and only the panel streamed; the admin signed in
  on two databases. The fallback — Cache Components off, request-time rendering
  throughout (KOI's model), content cached through `unstable_cache`-style tagged
  helpers — was not needed and is not adopted; the two are never mixed. The CSP
  the proxy sets uses **per-request nonces**: hashes cannot hold, since Next's
  inline scripts carry each request's RSC payload (the spike, §7; §13).
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
payment-link and quote pages (C10 `sensitive`); and on every page, the
`Content-Security-Policy` it builds per request from the brand's config (§13).
Each app's `src/proxy.ts`
re-exports the engine's proxy handler but declares its `matcher` literally,
because Next analyses it statically.

**Engine routes live under `/api/x/`**, so no engine handler can shadow Payload's
REST API (`/api/media/file/…` and the admin's lookups). Payload's catch-all,
`api/[...slug]`, reads a collection from the first segment after `/api/`, and a
static route there wins over it, so that segment is what the route-parity check
compares — `x` for every engine route, `health` for the health route
(`/brand-assets/…` is outside `/api/`): it fails if one equals a collection slug,
`payload-jobs` or `graphql`, so no collection may be named `x` or `health`. A write that a cookie authenticates — the cart, the customer
session, order access, a want list's own access, each `HttpOnly`, `Secure` and
`SameSite=Lax` — is refused unless it comes from the site itself (`Origin` or
`Sec-Fetch-Site`; C13 `sameOrigin`), and no credential travels in a URL beyond
a page's own capability (a payment link's or a quote's token) and the one-hop
links an email carries (order access, an application's status, set-password
and reset, email verification, a want list's confirm and account access,
one-click unsubscribe), each of which but the unsubscribe moves its token into
a cookie and answers 303 to a clean page. **Every such token is derived, never
stored** (C6 `links`): an HMAC of the record's public reference and its
`token_version` under a key kept with the other secrets, so a copy of the
database opens no link, and NTF derives each email's link as it sends it — an
outbox row never carries a token. Bumping the version revokes every link a
record has. A link whose page shows personal data works for a window after it
was last issued (C6 `LINK_WINDOW_DAYS`), and a lapse is final: moving a lapsed
record's window bumps its version first. The keys are one ring per brand and per
environment, never shared, and a leaked one is revoked at once (DEPLOYMENT.md
§8). The one exception is a set-password link: it sets a credential, so it is a
single-use random nonce, kept only as a hash until used (C13 `PASSWORD_LINK`).
A signed-in page acts by its session: the account answers its offers and
viewings by the session and the record's id (C6 `OfferAccess`,
`AppointmentAccess`), and holds no token but a payment link's or a quote's own
address. **The want-lists area** (C10
`wantList`, C13's `want-lists` routes) reads this exactly like an order: its
confirmation and every alert carry the list's token, which the link stores in
`WANT_LIST_ACCESS`'s cookie before it answers 303 to the want-list page, so the
token itself never enters the page's HTML or its scripts. RFC 8058's one-click
unsubscribe is the sole exception, for a want-list alert exactly as for the
newsletter: the one POST the same-origin check still admits from outside the
site, because it is the mail client's own action and carries its token in the
URL by design — the only page-level credential that ever does. It is exempt only
as C13 `ONE_CLICK_UNSUBSCRIBE` states it: the URL's token is its whole
credential, its body is `List-Unsubscribe=One-Click` alone, it reads no cookie
and no session — so a cross-site post can borrow nothing of the visitor's — and
it answers 200 with an empty body, its token stripped from the log. **A form works without
JavaScript** (C13 `FORM_RESULT`): a script's post gets JSON; an HTML form post
answers 303 See Other to its page (a `returnTo` the handler checks against C10),
and its outcome waits on the server under an `HttpOnly` cookie holding an opaque
id and never an entry or any personal data — deleted once the response showing it
has been sent, or after ten minutes. The page's loader awaits it at request time,
and the page renders it in its own body, never inside a nested `<Suspense>`: what
a visitor must see without JavaScript — a form and its result — is never a
streamed part.

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
one brand's (or no brand's) settings into a shared build — which is why the
proxy sets it (C13 lists it among the proxy's headers). **One owner builds it:
41.1.a**, whose builder the proxy calls; 40.2 only declares the analytics origins
its tags need, in brand config. **It uses a fresh nonce per request**
(`script-src 'self' 'nonce-…' 'strict-dynamic'`), as the Cache Components spike
decided (TASKS.md 4.1.e, `docs/spikes/cache-components.md` §7): hashes cannot hold,
because Next's inline scripts carry each request's RSC payload — one page hashed
differently for two ship-to markets, and a hashed policy blocked hydration — and
Subresource Integrity (`experimental.sri`) hashes only the files a build emits,
never the scripts a request renders. The proxy sets the policy on the answer and
copies it onto the request (C13 `PROXY_REQUEST_HEADERS.contentSecurityPolicy`),
where Next takes the nonce for its scripts; it drops any CSP header a client sent.
The nonce holds only because every page renders per request (§9) — a served shell
would carry none — so the status spec's CSP case (no violation, every script
nonced) pins it once 41.1.a lands. The `style-src` line is 41.1.a's call: React
renders `style` attributes, which a nonce cannot cover. **`img-src` allows the configured sister's media
host too** (the origin `sisterBaseUrl()` gives: the host's `SISTER_BASE_URL`, else
the committed `sisters[].baseUrl`, the sister's staging site — C1, DEPLOYMENT.md
§8): a sister link renders the other brand's derivative images straight from
where they are, never copied into this brand's bucket or re-derived (BRANDS.md
§5, C12 `SnapshotImage`), so a build
that forgets the sister's host would fail silently as a blocked image, not a
missing one. Rate limits on auth, forms, offers and checkout,
webhook signature verification with replay protection, hosted payment fields or
redirects only (PCI SAQ-A), PII minimised on orders shown in the admin list
views, admin on a public path with lockout and rate-limited sign-in (NOW!'s
ADMIN-CONSOLIDATION risk note). The boot check refuses `LOADERS_SOURCE=fixtures`
in production, so fixture content can never ship.

**Next answers a path it cannot decode by itself.** A malformed percent-escape on
a path the proxy never sees — `/brand-assets/%E0%A4%A.svg`, `/api/x/legacy/%C0%AE…`
— gets Next's own bare 500, logged nowhere, before any engine code runs (4.1
review, senior-be #12); under the proxy's matcher the same path is the proxy's
not-found. Nothing leaks and nothing changes, so the engine does not answer it,
but a scanner can trip the 5xx-rate alert (DEPLOYMENT.md §7): the alert sets apart
a 500 whose request path does not percent-decode, as scanner noise, and never pages
on it (TASKS.md 41.2.c).

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

## 15. How engine routes reach Payload (decided 2026-09-30, TASKS.md 4.3.a)

**Decision: `@engine/http` depends on `@engine/cms` — and on it alone, never on
`payload`.** A route handler that reads the database — `/api/health` and
`/api/x/cron/jobs` first, then every DOM, PAY, LOG, MED, SRC, SIS and SEO handler
that needs Payload's pool or Local API — reaches Payload through SCH's
`@engine/cms/instance`, the process's one `getPayload({ config })`, from a
`payload-*.ts` module in its own folder that it loads with `import()` once it has
read its request. The apps' mounts stay one-line re-exports (C13). This is senior-be's
recommendation from the 4.1 review (item 5), adopted with its conditions.

**Rejected: each app injecting a Payload-backed port into the handlers.**

- ESLint's boundary 1 forbids `payload` and `@engine/cms` in every app file outside
  `src/app/(payload)/**`, so neither an app's `api/health/route.ts` nor its
  `instrumentation.ts` may build the port; moving the mount under `(payload)` would
  change the file route parity demands and end the one-line-mount rule.
- Every database-backed handler still to come — commerce, forms, auth, privacy,
  sister, media, search — would need the same injection, twice, once per app.
- Boundary 1 keeps Payload out of apps, which render view models; injecting it from
  them would defeat it. `@engine/http` is the server's composition layer, at the
  loaders' altitude (§4), which is where Payload belongs.

**Conditions — each one enforced:**

1. **One Payload.** SCH exports `@engine/cms/instance` (TASKS.md 4.8): `cms()`, the
   workspace's only `getPayload({ config })`, and the adapter's pool for
   `@engine/cms/db/probe`, typed where the adapter is built. So `payload` is declared
   and pinned by cms alone, and http declares `"@engine/cms": "workspace:*"`: a
   second copy of `payload` would split `getPayload`'s cache — two instances, two
   pools, migrations raced.
2. **Lazily, after the request.** A handler's `route.ts` never imports cms. It reads
   its request first (`atRequestTime(request)`), then `await import('./payload-…')`.
   So `next build`'s page-data pass, route parity's runner — which imports every
   mount — and a handler's unit test never evaluate the Payload config, and the
   pure ports (`checkHealth`, `perRunLimit`) stay testable without it.
3. **Fenced, by ESLint (HAR, TASKS.md 5.4).** Under `engine/packages/http/src/**`
   only a `payload-*.ts` module imports `payload`, `@payloadcms/*` or `@engine/cms`,
   statically or by `import()`, and no module imports a `payload-*` module
   statically; so the proxy, the manifest, brand assets, the legacy handler and the
   placeholder can never reach Payload. The manifest imports other packages as types
   only.
4. **No cycle.** `@engine/cms` never imports `@engine/http` (ESLint over
   `engine/packages/cms/**`). So `invalidate(tags)`, which cms hooks call, lives in
   neither: it lives in a leaf package, `@engine/cache` — the cache-tag builders and
   `invalidate(tags)` (in a Next request `revalidateTag`, else a post to
   `/api/x/revalidate`), importing `next/cache` and no engine package but C1's types —
   which cms, the loaders, the handlers and any package's job import alike without a
   cycle. Nothing in `@engine/loaders` or `@engine/http` could be that home: cms would
   import it back. SCH builds it with its first caller (TASKS.md 8.2) and adds a tag
   builder at another lane's request, as it does a registry entry.
5. **Client-safe, unchanged.** `check:client-safe` already refuses `payload`,
   `@payloadcms/*` and `@engine/cms` wherever a `'use client'` module reaches them,
   following static and dynamic imports; no `@engine/http` subpath was ever
   client-safe (brand assets reach `node:fs`).
6. **The build never touches a database** (CONVENTIONS.md §12): condition 2 and the
   request read first. 4.6.c proves it by building with `DATABASE_URL` unset and
   outbound connections refused.

**The files TASKS.md 4.6 changes**, and no others (the apps' mount files stay as they
are):

| File | Change |
| --- | --- |
| `engine/packages/http/package.json` | `"@engine/cms": "workspace:*"` in `dependencies`, by `pnpm add --filter @engine/http "@engine/cms@workspace:*"` (and `pnpm-lock.yaml` as its side effect) |
| `engine/packages/http/src/health/route.ts` | reads the request, then loads `./payload-ports` with `import()` |
| `engine/packages/http/src/health/payload-ports.ts` (new) | the database port — `cms()`, the pool probed once per check through `@engine/cms/db/probe` — and the queue port, counted with `runJobs`' own filter |
| `engine/packages/http/src/health/{health,ports}.ts`, `health.test.ts` | queue lag reported, never gating the status; one probe per check behind a ~5 s single-flight memo (4.6.a) |
| `engine/packages/http/src/cron/jobs/route.ts` | reads the request, authenticates, then loads `./payload-queue` with `import()`; single-flight in the process; a throw logged and answered 500 |
| `engine/packages/http/src/cron/jobs/payload-queue.ts` (new) | `(await cms()).jobs.run({ limit, allQueues: true })` |
| `engine/packages/http/src/cron/cron.test.ts` | the above, without a database |

And SCH's, before it (4.8): `engine/packages/cms/src/instance.ts` and the
`"./instance"` entry of `engine/packages/cms/package.json`'s `exports`. With cms
reached, http's type-check covers the cms files it imports, so `instance.ts` imports
the config and nothing an admin component needs.
