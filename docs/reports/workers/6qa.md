# 6qa — Evidence for phase 6's Checks 6.1.c, 6.2.d and 6.3.d

Continuation chain: `6qa` (haiku, fabricated) → `6qa-r1` (rejected before completion, seat limit) → `6qa-r2`
(this run, sonnet). Branch `w/6qa`. Full evidence, per-clause mapping and findings are in
`docs/gates/phase-6-checks.md` — this report is the WORKFLOW.md §5 summary.

## Task / Status

**partial** — 6.2.d and 6.3.d PASS with executed evidence; 6.1.c FAILS on one real clause ("Add to bag works"),
which is a genuine gap in merged product code (Finding 1), not a test problem. Per `tickets/6qa.md` rule 6, "a
verdict is PASS only with executed evidence," and a false claim is worse than an honest FAIL.

## Subtasks

This ticket evidences existing Checks; it owns no new subtask beyond the Checks themselves (never reported or
ticked here, per `tickets/6qa.md` step 6 and `tickets/6qa-r1.md`'s Verify section).

## Check

- ❌ **6.1.c** — Product page at 390 px, variant picker, out-of-stock path, axe clean at 390/1280 px.
  `tests/e2e/shop/product.spec.ts` (rewritten in full), 5/5 passing twice in a row
  (`E2E_PORT=4282 pnpm exec playwright test --project shop-e2e --workers=1`), screenshots in
  `docs/gates/phase-6/`. Every clause passes except **"Add to bag works"**: the product page's button still posts
  to the 6.1.b placeholder action, never 6.2's real bag — see Finding 1. Full clause table in
  `docs/gates/phase-6-checks.md` §6.1.c.
- ✅ **6.2.d** — Pricing: tampered price/quantity ignored, totals to the rupiah, free delivery at threshold,
  expired/unknown code refused. `pnpm vitest run engine/packages/cms/src/shop/pricing` — 77/77 pass. Every clause
  mapped to a real `it(...)` name and file:line in `docs/gates/phase-6-checks.md` §6.2.d (the 6qa-r1 rejection's
  point 4 — the prior mapping invented names and lines).
- ✅ **6.3.d** — Stock atomicity (20 concurrent orders, exactly one succeeds), pick-store (Ubud, unfillable basket,
  outside Indonesia). Ran the orders db-test suite three times in a row (9/9, 9/9, 9/9-with-a-teardown-ECONNRESET);
  the concurrency invariant held in every run that completed. Planted the bug (`quantity >=` removed from
  `order-sql.ts:56`), reproduced the exact failure the Check describes (both `stock.db.test.ts` tests fail, one
  via the application guard, one via the `stock_levels_quantity_non_negative` CHECK constraint), restored the
  file, confirmed `git status --porcelain` is clean for it. Full detail and the three runs' output in
  `docs/gates/phase-6-checks.md` §6.3.d (the 6qa-r1 rejection's point 5).

## Files

- `tests/e2e/shop/product.spec.ts` — rewritten in full (was the Haiku-run version unchanged by the `6qa-r2` setup
  run that preceded this one: conditional assertions, invented `data-testid`s, an invented `/api/x/bag/add` route,
  `axe-playwright` which isn't installed, never run against data).
- `docs/gates/phase-6-checks.md` — rewritten in full with real test names, lines, command output and screenshots
  for all three Checks, and the Findings below.
- `docs/gates/phase-6/*.png` — the four screenshots `tests/e2e/shop/product.spec.ts` captures
  (`PHASE6_SHOTS=docs/gates/phase-6`).
- `docs/reports/workers/6qa.md` — this report.
- `playwright.config.ts` — unchanged this run; the `shop-e2e` project was already added and committed by the prior
  `6qa-r2` setup run (`d74b551`, shared with 6.5).
- Deleted: `seed-out.txt`, `seed-out2.txt` (the prior run's untracked seed-command output, per this ticket's
  instruction).

No product code was changed. `engine/packages/cms/src/shop/orders/order-sql.ts` was edited for the planted-bug
demonstration and restored byte-for-byte in the same step (see 6.3.d above); `git status --porcelain` on it is
clean in every commit.

## Found

- **`engine/apps/web/src/sites/shop/product/actions.ts`** (6.1.b's placeholder) is still what the product page's
  "Add to bag" posts to; it was never rewired onto 6.2's real bag action
  (`engine/apps/web/src/server/shop/bag/actions.ts`). Reported with file:line in
  `docs/gates/phase-6-checks.md` Finding 1 — not fixed here, per `tickets/6qa.md`'s owned paths.
- **`BAG_COOKIE_KEY` is required (`engine/packages/cms/src/shop/pricing/bag.ts`) but missing from
  `.env.example`.** Every page that reads the bag 500s without it. Finding 3 in the gate doc; added only to this
  worktree's two gitignored `.env.local` files to run the suite, not to `.env.example` (outside owned paths).
- **No seeded product's variants carry different prices**, so `6.1.c`'s "changes the variant and its price" clause
  has no real data to prove itself against as seeded. Finding 5 in the gate doc; one variant's price was raised by
  SQL on this worktree's own database only to demonstrate the real behaviour.
- **This host's Postgres container drops connections under concurrent load** (ECONNRESET on `DROP DATABASE`
  teardown, a tight 5 000 ms test default being hit, a flaky concurrency diagnostic) when the production server
  and the db-test suite, or 5 Playwright workers, run against it together. Finding 2 in the gate doc; not a
  stock-safety bug.
- **The seed's inventory import is order-dependent** (`--publish` rejects every product for missing images before
  `stock.csv` can even be read, since no product has one): already known as F5 in `docs/gates/phase-4.md`; not
  re-opened here.

## Follow-ups

- Rewire the product page's "Add to bag" onto `setBagLineQtyAction` (SHP lane) — closes 6.1.c's last clause.
- Add `BAG_COOKIE_KEY` to `.env.example` (OPS/DOC lane).
- A product fixture with two differently-priced variants, so 6.1.c's data precondition needs no per-run SQL patch.

## For the orchestrator

```bash
pnpm tasks:tick 6.2.d 6.3.d
```

**Do not tick 6.1.c.** It stays open until the product page's Add to bag is rewired onto the real bag action and
`tests/e2e/shop/product.spec.ts`'s third test (currently proving the failure) is updated to prove success instead.
