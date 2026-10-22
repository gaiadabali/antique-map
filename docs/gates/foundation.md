# Foundation gate (TASKS.md 5.2, and 5.5's Check)

Two runs. The **first** (below, to "Pending") was the local half on 3914a0a. The **second**, on
**a5fb2e9** (5.6 merged), drove staging, the 5.4-owned plants, the F1–F7/M1 re-runs and 5.5's
Check; it starts at [Second run](#second-run--a5fb2e9) and ends in the [Verdict](#verdict).

## First run — the local half

qa, 2026-10-01, on **3914a0a** (`main` at dispatch). It ran in a fresh worktree
(`antique-map-qa-p5-gate`, `pnpm install --frozen-lockfile`, `pnpm worktree:env 5 QAF` →
`PORT=4257`, `DB_SUFFIX=p5_qaf`) on Windows 11, Node 24.18, Docker Desktop Postgres 18. Staging
(5.1) was still being provisioned, and 5.4's own fences were gated by another qa in parallel. So
this file proves every clause that needs neither, and marks the rest **pending**.

`main` has moved on since dispatch. 1adabf7 is 3914a0a plus docs, `.gaiadeploy.yml` and the two
brand configs' staging domains, and CI run 36809122136 is green on it (static, Lighthouse,
end-to-end). Later, 04d7e89/3c6f457 added 5.5 and 5.1.a; this gate did not cover them.

Screenshots and the raw driver output (`drive.json`, `drive-admin.json`) are in
`docs/gates/foundation/`. The repository keeps images (`docs/design/input/**`).

## How it was run

| Step | Command / setup | Result |
| --- | --- | --- |
| Databases | `pnpm db:fresh --brand indies-gallery\|old-east-indies --suffix p5_qaf`; `--brand test --storefront gallery\|emporium --suffix p5_qaf` | four databases created and migrated. `--suffix QAF` is refused (lower-case only), so the suffix is `worktree:env`'s `p5_qaf` |
| Build | `env -u DATABASE_URL -u PAYLOAD_SECRET -u BRAND -u BRAND_ROOT pnpm build` | exit 0; no `warn`/`error` line in the log; `grep -rl "Indies Gallery\|Old East Indies" engine/apps/*/.next/server/app` finds nothing |
| Servers | the environment `start-server.sh` gives each server (`env -i`, `NODE_ENV=production`, `HOSTNAME=0.0.0.0`, a random `PAYLOAD_SECRET` and `ci:` ring, `LOCAL_PRODUCTION_BUILD=1`, `node server.js`), from each app's `.next/standalone` | ig :4257, oei :4259, test-gallery :4260, test-emporium :4261, spike (test gallery, `SPIKE_ROUTES=1`) :4262, ig with `SPIKE_ROUTES=1` :4264 for Lighthouse. `/api/health` was 200 `"status":"ok"` on all six (app, boot, database, storage, queue; `environment: local`) |
| Release tree | `bash .github/scripts/assemble-artifact.sh` | assembled both subdirs (712 MB each, sharp 0.35.5) in 64 min. On Windows the tree does not boot: `Cannot find module '@swc/helpers/_/_interop_require_default'`, because Git Bash's `cp -r` breaks pnpm's links (finding L4). So the servers ran from the in-place standalone output. The Linux CI boots the assembled tree (run 36809122136) |

## 5.2.a — the full gate, locally

| Gate | Evidence | |
| --- | --- | --- |
| `pnpm verify` | second run: exit 0, **115 files, 1248 passed, 22 skipped**. Every gate printed ok: file size, brand literals (6 terms), client-safe, brands, route parity (41 routes / 39 slugs), `check:generated` (20 runs, no drift), tasks-lint (44 phases, 173 tasks). The first run, made while `db:fresh` loaded the machine, had **3 timeouts** (F7) | ✅ (⚠ F7) |
| e2e, production build | `E2E_*_URL` at the five servers, `E2E_EXPECT_UA_FIX=1 pnpm test:e2e --workers=4` gave **79 passed, 9 skipped** (the fixme cases for 22.4.e and 41.1.a), 22.4 s. Smoke: 6/6 on each of ig, oei, test-gallery and test-emporium × desktop and mobile. Status: 21 on the spike gallery, 10 `@any-app` on the test emporium | ✅ |
| Lighthouse | `lhci autorun` with `lighthouserc.{gallery,emporium}.json` ported to these ports ran Lighthouse, but exits 1 on Windows (chrome-launcher `taskkill … not found`). So Lighthouse 12.6.1 (lhci's own) ran 3× per URL, mobile, and the medians were checked against the same budgets | ✅ |

Lighthouse medians (budget in brackets):

| URL | LCP ms (≤2500) | CLS (≤0.05) | TBT ms (≤200) | script bytes | a11y |
| --- | --- | --- | --- | --- | --- |
| ig `/` | 2048 | 0.000 | 43 | 137,563 (≤153,600) | 1.0 |
| ig `/product/1706-café-de-java` (spike) | 2007 | 0.000 | 26 | 138,247 (≤184,320) | 1.0 |
| oei `/` | 2014 | 0.000 | 33 | 137,563 (≤153,600) | 1.0 |

The empty shell already uses 90 % of the home page's 150 KB script budget (L5).

## 5.2.b — every clause of each Done when

### Phase 1

| Clause | Evidence | |
| --- | --- | --- |
| a fresh clone runs `pnpm install && pnpm verify` green | a fresh worktree of 3914a0a: `pnpm install --frozen-lockfile` (1 m 43 s), then `pnpm verify` exit 0 (above) | ✅ |
| every contract compiles, is `@contract` with an owner | 148 files under `engine/packages` carry `@contract` (C1–C13), every tag names `owner:`; they compile in `pnpm verify`'s typecheck | ✅ |
| signed off by its reviewers | `.claude/specs/indies-platform/reviews/` holds the senior-be/fe/db reviews per contract round (1.2, 2.4, 3.4, 4.3) | ✅ |
| `pnpm worktree` gives its own branch, port, database suffix | `pnpm worktree 5 QZZ` created `antique-map-p5-qzz` on `feat/p5-qzz` with `PORT=4258`, `DB_SUFFIX=p5_qzz` (this worktree: 4257, `p5_qaf`). Removed afterwards | ✅ |

### Phase 2

| Clause | Evidence | |
| --- | --- | --- |
| `pnpm db:fresh` creates a brand database with `unaccent` and `pg_trgm` | `pg_extension` in all four `p5_qaf` databases: `pg_trgm 1.6, unaccent 1.1` | ✅ |
| every gate fails on a planted violation and passes once removed | see 5.2.c. Gaps: F3 (brand-literal aliases), F4 (`--wave` overlap) | ✅ (⚠ F3, F4) |
| a push to `main` runs CI green | run 36809122136 (1adabf7, which holds 3914a0a): Static checks, Lighthouse, End-to-end all `success` | ✅ |
| a push to `production` runs the release workflow | release run 36686348116 on `production` d2c5786 `success` (4.4.f) | ✅ |

### Phase 3

| Clause | Evidence | |
| --- | --- | --- |
| each brand's config loads | `check:brands` ok for all four configs, with copy (374/394 keys); four servers boot from them | ✅ |
| a broken one is refused with the field named | a plant in `test/site/brand.gallery.json`: without `name`, `check-brands: test/site/brand.gallery.json: name: Invalid input: expected string, received undefined`; with `locales.default: "fr"`, `locales.default: Invalid option: expected one of "en"\|"id"\|"nl"`. Restored | ✅ |
| `bootCheck()` refuses a missing secret | the production gallery `server.js`, with everything else set: no `PAYLOAD_SECRET` → `✗ PAYLOAD_SECRET: is not set`, exit 1. No `LINK_TOKEN_KEYS` → `✗ LINK_TOKEN_KEYS: is not set`, exit 1. Also `HOSTNAME=127.0.0.1` → `✗ HOSTNAME: … a loopback IP`, exit 1 | ✅ |
| `/admin` logs in against two different databases whose schema hashes are equal | sign-in on ig and oei (phase 5 below). `pnpm schema-hash --all` over the four databases: one hash, `e9f18428…c8c4`, "4 database(s) share one schema" | ✅ |

### Phase 4

| Clause | Evidence | |
| --- | --- | --- |
| both apps serve their brand and `test` in EN and ID | 16 pages, 4 servers × EN/ID × 390/1280: each 200, `<html lang>` matching, the brand name in `<title>` and `<header>`, Indonesian copy on `/id` ("Galeri ini sedang dibangun…", "Toko ini sedang dibangun…"), **axe 0, no horizontal overflow, 0 console errors**. Screens: `{ig,oei,test-gallery,test-emporium}-{en,id}-{390,1280}.png`. Smoke `the home page in en/id answers 200 with the brand's name` on all 8 projects | ✅ |
| with Payload at `/admin` | `/admin/login` 200 on all four (smoke `/admin/login answers 200`, and the driver) | ✅ |
| `/api/health` green | all six servers: `{"status":"ok", … "database":{"ok":true}, "storage":{"ok":true,…}}`; smoke `/api/health answers 200 …` on 8 projects | ✅ |
| route parity passing | `check:routes`: `ok, 41 manifest route(s) checked against 39 collection slug(s)` | ✅ |
| the spike's verdict recorded in ARCHITECTURE.md §9 | §9 says "confirmed by the phase 4 spike … `docs/spikes/cache-components.md`" and carries the three settings. Reviewed under 5.2.d | ✅ |
| the client-safe gate runs in `pnpm verify` | `check:client-safe` is in the `verify` script; it printed `ok, 1 'use client' module(s) reach nothing server-only` | ✅ |

### Phase 5 (local clauses)

| Clause | Evidence | |
| --- | --- | --- |
| `pnpm dev --brand indies-gallery` and `--brand old-east-indies` … | **`pnpm dev` does not exist.** The root script runs `node engine/tooling/dev/cli.mjs`, which is not in the tree (`MODULE_NOT_FOUND`), although README.md:60 documents it. `next dev` in `engine/apps/gallery`, given the brand's environment, serves `/` and `/id` 200 (F1). The same shells were proven on production builds (phase 4 above) | ❌ F1 |
| … serve two differently themed shells | they differ in name, logo, favicon, manifest and copy (`ig-en-1280.png` navy mark, `oei-id-390.png` red mark). The theme itself is the same: both configs ship `"tokens": {}`, and both bodies compute `rgb(28,28,28)` text in Georgia on the same ground (`drive.json` `theme`) | ⚠ F2 |
| … in EN and ID from two databases | ig on `indies_gallery_p5_qaf`, oei on `old_east_indies_p5_qaf`; each brand's staff credentials 401 on the other three servers and 200 on their own (`drive-admin.json` `cross`) | ✅ |
| `/admin` logs in on both | the first user created, then UI sign-in reached `/admin` (Dashboard, "Staff") at 390 and 1280 on ig, oei, test-gallery and test-emporium: `*-admin-dashboard-{390,1280}.png`. Payload's own admin UI is **not axe clean** (F6) | ✅ (⚠ F6) |
| `test` runs on both apps | test-gallery (gallery app) and test-emporium (emporium app; default locale `id` unprefixed, `/en` prefixed): smoke 12/12 each, screens, admin sign-in | ✅ |
| the spike's verdict is recorded | ARCHITECTURE.md §9 and `docs/spikes/cache-components.md` (5.2.d) | ✅ |
| every gate fails on a planted violation | 5.2.c below. The 5.4-owned plants are pending 5.4's gate | ✅ / pending |
| both staging hostnames serve a CI-built release | — | **pending 5.1** |

## 5.2.c — planted violations (each reverted; `git status` clean after each)

| Gate | Plant | Fails with | Passes once removed |
| --- | --- | --- | --- |
| a 301-line file | `engine/packages/ui/src/qa-plant-long.ts`, 301 lines | `check-file-size: 1 file(s) over 300 lines — …qa-plant-long.ts — 301 lines`, exit 1 (300 lines: ok) | ok, exit 0 |
| a brand literal | `export const who = 'Old East Indies'` in `engine/apps/emporium/src/shell/qa-plant.tsx` | `lint-brand-literals: 1 violation(s) … :1 — contains "Old East Indies"`, exit 1 | ok, exit 0 |
| a drifted schema (database) | `alter table users add column qa_plant text` in `old_east_indies_p5_qaf` | `schema-hash --all: schema drift across 4 database(s)` (oei `e2492e3f…`), exit 1 | the column dropped: `ok, 4 database(s) share one schema` |
| a drifted schema (config) | `{ name: 'qaPlant', type: 'text' }` in `users` with no migration | `check-generated: … drifted`: `migration-snapshot — schema:check: the config differs from …20260929_182126_initial.json`, and `payload-types [every context] — first difference at line 219 … "qaPlant?: string \| null"`, exit 1 | `ok, no drift (20 runs)` |
| config drift (`BRAND`-shaped config) | `...(process.env.BRAND ? [{ name: 'qaPlant', … }] : [])` in `users` | 8 drifted: `migration-snapshot [BRAND=…] — first difference at line 186: with BRAND unset "name", regenerated "qa_plant"` and `payload-types [BRAND=…]` for each of the 4 brand contexts, while BRAND unset stays clean; exit 1 | ok, exit 0 |
| a stale import map | the `S3ClientUploadHandler` entry deleted from the gallery's `importMap.js` | 5 drifted: `importmap.gallery [every context] — first difference at line 2: committed "", regenerated "import { S3ClientUploadHandler …"`, exit 1 | ok, exit 0 |
| a missing route | `engine/apps/emporium/src/app/api/x/collect/route.ts` deleted | `{"kind":"missing-route-file","app":"emporium","path":"/api/x/collect",…}`, exit 1 | `route-parity: ok, 41 …` |
| a shadowing route | `'health'` added to `COLLECTION_SLUGS` | `{"kind":"reserved-segment-collision","path":"/api/health","segment":"health"}`, exit 1 | ok |
| a mount left on the placeholder once its handler exists | `engine/packages/http/src/collect/route.ts` created; both mounts still `@engine/http/unbuilt` | `placeholder-with-handler` for emporium and gallery, `"handler":"@engine/http/collect"`, exit 1 | ok |
| an overlapping wave | `engine/packages/http/src/proxy/**` added to 5.1's **Owns** (5.3 owns it, both W1); then `{media,masters,places}` in 8.3's (8.1 owns `{makers,places,…}`, both W1) | `[owns-overlap] line 574: 5.1 and 5.3 share wave W1 …` and `[owns-overlap] line 724: 8.1 and 8.3 …`, exit 1 | ok. **But** `tasks:lint --phase 8 --wave 1` said "ready to dispatch" with the overlap planted (F4) |

**Pending 5.4's gate** (owned and planted there, not repeated here): a non-literal matcher, Payload
reached from an `@engine/http` module that is not `payload-*.ts`, a route segment config outside
the `(site)` layout, and the two apps' `next.config.ts` apart. (5.4 has since been ticked on
`main`, 1adabf7.)

## 5.2.d — screenshots and the spike review

- **Local screenshots**: `docs/gates/foundation/` holds both shells (and `test` on both apps) in
  EN and ID at 390/1280, both admins' first-user screen and signed-in dashboard. **Staging
  screenshots: pending 5.1.**
- **Spike review** (`docs/spikes/cache-components.md` against ARCHITECTURE.md §9 and the build).
  The verdict stands, and the build bears it out: the admin, the item route and `[...missing]`
  are ◐, everything else is ƒ, and `/_not-found` alone is ○. Status codes hold on a production
  build (the status spec, 21 + 10 passed), as do the script budget and the no-database build. Two
  stale lines (L3): §2's table still calls the no-User-Agent case "the one gap", which 5.3 closed
  (the no-UA cases pass with `E2E_EXPECT_UA_FIX=1`); and §2 names `e2e/status.spec.ts`, which
  moved to `tests/e2e/status/status.spec.ts` (the header gives the new path).

## 5.2.e — failures, as proposed subtasks

| # | Sev | Proposed subtask (owner) | Reproduction |
| --- | --- | --- | --- |
| F1 | High | **2.1 (HAR) — `pnpm dev --brand <slug> [--storefront]`**: `engine/tooling/dev/cli.mjs` starts the brand's app with `BRAND`, `BRAND_ROOT`, the `DATABASE_URL` from `DB_SUFFIX`, and `PORT`. 1.3.c moved its dev clause to 2.1, and 2.1's Check dropped it | `pnpm dev --brand indies-gallery` → `Error: Cannot find module …engine/tooling/dev/cli.mjs`; README.md:60 promises it |
| F2 | Med | **Orchestrator / 4.5 (BRD)** — decide what "differently themed" means at Foundation: either the phase 5 Done when (and PLAN.md:96) says "branded (name, logo, favicon, copy)", or each brand gets minimal `tokens` in its config and the shell applies them | `drive.json` `theme`: ig and oei bodies are both `rgb(28, 28, 28)` Georgia; both configs have `"tokens": {}` |
| F3 | Med | **2.2.b (HAR) — `lint-brand-literals` bans `domains.aliases[]`**, and the brands' legacy domains (MIGRATION.md) through a config field the banned-term list reads | fixture tree: `aliases: ["www.antiquemapsindonesia.com"]` and `engine/packages/x/a.ts` holding that URL → `ok … (3 banned term(s))`. Today `'https://oldeastindies.com/x'` under `engine/` passes too |
| F4 | Med | **2.2.f (HAR) — `tasks:lint --phase <n> --wave <k>` fails on an Owns overlap within that wave**, as PARALLEL-TRACKS.md §5 says (`wave.mjs` leaves it to the full lint) | add `places` to 8.3's Owns brace → full lint `[owns-overlap]` exit 1, but `--phase 8 --wave 1` → "ready to dispatch", exit 0 |
| F5 | Low | **4.1 / next.config owner (PLT) — `agentRules: false` in both apps' `next.config.ts`** (5.4.d's parity allowlist kept equal), or ignore `engine/apps/*/{AGENTS,CLAUDE}.md` | `next dev` in `engine/apps/gallery` prints "Generated AGENTS.md and CLAUDE.md for AI agents" and leaves both untracked (removed here) |
| F6 | Low | **23.x (admin shell) — the admin's axe debt**, or a recorded exception for Payload's stock UI | signed-in `/admin`, 1280: `critical label #react-select-…-input`, `serious color-contrast .localizer-button__label`, `serious aria-hidden-focus .dropdown-indicator`, moderate landmark/heading/region. Create-first-user: also `nested-interactive`. Login: moderate only |
| F7 | Low | **4.7 (HAR) — `client-safe/check.test.mjs` "passes: no 'use client' module … reaches anything server-only" gets the load-proof timeout** 5.4 gave its hook tests | `pnpm verify` while four `db:fresh` runs load the machine: `Test timed out in 5000ms` (12.9 s). Two 5.4-owned eslint tests also hit 60 s there; a quiet rerun is green |
| M1 | Low | **HAR — the smoke asserts axe**: playwright.config.ts says "each e2e spec calls `new AxeBuilder({ page }).analyze()`", but no spec under `tests/e2e/` does | `grep -rn -i axe tests/e2e` → nothing |

Lows recorded and not filed: L3 (the spike doc's two stale lines, ARC). L4: on Windows,
`assemble-artifact.sh`/`start-server.sh` give a tree that does not boot, which contradicts
playwright.config.ts's "locally, start them the same way" (a doc note for HAR). L5: the script
budget's headroom (DESIGN-SYSTEM.md §7's owner). And `server.js` prints `✓ Ready` before the boot
check refuses and exits 1 (cosmetic).

## Pending after the first run (all closed by the second run)

- **pending 5.1**: https://indies-gallery.gaiada.com and https://old-east-indies.gaiada.com
  serving a CI-built release, and the staging screenshots. (At 3914a0a the brand configs still
  say `ig.gaiada.com`/`oei.gaiada.com`; 1adabf7 renamed them.)
- **pending 5.4's gate**: the four 5.4-owned plants above.
- **5.2.f** is not met while F1 (and F2, F3, F4) stay open.

## Second run — a5fb2e9

qa, 2026-10-01, on **a5fb2e9** (5.6 merged), in a fresh worktree `antique-map-qa-p5-gate2`
(`pnpm install --frozen-lockfile`, `pnpm worktree:env 5 QAG2` → `PORT=4258`, `DB_SUFFIX=p5_qag2`).
Staging was only read: `ssh helios` for `readlink`, `ss -ltnp` and `journalctl -u gaiada-poll`,
plus HTTPS GETs and one admin sign-in session per site and width. Each admin's credentials went
from `/etc/indies/staging-admin/<domain>` over ssh straight into the driver's environment, and were
never printed or saved. Raw output: `foundation/staging-drive.json` and `foundation/dev-drive.json`.

### 5.2.a — the full gate on main

| Gate | Evidence | |
| --- | --- | --- |
| `pnpm verify` on a5fb2e9 | exit 0. **120 files passed (2 skipped), 1322 tests passed (22 skipped)**. Every gate ok: file size; brand literals ("6 banned term(s) and 3 legacy domain(s)"); client-safe; brands; route parity (41 routes / 39 slugs); `check:generated` (20 runs, no drift, 62.8 s); tasks-lint | ✅ |
| CI on main | CI run **36818480466** (push, a5fb2e9): Static checks, What changed, Lighthouse (holding 5.5's bundle-scan step) and End-to-end all `success`. CodeQL 36818479397 `success` | ✅ |
| e2e, production build, all four configs | the same run's e2e job ran on the assembled release tree: **95 passed, 9 skipped** (the `fixme` cases for 22.4.e and 41.1.a). That covers the smoke on ig, oei, test-gallery and test-emporium; status; and the new **a11y projects: 16/16 passed** (`[ig-a11y]`, `[oei-a11y]`, `[test-gallery-a11y]`, `[test-emporium-a11y]`; home and not-found pages, every locale, 390 and 1280 px) | ✅ |
| Lighthouse | the same run's Lighthouse job: `success` against `lighthouserc.{gallery,emporium}.json` | ✅ |

### 5.2.b — phase 5, the clauses left open

| Clause | Evidence | |
| --- | --- | --- |
| `pnpm dev --brand indies-gallery` and `--brand old-east-indies` serve … shells in EN and ID from two databases | Both ran at once (`pnpm dev --brand old-east-indies --port 4259`). They printed `[dev] indies-gallery on engine/apps/gallery · http://localhost:4258 · database indies_gallery_p5_qag2` and `[dev] old-east-indies on engine/apps/emporium · … · database old_east_indies_p5_qag2`. `/`, `/id` and `/admin/login` answered 200 on each; `lang` was `en`/`id`; axe found 0 violations; `/api/health` was `ok`. `pg_stat_activity` showed one connection in each of `indies_gallery_p5_qag2` and `old_east_indies_p5_qag2`. Screens: `dev-{ig,oei}-{en,id}-390.png`; data in `dev-drive.json` | ✅ (F1 closed) |
| … differently branded (name, logo, favicon, copy) | Name: `Indies Gallery` / `Old East Indies` in `<title>`, header and h1. Logo: `logo.svg?v=99c92664` / `?v=f7093a23`. Favicon: `favicon.ico?v=3048a1e1` / `?v=d420c011`. Copy: "Galeri ini sedang dibangun. Yang Anda lihat baru kerangkanya." / "Toko ini sedang dibangun. Yang kamu lihat baru kerangkanya." Theming is D9's (the Done when as reworded), so F2 is closed | ✅ |
| `/admin` logs in on both | Signed in on staging on both sites at 390 and 1280: it reached `/admin` with the "Collections" dashboard ("Staff"). Screens: `staging-{ig,oei}-admin-dashboard-{390,1280}.png`. The driver masked any rendered email or password before each shot, and its check of rendered text, attributes and inputs found **0** of either. Each shot was opened and shows only Payload's avatar. Locally, the first run proved sign-in on all four | ✅ |
| `test` runs on both apps | CI 36818480466: smoke, status and a11y on test-gallery (gallery app) and test-emporium (emporium app) | ✅ |
| the spike's verdict is recorded | ARCHITECTURE.md §9 and `docs/spikes/cache-components.md` (first run, 5.2.d). The two stale lines (L3) are still there, at lines 89–91 | ✅ (L3 open, doc-only) |
| every gate fails on a planted violation | 5.2.c (first run) and 5.2.c below: **every** plant fails a gate, naming the file, and passes once removed | ✅ |
| both staging hostnames serve a CI-built release | `readlink /home/uig/current` → `…/releases/deploy_production-20261001T044432Z-1eddcaf/indies-gallery`; uoei → `…-1eddcaf/old-east-indies`. That tag is the Release workflow's: run **36816388257** on `production` 1eddcaf `success`, GitHub release `production-20261001T044432Z-1eddcaf`. The poller logged `DEPLOY OK (uig) <- deploy_production-20261001T044432Z-1eddcaf` at 04:46:39 and `DEPLOY OK (uoei) <- …` at 04:47:53. `/api/health` answered `{"status":"ok","environment":"staging",…}` on both sites, with the app, boot (0 problems), database, storage and queue ok. `ss -ltnp`: 4030 and 4031 (next-server), 4032 (rustfs), 4034 and 4035 (mailpit), all on 127.0.0.1. 1eddcaf is a merge whose tree equals main's 7a5b20f (`git diff 1eddcaf^2 1eddcaf` is empty). So staging runs main as of 5.1, without 5.6's tooling or `agentRules` (no storefront change) | ✅ |

**Staging shells** (5.2.d): `staging-{ig,oei}-{en,id}-{390,1280}.png`. All 8 pages answered 200, with
`lang` matching, **axe 0 violations, 0 console errors and no horizontal overflow** (`staging-drive.json`). The
committed smoke and a11y specs against staging (`E2E_GALLERY_URL`/`E2E_EMPORIUM_URL` at the two
hostnames; GET only) gave **24 passed, 8 failed**: ig-a11y and oei-a11y 8/8, but two smoke cases on all 4
projects failed, for N1 and N2 below.

### 5.2.c — the plants 5.4 owned, now on main (each reverted, `git status` clean)

| Plant | Fails with | Removed |
| --- | --- | --- |
| a **non-literal matcher**: `const MATCHER = '/((?!api/…).*)'; export const config = { matcher: [MATCHER] }` in the gallery's `proxy.ts` | **`pnpm build`**: `Next.js can't recognize the exported 'config' field in route. Entry 'matcher[0]' need to be static strings or static objects`, exit 1. The imported form (`matcher: PROXY_MATCHER` from `@engine/http/manifest`) fails the same way: `` `matcher` needs to be a static string or array of static strings ``. **But `check:routes` and ESLint pass both** (N3) | builds; route parity ok |
| a matcher whose value differs from C13 | `check:routes`: `{"kind":"proxy-matcher-mismatch","app":"gallery",…"actual":["/((?!api/\|_next/\|brand-assets/\|qa-plant/).*)"]}`, exit 1 | ok |
| Payload from an `@engine/http` module that is no `payload-*.ts` | `engine/packages/http/src/health/qa-plant.ts`, `import { getPayload } from 'payload'` → `1:1 error 'payload': under http/src only a payload-*.ts module imports Payload by value … fences/payload-by-value`. With `() => import('@payloadcms/db-postgres')`: the same rule, at 1:30. With a side-effect `import 'payload'` atop `health/health.ts`: ESLint, **and** `check:routes` reports `payload-reached` on both apps' `/api/health`, chain `engine/packages/http/src/health/route.ts → …/health.ts` | lint clean; ok |
| a route segment config outside the `(site)` layout | `export const dynamic = 'force-dynamic'` in `(site)/[locale]/page.tsx` → `25:14 error 'dynamic' is route segment config: the one allowed is 'export const instant = false' … fences/segment-config`. `export const revalidate = 60` in the emporium's `api/health/route.ts` → the same, `'revalidate'`. `export const { instant } = { instant: false }` in page.tsx → the same, `'instant'`. `instant = true` in the emporium layout → ESLint, plus the parity test `layout.tsx: expected false to be true` | clean |
| the two apps' `next.config.ts` apart | `reactStrictMode: false` in the emporium's → `next-config-parity.test.mjs … differs … at line 44: reactStrictMode: true, (… line 44: reactStrictMode: false,)` and `resolved-config.test.mjs` fail. A comment-only change (`/** qa-plant`, gallery line 1) also fails the byte-identical test | 85/85 passed |

**First-run reproductions, re-run on a5fb2e9:**

| # | Reproduction | Now |
| --- | --- | --- |
| F1 | `pnpm dev --brand <slug>` | runs; see 5.2.b above ✅ |
| F3 | `'https://oldeastindies.com/x'` in `engine/packages/ui/src/qa-plant.ts` → `contains "oldeastindies.com"`. `'WWW.AntiqueMapsIndonesia.COM'` in `engine/apps/gallery/src/` → `contains "antiquemapsindonesia.com"`. `'indiesgallery.com'` in `engine/tooling/` → caught. An alias: `domains.aliases: ["shop.qa-plant-alias.test"]` in old-east-indies' config, plus that host under `engine/` → `contains "shop.qa-plant-alias.test"`. A staging domain → caught. Each exits 1, and is ok once removed | ✅ |
| F4 | `places` added to 8.3's Owns brace → `tasks:lint --phase 8 --wave 1`: `phase 8 · W1 is NOT ready: Owns overlap: 8.1 and 8.3 share wave W1 …`, exit 1. Reverted: `W1 is ready to dispatch` | ✅ |
| F5 | after both `pnpm dev` servers ran, `git status --untracked-files=all` lists no `AGENTS.md`/`CLAUDE.md`; `agentRules: false` is at line 43 of both configs | ✅ |
| F7 | `vitest run` (the whole suite) while 8 `db:fresh` runs loaded the machine: **1322 passed**, no timeout. The three tests now allow 60 s (client-safe) and 180 s (both ESLint suites) | ✅ |
| M1 | `tests/e2e/a11y/a11y.spec.ts`: 16/16 in CI, and 8/8 against staging | ✅ |
| F2 | the Done when now reads "branded (name, logo, favicon, copy …)"; evidenced above | ✅ |
| F6 | Payload's admin still is not axe clean; it stays 23.x's, and no Done-when clause names it | open, filed |

### 5.5's Check — the third gate's missed forms, planted

| Form (qa's third gate) | Plant | Fails with |
| --- | --- | --- |
| L1: a `package.json` beyond `engine/packages/*` | a nested `engine/packages/http/src/health/package.json` with `{"react-server", "default"}` exports; an `imports: {"#qa": {...}}` added to `engine/apps/gallery/package.json`; `engine/tooling/qa-plant/package.json` with `production` | `check:routes`: `{"kind":"exports-condition","file":"<that package.json>","field":"exports"\|"imports",…,"condition":"react-server"}` (and so on), exit 1, for each |
| L2: one config text, resolved differently | in both configs, `generateBuildId: async () => process.env.QA_PLANT_ID ?? null`, with `QA_PLANT_ID` only in `engine/apps/emporium/.env.production`. Then `trailingSlash: process.cwd().endsWith("emporium")` in both | `resolved-config.test.mjs`: `… resolves differently … at generateBuildId.generateBuildId()`, then `… at env.NEXT_TRAILING_SLASH, trailingSlash` |
| L3: `staticString` | in `engine/apps/gallery/src/shell/qa-plant-l3.tsx`: ``require(`next/link`)``, `require('next/link' as const)`, `require('next/link' satisfies string)`, `require(B)` where `const A = 'next/link'; const B = A`, ``router[`prefetch`]``, `router[C]` where `C = 'prefetch' as const`, `Reflect['get'](router, 'prefetch')`, and `const { get } = Reflect; get(router, 'prefetch')` | ESLint `fences/no-next-link` at lines 8–11 and `fences/no-router-prefetch` at 12, 13, 14, 16: **every line** |
| L4: a held `createRequire` | in `engine/packages/http/src/health/qa-plant-l4.ts`: `createRequire as cr`, then `r('payload')`; `let r2; r2 = createRequire(…); r2('payload')`; `const r3 = r; r3('@engine/cms')`; `r.call(null, 'payload')`; `r.apply(null, ['payload'])` | `fences/payload-by-value` at lines 4, 7, 9, 10, 11: **every form** |
| L5: a `conditional-branch-reached` chain | `@engine/http`'s exports given `"./revalidate": {"react-server": "./src/revalidate/payload-real.ts", "default": …}`, and the condition **allowlisted** in `ALLOWED_EXPORT_CONDITIONS` | still exit 1: `{"kind":"conditional-branch-reached","file":"engine/packages/http/package.json",…,"chain":["engine/packages/http/src/revalidate/payload-real.ts"]}`. The chain names no `engine/apps/` importer, and `payload-reached` comes on both apps' `/api/x/revalidate`. Without the allowlist, `exports-condition` is reported too |

Each was then removed, and its gate passed: `check:routes` ok, `npx eslint` on the folders exit 0,
parity 85/85. One harness slip: L2's `.env.production` is gitignored, so it outlived the plant until
it was found and deleted. It changed no result (the configs no longer read it), and parity was
re-run clean after.

**The CI bundle scan** (`node engine/tooling/bundle-scan/cli.mjs`, after
`env -u DATABASE_URL -u PAYLOAD_SECRET -u BRAND -u BRAND_ROOT pnpm build`):

- **The `react-server` plant** (above; `payload-real.ts` reaches Payload through `@engine/cms/instance`):
  the build succeeds, then the scan **exits 1** on both apps, e.g. `bundle-scan:
  engine/apps/gallery/.next/server/app/api/x/revalidate/route.js loads Payload synchronously
  (ARCHITECTURE.md §15): server/chunks/[root-of-the-server]__0ry_bbb._.js ::
  …/engine/packages/cms/src/instance.ts … payload@3.90.2/…/payload/dist/uploads/… and 668 more`,
  and `emporium: 41 engine route(s), 1 bundle cms or payload synchronously`.
- **Clean a5fb2e9** (the plant removed, `.next` deleted, rebuilt): the build exits 0 with no
  warn/error line, and the scan **exits 0**: `emporium: 41 engine route(s), 0 bundle cms or payload
  synchronously; 132/132 chunk load(s) had a .map`, and the same for the gallery. CI's own scan
  step passed in run 36818480466.

### 5.2.e — new findings, as proposed subtasks

| # | Sev | Proposed subtask (owner) | Reproduction |
| --- | --- | --- | --- |
| N1 | Low | **5.1 / `scripts/ops` (HAR, devops)**: the CloudPanel vhost adds its own `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `X-Permitted-Cross-Domain-Policies` and `Referrer-Policy: same-origin` to every answer. Wherever the app sets one too, it goes out twice. Have the provision script drop those `add_header` lines, so the app's own headers (ARCHITECTURE.md §13) are the only ones | `curl -sD- -o/dev/null https://old-east-indies.gaiada.com/api/health` → both `X-Content-Type-Options: nosniff` and `x-content-type-options: nosniff`. The smoke's `the brand files … are served with their type and caching` fails on staging with `Received: "nosniff, nosniff"` |
| N2 | Low | **HAR (owner of `tests/e2e/smoke/`)**: the smoke's health case pins `environment: 'local'` (smoke.spec.ts:150), so the smoke cannot be pointed at staging. Read the expected environment from an `E2E_EXPECT_ENVIRONMENT`, default `local` | `E2E_GALLERY_URL=https://indies-gallery.gaiada.com npx playwright test --project=ig-desktop` → `Expected: "local" Received: "staging"` |
| N3 | Low | **HAR (route parity)**: a non-literal matcher passes `pnpm verify`, and only `next build` refuses it. Route parity imports `proxy.ts` and compares the value (`readProxyMatcher`). Have it also check statically that `config.matcher` is an array of string literals, so the failure lands in verify with the file named (TASKS.md 5.2.c lists the plant as a route-parity case) | the `const MATCHER` and `matcher: PROXY_MATCHER` plants above: `check:routes` ok, ESLint clean, `pnpm build` exit 1 |
| N4 | Cosmetic | **23.x (admin shell)**: Payload's localizer paints `Locale: undefined` for about 1–2 s after sign-in, then `English` | sign in on either staging admin; `.localizer-button__current-label` reads `undefined` at first paint and `English` 2 s later (390 and 1280, both sites) |

Not filed:

- 5.1's doc lists the RustFS console on 4033, but nothing listens there (`ss -ltnp`). It is
  loopback-only either way.
- Staging serves 7a5b20f's tree, older than main. No storefront change is missing.
- L3 (the spike doc's stale lines) and L4/L5 from the first run stand as recorded.

## Verdict

**5.2: PASS. 5.5: PASS.** Every Done-when clause of phases 1–5 is evidenced, and none is failing.
Phases 1–4 were proven on 3914a0a in the first run; a5fb2e9 holds them, with `pnpm verify` green
and CI's static, Lighthouse and e2e jobs green. The open items, N1–N4, F6 and L3, are filed and
none fails a clause.

| Phase | Clause | |
| --- | --- | --- |
| 1 | a fresh clone runs `pnpm install && pnpm verify` green | ✅ fresh worktree of a5fb2e9, verify exit 0, 1322 passed |
| 1 | every contract compiles, `@contract`, owner, signed off | ✅ first run; typecheck in verify |
| 1 | `pnpm worktree` gives its own branch, port, suffix | ✅ first run; `worktree:env 5 QAG2` → 4258, `p5_qag2` |
| 2 | `pnpm db:fresh` makes a brand database with `unaccent` and `pg_trgm` | ✅ first run; this run's databases: `plpgsql,unaccent,pg_trgm` |
| 2 | every gate fails on a planted violation and passes once removed | ✅ both runs' 5.2.c (the matcher through `next build`, N3) |
| 2 | a push to `main` runs CI green | ✅ 36818480466 on a5fb2e9 |
| 2 | a push to `production` runs the release workflow | ✅ Release 36816388257 on 1eddcaf |
| 3 | each brand's config loads, and a broken one is refused with the field named | ✅ first run; `check:brands` ok ×4 here |
| 3 | `bootCheck()` refuses a missing secret | ✅ first run |
| 3 | `/admin` logs in against two databases with equal schema hashes | ✅ first run (4 databases, `e9f18428…c8c4`); this run's ig and oei databases have the same hash |
| 4 | both apps serve their brand and `test` in EN and ID, Payload at `/admin`, `/api/health` green, route parity | ✅ first run; CI e2e 95 passed; route parity ok |
| 4 | the spike's verdict in ARCHITECTURE.md §9 | ✅ (L3 doc lines) |
| 4 | the client-safe gate in `pnpm verify` | ✅ |
| 5 | `pnpm dev --brand` × 2: differently branded shells, EN and ID, two databases | ✅ `dev-drive.json` |
| 5 | `/admin` logs in on both | ✅ staging `staging-*-admin-dashboard-*.png` |
| 5 | `test` runs on both apps | ✅ CI e2e |
| 5 | the Cache Components verdict recorded | ✅ |
| 5 | every gate fails on a planted violation | ✅ |
| 5 | both staging hostnames serve a CI-built release | ✅ `1eddcaf` in `current`, Release 36816388257, DEPLOY OK ×2, health ok |
| 5.5.f | each missed form planted and failing with the file named; the bundle scan fails on `react-server` and passes clean; `pnpm verify` green | ✅ |
