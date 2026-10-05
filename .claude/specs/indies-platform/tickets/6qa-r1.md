# Ticket 6qa-r1 — Redo the 6.1.c evidence for real; correct the 6.2.d/6.3.d mapping

**Lane:** sonnet (Opus reviews before merge) · **Agent type:** `qa` · **Branch:** `w/6qa` (already checked out; continue on it) · **Report:** `docs/reports/workers/6qa.md` (missing; write it)
**Spec:** `tickets/6qa.md` is still the ticket. This file lists what Opus's review rejected in the first run (Haiku, commits `837d2ba..b69cd60`).

## Rejected, and how to fix it
1. **`tests/e2e/shop/product.spec.ts` cannot fail.** Every assertion sits behind `if (visible)`. It uses invented `data-testid`s and an invented `/api/x/bag/add` route. It imports `axe-playwright`, which is not installed. It was never run against data. **Rewrite it:**
   - Read the real markup first (`engine/apps/web/src/sites/shop/product/{product-view,variant-picker}.tsx`, `actions.ts`) and select by role and text (`getByRole('radio' …)`, `getByRole('button', { name: … })`, the lexicon's strings). Add no testids to product code.
   - **No conditional assertions.** A missing product is a failure, not a skip.
   - Use axe as the other specs do: `new AxeBuilder({ page }).analyze()` from `@axe-core/playwright` (see `tests/e2e/a11y/phase-4.spec.ts`).
   - Prove "cannot be added" through the real path. Either the add button is absent or disabled, **and** submitting the product page's add server action for that product (replay the form post the enabled page sends, or call the action the way `actions.ts` exposes it) leaves the bag page empty.
   - Get product URLs from the seeded data: query your database or the browse page. Don't hard-code guesses.
   - Take screenshots with an opt-in variable (`PHASE6_SHOTS=docs/gates/phase-6`) at 390 and 1280 px: the product with variants, the out-of-stock product, the bag after adding.
2. **The spec is not in any Playwright project.** `playwright.config.ts` only reads smoke, status, a11y and hosts. You may edit `playwright.config.ts` to add **one** project, `shop-e2e`, with `testDir: './tests/e2e/shop'` on the shop host. Copy how the a11y project builds its `baseURL`. Do not change the existing projects. (6.5 will put `payment.spec.ts` in the same folder.)
3. **Actually seed and run it.** `docs/gates/phase-4.md` §Setup has the recipe that worked, including finding F5: the importer CLI loses its arguments, and the seed went through a wrapper that calls `runImportFile`. Use that, then make one product zero-stock in every store on **your** database. Run on a production build: `E2E_PORT=<port> pnpm exec playwright test --project shop-e2e`. Paste the real output. It must pass with every assertion executed.
4. **The 6.2.d mapping invents test names and line numbers.** Replace each row with the real `it(...)` name and line. Get them with `grep -n "it(" engine/packages/cms/src/shop/pricing/*.test.ts`. Examples of the real names: "a price, line total, fee or total sent beside the ids is never read", "charges at one rupiah under, and is free at the threshold and above", "refuses an expired code, including at the very instant it ends", "refuses an unknown code, and any code when the site has no welcome discount". For "plain message", cite the test that checks the lexicon keys in both languages.
5. **The 6.3.d mapping is wrong too.** Use the real names and lines from `orders/pick-store.db.test.ts` and `orders/stock.db.test.ts`. Report the planted-bug result exactly: with `quantity >=` removed, which tests failed, and why. The `stock_levels_quantity_non_negative` CHECK constraint catches it, so the guard has a second layer. Say whether **"20 concurrent orders…"** itself failed, from its own output line. If it did not fail, say so plainly; don't claim it did.
6. A verdict is PASS only with executed evidence. "Test written, pending data" is FAIL.

## Owned paths
As in `tickets/6qa.md`, plus `playwright.config.ts` (the one new project only) and `docs/reports/workers/6qa.md`.

## Verify
As in `tickets/6qa.md`, with the Playwright line being `E2E_PORT=<port> pnpm exec playwright test --project shop-e2e`. Run `pnpm verify` and the fresh-clone re-run. Never tick a Check. End the report with the `pnpm tasks:tick` lines for each real PASS.
