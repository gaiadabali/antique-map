# Foundation gate (TASKS.md 5.2) — the local half

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

## Pending

- **pending 5.1**: https://indies-gallery.gaiada.com and https://old-east-indies.gaiada.com
  serving a CI-built release, and the staging screenshots. (At 3914a0a the brand configs still
  say `ig.gaiada.com`/`oei.gaiada.com`; 1adabf7 renamed them.)
- **pending 5.4's gate**: the four 5.4-owned plants above.
- **5.2.f** is not met while F1 (and F2, F3, F4) stay open.
