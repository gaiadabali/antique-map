# Ticket 6-followup-2 — Order-page and price-email polish; the shop catalogue's cache invalidation

**Lane:** sonnet (Opus reviews before merge) · **Branch:** `fix/6-followup-2` (cut from `main`, checked out) · **Report:** `docs/reports/workers/6-followup-2.md`
**Read first:** `.claude/worker-rules.md` — **foreground only, never "wait" or schedule a wakeup; commit after every step, before any long run.** Board: nothing to report (6.6 and 6.1 are done; these are follow-ups from the staging runs).

## A. Polish found on staging (2026-10-06, order #100011)
1. **The confirming page shows no order number.** `sites/shop/payment/order-view.tsx`'s `awaiting_quote` state: show "Order {number}" (plain digits, as the other states do) so a buyer contacting the shop can name it.
2. **"Total" before delivery is known.** In the `awaiting_quote` state, label the sum **"Items total"** (lexicon key; `en` + `id`), as checkout does; "Total" only once the fee is set.
3. **The price-ready email has no delivery line.** `engine/packages/cms/src/shop/notify/templates.ts` `quoteReadyEmail`: show **items, delivery fee and total** as three lines (from the stored order: subtotal − discount, `totals.deliveryFee`, `totals.total`), both languages. Pass the amounts from `notify/index.ts` (it already loads `totals`). Unit-test the template ("the fee appears as its own line", "the three amounts add up").

## B. The shop catalogue is never invalidated (reported by antique-map-9d)
Mirror the gallery's fix on main (`b947e6f`; read it):
1. `engine/apps/web/src/server/shop/catalogue/catalogue.ts`: replace the hand-written `CATALOGUE_TAG = 'products'` with `catalogueTag('shop')` from `@engine/cache` on every `'use cache'` scope (categories, categoryId, cachedListing, cachedSearch, productEditorial), and give each an explicit `cacheLife('hours')`. Availability stays live, outside the cache (never move it in — `catalogue.cache.test.ts` guards it).
2. `engine/packages/cms/src/collections/products/index.ts`: an `afterChange` + `afterDelete` hook modelled on `hooks/work-invalidate.ts` that invalidates `catalogueTag('shop')` and the product's own tag, using `hooks/published-state.ts` so a draft-revision-then-unpublish also clears it. Out-of-request writes go through `invalidationBatch()` like main's other hooks.
3. `server/shop/home/load-featured-products.ts`: tag the new-products rail with `catalogueTag('shop')` too (it is tagged per product only — the gallery home rail had the same bug).
4. Tests: a unit test that every shop catalogue `'use cache'` scope carries `catalogueTag('shop')` (source-level, like `catalogue.cache.test.ts`); a hook test that publishing, editing and unpublishing a product calls the invalidation for `catalogue:shop` (follow `work-invalidate`'s tests).

## Owned paths
`engine/apps/web/src/sites/shop/payment/**`, `engine/apps/web/src/server/shop/{catalogue,home}/**`, the shop lexicon (add keys, both languages), `engine/packages/cms/src/shop/notify/{templates,index}.ts` (+ a template test), `engine/packages/cms/src/collections/products/**` (the hook only), `engine/packages/cms/src/hooks/**` (a new products hook file if you split it out), the report.

## Verify (foreground)
`pnpm --filter @engine/web typecheck`, `pnpm --filter @engine/cms typecheck`, `pnpm vitest run engine/apps/web/src/server/shop engine/packages/cms/src/shop/notify engine/packages/cms/src/collections/products engine/packages/cms/src/hooks`, then `pnpm verify`. Screenshot the confirming page at 390 px on a production build if you can; if the build or server cannot start, say so and stop there. Do not run `git merge`.
