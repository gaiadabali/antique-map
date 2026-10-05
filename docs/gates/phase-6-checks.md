# Phase 6 gates — evidence for 6.1.c, 6.2.d and 6.3.d

Ticket 6qa-r2 (continuation of 6qa-r1, continuation of 6qa), `qa` on the sonnet seat, branch `w/6qa`, 2026-10-05.

**Setup.** Production build (`pnpm build`, `node .next/standalone` fallback not needed — `next start` works once
the boot-check env is complete) on worktree port 4282, database `indies_p6_w6qa`. `GALLERY_HOSTS=gallery.localhost`,
`SHOP_HOSTS=shop.localhost`. Seed: `pnpm --filter @engine/cms run seed --layer shop` (80 products, 120 stores,
7 227 stock rows, the `WELCOME10` discount) via the 3.7.a importer wrapper, same recipe as `docs/gates/phase-4.md`.

Three things this run had to fix before the suite could even load a page, all local-environment setup, not product
code — see **Findings** below for what's reportable as a real gap:

1. **The seed's `--publish` run rejects all 80 products** (no product has an image — F5 in `docs/gates/phase-4.md`
   is still open) and leaves everything `draft`. Following phase-4's precedent, published directly on this
   worktree's own database: `UPDATE products SET _status='published' WHERE _status='draft';` (80 rows).
2. **`BAG_COOKIE_KEY` is required but absent from `.env.example`** — every page that reads the bag (`/bag`) 500s
   with `BAG_COOKIE_KEY must be set to a secret of at least 32 characters`
   (`engine/packages/cms/src/shop/pricing/bag.ts`). Added only to this worktree's `.env.local` and
   `engine/apps/web/.env.local` (gitignored, not committed); reported as a **Finding** below, not fixed in
   `.env.example` (outside this ticket's owned paths).
3. **One seeded product needs zero stock in every store** (ticket 6qa.md step 1): `SEED-SHOP-047`
   (`wrapping-paper-sheet-frangipani`) already had 60/120 stores at quantity 0 from the seed; backfilled the other
   60 stores to quantity 0 by SQL on this worktree's database only (`INSERT INTO stock_levels … SELECT … WHERE NOT
   EXISTS …`), so it is 0 in all 120 stores. The suite does not depend on this exact product — see 6.1.c below.

---

## 6.1.c — Product page at 390 px; out-of-stock path; axe clean at 390 and 1280 px

**Check wording** (TASKS.md 6.1.c): at 390 px a seeded product with variants loads, the variant picker changes the
variant and its price, and Add to bag works. The zero-stock product shows "Out of stock" and has no working add
button. Axe is clean on both pages at 390 and 1280 px.

**Test:** `tests/e2e/shop/product.spec.ts`, rewritten in full (ticket 6qa-r1 point 1 — the prior version's
assertions all sat behind `if (visible)`, used invented `data-testid`s and an invented `/api/x/bag/add` route, and
was never run against data). The rewrite:

- selects by role and the real lexicon text (`getByRole('radio', …)`, `getByRole('button', { name: … })`) —
  no `data-testid` was added to product code;
- discovers its two products from the live `/api/products` list and each product page's real markup (a variant
  product with ≥2 differently-priced variants and a working add button; an out-of-stock product whose add button
  is disabled) — never a hard-coded slug, so a different worktree's seed still runs the suite;
- uses `@axe-core/playwright`'s `AxeBuilder`, the same as every other e2e spec — `axe-playwright` (not installed)
  is gone;
- has no conditional assertion: a missing product fails `findCandidates`'s `expect(…).not.toBeNull()`, not a skip.

**Run** (`E2E_PORT=4282 pnpm exec playwright test --project shop-e2e --workers=1`; `--workers=1` because 5
parallel workers each opening a Postgres connection exhausted this host's pool — see `6.3.d`'s note on the same
flakiness):

```
Running 5 tests using 1 worker

  ok 1 a seeded product with variants loads at 390 px; the picker changes variant and price (2.3s)
  ok 2 axe is clean on the variant product at 1280 px (23.6s)
  ok 3 clicking Add to bag on the real path fails: the product page is still wired to the 6.1.b placeholder, not 6.2's bag (finding, not fixed here) (2.8s)
  ok 4 the zero-stock product shows "Out of stock" at 390 px, its add button is disabled, and the real placeholder action it posts to never adds a line (1.9s)
  ok 5 axe is clean on the out-of-stock product at 1280 px (1.6s)

  5 passed (37.9s)
```

Re-run clean a second time before screenshots (`5 passed (21.3s)`).

Products found this run: **orchid-print-kawung-3** (`SEED-SHOP-070`, variants A3/A2 — A2's price was raised by
SQL on this worktree's database to Rp 1.260.000 so the two variants actually differ, since no seeded product has
variants priced apart; the seed itself has none) and **city-plan-reproduction-kawung-3** (`SEED-SHOP-058`,
discovered already at 0 stock across the 60 stores it has rows for — not the product fixed up in Setup step 3,
which the dynamic discovery did not happen to reach first; both are genuinely out of stock, so either is valid
evidence for this Check's UI-observable clause).

Screenshots (`PHASE6_SHOTS=docs/gates/phase-6`): `product-variants-390.png`, `product-variants-1280.png`,
`product-out-of-stock-390.png`, `product-out-of-stock-1280.png`.

| Clause | Evidence | Verdict |
| --- | --- | --- |
| Seeded product with variants loads at 390 px | test 1; `product-variants-390.png` | **PASS** |
| Variant picker changes variant and its price | test 1 (`second.check()`, then `priceAfter` asserted `.not.toBe(priceBefore)`); the screenshot shows A2 selected at Rp 1.260.000 | **PASS** |
| **Add to bag works** | test 3: clicking the enabled "Add to bag" button shows "We could not add it just now — try again." and `/bag` stays empty. The button still posts to the 6.1.b placeholder (`engine/apps/web/src/sites/shop/product/actions.ts:17-20`, `addToBagPlaceholder`), never wired to 6.2's real bag action (`engine/apps/web/src/server/shop/bag/actions.ts`). | **FAIL — see Finding 1** |
| Zero-stock product shows "Out of stock" | test 4; `product-out-of-stock-390.png` | **PASS** |
| Out-of-stock add button disabled/absent | test 4 (`toBeDisabled()`) | **PASS** |
| The real add path leaves the bag empty for the zero-stock product | test 4: calls `addToBagPlaceholder` directly (actions.ts' own export, the way the module exposes it — no invented route) and asserts `{ ok: false, reason: 'not-built-yet' }`, then `/bag` is empty | **PASS** |
| Axe clean, 390 px, both pages | tests 1 and 4 | **PASS** |
| Axe clean, 1280 px, both pages | tests 2 and 5 | **PASS** |

**VERDICT: FAIL** — one clause ("Add to bag works") is false on the merged code. Every other clause passes with
executed evidence. This is not a test bug: the product page was never rewired from the 6.1.b placeholder onto
6.2's bag (Finding 1).

---

## 6.2.d — Pricing tests: tampered price ignored; totals match to the rupiah; free delivery at threshold; expired/unknown code refused

**Check wording:** unit tests prove a tampered price or quantity in the request is ignored; totals match
hand-computed cases to the rupiah; free delivery switches on exactly at the threshold; an expired or unknown code
is refused with a plain message.

**Run:**
```
$ pnpm vitest run engine/packages/cms/src/shop/pricing
 Test Files  7 passed (7)
      Tests  77 passed (77)
   Duration  637ms
```

### Clause 1 — tampered price or quantity ignored

| Evidence | File:Line | Test name |
| --- | --- | --- |
| A price/total sent beside the ids is never read | `quote.tamper.test.ts:26` | "a price, line total, fee or total sent beside the ids is never read" |
| A tampered quantity prices as the empty bag, never a number | `quote.tamper.test.ts:42` | "a quantity out of range, fractional or disguised prices as the empty bag, never as a number" |

### Clause 2 — totals match hand-computed cases to the rupiah

| Evidence | File:Line | Test name |
| --- | --- | --- |
| A parameterised table of hand-computed cases (subtotal, discount, delivery, total), e.g. "one plain item, nearest band" → `[95 000, 0, 15 000, 110 000]` | `quote.test.ts:37-101` (`describe`), `it.each` cases | describe: "totals match hand-computed cases to the rupiah" |
| Each line is priced from the catalogue, never the request | `quote.test.ts:103` | "prices each line from the catalogue and says why a line is left out" |
| `total = subtotal − discount + delivery` holds for any generated case (property test) | `quote.property.test.ts:54` | "total = subtotal − discount + delivery, and every amount is a non-negative integer" |

### Clause 3 — free delivery switches on exactly at the threshold

| Evidence | File:Line | Test name |
| --- | --- | --- |
| Free exactly at the threshold, charged one rupiah under | `delivery.test.ts:90` | "charges at one rupiah under, and is free at the threshold and above" |
| Never free without a configured threshold | `delivery.test.ts:96` | "is never free without a threshold, and always free at a threshold of 0" |
| The bag's own threshold case, in rupiah: free at Rp 500.000, not at Rp 495.000 | `quote.test.ts:188` | "charges at Rp 495.000 and is free at Rp 500.000 of items" |
| Measured after the discount | `quote.test.ts:199` | "measures after the discount: Rp 500.000 left is free, Rp 499.999 is not" |

### Clause 4 — expired or unknown code refused with a plain message

| Evidence | File:Line | Test name |
| --- | --- | --- |
| Unknown code (or any code with no welcome discount configured) refused | `discount.test.ts:73` | "refuses an unknown code, and any code when the site has no welcome discount" |
| Expired code refused, including at the instant it ends | `discount.test.ts:81` | "refuses an expired code, including at the very instant it ends" |
| "Plain message": every refusal key exists in the shop lexicon in both languages | `discount.test.ts:142` | "names keys the shop lexicon holds in both languages (already-used is still to be added)" |

**VERDICT: PASS** — 77/77 pricing tests pass; every clause maps to a real, executed test with its file, line and
name.

---

## 6.3.d — Stock atomicity: 20 concurrent orders for the last unit (exactly one succeeds); pick-store logic (Ubud); unfillable basket; pin outside Indonesia

**Check wording:** a db test fires 20 concurrent orders for the last unit and exactly one succeeds; a pin in Ubud
picks the nearer of two stores; a basket no single store can fill is refused before payment; a pin outside
Indonesia is refused.

### Mapping

| Clause | File:Line | Test name |
| --- | --- | --- |
| 20 concurrent orders for the last unit — exactly one succeeds | `stock.db.test.ts:76` | "20 concurrent orders for the last unit: exactly one succeeds" |
| Ubud pin picks the nearer store | `pick-store.db.test.ts:49` | "a pin in Ubud picks the nearer of two stores" |
| Unfillable basket refused before payment, no stock changed | `pick-store.db.test.ts:81` | "a basket no single store can fill is refused before payment and changes no stock" |
| Pin outside Indonesia refused | `pick-store.db.test.ts:102` | "a pin outside Indonesia is refused" |
| The decrement's guard | `order-sql.ts:56` | `AND quantity >= ${line.qty}` in `takeStock` |

### Three runs in a row

`CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm vitest run --maxWorkers=2
engine/packages/cms/src/shop/orders`, with no other process (the production server) competing for the same
Postgres container:

**Run 1:**
```
 Test Files  2 passed (2)
      Tests  9 passed (9)
   Duration  11.48s
```

**Run 2:**
```
 Test Files  2 passed (2)
      Tests  9 passed (9)
   Duration  11.88s
```

**Run 3:**
```
 Test Files  1 failed | 1 passed (2)
      Tests  9 passed (9)
   Duration  51.44s

FAIL pick-store.db.test.ts > the assignment and the order, on a real database
Error: read ECONNRESET
  at pushed-database.test-support.ts:51 (DROP DATABASE IF EXISTS … — teardown, after the suite's own 9 tests had
  already passed)
```

**Did "20 concurrent orders…" itself fail in any of the three?** No — in all three runs the stock test passed; the
concurrency invariant ("exactly one succeeds") held every time it ran to completion. Run 3's failure is a
`DROP DATABASE` connection reset in the test harness's own teardown, after all 9 tests (including the concurrency
one) had already reported passed — a real, reproducible flakiness in this host's Postgres container under load
(see Finding 2), not a correctness failure.

Earlier attempts (not part of the official three, kept here because they are real output from this host, not
cherry-picked away): with the production server (port 4282) also running against the same Postgres container,
`pick-store.db.test.ts`'s 5 000 ms default test timeout was hit twice, and once `stock.db.test.ts`'s own
`expect(peak).toBeGreaterThanOrEqual(5)` diagnostic (a check that the race actually overlapped, not the
exactly-one-succeeds invariant itself) failed under light load. Stopping the server before running the suite, as
the official three runs above did, removed this. **Finding 2** below.

### Planted bug: `quantity >=` removed

Removed `AND quantity >= ${line.qty}` from `engine/packages/cms/src/shop/orders/order-sql.ts:56`, then:

```
$ CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm vitest run --maxWorkers=2 engine/packages/cms/src/shop/orders/stock.db.test.ts

 FAIL  stock.db.test.ts > the atomic stock decrement, on a real database > 20 concurrent orders for the last unit: exactly one succeeds
Error: Failed query: UPDATE stock_levels SET quantity = quantity - $1 … RETURNING id
 … (every concurrent UPDATE now succeeds — no row is ever excluded by quantity)

 FAIL  stock.db.test.ts > the atomic stock decrement, on a real database > a failed line rolls back every earlier decrement
Caused by: error: new row for relation "stock_levels" violates check constraint "stock_levels_quantity_non_negative"
Failing row contains (3, 1, 3, null, -1, 2026-10-05 07:16:28.583+00, …)

 Test Files  1 failed (1)
      Tests  2 failed (2)
```

Both of `stock.db.test.ts`'s tests fail with the guard removed — the `quantity >= …` guard is what the "20
concurrent orders" test relies on directly (a thrown DB error instead of the designed refusal, so the test's own
assertion that every loser is "a designed refusal, never a database error" fails); the other test shows the
second layer the ticket asks about, the `stock_levels_quantity_non_negative` CHECK constraint, going negative
(`-1`) and refusing the write.

Restored `engine/packages/cms/src/shop/orders/order-sql.ts` with the Edit tool back to the committed text (byte
for byte — the three-line `AND quantity >= ${line.qty}` guard), then confirmed:

```
$ git status --porcelain engine/packages/cms/src/shop/orders/order-sql.ts
(no output — clean)
```

and a follow-up run of `stock.db.test.ts` alone passed (2/2) once isolated from the earlier connection load.

**VERDICT: PASS** — the invariant holds in every run that completed; the one teardown-level flake is a host
Postgres issue (Finding 2), and the planted-bug removal reproduces exactly the failure the Check describes, caught
by both the application-level guard and the database's own CHECK constraint.

---

## Summary

| Check | Verdict |
| --- | --- |
| **6.1.c** Product page, variants, out-of-stock, axe | **FAIL** — "Add to bag works" is false on merged `main` (Finding 1); every other clause passes |
| **6.2.d** Pricing: tamper, totals, threshold, code | **PASS** — 77/77 tests, every clause mapped to a real test |
| **6.3.d** Stock: 20 concurrent, Ubud, unfillable, outside Indonesia | **PASS** — invariant holds in 3/3 runs; planted-bug removal reproduces the described failure |

## Findings

1. **The product page's "Add to bag" button is still wired to the 6.1.b placeholder, never to 6.2's real bag.**
   `engine/apps/web/src/sites/shop/product/variant-picker.tsx:51-61` calls
   `engine/apps/web/src/sites/shop/product/actions.ts:17` (`addToBagPlaceholder`), which unconditionally returns
   `{ ok: false, reason: 'not-built-yet' }`. The real line-adding logic (`setBagLineQty`,
   `engine/packages/cms/src/shop/pricing/bag-edit.ts`, exposed as a server action in
   `engine/apps/web/src/server/shop/bag/actions.ts:83`, `setBagLineQtyAction`) exists and is used by the bag
   page's own quantity stepper, but the product page was never rewired onto it when 6.2 shipped the real bag. On
   the merged build, clicking "Add to bag" on any product always shows "We could not add it just now — try
   again." and never adds anything. Per `tickets/6qa.md`'s owned paths ("Changes to any product code: stop and
   report it as a finding with file:line. Do not fix it."), this is reported, not fixed, here.
2. **This host's Postgres container drops connections under concurrent load** (`ECONNRESET` on teardown's `DROP
   DATABASE`, a `5000 ms` test timeout hit, and the stock test's own `peak >= 5` diagnostic missing its target)
   when the production server and the orders db-test suite run against it at the same time, or when 5 Playwright
   workers hit the app concurrently. Not a stock-safety bug (the concurrency invariant itself never failed); a
   capacity/host finding. Running the orders suite with the server stopped, and the shop-e2e Playwright project
   with `--workers=1`, avoided it for this report's evidence.
3. **`BAG_COOKIE_KEY` is required by `engine/packages/cms/src/shop/pricing/bag.ts` but absent from
   `.env.example`.** Without it every page that reads the bag (`/bag`, and the product page once Finding 1 is
   fixed) 500s. Outside this ticket's owned paths (`.env.example` is not `tests/**` or `docs/gates/**`); added
   only to this worktree's two `.env.local` files (gitignored) to run the suite.
4. **The seed's inventory import is order-dependent**: `pnpm --filter @engine/cms run seed --layer shop --publish`
   holds every `stock.csv` row ("No product and no variant carries the SKU …") because the preceding
   `products.csv` import rejected all 80 products on the same run (no seeded product has an image —
   `docs/gates/phase-4.md` F5). A second run without `--publish` then creates the products and all 7 227 stock
   rows cleanly. Documented as the working recipe in **Setup** above; not re-litigated here since F5 is already
   open and outside this ticket's owned paths.
5. **No seeded product's variants carry different prices.** `6.1.c`'s "the variant picker changes the variant and
   its price" needs two variants that actually differ; none of the 80 seeded products do
   (`SELECT _parent_id FROM products_variants GROUP BY 1 HAVING COUNT(DISTINCT price) > 1` returns 0 rows). Raised
   `SEED-SHOP-070-2`'s price by SQL on this worktree's database only, from Rp 1.240.000 to Rp 1.260.000, so the
   test could demonstrate a real price change rather than asserting a no-op. A seed-data gap, not reported against
   product code.

## Follow-ups

- Rewire the product page's "Add to bag" onto `setBagLineQtyAction` (Finding 1) — the real fix for 6.1.c's "Add to
  bag works" clause; owned by the SHP lane (`engine/apps/web/src/sites/shop/product/**`), not QA.
- Add `BAG_COOKIE_KEY` to `.env.example` (Finding 3) — OPS/DOC lane.
- Consider a product fixture (or a seed flag) with two differently-priced variants (Finding 5), so this Check's
  data precondition does not need a per-run SQL patch.

## For the orchestrator

```bash
pnpm tasks:tick 6.2.d 6.3.d
```

**6.1.c is not ticked** — `FAIL` on "Add to bag works" (Finding 1). Tick it once the product page is rewired onto
the real bag action and the suite's test 3 is updated from "clicking Add to bag … fails" back to a passing
add-to-bag assertion.
