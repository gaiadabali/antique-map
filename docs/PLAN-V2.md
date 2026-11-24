# Plan v2 — two apps, two CMSs, two databases, one repo

**Written 2026-10-22; the owner's answers (§9) recorded the same day; approved and landed as phase A on
2026-11-03 (DR-17 in [PLAN.md](PLAN.md)).** This plan replaces [PLAN.md](PLAN.md) (v1, 2026-10-01) as the
spine. v1 stays in the repo as history; where the two disagree, **this file wins**. This is the full list of what
changes, in what order, and how each step is checked; the executable version — phases 21–26 (A–F below), with
tasks, subtasks and Checks — is [`TASKS.md`](../TASKS.md). Until phase F, today's one app
(`engine/apps/web`) keeps serving both sites.

## 1. Why

v1 settled **DR-1: one Next.js app, one Postgres database, two hostnames**. Building both sites on it showed the
cost:

- **CI runs everything on every push.** A change to the shop runs the gallery's database tests, e2e and
  Lighthouse too; the slowest job (database tests) takes 5–6 minutes, and the Next build runs twice per run.
- **The code is hard to navigate.** Every collection, loader and route carries `site`, and the shell picks the
  site from the hostname; a shop change means reading past the gallery and the reverse.
- **One release, one blast radius.** A shop fix ships with whatever gallery work is on `main`; a migration or a
  crash takes both sites down; a forgotten `site` filter leaks one site's records into the other.
- **The two sites have little in common.** The gallery is a catalogue with enquiries. The shop has checkout,
  payments, stock in 100+ stores, fulfilment and partner accounts.

**Now is the cheapest moment to split:** no production data exists (production is still 👤), and the gallery
is not under active development, so the shop moves first without touching it.

## 2. The decision

| | v1 | v2 |
| --- | --- | --- |
| **DR-1 →** | one app, one database, two hostnames | **two apps, two Payload configs, two databases**, one repo |
| Admin | one `/admin` on the shop's host | **one admin per site**, each on its own host |
| Site choice | the proxy reads `Host` against both host lists | each app serves **one** site; an unknown host is a 404 |
| `site` field | on every shared record | **gone**: a database holds one site |
| Deploy | one process, one release | **two processes, two releases**, independent rollback |
| CI | one pipeline for both | **per app, by path**; shared packages run both |
| Shared code | one app | **`engine/packages/*`**, imported by both apps — never copied |

DR-2 to DR-16 of v1 stand unless §9 says otherwise (DR-15's one RustFS bucket becomes two, Q3). **DR-1 and the "one CMS" line of AGENTS.md are retired.**

**Not chosen:** two repositories (shared tokens, UI, i18n, migrations tooling would be copied and drift);
SQLite locally (the migrations, `unaccent`/`pg_trgm` search, the atomic stock SQL and advisory locks are
Postgres-only, and dev/prod parity matters most where money and stock are); a multi-tenant plugin (one owner,
and it keeps one database).

## 3. The target shape

```
engine/
  apps/
    shop/          Old East Indies — Next.js 16 + Payload (cms-shop) — DB indies_shop — oldeastindies.com
    gallery/       Indies Gallery  — Next.js 16 + Payload (cms-gallery) — DB indies_gallery — antiquemapsindonesia.com
  packages/
    cms-core/      shared Payload building blocks: fields, access helpers, roles, the users/media/pages/
                   redirects/leads/events collection factories, site-settings factory, hooks, migration tooling
    cms-shop/      shop config: products, categories, stores, stock-levels, orders, discounts, partners,
                   payment-events, order-notifications, shop pages blocks, shop jobs, its own migrations
    cms-gallery/   gallery config: works, makers, places, masters, terms, its own migrations
    ui/            tokens (base + per-site palettes), shared components (from apps/web/src/shared)
    chat/          the AI chat engine, configured per site (prompt, tools, projection)
    config · http · i18n · cache · media · migrate · view-models   (as today, minus the two-site logic)
  tooling/         db (per app), worktree (two ports), check-file-size, config-drift (per cms), tasks-lint
```

```
 oldeastindies.com ──► nginx ──► shop process (pm2)    ──► Postgres: indies_shop    ──► RustFS bucket: shop media
                                  /admin (shop staff, store users; partners sign in on the site)
 antiquemapsindonesia.com ──► nginx ──► gallery process ──► Postgres: indies_gallery ──► RustFS bucket: gallery media
                                  /admin (owner, editors)                                 (+ the private masters bucket, as today)
```

## 4. What moves where — the full inventory

### 4.1 Collections

| Today (one config) | v2 | Notes |
| --- | --- | --- |
| `products`, `categories`, `stores`, `stock-levels`, `orders`, `order-notifications`, `discounts`, `partners`, `payment-events` | **cms-shop** | unchanged apart from dropping `site` on products |
| `works`, `makers`, `places`, `masters` | **cms-gallery** | unchanged |
| `terms` | **cms-gallery** | the shop's categories already left it (2026-10-21); subject/grade stay gallery-only |
| `pages` | **both**, from a cms-core factory | shop: blocks (`layout`), the built-in `home`/`partnership`/`stores`; gallery: intro/hero/body/works; `site` and `kind`-for-shop go |
| `media` | **both**, from a cms-core factory | the derivative pipeline is shared code; each app has its own rows and **its own bucket** (Q3) |
| `users` | **both**, from a cms-core factory | shop roles: `owner`, `editor`, `store`; gallery roles: `owner`, `editor`. Partner sign-in stays on the shop's `partners` collection |
| `redirects`, `leads`, `events`, `chat-sessions` | **both**, from cms-core factories | leads: gallery = sell-to-us/enquiry, shop = partnership; `site` goes |
| global `site-settings` | **both**, one group each | today one global holds both sites' groups |

### 4.2 The app (`engine/apps/web/src` today)

| Today | v2 |
| --- | --- |
| `app/(shop)/shop/[locale]/…`, `sites/shop/**`, `server/shop/**`, `server/orders/**` | `apps/shop/src/…` — routes lose the internal `/shop/<locale>` prefix |
| `app/(gallery)/gallery/[locale]/…`, `sites/gallery/**`, `server/gallery/**` | `apps/gallery/src/…` |
| `app/(payload)` (one admin, `importMap.js`) | one per app, each its own generated `importMap.js` |
| `app/api/x/**` (webhooks, cron, chat, beacon, revalidate) | Midtrans webhook, stock cron, shop chat in **shop**; gallery chat, sell-to-us in **gallery**; beacon and revalidate in **both** |
| `proxy.ts` (host → site, rewrite, CSP) | one per app: host allow-list for its own site, CSP, locale; no site choice |
| `shell/**` (site-root, site-shell, `siteFromHost`) | per app; the shared header/footer pieces move to `packages/ui` |
| `shared/ui`, `shared/styles`, `shared/chat`, `shared/beacon` | `packages/ui`, `packages/chat` (client parts), `packages/ui/beacon` |
| `server/seo`, `server/analytics`, `server/redirects`, `server/leads`, `server/media`, `server/site-settings.ts` | shared logic into packages; each app keeps a thin loader for its own database |
| lexicons `sites/{shop,gallery}/lexicon/*.json`, `messages/lexicon/*` | per app; shared keys (shell, errors) in `packages/i18n` |

### 4.3 Cross-site links (the only real coupling)

| Link | Today | v2 |
| --- | --- | --- |
| Product → its antique ("See the original", `products.relatedWork`) | a relationship into `works` | a **stock number** text field; the shop resolves it through the gallery's public read API (cached, published-only) or shows no link |
| Shop home "bridge to the originals" | reads gallery works directly | the gallery's public API (two featured works), or CMS-chosen pictures in the block |
| Sister-site links in header/footer | `siteHref('gallery')` | absolute URL from config (`SITES.gallery.origin`) |
| Chat answering about both catalogues | one projection | each site's chat answers its own catalogue and links to the other site |

### 4.4 Tooling, tests and CI

| Area | v2 |
| --- | --- |
| Databases | `indies_shop_<suffix>`, `indies_gallery_<suffix>`; `pnpm db:fresh --app shop|gallery` |
| Worktrees | two ports per worktree (shop, gallery); `.env.local` per app |
| Generated files | `payload-types.ts` and `importMap.js` per CMS; `check:generated` runs both |
| Unit tests | vitest projects per app and per package |
| DB tests | per CMS; **sharded** over 2–3 runners; shop no longer runs gallery's and the reverse |
| e2e, Lighthouse | per app, against one host each; **one build per app per run**, shared by e2e and Lighthouse |
| CI triggers | path filters: `apps/shop/**` + `packages/cms-shop/**` → shop jobs; gallery likewise; `packages/{cms-core,ui,i18n,…}/**` → both |
| Postgres in CI | native from PGDG apt (`.github/actions/setup-postgres`, done 2026-10-22) — no image pulls |
| Local services | `docker-compose.dev.yml` stays **optional** (Postgres, Mailpit, MinIO); a no-Docker path documented: native Postgres 18 (`PGHOST`), uploads to local disk, mail to console |

### 4.5 Deploy (Helios)

| Today | v2 |
| --- | --- |
| one CloudPanel Node site, nginx `server_name` for both hosts | **two** CloudPanel Node sites, one per host |
| one pm2 process, one port | two pm2 processes, two ports |
| one database `indies_db` | `indies_shop`, `indies_gallery` (+ one backup job each) |
| one release tarball, one `scripts/ops/pack.sh` run | one tarball per app; `pack.sh --app` |
| `GALLERY_HOSTS`, `SHOP_HOSTS`, `ADMIN_HOST` | per app: `SITE_HOSTS`, `ADMIN_HOST`; secrets per app (`PAYLOAD_SECRET`, Midtrans for shop only) |
| one media bucket | **two buckets**, one per site, each with its own scoped key and public URL (Q3); the private `archive-masters` bucket stays as today (the gallery's masters; the shop's key writes only under `print-files/`) |

### 4.6 Documents to rewrite

`AGENTS.md` (the "one app, one CMS, one database" opening and the rules that name it), `README.md`,
`docs/ARCHITECTURE.md`, `docs/CONTENT-MODEL.md`, `docs/DEPLOYMENT.md`, `docs/WORKFLOW.md` (lanes and file
ownership per app), `docs/CONVENTIONS.md` (commands), `docs/DATA.md` (seed per app), `docs/SECURITY.md`
(two admins, two secrets), `docs/CONTENT-OPERATIONS.md` (two admin addresses), `.claude/specs/indies-platform/*`,
and a new phase block in `TASKS.md`.

## 5. Phases

Each phase ends in something you can open, and its **Check** is what "done" means. The gallery keeps running
from today's app until phase F, so nothing is ever down.

| # | Phase | Ends in | Check |
| --- | --- | --- | --- |
| **A** | **Decide and write down** | this plan approved; a DR-17 that retires DR-1 in `docs/PLAN.md`; AGENTS.md and the doc list in §4.6 updated; `TASKS.md` phases A–F | the owner's go-ahead on §9; every doc in §4.6 names two apps |
| **B** | **Shared packages first** | `cms-core` (fields, access, roles, collection factories, migration tooling), `ui` (tokens, components), `chat` extracted from today's code; **today's app now imports them** and behaves exactly as before | `pnpm verify` green; no behaviour change (the current e2e and Lighthouse pass unchanged) |
| **C** | **The shop app** | `apps/shop` + `cms-shop` with its own initial migration; routes without the `/shop/<locale>` prefix; its proxy, admin, webhooks, cron, chat; `relatedWork` → stock number | the shop runs on `shop.localhost` from its own database; checkout to payment (sandbox) to tracking works; admin with owner/editor/store roles; partner sign-in works |
| **D** | **Shop data, CI and staging** | shop seed layers (vocabulary, stores, the 156 designs, CMS pages) against `indies_shop`; CI jobs for the shop by path; a second CloudPanel site on Helios staging for `old-east-indies.gaiada.com` | CI shop jobs green and faster than today's run; staging shop healthy (`/api/health` 200) with seeded data |
| **E** | **The gallery app** | `apps/gallery` + `cms-gallery` the same way; its seed (gallery sample/full); its CI jobs; its own staging site | gallery on its own database and admin; deep zoom, enquiry and sell-to-us work; staging gallery healthy |
| **F** | **Retire the one app** | `apps/web` and the merged `cms` package deleted; `site` fields and `siteFromHost` gone; the shared staging site and `indies_db` removed | nothing imports `apps/web` or `@engine/cms`; `grep` finds no `site: 'shop'` filter; both sites pass their full checks |

**Order:** A → B → C → D, then E → F. B is the step that keeps C and E small: it moves shared code once, while
everything still runs as one app.

**Size:** A ½ day · B 2–3 days · C 3–4 days · D 1–2 days · E 2–3 days · F 1 day — about **two working
weeks** for one developer, the shop usable on its own after the first week and a half.

## 6. Data

- **Production:** none yet — nothing to migrate.
- **Staging:** reseeded per app (the shop from `LEGACY_DATA_DIR` as today; the gallery from its crawl). The
  shared `indies_db` is dropped in phase F, after both new databases pass.
- **Local:** `pnpm db:fresh --app …` and the seed commands per app. Today's `indies_<suffix>` databases are
  dropped once phase F lands.
- **Media:** re-uploaded per app by the seeds (the derivative pipeline runs per app). Nothing is shared between
  the two media tables or buckets, so a picture used on both sites is stored twice — accepted (Q3).

## 7. Risks and how each is handled

| Risk | Handling |
| --- | --- |
| Shared code copied into both apps and drifting | phase B extracts it **before** either app is built; a lint rule fails an app that imports the other app |
| Two migration sets getting out of step on shared collections | the shared collections come from one factory in `cms-core`; each CMS generates its own migration from it in the same wave |
| The owner's work doubles (two admins) | a link to the other admin in each admin's header; one password manager entry each; the same roles and layout in both |
| The shop's link to the gallery breaks when the gallery is down | the stock-number lookup is cached and optional: no link is shown, the product page never fails |
| Phase C stalls and leaves two half-apps | the gallery keeps running from today's app until F; C can pause without anything being down |
| CI still slow | sharded DB tests, one build per app, path filters — measured in D's Check against today's 5–6 minutes |

## 8. What does not change

Every rule in AGENTS.md except the "one app, one CMS, one database" opening: money in integer rupiah priced on
the server; the atomic stock decrement; verified, idempotent payment webhooks in one transaction; public reads
published-only and projected (`overrideAccess: false`); store users see only their store; the AI never quotes a
price; 300-line files; generated files never hand-edited; the build never touches a database; copy in lexicons;
UI from tokens and shared components; never touching the live sites; secrets out of the repo. The design
(tokens, components, the handoff's pages) and every feature built so far carry over unchanged.

## 9. The owner's answers (2026-10-22)

| # | Question | Answer |
| --- | --- | --- |
| Q1 | Two admin addresses (`oldeastindies.com/admin`, `antiquemapsindonesia.com/admin`) with two logins — acceptable? | **Yes.** |
| Q2 | Who uses which admin? | **The same person runs both**, with an account in each — accepted. |
| Q3 | Media: one bucket with a prefix per site, or two buckets? | **Two buckets**, one per site (§3, §4.5). |
| Q4 | "See the original" on a product: keep it (by stock number, through the gallery) or drop it? | **Keep it** (§4.3). |
| Q5 | The order: shop first (C, D) and the gallery after (E)? | **Yes.** |
| Q6 | Staging: a second CloudPanel site on Helios under the standing go-ahead? | **Yes.** |

Production deploys, DNS and live credentials still need their own go-ahead, as in v1.

## 10. Before implementation starts

1. ~~The owner answers §9.~~ Done 2026-10-22.
2. ~~Phase A lands as its own commit: this file approved, DR-17 in `docs/PLAN.md`, AGENTS.md and the docs in §4.6
   updated, the phases in `TASKS.md`.~~ Done 2026-11-03.
3. Work in progress on `main` is committed or parked: phase B moves files that are being edited today
   (`sites/shop/**`, the shell, the partnership form).
4. CI is green on `main` (the native Postgres setup and the three test fixes of 2026-10-22), so every later phase
   is measured against a passing baseline.
