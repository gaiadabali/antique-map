# The shop on its own — phase 23 gate (23.6)

QA seat, 2026-11-19. The working tree of `plan-v2/phase-a` as it stands (uncommitted): phase 23's `engine/apps/shop`
on `engine/packages/cms-shop`, its own database, its own host.

> **Verdict: phase 23's Done when holds on a production build on `shop.localhost`, with one clause not
> evidenced — the Midtrans sandbox (no sandbox keys on this workstation).** Checkout → payment on the simulator →
> tracking passes both ways (a pin inside the owner's distance bands, priced at checkout; a pin past the last band,
> priced by the owner's quote in the admin); owner, editor and store staff sign in and each sees what the role may,
> a store user only its own store's orders; an approved partner signs in and out; "See the original" links while
> the gallery answers and is absent — the product page whole, in under a second — when it does not. Every buyer
> screen at 390 and 1280, axe clean, no sideways scroll. 10/10 shop-app e2e cases pass (9 with the gallery up, the originals case again with it down).
>
> **Today's app:** no behaviour change from phase 23, but phase 23 broke three e2e imports and one smoke-spec path,
> so its suite cannot run as it stands (Found 1–2).

## How it was run

- **Builds:** the production builds already in the tree (`engine/apps/shop/.next` BUILD_ID `A6dsa97u84_dF8TKXcmhc`,
  `engine/apps/web/.next` `UkuhLN3Ho8ftPJOPH2PPv`, both 2026-11-19 10:15); no source file under `engine/` is newer
  than either, so neither was rebuilt.
- **Shop database:** `indies_shop_p23_qa`, a clone of `indies_shop_p23` (cms-shop's migration, the four staff
  accounts of `tests/e2e/admin/accounts.ts`, stores `E2E-A`/`E2E-B`, three orders) seeded through cms-shop's own
  Payload with the shop's categories, settings defaults, the mock sheets (80 products, 120 stores, 7,227 stock
  rows, the welcome discount), one picture per product, the three built-in pages, and two products made from an
  original: `M.0232` (the gallery publishes it) and `M.9999` (it does not). Dropped afterwards.
- **Shop server:** `next start` of `engine/apps/shop` on port 4881, the one-app environment
  (`SITE_HOSTS=shop.localhost,www.shop.localhost`, no `GALLERY_HOSTS`/`SHOP_HOSTS`/`ADMIN_HOST`),
  `GALLERY_ORIGIN=http://gallery.localhost:4880`, `MIDTRANS_MODE=simulate`, `LOCAL_PRODUCTION_BUILD=1`, the
  Turnstile test keys. A fresh start for each gallery state (the shop keeps a gallery answer for hours).
- **Gallery:** today's app on port 4880 against `indies_p23_galqa` (`db:fresh`, `vocabulary` and `gallery-sample`
  published, derivatives), serving `/api/x/originals/*` on `gallery.localhost`. Dropped afterwards.
- **Playwright:** `pnpm test:e2e:shop` (`playwright.shop.config.ts`, `tests/e2e/shop-app/**`), one worker,
  `E2E_PORT=4881`, `E2E_EVIDENCE=1`; `E2E_GALLERY=up` for the full run with the gallery up, then the gallery
  stopped, the shop restarted, and `E2E_GALLERY=down … originals`.

## Done when, clause by clause

| Clause                                                           | Result           | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runs on `shop.localhost` from its own database, production build | ✅               | `host.spec.ts`: `shop.localhost/` 200, `/admin/login` 200, the old `/shop/en` 404; `gallery.localhost` and an unknown host 404 on the shop's port, `/admin` with them (`drive.json` `host`)                                                                                                                                                                                                                                                                                                                                                             |
| Checkout → payment (simulator) → tracking                        | ✅               | `purchase.spec.ts` "in band": items Rp 75.000 + fee Rp 20.000 from the bands = Rp 95.000, order `pending_payment` at once, Pay → simulator → Settle → "Payment received" → "Track your order" → `/track/<token>`; the owner's API reads `paid`. "Past the last band" (Jakarta): "We're confirming your delivery price", no Pay button, `awaiting_quote`; the owner sends Rp 35.000 on `/admin/orders/<id>` (`/api/x/orders/quote` → 303), the order is `pending_payment`, Pay Rp 110.000 → Settle → paid → tracking. Screens `in-band-*`, `past-band-*` |
| Checkout → payment (**sandbox**)                                 | ❌ not evidenced | No Midtrans sandbox keys on this workstation; the simulator path is the only one run. Follow-up 1                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Admin: owner, editor, store roles                                | ✅               | `admin.spec.ts`: each signs in on the shop's host; owner and editor land on `/admin` (the Today link above the sidebar), store staff on `/admin/orders`; Partners in the owner's sidebar alone and `GET /api/partners` 200 / 403 / 403. Sidebars in `drive.json` `admin.*`; screens `admin-*-landing-{390,1280}`                                                                                                                                                                                                                                        |
| A store user sees only its store                                 | ✅               | Store A lists its 2 orders, store B its 1 — exactly the owner's list of each store's orders; the other store's orders by store: 0, by id: 404; the admin's list shows the same rows (`admin-storeA-orders-1280`, `admin-storeB-orders-1280`)                                                                                                                                                                                                                                                                                                            |
| Partner sign-in                                                  | ✅               | `partner.spec.ts`: the owner turns a partner's sign-in on through REST; on `/partnership` a wrong password is refused ("That email and password do not match…"), the right one shows "Welcome, E2E Partner Hotel." with the shop's own `oei_partner` cookie (no `payload-token`), survives a reload, and signing out puts the form back (`partner-signed-in-{390,1280}`)                                                                                                                                                                                |
| "See the original" links when the gallery answers                | ✅               | `originals.spec.ts` with `E2E_GALLERY=up`: `M.0232` (gallery 200) shows one "See the original" link to `http://gallery.localhost:4880/product/1701-map-of-florida-…`, new tab; `M.9999` (gallery 404) no link (`original-up-*`)                                                                                                                                                                                                                                                                                                                         |
| … absent, never failing, when it does not                        | ✅               | `E2E_GALLERY=down` (gallery stopped, shop restarted): both products 200, Add to bag shown, no link; 760 ms for the first page (the 1.5 s client gives up on a refused connection at once), 52–132 ms after (`original-down-unlinked-*`)                                                                                                                                                                                                                                                                                                                 |
| 390 and 1280, axe clean                                          | ✅               | Every buyer screen above at both widths: axe no violation, no horizontal scroll; the admin landings at both widths                                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Today's app, unchanged by phase 23

Run once, CI-style: `pnpm test:e2e` (all projects) with `CI=1` (2 retries), `E2E_WORKERS=4`, `E2E_EXPECT_UA_FIX=1`,
against today's app's build on port 4880, with `start-server.sh`'s variables plus `e2e.yml`'s extras (a fresh
`PAYLOAD_SECRET` and `ci:` key ring, shared `ORDER_LINK_KEY`, `BAG_COOKIE_KEY` and `REVALIDATE_SECRET`, Mailpit,
`MIDTRANS_MODE=simulate`, the Turnstile test keys), on `indies_p23_webqa` seeded as `e2e-db.sh seed` does (uploads to
the dev stack's MinIO, as `tests/e2e/admin/local.mjs` runs locally, then the derivative backfill). Dropped afterwards.
The specs' evidence writes under `docs/gates/{3.6,7.2,performance,…}` (71 files) were put back byte for byte
afterwards. Summary: `v2-shop/web-e2e.json`.

**As it stands, the suite does not run: phase 23 broke three of today's e2e imports** (Found 1). With those three
import paths pointed at where phase 23 moved the modules — for the run only; the files were restored byte for byte
afterwards (sha1 checked) — the result is:

| Run                  | Tests | Passed | Skipped | Flaky | Failed | Wall   |
| -------------------- | ----- | ------ | ------- | ----- | ------ | ------ |
| Phase 22 gate, AFTER | 227   | 195    | 30      | 1     | 1      | 8m 29s |
| This run             | 229   | 193    | 29      | 3     | 4      | 9m 02s |

Every difference, attributed:

- **+2 tests, +2 passed:** `[shop-e2e] product-page-locale.spec.ts` at 390 and 1280, added after the phase-22 gate.
- **Failed 1 → 0 for the thumbnail case, skipped 30 → 29:** the `[admin-product-editor]` thumbnail case (phase 22's
  one failure) is fixed, so `Duplicate makes a draft copy…`, which skipped behind it, runs and passes.
- **4 failed, all one test-harness defect of phase 23:** `[shop-mobile|shop-desktop] smoke.spec.ts › the home page in
en|id …` reads the home's words from `engine/apps/web/src/sites/shop/lexicon/<locale>.json`, which 23.3 moved to
  `engine/packages/storefront/src/sites/shop/lexicon/` (the keys are there). The pages themselves answer: the same
  host's status, a11y and shop-e2e projects pass. Found 2.
- **Flaky 1 → 3:** `[gallery-e2e] pages.spec.ts › lists its available work before its sold one` is phase 22's known
  flake. `[gallery-a11y] chat.spec.ts` (a focus read at 390 on attempt 1) and `[admin-gate] the owner's screens` (axe
  colour contrast on the admin sidebar while it slides) passed on retry, and again run alone on the first attempt
  (`--retries 0`: 1/1; 15 passed, 1 skipped by design). Timing, not phase 23: neither spec nor what it renders changed
  in phase 23, and the shop app's own spec met the same sidebar transition (now waited out in
  `tests/e2e/shop-app/support.ts`).

**Verdict:** no behaviour change in today's app attributable to phase 23, but its e2e suite cannot run until Found 1
and Found 2 are fixed. CI would show that as a red e2e job.

## Found

1. **Today's e2e suite fails to load (phase 23, 23.1).** 23.1 moved the import kit to `cms-core` and the shop's
   collections to `cms-shop`, and three test files still import the old paths: `tests/e2e/admin/stores-stock.spec.ts`
   (`cms/src/import/xlsx.test-support`, a static import, so Playwright stops at load and runs **nothing**),
   `tests/e2e/admin/fixtures.ts` (`cms/src/import/cli-cache`: the global setup and every admin spec's `fixtures()`
   fail) and `tests/e2e/shop/payment.spec.ts`'s seed script (`cms/src/collections/stock-levels/shop.test-support`).
   **Fix:** point them at `engine/packages/cms-core/src/import/{xlsx.test-support,cli-cache}` and
   `engine/packages/cms-shop/src/collections/stock-levels/shop.test-support` (the run above did exactly that, and they
   work). A typecheck of `tests/e2e/**` would have caught it; nothing checks it today.
2. **`tests/e2e/smoke/smoke.spec.ts` reads the shop lexicon from today's app (phase 23, 23.3).** `homeCopy()` builds
   `engine/apps/web/src/sites/${site}/lexicon/${locale}.json`; the shop's moved to
   `engine/packages/storefront/src/sites/shop/lexicon/`. **Fix:** read the shop's from the storefront path (the
   gallery's is still in the app).
3. **Noted, not defects:** the bag keeps its line after the order is placed and paid (the tracking page's header still
   shows 1). This is the same shared `storefront` code as today's app, and no doc says the bag empties. The admin's
   Orders list fills its Sending store column after the rows (a moment of "<No Sending store>"); the shop-app spec now
   waits for it.

## Follow-ups

1. **The sandbox clause.** Run `purchase.spec.ts` with `MIDTRANS_MODE=sandbox` and sandbox keys once they exist (phase
   24's staging), paying on Midtrans's sandbox page instead of the simulator.
2. **Fix Found 1 and 2**, then re-run today's suite; add `tests/e2e/**` to a typecheck so a moved module fails
   `pnpm verify`.
3. **CI for the shop app** (phase 24): `pnpm test:e2e:shop` against the shop app's own build and database, with the
   originals spec run in both gallery states.

## Files

`playwright.shop.config.ts`; `tests/e2e/shop-app/{support,checkout}.ts` and
`tests/e2e/shop-app/{purchase,admin,partner,originals,host}.spec.ts`; `package.json` (`test:e2e:shop`);
`tests/e2e/support/global-setup.ts` (`E2E_FIXTURES=none` skips today's CMS fixtures, since the shop's accounts live in
its own database); evidence in `docs/gates/v2-shop/` (`drive.json`, `web-e2e.json`, 39 screenshots).
