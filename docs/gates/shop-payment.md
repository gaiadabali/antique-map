# Shop payment gate — Local production build, then staging (release 70a0cae) — PASS, 6.5.c ticked 2026-10-06

Ticket 6.5c (TASKS.md 6.5.c), `qa` on the sonnet seat, branch `w/6.5`, 2026-10-05. `tests/e2e/shop/gate.spec.ts`
drives one buyer journey at 390 px against a local production build (`pnpm build`, `next start -p 4290`),
`MIDTRANS_MODE=simulate`, this worktree's own database (`indies_p6_r1_65`) and Mailpit
(`indies-platform-dev-mailpit-1`).

**Owner decision (2026-10-05): no payment gateway yet — simulate only.** The "one real Midtrans sandbox payment"
clause of 6.5.c and of Phase 6's Done-when is **deferred by owner decision 2026-10-05**, not attempted here.

## Setup

- Seed: `pnpm --filter @engine/cms run seed --layer shop` (132 products, 118 active stores, 7,279 stock rows,
  the `WELCOME10` discount), then, following the phase-4/phase-6 precedent (no product carries an image yet —
  `docs/gates/phase-4.md` F5, still open), published the 80 still-draft rows directly on this worktree's own
  database: `UPDATE products SET _status='published' WHERE _status='draft';` (80 rows; 132 published total).
- `.env.local` (this worktree's, gitignored) and `engine/apps/web/.env.local` (Next reads the app directory's
  own copy, not the repo root's — the same gap `docs/gates/phase-6-checks.md` Finding 3 named for
  `BAG_COOKIE_KEY`) both hold: `DATABASE_URL`, `PAYLOAD_SECRET`, `GALLERY_HOSTS=gallery.localhost`,
  `SHOP_HOSTS=shop.localhost`, `BAG_COOKIE_KEY`, `MIDTRANS_MODE=simulate`, `CRON_SECRET=dev-only-not-a-secret`,
  `SMTP_HOST=localhost`, `SMTP_PORT=1025`.
- Production server: `pnpm build`, then (standalone output needs its static assets and `public` copied in —
  `next start` alone warns `"next start" does not work with "output: standalone"` and serves an empty shell)
  `pnpm --filter @engine/web run start -p 4290`, confirmed with `boot check passed (local, …)`.
- Mailpit confirmed up: `curl -s localhost:8025/api/v1/info` → 200.

## The spec and its run

`GATE_DB=local E2E_PORT=4290 pnpm exec playwright test tests/e2e/shop/gate.spec.ts --project=shop-e2e --workers=1`
(`GATE_DB=local` is also set in this worktree's `.env.local` as a fallback the spec reads, since this session's
shell cannot export inline environment variables; the effect is identical).

Two consecutive clean runs (of several — see **Findings** for the bugs fixed along the way):

```
Running 2 tests using 1 worker

  ok 1 [shop-e2e] › tests\e2e\shop\gate.spec.ts:391:3 › the shop payment gate (6.5.c) › a guest buys two products; pays; the order is confirmed and emailed (22.3s)
  ok 2 [shop-e2e] › tests\e2e\shop\gate.spec.ts:501:3 › the shop payment gate (6.5.c) › an abandoned order expires, returns its stock, and a second sweep changes nothing (42.9s)

  2 passed (1.1m)
```

```
Running 2 tests using 1 worker

  ok 1 [shop-e2e] › tests\e2e\shop\gate.spec.ts:391:3 › the shop payment gate (6.5.c) › a guest buys two products; pays; the order is confirmed and emailed (31.6s)
  ok 2 [shop-e2e] › tests\e2e\shop\gate.spec.ts:501:3 › the shop payment gate (6.5.c) › an abandoned order expires, returns its stock, and a second sweep changes nothing (45.6s)

  2 passed (1.3m)
```

Both skip paths were exercised directly and print correctly:
`GATE_DB` unset → `SKIPPED (no db access): step 5 — order status and stock by database read` (and test 2 reports
`1 skipped`); `MAILPIT_URL=none` → `SKIPPED: email (MAILPIT_URL=none)`.

Products and store discovered this run (never hard-coded — `findSellablePair` reads the live `/api/products`
list and each candidate pair's own checkout fee quote, the same oracle a real buyer's browser has): **Candle in
ceramic cup — rice terrace** and **City plan reproduction — parang**, both held by the seed's one active store
("Seed store", Ubud, `-8.5069, 115.2625`) — within the 30 km / Rp 20.000 band of the Denpasar default pin, and
over the Rp 500.000 free-delivery threshold, so delivery showed as Rp 0 this run.

## Per clause (TASKS.md 6.5.c; Phase 6's Done-when)

| Clause | Evidence | Verdict |
| --- | --- | --- |
| Two products, a bag, a pin via the fallback | `gate.spec.ts` steps 1-2; `bag-two-lines-390.png`, `checkout-filled-390.png` | **PASS** |
| A delivery fee and a total; total = items − discount + fee | step 3: `expect(totalIdr).toBe(subtotalIdr - discountIdr + feeIdr)`, read as integers from the page (`Rp 5.595.000 = Rp 5.595.000 − Rp 0 + Rp 0` this run) | **PASS** |
| Pay, simulator Settle, confirmation with order number and tracking link | step 4: `order-pending-390.png`, `order-paid-390.png`; heading "Payment received", link "Track your order" | **PASS** |
| **One real sandbox payment** | — | **DEFERRED** (owner decision 2026-10-05 — no gateway set up) |
| Confirmation in Mailpit (order number, totals, tracking link from the site's own origin) | step 6: Mailpit search by recipient, message subject "Your order 100,059" (matches the pending page's own "Order 100,059" heading — `orderNumberText`), body holds `Subtotal: Rp 5.595.000`, `Total: Rp 5.595.000`, and `Track your order any time: http://shop.localhost:4290/track/…` (starts with `SITE_ORIGIN`) | **PASS** |
| Abandoned order expires and returns its stock; a second sweep changes nothing | step 7, second test: `order.status` `pending_payment` → `expired`; stock back by exactly the line's qty; a second `POST /api/x/cron/sweeps` (200, bearer `CRON_SECRET`) leaves both unchanged; order page shows "Put these back in my bag" — `order-expired-390.png` | **PASS** |
| Lighthouse mobile ≥ 90 performance, ≥ 90 accessibility | see **Lighthouse** below — both pages clear both bars | **PASS** |
| Axe clean on bag, checkout, order (pending and paid) at 390 and 1280 px | every state passes except one known, reported finding on the bag page (filtered, not hidden — see **Findings** F1); checkout and both order states are fully clean at both widths | **PASS** — F1 fixed by the orchestrator (the bag summary is no longer a nested landmark); the axe filter is removed and the gate re-ran 2/2, then 8/8 with `payment.spec.ts`, fully clean |

## Lighthouse (mobile, local production build)

Run via the installed `lighthouse` CLI directly (`pnpm exec lhci collect` crashed on this Windows host's
Chrome-profile cleanup — Finding F2 below; the `lighthouse` binary itself, given its own `--user-data-dir`, ran
and wrote its JSON report before hitting the same cleanup bug, so the real scores below are from that JSON, not
guessed):

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| `/product/island-chart-reproduction-wayang-2` | **96** | **100** | 100 | 69 |
| `/bag` | **92** | **100** | 100 | 58 |

The Check's bar (performance ≥ 90, accessibility ≥ 90) is cleared on both pages. Raw reports:
`docs/gates/shop-payment/lighthouse-product.json`, `docs/gates/shop-payment/lighthouse-bag.json`.

## Findings

1. **Fixed (orchestrator):** `engine/apps/web/src/sites/shop/bag/bag-view.tsx:108`'s `<aside aria-label={text.shared('cart.title')}>`
   nests inside `bag-view.tsx:47`'s `<section className={styles.bag} aria-labelledby="bag-title">`** — once axe
   resolves the section's accessible name (from `aria-labelledby`), it counts as a landmark (a named region),
   so the `<aside>` — itself a landmark (`complementary`) — is never top-level. axe: `moderate
   landmark-complementary-is-top-level`. Reported, not fixed (outside this ticket's owned paths — product code
   is `stop and report`, per `.claude/specs/indies-platform/tickets/6.5c.md`'s owned paths). `gate.spec.ts`'s
   `axeClean` filters this one, documented rule id so the rest of the bag page's axe run still fails loudly on
   anything else; every other page and width in this gate is fully clean with no filter.
2. **`pnpm exec lhci collect` (the `@lhci/cli` wrapper) crashes on this Windows workstation**: after Lighthouse
   finishes auditing and writes nothing yet, `chrome-launcher`'s own post-run cleanup
   (`Launcher.destroyTmp` → `fs.rmSync` on its random `%TEMP%\lighthouse.*` profile dir) throws `EPERM`, killing
   the whole process before `lhci` can persist a report — reproduced on three separate invocations, including a
   single-URL retry. Calling the `lighthouse` CLI directly, with an explicit `--user-data-dir` of its own, lets
   the JSON write (`LH:Printer json output written to …`) complete before the same `EPERM` fires during cleanup
   — a host/profile-cleanup issue, not a product defect, and not this ticket's to fix (environment, not owned
   paths). Workaround used for this run's numbers; the staging run (a Linux host) is expected not to hit it.
3. Both `.env.local` files needed hand-written values this ticket's `.env.example` does not supply
   (`BAG_COOKIE_KEY` — already `docs/gates/phase-6-checks.md` Finding 3 — plus `DATABASE_URL`, `PAYLOAD_SECRET`,
   `GALLERY_HOSTS`, `SHOP_HOSTS`, `MIDTRANS_MODE`, `CRON_SECRET`, SMTP settings for a from-scratch worktree).
   Not fixed here (`.env.example` is outside this ticket's owned paths).

## Note on the fee

This run's pair (Rp 5.595.000) is over the free-delivery threshold, so the review showed delivery free (Rp 0). The charged band and the exact threshold switch are proven by the 6.2.d unit tests (`docs/gates/phase-6-checks.md`).

## Staging run

Once the orchestrator has a staging build and Mailpit is confirmed loopback-only there, the exact command for
that host (no product code, env setup or spec changes needed — `gate.spec.ts` was written against `E2E_BASE_URL`
and `MAILPIT_URL=none` from the start):

```
E2E_BASE_URL=https://old-east-indies.gaiada.com MAILPIT_URL=none pnpm exec playwright test --project shop-e2e tests/e2e/shop/gate.spec.ts --workers=1
```

`GATE_DB` stays unset there (the orchestrator has no staging database access from this spec's own process), so
steps 5 and 7 print `SKIPPED (no db access): …` — the orchestrator reads the order status, stock and sweep
behaviour by other means it already has for staging (TASKS.md 6.5.c's note: "the orchestrator reads it on the
host"). `SITE_ORIGIN` should be set to the staging origin so the email-link assertion matches it exactly, as it
does locally by default.

## Verify

```
$ pnpm verify
```

(run at the end, after every step above was committed; see `docs/reports/workers/6.5c.md` for its output.)


## Staging result — release 70a0cae, 2026-10-06 — PASS

Run from the workstation against `https://old-east-indies.gaiada.com` (simulate mode, seeded catalogue, placeholder
fee bands — see below), with the host-only steps done on Helios by the orchestrator:

| Clause | Evidence | Verdict |
| --- | --- | --- |
| Two products → pin → fee and total → simulator payment → confirmation, axe clean | `E2E_BASE_URL=https://old-east-indies.gaiada.com MAILPIT_URL=none pnpm exec playwright test --project shop-e2e tests/e2e/shop/gate.spec.ts --workers=1` → `1 passed (12.0s)`; order 100001, "Payment received", "Denpasar is getting your order ready", Rp 5.595.000 (over the free threshold, so delivery Rp 0) | **PASS** |
| The order is paid, the nearest store holding every line has it, its stock fell by each line's qty | host read: order 100001 `paid`, store DPS-004, SEED-SHOP-077 2→1, SEED-SHOP-078 9→8 | **PASS** |
| The order-created email in Mailpit, tracking link on the site's own origin | host read of staging's Mailpit: "Your order 100,001" to the buyer, Rp 5.595.000, link prefix `https://old-east-indies.gaiada.com/track/` | **PASS** |
| An abandoned order expires and returns its stock; a second sweep changes nothing | order 100002 (one unit, DPS-006 8 held → expires_at moved back on the host) → sweep 1 `{checked:1, expired:1}`, order `expired`, stock 9; sweep 2 `{checked:0}`, unchanged | **PASS** |
| One real sandbox payment | — | **DEFERRED** (owner decision 2026-10-05) |
| Lighthouse mobile ≥ 90 performance and accessibility | local production build (above): 96/100 product, 92/100 bag | **PASS** |

**What the staging run found first (all fixed before the passing run):** the browse and collection pages 404'd (app
folders did not match the route table); stock was cached with the editorial data (`'use cache'`), so pages showed a
stale "Out of stock"; the token rate limit counted every request and throttled the pending page's own polling; the
order email was sent inline before the redirect; staging had no delivery fee table (`no_delivery_table` refuses every
checkout). The fee bands on staging are a **placeholder** (5 km Rp 10.000, 15 km Rp 15.000, 30 km Rp 20.000, free over
Rp 500.000) until the owner's courier prices (Q3) — a launch blocker on the board.

**Open, filed as one follow-up ticket:** the typed-pin fallback can submit a near-(0, 0) pin for a moment while the
second field is empty (`Number('') === 0`), refused as "outside Indonesia" before any order exists; order numbers are
printed with a thousands separator ("100,001").
