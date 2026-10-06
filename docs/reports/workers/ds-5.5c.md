# Report — ds-5.5c: the gallery's Lighthouse runner (local half)

Ticket `.claude/specs/indies-platform/tickets/ds-5.5c.md` · lane deepseek (via glmteam) · branch `w/ds-5.5c`.
5.5.c/5.5.d are only ticked on staging (the orchestrator's later run); this is the runner plus one local
evidence run, worktree `wds5c` (PORT 4255, DB_SUFFIX p5_wds5c).

## What's built

- `tests/e2e/gallery/lighthouse/run.mjs` — calls the `lighthouse` CLI directly (not `lhci collect`, which
  crashes on this Windows host — `docs/gates/shop-payment.md` Finding 2), `--runs 3` per page, mobile
  emulation, reads each JSON, takes the median performance score and the worst-run accessibility score,
  checks LCP/CLS/TBT/script bytes against `lighthouserc.web.json`, prints a Markdown table, exits 1 on any
  budget miss. Committed in run 1 (1582260, 6beb36d, 4fe2e4a); unchanged this run.
- `tests/e2e/gallery/lighthouse/README.md` — how to run it locally and against staging, and the `EPERM` note.

## Local run — setup

- `pnpm worktree:env 5 wds5c` (PORT=4255, DB_SUFFIX=p5_wds5c, already set from a prior run).
- `pnpm db:fresh` — migrated `indies_p5_wds5c`.
- `pnpm --filter @engine/cms run seed --layer gallery-sample --publish` **crashed every row** — `Row N
  rejected — 'after' was called outside a request scope` (Next's `after()`, called by the works collection's
  `invalidateWorkOnChange` hook — `engine/packages/cms/src/hooks/work-invalidate.ts` — which only has an
  outside-a-request path when the caller puts a collector on `req.context`; the seed importer does not). This
  is app code outside this ticket's owned paths (`tests/e2e/gallery/lighthouse/**`,
  `docs/reports/workers/ds-5.5c/**` only) — not fixed here, reported as a blocker below.
  - Workaround, same precedent as the shop seed (`docs/gates/shop-payment.md` §Setup, phase-4/phase-6, F5):
    seeded without `--publish` (works land as drafts, no status transition, no crash — 42 of the 50 sample
    rows were already published from an earlier partial run in this worktree's database; the remaining 8
    updated cleanly as drafts), then published the 8 directly: `UPDATE works SET _status='published' WHERE
    _status='draft';` (bypasses the hook entirely, same as the shop's direct `UPDATE products …`). 50/50
    works published.
- `pnpm build` — clean production build.
- `node .next/standalone/engine/apps/web/server.js`, `PORT=4255 GALLERY_HOSTS=gallery.localhost
  SHOP_HOSTS=shop.localhost LOCAL_PRODUCTION_BUILD=1`, after copying `.next/static` and `public/` into the
  standalone tree (`next start` warns `"next start" does not work with "output: standalone"` and serves an
  empty shell — same gap the shop gate hit). Boot check additionally needed `DATABASE_URL` and
  `PAYLOAD_SECRET` in this worktree's `.env.local` (worktree:env does not write them); added
  `DATABASE_URL=postgres://postgres:postgres@localhost:5432/indies_p5_wds5c` and
  `PAYLOAD_SECRET=dev-only-not-a-secret` (the convention already used across this repo's boot-check tests).
  Confirmed up: `/` → 200, `/browse` → 200 (Host header `gallery.localhost:4255`).
- Item page: `/browse`'s own links are `/product/<id>` (e.g. `/product/2050`), which answers **404** — the
  item page is not on main yet, so only `/` and `/browse` were run, per the ticket's fallback.

## The table (this worktree, release = working tree at HEAD)

| Page | Perf (median) | A11y | LCP ms | CLS | TBT ms | Script KB | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / | 98 | 100 | 2320 | 0.000 | 71 | 142 | PASS |
| /browse | 92 | 100 | 3329 | 0.000 | 75 | 240 | FAIL |

budgets: LCP ≤ 2500 ms, CLS ≤ 0.05, TBT ≤ 200 ms, script ≤ 150 KB; performance ≥ 90, accessibility 100 every
run. Raw JSON (3 runs × 2 pages) under `docs/reports/workers/ds-5.5c/`.

`/browse` passes the Check's own numbers (perf 92 ≥ 90, a11y 100) but misses two of the numeric budgets: LCP
3329 ms (budget 2500) and script 240 KB (budget 150 KB). Top three opportunities/diagnostics from the raw
JSON, consistent across all 3 runs:

1. **`unused-javascript`** (Reduce unused JavaScript) — ~440–460 ms, ~104–106 KB potential savings.
2. **`legacy-javascript`** (Avoid serving legacy JavaScript to modern browsers) — ~0–150 ms, ~13.7 KB.
3. **`render-blocking-resources`** (Eliminate render-blocking resources) — ~60–175 ms.

No app code was changed to chase this — out of this ticket's owned paths, and 5.5.c/d are only ticked on the
staging run.

## Blocker to report (not fixed here)

`engine/packages/cms/src/hooks/work-invalidate.ts`'s `invalidateWorkOnChange`/`invalidateWorkOnDelete` call
`invalidate(tags, context)`, whose outside-a-request path (ARCHITECTURE.md §9/§15: "outside one — a job, an
import, a seed — a collector on `req.context` gathers the tags") depends on the caller setting that collector.
`engine/packages/cms/src/seed/run.ts` (via `engine/packages/cms/src/import/apply.ts`) does not set one, so any
seed or import that **changes** a work's published status (not just a publish-only `UPDATE`) throws `after()
was called outside a request scope` and rolls back the whole file's transaction. This blocked
`--layer gallery-sample --publish` outright. Someone who owns `engine/packages/cms/src/{seed,import}/**`
should wire the collector (or pass `req.context` through the importer) so seeding published gallery content
doesn't need the direct-SQL workaround.

## Verify

```
$ pnpm lint
$ eslint --max-warnings=0 .
(clean, no output)

$ node tests/e2e/gallery/lighthouse/run.mjs --base http://gallery.localhost:4255 --out docs/reports/workers/ds-5.5c / /browse
| Page | Perf (median) | A11y | LCP ms | CLS | TBT ms | Script KB | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| / | 98 | 100 | 2320 | 0.000 | 71 | 142 | PASS |
| /browse | 92 | 100 | 3329 | 0.000 | 75 | 240 | FAIL |

budgets: LCP ≤ 2500 ms, CLS ≤ 0.05, TBT ≤ 200 ms, script ≤ 150 KB; performance ≥ 90, accessibility 100 every run.
(exit code 1 — /browse misses LCP and script budgets, expected per above)
```

Both commands above ran in this worktree (not the fresh clone — see below).

### Fresh-clone verify (`…-fresh`, `git clone -b w/ds-5.5c`, `pnpm install --frozen-lockfile`, `pnpm worktree:env 5 wds5cfresh`)

```
$ pnpm lint
$ eslint --max-warnings=0 .
(clean, no output — the runner and README have no fresh-clone-only dependency)

$ pnpm db:fresh
[db] fresh indies_p5_wds5cfresh
[db] migrate indies_p5_wds5cfresh: … Migrated: 20261002_073156_initial, 20261002_200042_indies_wave_3_1,
     20261005_033710_indies_9_4b
[db] indies_p5_wds5cfresh ready
```

`pnpm build` then failed on a **freshly installed** `node_modules`, reproducibly (3 tries): Turbopack cannot
resolve `next/font/google`'s generated CSS module for `Cormorant Garamond` —
`Error: Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font' … next/font/google
queries have exactly one entry` — even though `curl -sv https://fonts.googleapis.com/css2?…` from the same
shell gets a real `200`, so it is not a network block. This worktree's own `engine/apps/web/.next/cache/
turbopack/**` (gitignored, 30+ `.sst`/`.meta` files) is **not in the fresh clone**, and the font-module build
succeeds here only because that cache is reused rather than recomputed — so a build from a genuinely empty
cache hits this Turbopack/font bug every time. This is a pre-existing build-pipeline issue, not something
introduced by this ticket's files (`tests/e2e/gallery/lighthouse/**`, `docs/reports/workers/ds-5.5c/**` only) —
reported here as a finding for whoever owns `engine/apps/web`'s Next config / font setup, not fixed here.
Because of it, the runner could not be re-run end to end against a fresh-clone build; the page-level evidence
above is from this worktree's own build, run twice (this run and the resumed run before it) with consistent
numbers.

The runner, README and local evidence run are done and committed. `/browse`'s numeric-budget miss is reported
with its top opportunities per the ticket's own instruction (step 4) — not a reason to block, since 5.5.c/d
are only ticked on the staging run. Two findings are reported for other owners, not fixed here (out of this
ticket's owned paths): the seed-hook bug (`engine/packages/cms/src/{seed,import}/**`) and the Turbopack/font
fresh-build failure (`engine/apps/web`'s Next config).

## Orchestrator note (merge)
Trimmed before the merge: the run helpers (`assemble.mjs`, `poll-pg.mjs`, `start-server.mjs`) were local scaffolding outside the ticket's owned code paths and are not kept; of the three raw Lighthouse JSON files per page only run 1 is kept (`home-1.json`, `browse-1.json`) — the table above is the runner's median over all three runs. The seed's direct `UPDATE … _status='published'` workaround described above is obsolete: the seed bug is fixed on main (`pnpm data:seed --layer gallery-sample --publish`). `/browse` misses the LCP (3.3 s vs 2.5 s) and script (240 KB vs 150 KB) budgets — open for 5.5.c on staging. The item page was not measured (not on main at run time).
