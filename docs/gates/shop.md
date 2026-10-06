# Shop fulfilment gate — local interim; the staging run is pending

Ticket 7.4 / 7.4-r1 (TASKS.md 7.4), `qa` on the sonnet seat, branch `w/7.4`, 2026-10-05.
`tests/e2e/shop-fulfilment/flow.spec.ts` drives one buyer-to-delivery journey across four roles (guest,
the nearest store, another store, the owner) at 390 px, on a local production build (`pnpm build`,
`next start -p 4321`), `MIDTRANS_MODE=simulate`, this worktree's own database (`indies_p7_w74`) and
Mailpit (`indies-platform-dev-mailpit-1`).

## Setup

- `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm db:fresh` (migrate only — no-op seed until phase 3's
  seed layer), then `pnpm --filter @engine/cms seed --layer shop --publish` (80 products published, 120
  stores, ~7,200 stock rows, the `WELCOME10` discount).
- `node tests/e2e/admin/local.mjs start` on port 4321 (this worktree's `.env.local`); `boot check passed
  (local, loaders from payload)`.
- The spec's own fixtures (`GATE_DB=local`, `ops.ts`'s `setup`): activates the two fixture stores at
  `E2E_PIN` (Denpasar default), picks two sellable unvarianted published products, zeroes every other
  store's stock of them and stocks both fixture stores at 999, and seeds a working delivery-fee table
  (5/15/30 km bands, free over Rp 500.000) since a fresh worktree's seed leaves `site-settings.shop.delivery`
  empty.

## The spec and its run

`pnpm exec playwright test -c tests/e2e/shop-fulfilment --reporter=list` (`GATE_DB=local`, `E2E_PORT=4321`
read from this worktree's `.env.local`).

Two fixes landed on top of the ticket's prior, uncommitted run (which had step 1 passing and was mid-fix on
the `shownNumber`/`numberText` split — already correct in the committed spec):

1. **F1 — the tracking page's "Ask on WhatsApp" link is ambiguous.** The page carries two: the order's own
   (inside the "Order #" region) and the shop's generic one in the footer. `getByRole('link', { name: 'Ask
   on WhatsApp' })` resolved to both (Playwright strict-mode violation). Fixed in the test only (scoped to
   `page.locator('main')`) — this is the page's real, intended shape (an order-specific contact link plus a
   footer-wide one), not a product bug.
2. **F2 — the order/admin view has no `main` landmark.** `page.locator('main p').first()` (reading the
   store name shown on an order before/after reassignment) never resolved — the admin's order view renders
   outside any landmark element. Fixed in the test only: reads the first paragraph following the
   "#&lt;number&gt;" heading (`orderHeading.locator('xpath=following::p[1]')`), the same pattern the tracking
   page's own store-name read already used.

With both fixes, a full run of the five steps:

```
Running 5 tests using 1 worker

  ok 1 [shop-fulfilment] › flow.spec.ts:80:3 › a guest buys two in-stock products, pays, and reaches the order page (4.3s)
fulfilment drive (paid → delivered): 5.3s
  ok 2 [shop-fulfilment] › flow.spec.ts:111:3 › the nearest store fulfils: processing → waiting for driver → image → on the way → delivered (42.9s)
  ok 3 [shop-fulfilment] › flow.spec.ts:175:3 › the buyer tracks the order: timeline, driver image, store name and WhatsApp (1.1s)
  ok 4 [shop-fulfilment] › flow.spec.ts:208:3 › another store's user sees no such order (808ms)
```

and, run alone (not depending on the prior four, confirming F2's fix independently of ordering):

```
Running 1 test using 1 worker

  ok 1 [shop-fulfilment] › flow.spec.ts:219:3 › the owner reassigns a second order to another store with stock (38.5s)

  1 passed (1.3m)
```

All five steps are proven individually; steps 1-4 together and step 5 alone are each clean. A single
back-to-back 5/5 run was not captured — see **Found** below: partway through this ticket's verification the
shared dev Postgres (`indies-platform-dev-postgres-1`) began refusing connections (`the database system is
in recovery mode`, then `Connection terminated due to connection timeout`, alternating) and had not
recovered after ~25 minutes of waiting and retrying (no `db:fresh`, restart or other write attempted against
it — worker rules forbid touching a shared service). This is an outage on shared infrastructure, not a
defect in the spec or the product code it drives.

## Per clause (TASKS.md 7.4.a-c)

| Clause | Evidence | Verdict |
| --- | --- | --- |
| Guest buys two in-stock products, pays, reaches the order page | step 1; `buyer-bag-390.png`, `buyer-checkout-390.png`, `buyer-order-paid-390.png` | **PASS** |
| The nearest store fulfils: processing → waiting for driver → image → on the way → delivered | step 2; `store-order-new-390.png`, `store-driver-image-390.png`, `store-delivered-390.png`; `order.status` confirmed `delivered` at `accounts.storeAId` (`GATE_DB` read) | **PASS** |
| The buyer tracks: timeline, driver image, store name, WhatsApp | step 3; `tracking-delivered-390.png`; axe clean at 390 and 1280 px | **PASS** |
| Another store's user sees no such order | step 4; `store-b-empty-390.png`; `getByRole('link').filter({ hasText: '#<number>' })` count 0 | **PASS** |
| The owner reassigns a second order to a store with stock | step 5 (run alone); `buyer-second-order-paid-390.png`, `owner-reassigned-390.png`; `order.storeId` confirmed moved from store A to store B (`GATE_DB` read) | **PASS** |
| Screenshots at each step into `docs/gates/shop/` | all of the above, committed | **PASS** |
| 7.4.b Lighthouse mobile (product, tracking) against staging | not attempted — needs a staging build | **PENDING** (orchestrator, against staging) |
| 7.4.c Check: this doc, screenshots, emails, access denial, Lighthouse ≥ 90/100 | this doc + screenshots + access denial done; emails and Lighthouse pending staging | **PARTIAL** — never ticked by a worker regardless |

## Findings

1. **F1, F2 above** — test-only fixes, both inside this ticket's owned paths (`tests/e2e/shop-fulfilment/**`).
2. **The shared dev Postgres (`indies-platform-dev-postgres-1`) went into recovery mode / refused
   connections for an extended period** during this ticket's verification, recovering from no action taken
   here. Reported so the orchestrator can check what else was running against it at the time (worker-rules.md
   forbids touching it directly: "never drop, reset or tear down shared services... other workers'
   databases").
3. Email check (`MAILPIT_URL`) intermittently timed out at 15s against a Mailpit confirmed reachable by a
   direct `curl` moments later — plausibly the same host contention as Finding 2, not a `gate.spec.ts`-pattern
   bug (this spec reuses `findOrderEmail`'s retry loop verbatim from `tests/e2e/shop/gate.spec.ts`).

## Staging run

Unchanged from the spec's design (`E2E_BASE_URL`, `E2E_OWNER_EMAIL`/`_PASSWORD`,
`E2E_STORE_A_EMAIL`/`_PASSWORD`, `E2E_STORE_B_EMAIL`/`_PASSWORD`, `E2E_PIN`, `MAILPIT_URL`) — the orchestrator
fills this section once staging accounts exist.

## Verify

See `docs/reports/workers/7.4.md` for the full Verify output, including the fresh-clone re-run.
