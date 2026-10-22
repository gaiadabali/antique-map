# Ticket 6qa — Evidence for phase 6's Checks 6.1.c, 6.2.d and 6.3.d

**Lane:** haiku (the user's Claude login; Opus reviews before merge) · **Agent type:** `qa` · **Branch:** `w/6qa` (cut from `main`, already checked out)
**Report:** `docs/reports/workers/6qa.md` · **Goal:** the code for 6.1, 6.2 and 6.3.b/c is merged; only the evidence is missing. Run it, write it down, fix only small test gaps, and leave the orchestrator one command per Check.

## Read first
`AGENTS.md`, `.claude/worker-rules.md`, TASKS.md tasks 6.1, 6.2 and 6.3 (the exact **Check** wording is your acceptance list), `docs/gates/phase-4.md` (copy its layout and its local production-build recipe).

## Owned paths
`docs/gates/phase-6-checks.md` (new), screenshots under `docs/gates/phase-6/`, `tests/e2e/shop/product.spec.ts` (new). You may also add tests, **never** weaken or edit existing assertions, in `engine/packages/cms/src/shop/pricing/*.test.ts` and `engine/packages/cms/src/shop/orders/*.db.test.ts`. Changes to any product code: **stop and report it as a finding** with file:line. Do not fix it.

## Do
1. Setup: run `pnpm worktree:env 6 w6qa` and `pnpm db:fresh`. Seed with the shop mock seed (3.7.c files through the 3.7.a importer CLI; see `docs/gates/phase-4.md` for the exact commands). Make one seeded product have **zero stock in every store** (Local API or SQL on *your* database only). Then `pnpm build && pnpm --filter @engine/web start` on your port, and reach the shop as `shop.localhost:$PORT`.
2. **6.1.c**: write `tests/e2e/shop/product.spec.ts`. At 390 px a seeded product with variants loads, the variant picker changes the variant and its price, and Add to bag works. The zero-stock product shows "Out of stock" and has no working add button (assert it is disabled or absent, and that a forced POST of the add action leaves the bag empty). Axe is clean on both pages at 390 and 1280 px. Save screenshots.
3. **6.2.d**: map each clause of the Check to an existing named test, with file:line and the test name. The clauses are: tampered price or quantity ignored; totals match hand-computed cases to the rupiah; free delivery exactly at the threshold; expired or unknown code refused with a plain message. Look in `engine/packages/cms/src/shop/pricing/` (`quote.tamper.test.ts`, `quote.test.ts`, `delivery.test.ts`, `discount.test.ts`). Run them. If a clause has no test, add one.
4. **6.3.d**: the tests already exist on `main`: `orders/stock.db.test.ts` "20 concurrent orders for the last unit: exactly one succeeds" and `orders/pick-store.db.test.ts` (Ubud, unfillable basket, outside Indonesia). Run them three times in a row with `CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm vitest run --maxWorkers=2 engine/packages/cms/src/shop/orders` and paste each run's summary. Then plant the bug: remove `quantity >= ` in the decrement SQL locally. Show the concurrency test failing, restore the file (`git checkout -- <file>`), and show `git status` clean for that file. Map each Check clause to file:line.
5. Write `docs/gates/phase-6-checks.md` with, per Check, the clause → evidence (test name, file:line, command output excerpt, screenshot path) → PASS/FAIL. Commit it with the spec and screenshots.
6. **Never** run `tasks:tick` or `tasks:report` for a Check. End the report with the exact `pnpm tasks:tick <id>` lines the orchestrator should run for each PASS.

## Verify (paste output)
```bash
pnpm vitest run engine/packages/cms/src/shop/pricing
CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm vitest run --maxWorkers=2 engine/packages/cms/src/shop/orders
pnpm build
pnpm exec playwright test tests/e2e/shop/product.spec.ts
pnpm verify
```
Plus the fresh-clone re-run the launcher requires.
