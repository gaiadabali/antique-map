# Ticket 6qa-r3 — Re-run 6.1.c against the real add-to-bag

**Lane:** sonnet (Opus reviews) · **Branch:** `w/6qa` (checked out; your seeded database `indies_p6_w6qa` and `.env` are still here) · **Report:** append to `docs/reports/workers/6qa.md`

## Where it stands
Your 6.1.c finding is fixed on `w/6.1fix` (`deca40b`, reviewed). The picker now posts to `addToBagAction` (`server/shop/bag/actions.ts`), which refuses a product or variant with no stock in any store (`server/shop/bag/add-to-bag.ts`), and the placeholder `sites/shop/product/actions.ts` is deleted.

## Do
1. Run `git merge --no-edit w/6.1fix`.
2. In `tests/e2e/shop/product.spec.ts`, replace the two placeholder cases. Every assertion is unconditional.
   - "Add to bag works": on the variant product at 390 px, choose a variant and press Add to bag. The success status appears, the bag page lists that product and variant with qty 1, and pressing again makes it qty 2.
   - "The zero-stock product cannot be added": the button is disabled, "Out of stock" shows, and a **forced** add is refused. Post the server action the enabled page uses, replaying its form submission (capture it from the variant product's request, then swap in the zero-stock product's id). Then assert the bag page is still empty.
   - Remove every import of the deleted placeholder.
3. Rebuild (`pnpm build`), start on your port, and run `E2E_PORT=<port> PHASE6_SHOTS=docs/gates/phase-6 pnpm exec playwright test --project shop-e2e tests/e2e/shop/product.spec.ts --workers=1`. Paste the real output. Add the screenshot `product-added-bag-390.png`.
4. Update `docs/gates/phase-6-checks.md` §6.1.c to PASS **only** if every clause ran green. Commit. Run `pnpm verify`. End the report with the exact `pnpm tasks:tick` lines for 6.1.c, 6.2.d and 6.3.d.
