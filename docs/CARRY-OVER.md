# Carry-over — what the simplified build keeps from the v1 engine

**Audited** 2026-10-01 at `main` `49040fe`, plus the unmerged `feat/p8-sch-8.2-works` (Works) and
`worktree-agent-a1eb12599989f6e01` (8.5, staging storage). Read-only: nothing was installed, no dev server ran, and
`pnpm verify` was not run. Sizes are tracked lines from `wc -l`, with tests included unless split out. **Target:**
one Next 16.3 + Payload 3.90 app and one Postgres database. It serves the gallery (an enquiry-only catalogue) and
the shop (guest checkout, Midtrans, per-store stock, Gojek/Grab hand-off), told apart by hostname. One owner, one
CMS.

## 1. Verdict

About 76k lines were written in a week (25 Sep – 1 Oct). About 25k of those are tests. The code is careful, tested
and heavily commented, but roughly half of it serves two things the new target drops: "a brand is configuration",
and a commerce model built on reservations, offers, holds, invoices, multi-seller tax and FX. What actually runs is
worth keeping. That is the Payload boot, with migrations applied under an advisory lock; staff users, with a
last-admin guard enforced in the database; the catalogue vocabulary (makers, a gazetteer with historical names,
terms and sources); and media and masters storage (private uploads, a presigned master PUT checked by checksum,
bucket policies tested on MinIO). It also includes a pure, tested proxy; health, cron and legacy-redirect routes;
i18n formatters; cache invalidation after commit; and the legacy crawler and normalisers, which have already
produced 1,823 normalised gallery records. Much of the rest exists on paper only. About 15.5k lines are types-only
"contracts" that nothing uses at runtime except two spike pages. 31 of the 39 Payload collections are empty 7-line
stubs. 36 of the 42 route files are placeholders. About 7k lines of tooling police brand rules and lane governance.
Carry the running core over, since it holds the Next 16.3 and Payload 3.90 lessons and the security guards. Delete
the contracts and the brand machinery outright instead of adapting them. Reset migrations, because the database is
greenfield. By size, about 60% carries over (much of it needing edits for one owner and one database) and about 40%
is deleted.

## 2. Inventory and verdicts

### 2.1 Packages (`engine/packages/*`)

| Item | What it is (real size) | Verdict | Why, and what must change |
| --- | --- | --- | --- |
| `cms` | The Payload config, collections, access helpers, DB adapter and migrations. 153 files, 14.7k lines (5.4k tests), plus the generated `payload-types.ts` (1.8k) | KEEP, reshape | The core. **Delete:** the 31 stubs (§2.5), the frozen-slug order assertion, `access/brand.ts`, `access/modules.ts`, and `db/engine-tables.ts` with `idempotency.ts` (nothing uses them). **Keep:** `assertDraftAccess`, `DRAFTED_ACCESS`/`publishedOrStaff`, `roles.ts`, the users guards, `hooks/request-temp-files`, `db/adapter` (migrations at boot under the lock), `db/advisory-lock`, the `generate-migration` wrapper (`lock_timeout` 5s, Prettier, skip when empty), `fields/slug`. **Change:** `access/origins.ts` lists every site origin. Drop `nl`. |
| `config` | The C1 brand schema (zod): module flags, sellers, markets, FX, tax and trade tiers, the C10 route map, loader, validators and boot check. 72 files, 7.9k lines (3.2k tests). 78 files import `config/schema` | SIMPLIFY (gut to about 1.5k) | **Keep:** `constants` (en/id, the IDR exponent); `routes` (`href`/`parsePublicPath`/legacy, trimmed to the surfaces that stay); the environment half of `boot-check` (required env, refusing dev placeholders on deployed hosts); `hostname`. **Add:** a typed `SITES` table and `siteFromHost()` checked against an env allow-list. **Delete:** brand schema, modules, sellers, markets, trade, `validate`, `loader`, `link-keys`, `sister`, `provider-secrets`. |
| `domain` | The C5–C8 contracts: money, API, payment vocabulary, and state machines for order, payment, reservation, availability, offer and retailer. 34 files, 5.4k lines, **no runtime functions** | REMOVE | Everything it models is cut. Keep only "money is integer minor units", as a ten-line `Money` type in `i18n`. |
| `view-models` | The C2 view models, C4 blocks, loader signatures and fixtures. 74 files, 8.4k lines, types and fixtures only | SIMPLIFY, then fold into the app | About 4.3k lines cover purchase, cart, checkout, pay, invoice, account, retailer, want-list, gift-card and wishlist: delete them. Keep `RecordVM`, `ConditionVM`, `DimensionsVM`, `FuzzyDateVM`, `ImageVM`, cards, listing, discovery, editorial, blocks and shell, moved to `apps/web/src/view-models/`. The principle stays: a loader returns projected public fields only. |
| `http` | Engine route handlers and the C13 manifest. 56 files, 4.9k lines (2.4k tests) | SIMPLIFY | **Keep:** the pure `decideProxy` (rewrite only, 404 status on the rewrite, a User-Agent injected for `htmlLimitedBots`, client CSP headers dropped, `sensitive` pages get no-referrer and noindex, a CSP-nonce hook); health (503 gating, no secret in the body); the constant-time `shared/bearer.ts`; cron/jobs, revalidate, legacy. **Add:** Host → site resolution in the proxy. **Delete:** `brand-assets` (use `public/`), `unbuilt`, the cron outbox/reconcile/sweeps stubs, and the commerce, forms and auth manifest tables. |
| `media` | The C9 key contract (a derivative ladder of 320–2400 px in AVIF and WebP; public IIIF Level 0 tiles capped, the full pyramid private); roles and provenance; room plates; S3 storage; presigned master PUT; checksums; bucket-policy plans, `apply.mjs`, MinIO tests. 32 files, 3.3k lines (1.4k tests) | KEEP, small edits | Drop the `brand` segment from `iiifFullKey`, `intakeMasterKey` and `printFileKey`, and the outlet "print files only" policy: one media bucket and one masters bucket. Remove room plates (they were for the configurator). Derivatives, tiles, manifests and the viewer are **not built** (old phases 15–16). |
| `migrate` | The legacy pipeline: a polite public-read crawler, a Laravel MySQL restore in Docker with a mock dump, normalisers, review output, and the shop's URL inventory (CDX, sitemap, Search Console). 105 files, 9.0k lines (3.0k tests) | KEEP untouched | Already shaped by source, not by brand. Imports only `config/constants`, plus view-model types in one type test. Gains the data moved out of the brand directories (§2.6). |
| `i18n` | `formatMoney` (exponent-pinned, exact decimal), dates with precision, mm/in dimensions, plurals, a message loader that applies the brand's copy. 17 files, 1.4k lines (0.7k tests) | KEEP, simpler loader | Copy comes from the app's JSON per site, not from `BRAND_ROOT`. No library swap. |
| `cache` | Tag builders, `invalidate()` only after the commit (request collector), POST to `/api/x/revalidate`. 17 files, 1.8k lines (1.1k tests) | KEEP, review tags | The tag grammar assumes one brand per process (`item:<publicId>`). Namespace tags by collection (`work:`, `product:`), and add the site wherever one record renders on both sites. |
| `analytics`, `payments`, `shipping`, `fulfilment`, `sister`, `ui` | The C11, C7, C12 and C3 contracts. 25 files, 1.7k lines, types only | REMOVE | No implementation, no consumer. The Midtrans adapter and first-party events are built plainly later. Design tokens live in the app's CSS: custom properties and CSS Modules, no Tailwind. |
| `CONTRACTS.md` | Registry and changelogs for C1–C13. 915 lines | ARCHIVE | The frozen-contract process is gone. |

### 2.2 Apps (`engine/apps/*`)

| Item | What it is (real size) | Verdict | Why, and what must change |
| --- | --- | --- | --- |
| `gallery` | The shell. 101 files, 3.2k lines. Contents: the `[locale]` layout (`instant = false`, `connection()` first); an item route with the one-address 308 rule (`src/item/canonical.ts` and its test); shell; 565 lexicon keys; the `(payload)` mount; 42 route files, of which 33 point at `@engine/http/unbuilt` and 3 at cron stubs; the 4.1.e spike | KEEP, rename to `apps/web` | Becomes the one app. **Keep:** `next.config.ts` (standalone, `cacheComponents`, `htmlLimitedBots: /.*/`, Payload's client-hint headers on `/admin/*` only), `canonical.ts`, the `instrumentation.ts` boot. **Delete:** `src/spike/` (17 files, 915 lines), `supports.ts`, the 36 placeholder mounts, the `brand-assets` mount. |
| `emporium` | The same shell. 79 files, 1.8k lines. All 39 `api/x` mounts and 26 of its other 40 files are byte-identical to the gallery's | REMOVE | Port `messages/lexicon/shop.ts` (69 keys) and its tokens into `web`. |
| Both `PRODUCT.md` | Product briefs per brand. 197 and 172 lines | REWRITE | They rest on D50 invoices, the D52 single stock pool and partner accounts. |

### 2.3 Tooling and gates (`engine/tooling/*`)

| Item | Size | Verdict | Why |
| --- | --- | --- | --- |
| `check-file-size` | 3 files, 167 | KEEP | The 300-line rule. Cheap, and keeps agent diffs reviewable. |
| `config-drift` (`check:generated`) | 7 files, 814 | KEEP, one context | Regenerates `payload-types.ts` and `importMap.js` and fails on a diff. Drop the per-brand contexts. |
| `db` | 14 files, 1.2k | SIMPLIFY | `db:fresh`, `db:drop` and `db:list` without `--brand` or `--storefront`; one database, `indies_<suffix>`. Keep the extensions init (`unaccent`, `pg_trgm`). |
| `worktree` | 9 files, 881 | SIMPLIFY | Keep a port and a database suffix per agent. Drop the link-key ring and `BRAND`. |
| `tasks-lint` | 15 files, 1.5k | SIMPLIFY | Keep unique ids, needs that resolve, every task ending in a Check, Owns overlap inside a wave and requirements coverage (TASKS.md 1.3.d). Drop lane codes and per-phase size limits. |
| `dev` | 3 files, 335 | REMOVE | Plain `next dev` with `.env.local`. |
| `lint-brand-literals`, `check-brands`, `brand-create` | 456, 897, 489 | REMOVE | Brand machinery. Keep `check-brands`' copy-completeness idea as a unit test: every key has an en and an id value, and there are no unknown keys. |
| `route-parity` | 24 files, 2.6k | REMOVE | It polices the C13 manifest across two apps, plus the Payload fences. |
| `next-config-parity` | 8 files, 811 | REMOVE | Parity between two apps' configs. Next itself refuses route segment config under Cache Components. |
| `schema-hash` | 4 files, 281 | REMOVE | Compared the brand databases; there is one database now. |
| `bundle-scan` | 3 files, 315 | REMOVE | It kept Payload out of engine-route chunks: a cold-start concern, not a safety one. |
| `client-safe` | 12 files, 1.2k | REPLACE | Use `import 'server-only'` in every `apps/web/src/server/**` module (Next fails the build when a Client Component reaches one), plus one ESLint import rule. Never in `@engine/cms`: the Payload CLI loads cms in plain Node, where `server-only` throws, so ESLint keeps cms out of client modules instead. |
| ESLint fences (`eslint.config.mjs`, 226 lines) | | SIMPLIFY | **Keep:** apps import Payload only under `src/server/**` and `(payload)`; packages never import apps; no `next/link` or `next/form` prefetch (every page renders per request, so a prefetch costs a database read). **Drop:** the eight `fences/*` rules, which import from `route-parity` and `next-config-parity`. |

### 2.4 Scripts, CI and root configs

| Item | What it is | Verdict | Why, and what must change |
| --- | --- | --- | --- |
| `scripts/progress.mjs`, `scripts/board/*`, `.githooks/*`, the PostToolUse hook in `.claude/settings.json` | 766 lines | KEEP | The user's board format, with its generated progress table. The new `TASKS.md` must keep the shape `progress.mjs` parses. |
| `scripts/ops/*` | 29 files, 4.0k lines of bash: idempotent, `--dry-run` and `--report`, tested in a container | SIMPLIFY | One site user, port, database and media bucket (plus masters). Both staging hostnames on one CloudPanel site. `APPS=(gallery emporium)`, `brand_of` and `sister_of` go. |
| `.github/workflows/{ci,e2e,release}.yml` (509), `.github/scripts/*` | e2e on four databases and eight Playwright projects; two release subdirectories | SIMPLIFY | Keep the build with no database env. One artifact subdirectory, one e2e database. Drop the `schema-hash` and brand-config steps. Add `pnpm audit --prod` and a secret scan. |
| `.gaiadeploy.yml` | Two entries, `uig` and `uoei` | SIMPLIFY | One entry. |
| `docker-compose.dev.yml` | Postgres 18, Mailpit, MinIO (`ig-media`, `oei-media`, `test-media`, `archive-masters`) | KEEP | Buckets become `media` and `masters`. |
| `.env.example` | 16 KB, including `BRAND`, `BRAND_ROOT`, `TEST_STOREFRONT`, `SISTER_*`, `LINK_TOKEN_KEYS` | SIMPLIFY | Drop the brand, sister and link-key variables. Add the site host allow-list, `MIDTRANS_*` and `ANTHROPIC_API_KEY`. |
| `playwright.config.ts` (eight projects), `lighthouserc.{gallery,emporium}.json` | | SIMPLIFY | `gallery.localhost` and `shop.localhost` on one port (Chromium resolves `*.localhost` to loopback); desktop and mobile. One Lighthouse file for both sites. |
| `vitest.config.ts`, `tsconfig.base.json`, `pnpm-workspace.yaml`, Prettier, `.editorconfig` | | KEEP | |

### 2.5 Payload collections (39 collections and 6 globals; 7 have fields on `main`)

| Collection(s) | State on `main` | Verdict | Why, and what must change |
| --- | --- | --- | --- |
| `users` | 308 lines (499 tests). Seven roles in a multi-value `roles` field (table `users_roles`); lockout after 5 failures for 15 min; sessions; the first user becomes admin; the last admin is kept by hooks **and** a database constraint trigger | KEEP | Roles become `owner`, `editor` and `store` (DR-10). A `store` user gets a `store` relation and sees only that store's orders and stock through a `Where` access rule. The guards in `users/guards.ts` and the trigger both test `'admin'` on `users_roles`, so they must follow the rename (§6.4). |
| `makers`, `places`, `terms`, `sources` | 243, 457 (947 tests), 199 and 81 lines. Vocabulary; the gazetteer with historical names; a cycle guard | KEEP | Shared by both sites, so no `site` field. 8.2 adds deletes that refuse a term still in use. |
| `media` | 553 lines (843 tests). Localised alt text required; role and provenance; public REST reads refused (loaders only) | KEEP | One bucket; drop the brand segment. |
| `masters` | 1,029 lines (848 tests). Presigned PUT, checksum, intake-manifest import, origin/outlet attribution | SIMPLIFY | Drop `attribution.ts` and the per-brand print-file rules. |
| `works` | A stub on `main`. The unmerged 8.2 branch adds 43 files and 4,360 lines, with no migration | KEEP: merge, then strip | The gallery's record. Remove the `work-synced` guard (sister provenance copies), and take `workUidPrefix` from `SITES` instead of the brand config. Align its fields with the rewritten CONTENT-MODEL.md §3: a staff-set `status`, an owner-only `askingPrice`, `location`. |
| `products`, `orders`, `pages`, `redirects`, `enquiries`, `stock-levels`, `locations`, `discounts`, `payment-attempts` | Stubs | REPLACE: delete now, rebuild in their own phases | `products` (the shop, with variants as an array field). `stock-levels`: unique on store, product and variant SKU. `locations` → `stores` (with a geo point). `orders`: guest contact, delivery pin, assigned store, the status flow of DR-7, an image of the driver's details, a hashed tracking token. `enquiries` → `leads`. `discounts`: the welcome code (S13). `payment-attempts` → `payment-events`, an append-only Midtrans ledger with a unique dedupe key. `pages` and `redirects` gain `site`. |
| `customers`, `addresses`, `saved-items`, `want-lists`, `subscribers`, `reviews`, `curations`, `designs`, `product-types`, `variants`, `stories`, `exhibitions`, `carts`, `reservations`, `refunds`, `shipments`, `returns`, `offers`, `consignments`, `appointments`, `invoices`, `gift-cards` | 22 stubs | REMOVE | Cut by the target: no accounts, offers, holds, invoices, returns, gift cards or configurator. Variants live inside `products`. The cart lives in a cookie and is priced on the server. |
| Globals `brand-settings`, `navigation`, `homepage`, `commerce-settings`, `consent`, `seo-defaults` | Stubs | REPLACE | One `site-settings` global with a group per site (the rewritten CONTENT-MODEL.md §6). |
| New, not in the repo | | ADD later | `stores`, `partners`, `leads`, `payment-events`, `chat-sessions`, `events` (analytics), `site-settings`. |

### 2.6 Brand directories

| Item | What it is (real size) | Verdict | Why, and what must change |
| --- | --- | --- | --- |
| `indies-gallery/` | `site/brand.config.json` (8 KB); `site/copy/{en,id}.json` (587 keys); `site/assets/*` (favicon, touch icon, `logo.svg`, `og.png`, manifest); `content/legacy/inventory/urls.tsv` (7,665 old URLs); `public-read.json` (crawler settings); `content/legacy/schema/*` (Laravel schema notes) | DISSOLVE | Harvest into `SITES.gallery`: the en/id route segments, the facet vocabularies (`/antique-maps/…`, `/peta-antik/…`), the legacy prefixes `/category/`, `/storage/products/` and `/account/`, and `publicZoomMaxPx`. Copy → `apps/web/src/sites/gallery/lexicon/`. Assets → `apps/web/public/gallery/`. Legacy data → `packages/migrate/data/gallery/`. |
| `old-east-indies/` | Same shape: config (6 KB), copy (560 keys), assets, `content/legacy` (673 URLs, `discovery.json`) | DISSOLVE | The same moves, to `shop`. |
| `test/` | The synthetic brand: two configs, en/id/nl copy padded by +30%, assets, and `content/seed/gazetteer.json` (15 KB) | REMOVE, keep the gazetteer | The gazetteer moves to `packages/cms/src/seed/`. |

### 2.7 Tests and e2e

| Item | What it covers | Verdict | Why |
| --- | --- | --- | --- |
| Unit tests (about 25k lines across the tooling, packages and apps projects), including `*.db.test.ts` run against Postgres in `e2e.yml` | Real guards | KEEP with their code | They prove the last-admin trigger, the places tree, media access, temp-file cleanup and the proxy. Each test goes when its code goes. |
| `tests/e2e/status` (186) | 404 and 308 statuses on a production build | KEEP | Pins the status behaviour of Cache Components. Retarget to the two hosts. |
| `tests/e2e/smoke` (154), `tests/e2e/a11y` (71) | Per brand and viewport; axe | SIMPLIFY | Two hosts, two viewports. |

### 2.8 Code-adjacent docs

| Doc | Verdict | Why |
| --- | --- | --- |
| `docs/spikes/cache-components.md` (254) | KEEP | The Next 16.3.6 and Payload 3.90.2 findings: `instant = false`, `htmlLimitedBots`, `connection()` order, a CSP nonce per request. |
| `docs/ops/helios-staging.md` (137) | SIMPLIFY | The runbook, for one site. |
| `PLAN.md`, `CONTENT-MODEL.md`, `COMMERCE.md`, `DESIGN-SYSTEM.md`, `EXPERIENCE-*`, `ANALYTICS.md`, `COMPLIANCE.md`, `CONTENT-OPERATIONS.md`, `AGENTS.md`, `PRODUCT.md`, the spec's `requirements.md`; new `SECURITY.md` and `AI.md`; `PAYMENTS.md` removed | REWRITE in progress | At audit time another agent had these rewritten but **uncommitted** in the main checkout, with the old copies in `docs/archive/2026-10-replan/`. This file's verdicts follow them: DR-1 to DR-15, the roles of DR-10, the collections of CONTENT-MODEL.md §3–§6. |
| `ARCHITECTURE.md` (788), `DEPLOYMENT.md` (412), `CONVENTIONS.md` (367), `MIGRATION.md` (394) | REWRITE from them (done since the audit; `MIGRATION.md` became [DATA.md](DATA.md)) | Their mechanics carry over: security (§13), rendering (§9), media (§7), search (§8), migrations, backups, environment, URLs (MIGRATION §6). Their brand parts go. |
| `BRANDS.md`, `PARALLEL-TRACKS.md`, `CONTRACTS.md`, the spec's `design.md`, `DISPATCH.md` and `reviews/`, `docs/gates/foundation/*` (53 files) | ARCHIVE to `docs/archive/2026-10-replan/` | Governance and evidence of the old plan. |

## 3. Reshape the foundation (Phase 1): steps in dependency order

The target is the layout of [ARCHITECTURE.md](ARCHITECTURE.md) §4: one app, `engine/apps/web` (from `apps/gallery`),
whose proxy picks the site from `Host` against an env allow-list (an unknown host gets 404) and rewrites into that
site's tree, under internal prefixes that 404 when requested directly; admin and REST answered on the admin host
only; loaders in `src/server/**` (Local API, `overrideAccess: false`, published only, `select`), marked server-only;
`engine/packages/{cms,config,http,media,i18n,cache,migrate}` slimmed and everything else deleted; one database
(`indies_<env>`), one media bucket (public only under `derivatives/` and `iiif/`) and one masters bucket. Each step
is one reviewable commit set, and `pnpm verify` is green after each. Each step is tagged `[tier · model]`; the model
is the seat's default unless one is named.

0. **Freeze and triage** [orchestrator]
   - Stop dispatching phases 6 and 8. Cancel 6.3, 6.5.g and 6.7: they edit configs, C2 and docs that are about to
     go. Review and merge 8.2 (Works) first, so later steps simplify it in place. Let 8.6 finish: its Payload
     `ValidationError` bug lives on in the one app.
   - Do not merge 8.5's per-brand plan files; fold its RustFS parity findings into step 8. Prune the ~80 stale
     worktrees. Keep `replay/7.2` and `replay/7.4` (Hermes pilot evidence). Back up `../indies-legacy-data` (§6).
1. **Board and rules** [medior for `tasks-lint`; orchestrator for the rest]
   - Archive `TASKS.md` and the spec's `design.md` and `DISPATCH.md`. Slim `tasks-lint` (§2.3) so the new board
     passes `tasks:lint` and `tasks:check`. Commit the rewritten `AGENTS.md`, drafted but uncommitted at audit time,
     and the `docs/WORKFLOW.md` it names, written since.
2. **Drop the brand gates** [medior]
   - Remove `lint:brand-literals`, `check:brands`, `check:routes`, `brand:create`, `schema-hash` and `bundle-scan`
     from `verify` and CI, with their tooling folders. In the same commit, delete the `eslint.config.mjs` fences
     that import from them, and cut `check:generated` down to the `BRAND`-unset context.
3. **Delete the contracts and the placeholders** [medior]
   - Trim `view-models` (§2.1) and give it a local `Money` type. Delete `domain`, `payments`, `shipping`,
     `fulfilment`, `sister`, `analytics` and `ui`. Delete the 36 placeholder mounts in each app, their http manifest
     rows, the cron stubs and the gallery spike. `typecheck` proves nothing still imports them.
4. **One app** [senior-fe, with devops for CI]
   - `git mv engine/apps/gallery engine/apps/web`. Port the emporium's lexicon and tokens, then delete
     `apps/emporium`. `supports` becomes every module, for now: the app still serves one brand per process through
     `BRAND` until step 5.
   - Update the root `build`, Playwright, Lighthouse, the three workflows, `assemble-artifact.sh` (one subdirectory)
     and `.gaiadeploy.yml` together. Regenerate `pnpm-lock.yaml` with `pnpm install`; never hand-edit it.
5. **Site replaces brand** [senior-be with senior-fe · **opus·high**: host trust, cookie and CSRF scope, and reads
   at request time are security-critical, and a mistake costs a full re-run]
   - Gut `@engine/config` to `SITES` and `siteFromHost()`. The proxy rewrites by `Host` against an allow-list
     (`GALLERY_HOSTS`, `SHOP_HOSTS`) into the `(gallery)` and `(shop)` trees. Copy `instant = false` and the
     `connection()`-first read onto both root layouts.
   - Pin admin and REST to Payload's `serverURL` host; on the other host, `/admin` and `/api/*` outside `/api/x/`
     and `/api/health` are 404. CSRF and CORS list each site's origin. Build absolute URLs (emails, canonical tags,
     Open Graph) from `SITES`, never from the request.
   - Move copy and assets into the app; the proxy rewrites root files (favicon, manifest, robots) per site. Delete
     `access/brand.ts`, `access/modules.ts`, and `BRAND`/`BRAND_ROOT` everywhere.
6. **Dissolve the brand directories** [junior]
   - Legacy inventories → `packages/migrate/data/{gallery,shop}/`; the gazetteer → `packages/cms/src/seed/`. Delete
     `indies-gallery/`, `old-east-indies/` and `test/`, and fix the paths in the migrate READMEs and
     `public-read.json`.
7. **Collections and the migration reset** [senior-db · **opus·medium**: hand-written DDL and data-integrity
   triggers must survive the reset]
   - Delete the 31 stub collections and six stub globals, the frozen-slug assertion (keep `assertDraftAccess`),
     `engine-tables.ts` with `idempotency_keys`, and `nl`. Give users the new roles; take the brand segment and
     outlet logic out of media and masters; strip the works guard. Regenerate `payload-types.ts` and `importMap.js`
     in the same commit.
   - **Reset the migrations:** delete both migrations (1,353 lines of TypeScript and 13.2k lines of JSON snapshots);
     run `migrate:create initial` once, on a clean `main`, by one person; re-add the hand-written DDL —
     `unaccent`/`pg_trgm`, the last-admin constraint trigger (its advisory-lock key must equal `ADMINS_LOCK_KEY` in
     `users/guards.ts`), the truncate refusal; rewrite both triggers for the new role, `'owner'`, and for the new
     table if `roles` becomes a single `role` column.
   - Drop every existing database rather than migrating forward: local `ig_*`, `oei_*` and `test_*`, and on staging
     `ig_db` and `oei_db` after a `pg_dump`. Their `payload_migrations` rows name the old files. `admins.db.test.ts`
     must pass against the migrated database. Keep the rule that one person generates migrations, on `main`, never
     from a dev server.
8. **Staging as one site** [devops; the owner's standing Helios go-ahead of 2026-10-01 covers it]
   - One site user, pm2 process, port and database (`indies_db`), and one media bucket with a policy scoped by
     prefix; keep `archive-masters`. Both staging hostnames on one CloudPanel site through nginx `server_name`, so
     no DNS change. Remove `uig` and `uoei`. `/api/health` must answer 200 on both hostnames. Production stays 👤.
9. **Docs** [architect; parallel with steps 5–8]
   - Finish and commit the rewrite already underway (§2.8). Still to do at audit time: `ARCHITECTURE`, `DEPLOYMENT`,
     `CONVENTIONS`, `MIGRATION` (now `DATA.md`), `README`, both apps' `PRODUCT.md` (now one at the root) and the
     spec's `design.md`. Archive the rest, and mark the cut journeys (J-G2, J-G6, J-G8, J-S1, J-S2, J-S3, J-S5,
     J-S6).

**Order constraints.** Step 2 comes before steps 4–6, because those gates read the apps, the manifest and the brand
directories. Steps 2–4 remove 40 of the 78 importers of `config/schema` before step 5 rewires the other 38. Step 6
comes before step 7, because the places tests read the gazetteer's path. Step 7 comes before step 8. Steps 1 and 2
can run in parallel.

## 4. Gates: what stays in `pnpm verify`

New `verify`:
`format:check && lint && typecheck && test && check:filesize && check:generated && tasks:lint && tasks:check`.

- **Keep.** Prettier, ESLint (slimmed), TypeScript strict and Vitest are the standard floor. `check:filesize` keeps
  every agent's output reviewable. `check:generated` is the only guard against stale `payload-types.ts` and
  `importMap.js`; a component missing from the import map renders as nothing, with no error. The two board checks
  are cheap and keep the board honest.
- **Drop** `lint:brand-literals`, `check:brands` and `check:routes`.
- **Replace** `check:client-safe` with `server-only` imports in `apps/web/src/server/**`, never in `@engine/cms`. A
  build-time error from Next is a stronger guarantee than a custom static scan, and costs nothing to maintain.
- **CI, keep:** the `*.db.test.ts` suite on Postgres 18; `next build` with `DATABASE_URL` and `PAYLOAD_SECRET`
  unset, which proves the build touches no database and bakes in no secret; Playwright smoke, axe and status on the
  production build for both hosts; Lighthouse budgets; the release smoke boot from the tarball; the deploy-manifest
  check.
- **CI, add:** `pnpm audit --prod --audit-level=high`, a gitleaks secret scan on every push, and GitHub's default
  CodeQL setup.
- **CI, drop:** the four-database matrix, `schema-hash`, `bundle-scan`, the test brand.

## 5. Reusable assets: keep untouched

- **Media pipeline.** Done: storage (S3 plugin; private `uploads/`; public only under `derivatives/` and `iiif/`,
  tested on MinIO); the presigned master PUT with a SHA-256 checksum; upload limits and types; temp-file cleanup;
  bucket-policy plans. Not built: derivatives (sharp), IIIF tiles, manifests, the viewer; the C9 key functions and
  the 320–2400 ladder are reusable as they are. The pilot set (`docs/design/imagery/pilot-set/manifest.md`): the
  median legacy image is 2,706 × 1,697 px, 42% are under 2,400 px, 88% of items have a single image and none has a
  verso. Deep zoom adds little on migrated items until new photography arrives.
- **`migrate` and its output.** Raw data sits outside git, in `../indies-legacy-data/indies-gallery/` (3.3 GB):
  1,823 product records, 2,289 original images, the HTML cache, the category tree.
  `normalised/public-read/records.jsonl` holds 1,823 records, each field marked parsed, review or empty. Titles:
  1,709 parsed, 114 for review. Dates: 1,749 parsed. Condition: 1,783. Dimensions: 1,614. Stock numbers: 1,734.
  Prices: 1,628. Also: `review.csv`; the Laravel restore proven on a mock dump (the real export, OA9, is still
  outstanding); the redirect inventories (7,665 gallery URLs, 673 shop URLs).
- **The i18n lexicon.** Keys and neutral defaults live in `apps/*/src/messages/lexicon/*.ts`: 565 for the gallery,
  545 for the shop. Values for en and id are in the brand copy: 587 and 560 keys. British spelling and the *Anda*
  register are decided. About 38% of the gallery's keys (account, bag and checkout, payment and order) are dead and
  should be pruned. The shop's checkout and order keys are rewritten for guest checkout and tracking.
- **View models.** The kept subset (§2.1): record, condition, fuzzy dates, dimensions, images, cards, listing and
  facets, editorial, blocks, shell.
- **Voice and imagery.** `docs/design/gallery/voice.md` (333), `docs/design/emporium/voice.md` (346), and
  `docs/design/imagery/*` (22 files in EN and ID: guides, intake spec, retouching and labelling, shot lists, pilot
  set, handover).
- **Owner answers.** `docs/design/journeys/owner-answers.md`, unchanged. The file is not edited; the answers the new
  target supersedes are listed in §6.12.
- **Design input.** `docs/design/input/claude-design-2026-09/` (Cormorant Garamond and Inter).
- **Infrastructure knowledge.** The Cache Components spike, `scripts/ops` (idempotent CloudPanel, pm2, RustFS,
  Mailpit, cron and backups), and the security guards in §2.1 and §2.5.

## 6. Surprises and risks

1. **Work in flight.** About 80 git worktrees: 22 under `.claude/worktrees/`, about 58 sibling `antique-map-*`
   directories. `feat/p8-sch-8.2-works` (4,360 lines, finished 22:41 today) is unmerged. Agents are still on 6.3,
   6.5.g, 6.7 and 8.6. The main checkout holds a large uncommitted docs rewrite by another agent: 13 files changed,
   plus `docs/archive/`, `SECURITY.md` and `AI.md`. Reshaping under all this means conflicts against deleted files,
   so triage first (step 0).
2. **The only copy of the crawl.** `../indies-legacy-data` (3.3 GB) is outside git, on one laptop. Re-crawling needs
   the owner's OK again and takes hours at one request every 2 seconds. Back it up to the private masters bucket or
   the owner's drive.
3. **Contracts without code.** About 20% of the code is types-only contracts, 31 of 39 collections are stubs, and 36
   of 42 route files are placeholders. TASKS.md shows Foundation at 100%, but nothing a buyer would use exists yet.
   Plan the new board from what is listed in §1.
4. **Migrations hold hand-written DDL.** The extensions and the last-admin triggers were added by hand. A naive
   reset loses the database backstop silently, because a dev-pushed database lacks triggers by design. Renaming
   `admin` to `owner` (DR-10) breaks it just as silently: the trigger's `WHEN (OLD."value" = 'admin')` simply never
   fires again. Old databases must be dropped, not migrated forward.
5. **Two hostnames on one process is new attack surface.** A `Host` the allow-list does not hold must never pick a
   site or build a URL. Payload's `serverURL` takes one value, so pin the admin to one host, where its cookies are
   scoped. The cache tags assume one brand per process (`cache/src/tags.ts`).
6. **Staging storage.** Before 8.5, the staging media buckets allowed anonymous GET on the whole bucket. 8.5 was
   applied on Helios but is unmerged, and its independent review was still running. Four storage secrets were
   rotated after a transcript leak: confirm that is closed. Staging has no off-box backups (`DEPLOYMENT.md` §9).
   Pilot captures may already sit under `masters/intake/indies-gallery/pilot-2026-10/`. Check before dropping the
   brand segment from the keys.
7. **Secrets.** None committed: a pattern scan of every tracked text file found no AWS, Stripe, Midtrans, GitHub or
   Anthropic keys. Only dev placeholders exist (`dev-only-not-a-secret`, `minioadmin`,
   `db-fresh-dev-only-never-signs-anything`), and the boot check refuses them on deployed hosts. Keep that refusal.
8. **Brand names hard-coded.** None under `engine/`, which the lint enforced. But these all assume two brands:
   `scripts/ops/lib/sites.sh` (`brand_of`, `sister_of`); CI (`ig` and `oei` databases), `playwright.config.ts`, and
   `.gaiadeploy.yml` (`uig`, `uoei`); MinIO's bucket list; the media key layout (`iiif-full/<brand>/`,
   `masters/intake/<brand>/`, `print-files/<brand>/`).
9. **Dead or dangling code.** ESLint fences name `engine/packages/loaders`, which does not exist. The jobs registry
   names `@engine/mail/jobs` and `@engine/sister/jobs`. `ci.yml` keeps a "Brand config validation (TODO 3.1)" step.
   The spike was meant to go "with phase 33".
10. **Big files.** `TASKS.md` is 477 KB and 3,019 lines, and every agent session reads it: keep the new board small.
    The migration JSON snapshots are 13.2k lines. The vendored `.claude/skills/impeccable/scripts/live-browser.js`
    is 12,990 lines, outside the size gate.
11. **Prices must not leak.** 1,628 legacy records carry a price, yet the gallery shows "Price on request" (G4). The
    migration loader must not publish those prices. Enforce the AI chat's "never quotes prices" in its tool's
    projection (it is never given price fields), not in its prompt.
12. **Recorded decisions the target reverses.** The rewritten PLAN.md records them as DR-1 to DR-15: D50, D51 and
    G3b/G5 (an invoice and pay page, with a hold until it is due) → DR-3: invoices deferred to v2; D52 (one stock
    pool) → DR-6: stock per store; S11 (a Bali courier with a "deliver before" date) → DR-6: Gojek or Grab, with no
    courier integration; D31 (partner sign-in) → DR-8: partners are records only. Three memory notes still say the
    opposite and need updating: "Gallery sells by chat → invoice paid on our pay page", "Shop stock one pool", and
    "keep 44 phases, never renumber" (the new board restarts at Phase 1).
