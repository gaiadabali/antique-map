# Shop fulfilment gate — local and staging runs

Ticket 7.4-r2 (TASKS.md 7.4, 6.6), `qa` on the sonnet seat, branch `w/7.4r2`, 2026-10-06.
`tests/e2e/shop-fulfilment/flow.spec.ts` drives one buyer-to-delivery journey across four roles (guest, the
nearest store, another store, the owner) at 390 px, on a local production build, `MIDTRANS_MODE=simulate`, this
worktree's own database (`indies_p7_r4_2`) and Mailpit (`indies-platform-dev-mailpit-1`).

## What changed from 7.4 / 7.4-r1

6.6 (2026-10-06) moved the delivery fee off checkout: an order is placed `awaiting_quote` with no fee and no
charge; a staff member (the owner, an editor, or the order's own store) enters the courier fee in the admin
("Send price", `/api/x/orders/quote`); only then does the order reach `pending_payment` and show the buyer a
priced Pay button. The spec now drives that step explicitly:

- `fillCheckout` no longer waits for a checkout-page fee quote (there is none any more).
- `submitCheckout` (new) submits the checkout and asserts the order lands on "We're confirming your delivery
  price" — the pre-quote page, reading the items-only total for the fee math below.
- `quoteAsStaff` (new) signs in as the **owner** (not a store user — a store's own queue only lists `paid` and
  later statuses, so an `awaiting_quote` order never appears there; the owner/editor list has no such filter),
  opens the order, enters the fee (Rp 15.000, `DELIVERY_FEE_IDR`) and presses "Send price"; the panel confirms by
  showing "Awaiting payment" and the order's new delivery-fee line.
- `payAndSettle` now waits (reload loop) for the buyer's order page to carry the priced `Pay` button, asserts the
  total is `subtotal − discount + 15.000`, then pays with the simulator as before.
- The owner's second-order reassign step reads the order's actual starting store rather than assuming it is
  always the nearest fixture store: the nearest-store pick's own tie-break (`shop/orders/assign.ts`) prefers
  whichever fixture store still holds more stock, and the first order already spent some of store A's — so order
  2 is not guaranteed to start there. The test now targets whichever of the two fixture stores it is **not**
  currently at.

## Setup

- `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm db:fresh`, then `pnpm --filter @engine/cms seed --layer
shop --publish` (stores, vocabulary, the `WELCOME10` discount). **The products CSV cannot publish**: every row
  in `seed/shop/data/products.csv` carries an empty `image_files` (no real photography yet, AGENTS.md D19), and
  a product needs at least one image to publish — every row is rejected, as the ticket's own Verify block
  anticipated ("if the seed needs images, use the fixture route instead"). `ops.ts`'s `setup` op now makes up
  any shortfall itself: a tiny generated PNG, one `media` row, and as many published, unvarianted products as
  the gate needs, through the Local API exactly as a real catalogue row would be.
- The gate's own accounts (`GATE_DB=local`) now come from `ops.ts`'s own `accounts` op (`tests/e2e/shop-fulfilment/run-ops.ts`), not `tests/e2e/admin/local.mjs`'s `fixtures()`: that script also creates `terms` and
  `makers` rows, and since `291f012` (`vocabulary-invalidate.ts`) those collections' writes schedule a cache
  invalidation with Next's `after()` — which throws outside a Next request, which every plain `payload run` is.
  `stores` and `users` carry no such hook, so the new op only ever touches those two, idempotently.
- This worktree's `.env.local` needed values the project's `.env.example` does not yet supply, to boot the shop
  at all (`BAG_COOKIE_KEY` — already `docs/gates/phase-6-checks.md` Finding 3 / `docs/gates/shop-payment.md`
  Finding 3 — plus `GALLERY_HOSTS`, `SHOP_HOSTS`, `MIDTRANS_MODE=simulate`, `CRON_SECRET`, `SMTP_HOST`/`_PORT`,
  and the S3/MinIO settings by `127.0.0.1`, never `localhost` — worker-rules.md's own WSL-relay note). Next also
  reads `engine/apps/web/.env.local` separately from the repo root's copy, so both needed the same values.
- `ORDER_LINK_KEY` is a boot-check requirement `tests/e2e/admin/local.mjs`'s `start()` does not forward to the
  spawned server (unlike `.github/scripts/start-server.sh`, fixed for CI in `3b62e2d`) — worked around locally
  with `node --env-file=.env.local tests/e2e/admin/local.mjs start`, which loads the whole file into the
  process's own environment before it spawns `next start`.
- The spec's own fixtures (`GATE_DB=local`, `ops.ts`'s `setup`): activates the two fixture stores at `E2E_PIN`
  (Denpasar default), picks (or makes) two sellable unvarianted published products, zeroes every other store's
  stock of them and stocks both fixture stores at 999, and seeds a working delivery-fee table (5/15/30 km bands,
  free over Rp 500.000) since a fresh worktree's seed leaves `site-settings.shop.delivery` empty.

## The spec and its run

`pnpm exec playwright test -c tests/e2e/shop-fulfilment --reporter=list` (`GATE_DB=local`, `E2E_PORT=4320` via
this worktree's `.env.local`):

```
Running 5 tests using 1 worker

  ok 1 [shop-fulfilment] › flow.spec.ts:62:3 › a guest buys two in-stock products, pays, and reaches the order page (29.4s)
fulfilment drive (paid → delivered): 4.8s
  ok 2 [shop-fulfilment] › flow.spec.ts:100:3 › the nearest store fulfils: processing → waiting for driver → image → on the way → delivered (39.8s)
  ok 3 [shop-fulfilment] › flow.spec.ts:164:3 › the buyer tracks the order: timeline, driver image, store name and WhatsApp (3.1s)
  ok 4 [shop-fulfilment] › flow.spec.ts:197:3 › another store's user sees no such order (3.5s)
  ok 5 [shop-fulfilment] › flow.spec.ts:208:3 › the owner reassigns a second order to another store with stock (1.1m)

  5 passed (2.9m)
```

## Per clause (TASKS.md 7.4.a-c)

| Clause                                                                                      | Evidence                                                                                                                                                                 | Verdict                                    |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Guest buys two in-stock products, pays (after a staff quote), reaches the order page        | step 1; `buyer-bag-390.png`, `buyer-checkout-390.png`, `buyer-order-awaiting-quote-390.png`, `store-quote-sent-390.png`, `buyer-order-paid-390.png`                      | **PASS**                                   |
| The nearest store fulfils: processing → waiting for driver → image → on the way → delivered | step 2; `store-order-new-390.png`, `store-driver-image-390.png`, `store-delivered-390.png`; `order.status` confirmed `delivered` at `accounts.storeAId` (`GATE_DB` read) | **PASS**                                   |
| The buyer tracks: timeline, driver image, store name, WhatsApp                              | step 3; `tracking-delivered-390.png`; axe clean at 390 and 1280 px                                                                                                       | **PASS**                                   |
| Another store's user sees no such order                                                     | step 4; `store-b-empty-390.png`; `getByRole('link').filter({ hasText: '#<number>' })` count 0                                                                            | **PASS**                                   |
| The owner reassigns a second order to a store with stock                                    | step 5; `buyer-second-order-paid-390.png`, `owner-reassigned-390.png`; `order.storeId` confirmed moved to the other fixture store (`GATE_DB` read)                       | **PASS**                                   |
| Screenshots at each step into `docs/gates/shop/`                                            | all of the above, committed                                                                                                                                              | **PASS**                                   |
| 7.4.b Lighthouse mobile (product, tracking) against staging                                 | §Staging run: tracking 92–93 / 100; product 87–88 / 100                                                                                                                  | **RUN** — product below 90                 |
| 7.4.c Check: this doc, screenshots, emails, access denial, Lighthouse ≥ 90/100              | §Staging run: 5/5, screenshots, emails, access denial, accessibility 100; product performance 87–88                                                                      | **OPEN** until the product page reaches 90 |

## Findings

1. **The products CSV cannot publish without real images** (`seed/shop/data/products.csv`'s `image_files` is
   always empty, AGENTS.md D19 — no photographer yet). `ops.ts`'s `setup` now makes its own fixture products
   with a generated image when the mock catalogue has fewer than two sellable published ones, exactly the
   ticket's "use the fixture route instead" fallback — not a product defect.
2. **`tests/e2e/admin/local.mjs`'s `fixtures()` cannot run outside a Next request** since `291f012` added a
   cache-invalidation hook to `terms`/`makers`/`places`/`works` writes that calls Next's `after()`, which throws
   outside a request scope — every plain `payload run` script is outside one. Reported for the orchestrator;
   not fixed in `fixtures.ts` itself (outside this ticket's owned paths). Worked around here by giving the gate
   its own `accounts` op in `ops.ts` (owned), which only touches `stores` and `users` — collections with no such
   hook.
3. **`tests/e2e/admin/local.mjs`'s `start()` does not forward `ORDER_LINK_KEY`** to the server it spawns (a boot
   check requirement since 6.6), unlike CI's `start-server.sh` (fixed in `3b62e2d`). Reported; not fixed in
   `local.mjs` (outside this ticket's owned paths) — worked around with `node --env-file=.env.local` locally.
4. **The project's `.env.example` is still missing `BAG_COOKIE_KEY`, `GALLERY_HOSTS`, `SHOP_HOSTS`,
   `MIDTRANS_MODE`, `CRON_SECRET` and SMTP settings** a from-scratch worktree needs to boot the shop at all —
   already `docs/gates/phase-6-checks.md` Finding 3 and `docs/gates/shop-payment.md` Finding 3; still not fixed
   (`.env.example` is outside this ticket's owned paths either).
5. **A Postgres connection pool opened before a `db:drop`/`db:fresh` serves wrong (not erroring) reads after**:
   restarting the Next server once the database is back cleared it. Noted for anyone resetting a worktree's
   database while its server is already running — restart the server after, not just the database.

## Staging run

Orchestrator, 2026-10-06, against `https://old-east-indies.gaiada.com` on release
`production-20261006T113705Z-52d8a6b` (main `52d8a6b`: 6.6, its follow-ups fu2–fu5, 5.2's media pipeline and the
same-origin driver photo), after the 80 product images' derivatives were backfilled (`media:derivatives`: 80 ready,
first attempt). Real staging accounts by environment (`E2E_OWNER_*`, `E2E_STORE_A_*` = a DPS-004 store user,
`E2E_STORE_B_*` = a DPS-008 store user), `E2E_REASSIGN_STORE_ID=4` (staging has no fixture stores: the owner moves
the second order to DPS-004, which stocks it), `MAILPIT_URL` = staging's Mailpit through an SSH tunnel.

```
  ok 1 › a guest buys two in-stock products, pays, and reaches the order page (39.5s)
  ok 2 › the nearest store fulfils: processing → waiting for driver → image → on the way → delivered (14.5s)
  ok 3 › the buyer tracks the order: timeline, driver image, store name and WhatsApp (5.8s)
  ok 4 › another store's user sees no such order (18.3s)
  ok 5 › the owner reassigns a second order to another store with stock (1.4m)
  5 passed (3.3m)
```

Screenshots of this run at 390 px: `docs/gates/shop/staging/` (the local run's stay in `docs/gates/shop/`).

**Emails** (staging Mailpit, order #100011 driven through the real admin, and every gate order since): one email
per status — "Order #n — update" on placement, "your delivery price is ready" after Send price, "update" on payment
— each sent once (`order_notifications` holds one claim per status); every link in them opens the same order (the
same token, stored encrypted); the store's users get one "New order #n" on payment. The gate itself reads the
order number from the placement email.

**Access denial:** step 4 — the DPS-008 user's queue has no link to the DPS-004 order.

**The driver photo** is served from the shop's own origin (`/api/x/track/{token}/driver-image`: 200 `image/webp`,
`private, no-store`, `nosniff`) — no internal storage URL reaches the page.

**Lighthouse 12, mobile, default simulated throttling**, run from a container on the staging host (the
workstation's own connection was too unsteady to measure: 44–93 on one page), 3 runs each:

| Page                                                    | Performance         | Accessibility   | LCP   | TBT        |
| ------------------------------------------------------- | ------------------- | --------------- | ----- | ---------- |
| Tracking (`/track/{token}`, a delivered order)          | 93 · 93 · 92        | 100 · 100 · 100 | 2.4 s | 240–270 ms |
| Product (`/product/island-chart-reproduction-wayang-2`) | 69 (cold) · 87 · 88 | 100 · 100 · 100 | 2.7 s | 370–380 ms |

The product page is short of 90: its lead image paints ~1.5 s after it has downloaded, and a product-page-only
chunk ships all of `zod` (87 KB gzip) to the browser. Being fixed before 7.4.c is ticked.

Found on the way (all fixed): the staging cron called the app without a Host header, so the order-expiry sweep
and payment reconcile answered 404 for a day (`e51c536`); the checkout lost a typed pin submitted before its
reverse geocode answered and wiped the form on any refusal (6-followup-4); store users never saw an
`awaiting_quote` order (6-followup-3); product photos pointed at a staff-only URL and the driver photo at the
internal storage endpoint (6-followup-5, `ade4379`); the tracking timeline printed raw ISO timestamps
(`2a3cb76`).

## Verify

See `docs/reports/workers/7.4-r2.md` for the full Verify output, including the fresh-clone re-run.
