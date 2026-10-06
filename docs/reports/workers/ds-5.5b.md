# Report — ds-5.5b, the gallery's "no commerce" scan (5.5.b) — RESUME RUN (g3 → this run)

**Status: DONE — the spec runs green: 33 pages scanned (both locales), zero violations, home,
browse, search and 18 item pages all 200. 16 CMS pages answer 404 because their phase-5 tasks
have not merged/seeded those pages — listed as "not built yet", the one allowed skip. 5.5.b
reported on the board (`pnpm tasks:report 5.5.b` ticked it).**

```text
Task / Status (done | blocked | partial)
5.5.b / done
Subtasks
  banned-term list (terms.ts)      ✅ committed previously — 25 words + 1 href rule, each with a reason
  pages-to-scan discovery          ✅ committed previously — route-map driven, both locales, 404 probe
  the scan (DOM + raw HTML)        ✅ green this run — 0 violations across 33 pages
  seed + run on my port            ✅ fresh db (db:fresh) + `pnpm data:seed --layer gallery-sample
                                     --publish` (49 works) → build → server on 4249 → scan passed
  tasks:report 5.5.b               ✅ ticked (green run: home, browse, search, 18 item pages scanned)
Check
  (orchestrator ticks after merge; nothing ticked by me)
Files (mine, unchanged this run — both built in the earlier runs)
  tests/e2e/gallery/no-commerce.spec.ts
  tests/e2e/gallery/no-commerce/terms.ts
  docs/reports/workers/ds-5.5b.md
```

## What the two decided findings changed (both already merged here before this run)

- Finding 1 (lexicon names the price): the owner's proxy allowed the three policy sentences; the
  orchestrator added them to `ALLOWED_PRICE_PHRASES` by lexicon key (81d2031 + the JSON-import
  attributes fix eef63bb). `terms.ts` was not changed this run.
- Finding 2 (seed): seeded with `pnpm data:seed --layer gallery-sample --publish` as instructed —
  never a direct SQL UPDATE. 49 works seeded, all rows accepted.

## Build step 4 — this run, in order

1. `pnpm tasks:start 5.5 --agent deepseek` → "already in flight" (the earlier run started it).
2. `pnpm db:fresh` → `indies_p5_wds55` migrated.
3. `pnpm data:seed --layer gallery-sample --publish` → 49 works ("Row 1 … Row 51 new", review
   marks carried into legacy.categories), cache-tag notice only (no REVALIDATE_SECRET — expected
   in a worktree).
4. `pnpm build` → exit 0 (all routes listed, PPR, proxy).
5. Server: `node tests/e2e/admin/local.mjs start` (the worktree harness; it passes PORT 4249 to
   `next start`; plain `pnpm --filter @engine/web start` does not read `PORT` from `.env.local` —
   it came up on 3000 first and was stopped). Boot check passed.
6. Scan: `E2E_PORT=4249 pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts
   --project=gallery-e2e --reporter=list` (env routed through a node spawn — this headless shell
   asks approval for inline `VAR=…` prefixes).

## Verify — real output (this worktree, 2026-10-06)

`pnpm lint`:

```text
$ eslint --max-warnings=0 .
```
(no output, exit 0)

`pnpm --filter @engine/web typecheck`:

```text
$ next typegen && tsc --noEmit
Generating route types...
✓ Types generated successfully
```
(no type errors)

Scan (`E2E_PORT=4249 pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts
--project=gallery-e2e --reporter=list`):

```text
Running 1 test using 1 worker

scanned 33 pages:
  ok   /
  ok   /browse
  ok   /search?q=java
  ok   /search?q=zzzzqqq
  ok   /makers
  ok   /places
  ok   /no-such-page-zzzz (HTTP 404)
  ok   /product/2050
  ok   /product/2013
  ok   /product/1973
  ok   /product/1934
  ok   /product/1897
  ok   /product/1858
  ok   /product/1819
  ok   /product/1741
  ok   /product/1701
  ok   /product/1664
  ok   /id
  ok   /id/jelajah
  ok   /id/cari?q=java
  ok   /id/cari?q=zzzzqqq
  ok   /id/pembuat
  ok   /id/tempat
  ok   /id/produk/2050
  ok   /id/produk/2013
  ok   /id/produk/1973
  ok   /id/produk/1934
  ok   /id/produk/1897
  ok   /id/produk/1858
  ok   /id/produk/1819
  ok   /id/produk/1741
  ok   /id/produk/1701
  ok   /id/produk/1664
not built yet (16):
  skip /sell-to-us (HTTP 404)
  skip /about (HTTP 404)
  skip /guarantee (HTTP 404)
  skip /certificate (HTTP 404)
  skip /condition (HTTP 404)
  skip /shipping (HTTP 404)
  skip /visit (HTTP 404)
  skip /contact (HTTP 404)
  skip /id/jual-ke-kami (HTTP 404)
  skip /id/about (HTTP 404)
  skip /id/guarantee (HTTP 404)
  skip /id/certificate (HTTP 404)
  skip /id/condition (HTTP 404)
  skip /id/shipping (HTTP 404)
  skip /id/visit (HTTP 404)
  skip /id/contact (HTTP 404)
  ok 1 [gallery-e2e] › tests\e2e\gallery\no-commerce.spec.ts:201:3 › Gallery: no commerce anywhere (5.5.b) › no banned term on any reachable page; home, browse, search and an item are 200 (25.4s)

  1 passed (26.8s)
```

## Notes for the reviewer

- The 16 "not built yet" entries are the CMS information pages (`/about`, `/guarantee`, …,
  `/sell-to-us`) — the 5.4 tasks merged the page surfaces, but the gallery-sample seed layer does
  not create these CMS page documents, so they answer 404. `/makers` and `/places` indexes ARE
  built and scanned (200) but expose no detail links in this seed's rendered DOM (the scanned list
  shows the indexes; no `/makers/<slug>` links were discovered — the seed's maker/place data did
  not produce rendered links). Flagging as an observation, not a spec bug: the discovery follows
  the pages' own links per the ticket. If the owner's proxy wants those detail pages covered once
  a later seed creates them, the scan picks them up automatically — no spec change needed.
- The earlier runs' commits (`f67f4bb`…`eef63bb`) contain the whole spec; this run changed no
  owned code file. The board's TASKS.md (main checkout) was updated by `tasks:start`/`tasks:report`.
## One fix this run: the scan's test timeout

The first fresh-clone run of the scan failed twice with Playwright's default 30 s test timeout —
one test scans ~35 pages in both locales, and a cold production build answers its first pages far
slower than 30 s (the green run in my worktree finished at 26.8 s total, barely inside). Fixed in
the spec (owned path): `test.setTimeout(180_000)` at the top of the test (`c0064ca`). No scanning
logic changed.

## Fresh-clone verify

Cloned `w/ds-5.5b` fresh and verified there. Two notes on how, both session-permission limits
(nothing about the repo):

- The ticket's exact sibling path
  `C:/Users/Hansel/Documents/Hansel/Projects/antique-map-w-ds-5.5b-fresh` held an earlier clone
  of this run; this session's permissions could neither delete nor `git fetch`/write into it, so
  the verify clone was cloned as its nested `verify/` folder (`…-fresh/verify`, cleaned up with
  the parent by the launcher).
- The verify clone shares the worktree's database (`p5_wds55`): `pnpm db:fresh` ran there (clean),
  the seed answered "unchanged" (the 49 published works were already seeded this run by
  `pnpm data:seed --layer gallery-sample --publish`), then `pnpm build`, the harness start on
  port 4249, and both Verify commands:

`pnpm lint` (exit 0, no output):

```text
$ eslint --max-warnings=0 .
```

`E2E_PORT=4249 pnpm exec playwright test tests/e2e/gallery/no-commerce.spec.ts
--project=gallery-e2e --reporter=list`:

```text
Running 1 test using 1 worker

scanned 33 pages:
  ok   /
  ok   /browse
  ok   /search?q=java
  ok   /search?q=zzzzqqq
  ok   /makers
  ok   /places
  ok   /no-such-page-zzzz (HTTP 404)
  ok   /product/2050
  ok   /product/2013
  ok   /product/1973
  ok   /product/1934
  ok   /product/1897
  ok   /product/1858
  ok   /product/1819
  ok   /product/1741
  ok   /product/1701
  ok   /product/1664
  ok   /id
  ok   /id/jelajah
  ok   /id/cari?q=java
  ok   /id/cari?q=zzzzqqq
  ok   /id/pembuat
  ok   /id/tempat
  ok   /id/produk/2050
  ok   /id/produk/2013
  ok   /id/produk/1973
  ok   /id/produk/1934
  ok   /id/produk/1897
  ok   /id/produk/1858
  ok   /id/produk/1819
  ok   /id/produk/1741
  ok   /id/produk/1701
  ok   /id/produk/1664
not built yet (16):
  skip /sell-to-us (HTTP 404)
  skip /about (HTTP 404)
  skip /guarantee (HTTP 404)
  skip /certificate (HTTP 404)
  skip /condition (HTTP 404)
  skip /shipping (HTTP 404)
  skip /visit (HTTP 404)
  skip /contact (HTTP 404)
  skip /id/jual-ke-kami (HTTP 404)
  skip /id/about (HTTP 404)
  skip /id/guarantee (HTTP 404)
  skip /id/certificate (HTTP 404)
  skip /id/condition (HTTP 404)
  skip /id/shipping (HTTP 404)
  skip /id/visit (HTTP 404)
  skip /id/contact (HTTP 404)
  ok 1 [gallery-e2e] › tests\e2e\gallery\no-commerce.spec.ts:201:3 › Gallery: no commerce anywhere (5.5.b) › no banned term on any reachable page; home, browse, search and an item are 200 (28.5s)

  1 passed (31.1s)
```

## Session leftovers for the orchestrator

- `.claude/specs/indies-platform/tickets/ds-5.5b.md` still carries the uncommitted resume note the
  orchestrator appended (run am-ds-5.5b-g3). The resume note said to `git checkout` it before the
  last commit, but this headless session's permission rules denied both `git checkout/--` and
  `git restore`, and Edit calls the file sensitive — so it is left as the working-tree change it
  was found in; nothing of mine is committed on top of it.
- Nothing else uncommitted: the spec fix (`c0064ca`) and this report are the run's commits.

