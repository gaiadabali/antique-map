# Ticket 6-followup-3 — The store's own staff see orders that need a price

**Lane:** sonnet (Opus reviews before merge) · **Branch:** `fix/6-store-quote-queue` (cut from `main`, checked out) · **Report:** `docs/reports/workers/6-followup-3.md`
**Read first:** `.claude/worker-rules.md` — **foreground only, never "wait" or schedule a wakeup; commit after every step.** Board: nothing to report.

## The gap (found by the orchestrator's 7.4 run)
TASKS.md 6.6: the order's own store can quote, and the 2-hour quote window relies on the store acting. But the store user's queue never shows an `awaiting_quote` order:
- `engine/packages/cms/src/admin/orders/data.ts` `ACTIVE_STATUSES` (L59) is `paid … on_the_way`, and `loadStoreQueue` (L79) filters `status in [...ACTIVE_STATUSES, 'delivered']`.
- `engine/packages/cms/src/admin/orders/store-panel.jsx` groups `paid` as "new", then in progress, then delivered today.
So only the owner or an editor can press **Send price** today (the 7.4 gate works around it by quoting as the owner).

## Do (commit after each)
1. `ACTIVE_STATUSES`: add `awaiting_quote` and `pending_payment` (quoted, waiting for the buyer to pay — the store should see it is coming). The list filter only changes; **access stays the collection's own store scoping** — never widen it, never `overrideAccess`.
2. `store-panel.jsx`: a first group **"Needs a delivery price"** (`awaiting_quote`, oldest first, each showing its quote-by deadline in Bali time, Asia/Makassar, like `quote-panel.jsx`'s `baliClock`), then **"Waiting for payment"** (`pending_payment`), then the existing groups unchanged. Labels in `engine/packages/cms/src/i18n/orders-panel.ts`, `en` and `id`. The order view already shows `QuotePanel` for `awaiting_quote` (L82) — make sure a store user reaches it from the queue.
3. Tests:
   - extend `admin/orders/data.test.ts` (or the store-panel's own test) so the queue includes `awaiting_quote` and `pending_payment`;
   - a **db test**, `loadStoreQueue` as a store user of store A: sees A's `awaiting_quote` order, **never** store B's (pushed db, the helpers in `collections/users/staff.test-support.ts` / `shop/orders/orders-db.test-support.ts`);
   - a db test that the store user can `quoteDeliveryFee` their own store's order and is refused (`forbidden`) on another store's (if `shop/orders/quote.db.test.ts` already proves the refusal, cite it rather than duplicate).
   Run db tests one file at a time: `CMS_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm vitest run --maxWorkers=1 --testTimeout=90000 --hookTimeout=180000 <file>`.
4. `pnpm --filter @engine/cms typecheck`, lint, `pnpm verify`. Do not run `git merge`.

## Owned paths
`engine/packages/cms/src/admin/orders/{data.ts,data.test.ts,store-panel.jsx}`, `engine/packages/cms/src/i18n/orders-panel.ts`, a new db test beside them, the report. Nothing else.
