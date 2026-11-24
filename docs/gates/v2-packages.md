# No behaviour change gate — phase 22 (22.5)

QA seat, re-run 2026-11-16 to 2026-11-18 (the 2026-11-03/05 run of this gate measured phase 22 alone; since then
phase 27 has landed in the same uncommitted tree, so it was measured again). **BEFORE** is commit `9d9d30e5`, the
last commit before Plan v2. **AFTER** is the working tree of `plan-v2/phase-a` as it stands: phase 21 (docs),
phase 22 (`@engine/cms-core`, `@engine/ui`, `@engine/chat`, the cross-app lint) **and phase 27** (the shop's admin
rebuilt, its header/footer globals, media taking video and PDF, delivery priced by distance, product-page copy
from the settings, four migrations).

> **Verdict: no phase-22 regression found.** Every difference between BEFORE and AFTER is either a deliberate
> phase-27 change, a seed difference that phase 27 brought with it, or a flake that also happens on BEFORE. The
> gallery — which phase 27 does not touch — is 56/56 pixel-identical once its one flaky shot is re-taken. On the 190
> e2e tests present on both sides, all 190 have the same outcome. Lighthouse scores and budgets are the same within
> run-to-run noise; script grew by 255 B per home, all of it phase-27 code. No migration belongs to phase 22.
>
> **Caveat:** phase 22 can no longer be isolated — its files are interleaved with phase 27's in one uncommitted
> tree. "No change from phase 22" is therefore shown by attribution (each delta traced to a phase-27 file or to
> noise), not by a phase-22-only build. The phase-22-only measurement is the 2026-11-05 run (116/116 pages 0 px,
> same 193 e2e outcomes, +12 B script), recorded in this file's history.
> **Not claimable here: "CI green".** Nothing is committed or pushed, so no CI run exists.

## How it was run

- **Two scratch worktrees** (deleted afterwards): `before` = `git worktree add --detach … 9d9d30e5`; `after` = the
  same commit plus `git diff --binary HEAD` applied plus every untracked, non-ignored file copied in. The copy's
  content hash (sha1 over every modified and untracked file) equals the main checkout's, checked at the start and
  again after the laptop restarted mid-run. Running AFTER in a copy kept the e2e run's evidence writes (the specs
  rewrite `docs/gates/{3.6,7.2,performance,…}`) out of the main checkout and gave both sides the same environment
  (neither has an `.env.local`). `git status` of the main checkout was identical before and after `pnpm verify`.
- **Database per side**, built as `.github/scripts/e2e-db.sh seed` does: `db:fresh`, `vocabulary --publish`,
  `gallery-sample --publish`, `shop`, `tests/e2e/support/publish-shop-products.ts`; media in the local folder (no S3
  settings), as in CI. `indies_qa22before` (11 migrations) and `indies_qa22after` (15 migrations). Both seeds: 80
  published products, 64 media, 49 works, 120 stores. AFTER's publish script also creates and publishes three shop
  pages (`home`, `partnership`, `stores`) — phase 27 removed the hidden page fallbacks, so the seed now supplies them.
- **Build:** `pnpm build` with `env -u DATABASE_URL -u PAYLOAD_SECRET PGHOST=127.0.0.1 PGPORT=1
  LOCAL_PRODUCTION_BUILD=1`, as `e2e.yml` builds it.
- **Server:** `next start` in place (not `assemble-artifact.sh` + `server.js`: on Windows the `cp -r` breaks pnpm's
  links, as before), from an empty environment with `start-server.sh`'s variables plus `e2e.yml`'s extras:
  `HOSTNAME=0.0.0.0`, both hosts, fresh `PAYLOAD_SECRET` and `ci:` key ring, shared `ORDER_LINK_KEY`,
  `BAG_COOKIE_KEY`, `REVALIDATE_SECRET`, Mailpit SMTP, `MIDTRANS_MODE=simulate`, the Turnstile test keys,
  `LOCAL_PRODUCTION_BUILD=1`. BEFORE on port 4311, AFTER on 4312.
- **Playwright:** `pnpm test:e2e` (all projects) with `CI=1` (2 retries), `E2E_WORKERS=4`, `E2E_EXPECT_UA_FIX=1`,
  `MAILPIT_URL`, `REVALIDATE_ORIGIN`, the three shared keys, and `DB_SUFFIX` so the specs' SQL runs in the dev
  Postgres container (this host has no `psql`). Node cannot resolve `*.localhost` here, so a `--require` preload
  (scratch only) answers `dns.lookup` / `dns.promises.lookup` for `*.localhost` with 127.0.0.1 — CI uses
  `/etc/hosts` instead.
- **Lighthouse:** both URLs of `lighthouserc.web.json`, 3 mobile runs each, through `tests/e2e/a11y/lighthouse.mjs`
  (`lhci autorun` crashes on this host, `shop-payment.md` finding 2), judged against `lighthouserc.web.json`'s
  budgets. Each side ran on its fresh seed, before its e2e run.
- **Screenshots:** 110 per side — every public page of both sites in English and Indonesian at 390 (mobile
  emulation, DPR 2.75) and 1280, full page, animations off, reduced motion, lazy images scrolled in, fonts loaded;
  the chat opened on both homes (viewport); the bag with one line and `/checkout`; the owner's admin sign-in,
  dashboard, product list and a product edit. Compared RGBA-exact, no threshold. Detail paths were discovered once
  on BEFORE (`/product/2050`, `/makers/abraham-ortelius`, `/places/bali-lombok`,
  `/product/island-chart-reproduction-wayang-2`, `/collections/prints`) and reused on AFTER.
- **Interruption:** the laptop restarted after the BEFORE side finished. The OS's temp clean-up had deleted files
  inside both scratch worktrees' `node_modules` (e.g. `esbuild/lib/main.js`); both were wiped and reinstalled with
  `--frozen-lockfile`, and BEFORE was rebuilt (same route table). AFTER's database was dropped and re-seeded from
  scratch after a first attempt found `db:fresh` keeps an existing database (it creates, never drops).

## Pages: 110 pairs

| Site    | Pairs | 0 px first pass | Different | Attribution                                                                                 |
| ------- | ----- | --------------- | --------- | ------------------------------------------------------------------------------------------- |
| gallery | 56    | 55              | 1         | (c) flake: `gallery-chat-open-1280`; re-shot AFTER is 0 px from a re-shot BEFORE            |
| shop    | 46    | 2 (chat open)   | 44        | (a) 39 footer line only; (a) 2 checkout; (a/b) 2 product, Indonesian; (c)+(a) 1 home, ID 390 |
| admin   | 8     | 0               | 8         | (a) phase-27 admin rebuild                                                                  |

Per pair: `v2-packages/pixel-diff.txt` (size, pixel count, row band, attribution). The differences, one by one:

1. **Shop footer's bottom line — every full-page shop shot (39 alone, plus inside the 5 below). (a)** Exactly 770 px
   at 1280 and 3,986 px at 390 (829 / 4,200 in Indonesian), a 12-row band at the page foot. BEFORE shows "Privacy ·
   Terms"; AFTER shows "© 2026 Old East Indies". Phase 27 (27.5.c) rebuilt `sites/shop/shell/shop-footer.tsx`: the
   bar lists the `shop-footer` global's legal links, else the copyright; the CI seed has no legal links.
   `v2-packages/shop-footer-line-{1280,390}.png` (BEFORE left, AFTER right).
2. **Checkout. (a)** `/checkout` at both widths: a Delivery line ("Pin your spot to see the delivery price") and
   "Total to pay" above the button, and a new summary note — phase 27's delivery priced by distance bands
   (`sites/shop/checkout/*`). `v2-packages/shop-checkout-1280.png`.
3. **Indonesian product page. (a/b)** `shop-product-id-{390,1280}`: the delivery sentence and the two signal lines
   are in **English** on the Indonesian page. Phase 27 moved this fixed copy into `site-settings.shop.productPage`
   (`sites/shop/product/page-copy`); the seed fills only English, so Indonesian falls back to it. The English page is
   unchanged. `v2-packages/shop-product-id-copy-1280.png`. Not phase 22 — but a visible gap for phase 27 (open item 2).
4. **Shop home, Indonesian, 390. (c) + (a)** 13,877 px = the footer line (4,200) plus 9,677 px where a broken
   lazy image (the original print) shows its alt text or not. BEFORE does the same to itself: three fresh BEFORE
   shots gave 0, 9,677, 9,677 px against BEFORE's first; AFTER against the matching BEFORE shot leaves only the
   4,200-px footer line. `v2-packages/flake-shop-home-alt-*.png`, `v2-packages/reshoot.txt`.
5. **Gallery chat open, 1280. (c)** 10,080 px in the 24 rows under the open panel at the viewport's foot. Three
   fresh BEFORE shots differ from BEFORE's first by 10,080 / 8,332 / 2,115 px; AFTER re-shots 1 and 3 are **0 px**
   from BEFORE's re-shot 1. `v2-packages/flake-gallery-chat-before-vs-after-reshot-1280.png`, `reshoot.txt`.
6. **Admin — sign-in, dashboard, list, edit at 390 and 1280. (a)** The phase-27 admin: Old East Indies sign-in with
   its logo, the Today home with order/stock/lead tiles and the content/orders/catalogue/stores/settings groups, the
   product list with photo and stock columns, the one-screen product editor. `v2-packages/admin-*-1280.png`.

The gallery's 55 other pages and both shop chat panels are byte-for-byte the same pixels — the evidence that
`@engine/ui` tokens/components and `@engine/chat` render as before.

## E2E

| Run    | Tests | Passed | Skipped | Flaky | Failed | Wall    |
| ------ | ----- | ------ | ------- | ----- | ------ | ------- |
| BEFORE | 193   | 166    | 25      | 2     | 0      | 3 m 35s |
| AFTER  | 227   | 195    | 30      | 1     | 1      | 8 m 29s |

- **190 tests exist on both sides; 190 have the same outcome** (`v2-packages/e2e.json`).
- **3 only on BEFORE:** `roles.spec.ts` "…the sidebar and the dashboard counts…" ×3 — phase 27 renamed them "…the
  Today counts…" (they pass on AFTER).
- **37 only on AFTER:** phase 27's new projects and specs (admin-product-editor, -orders-door, -stores-stock,
  -site-navigation, -home-menu, -staff, -gate, -timed; 3 roles and 8 shop-e2e cases). 4 of them skip by design (person-paced or staging-only); 1 (`Duplicate makes a draft copy…`) skips because the test before it in its serial group fails.
- **Flaky, both sides:** `[gallery-e2e] pages.spec.ts › lists its available work before its sold one` — its
  `payload run` seed child fails on the first attempt under parallel workers, passes on retry; passes alone on its
  first attempt. **(c)**, the same as the 11-05 run's F2.
- **Flaky, BEFORE only:** `[admin] storeA: the sidebar and the dashboard counts` (the mobile menu's Close button not
  visible on attempt 1). The test no longer exists on AFTER. **(c)**
- **Failed, AFTER only:** `[admin-product-editor] the list shows the thumbnail and total stock, filters and moves in
  bulk` — all 3 attempts, and again when re-run alone. The product row shows "No photo" (`pe-thumb--none`) where the
  spec expects `img.pe-thumb`. A phase-27 spec of a phase-27 cell (`cms/src/admin/products/list-cells.jsx`,
  27.2.d): `coverOf` returns null although the same media reads fine over REST as the owner. **(a), open item 1** —
  not a phase-22 regression on the evidence here (cms-core's media access answers the owner's read), but CI will
  fail on it, since CI runs with the same environment as this run.

## Lighthouse (median of 3, mobile)

| Page         | Perf (B → A) | A11y | LCP ms (B → A) | CLS | TBT ms (B → A) | Script bytes (B → A) | CPU bench (B / A) |
| ------------ | ------------ | ---- | -------------- | --- | -------------- | -------------------- | ----------------- |
| gallery home | 93 → 93      | 100  | 3195 → 3204    | 0   | 26 → 28        | 151,652 → 151,907    | 3342 / 3120       |
| shop home    | 94 → 94      | 100  | 3054 → 3045    | 0   | 27 → 24        | 153,077 → 153,332    | 2871 / 3332       |

- Error budgets (CLS ≤ 0.05, TBT ≤ 200 ms, script ≤ 153,600 B) pass on both sides; LCP is over its 2,500-ms
  **warning** on both, this laptop's known baseline (`performance.md` F1). BEFORE's numbers equal the 11-03 run's.
- **Script +255 B per home (a):** one shared chunk changed (32,869 → 33,502 B raw). Its new code is phase 27's
  `sites/shop/shell/refresh-on-save.tsx` (a `payload-document-event` listener that refreshes on a preview save) and
  `shop-header.tsx`'s new-tab links (`newTabLabel` → `target="_blank"`, `rel`, `aria-label`). Everything else in the
  chunk is renamed CSS-module hashes and minifier names — the files moved into `@engine/ui` (22.2), no new code.
  **The shop home is now 268 B under its 153,600-B budget** (open item 3).

## Other checks

| Check                                     | Result                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm verify` on the main checkout        | ✅ exit 0: Prettier clean, lint, typecheck, 362 test files / 3,003 tests passed (2 files, 7 tests skipped), no file over 300 lines, `check:generated` no drift, tasks-lint and tasks:check ok, tokens clean                                                                                                               |
| `pnpm -s check:generated`                 | ✅ "ok, no drift (2 generator run(s) compared)"                                                                                                                                                                                                                                                                           |
| Cross-app lint fails a planted violation  | ✅ in the AFTER copy: `engine/apps/zzqa` importing `../../web/src/…` and `@engine/web/package.json` → 2 × `boundaries/no-cross-app-imports`; `engine/packages/ui` importing `@engine/web/package.json` → `@typescript-eslint/no-restricted-imports` ("Packages never import an app"); eslint exit 1. Plant removed |
| Migrations since `9d9d30e5`               | 4, all phase 27: `20261105_024103_shop_admin_data_model` (27.1.e), `20261109_082713_shop_header_footer_staff` (27.6), `20261116_031741_media_video_pdf` and `20261116_061814_media_label` (the shop-admin gate). None in `cms-core`, `ui` or `chat`. The 11-05 run had phase 22 complete at 11 migrations              |
| `payload-types.ts`                        | changed vs `9d9d30e5` (+706 −178), by those phase-27 schema changes; byte-identical at the end of phase 22 (11-05 run)                                                                                                                                                                                                    |

## Open items

1. **`admin-product-editor` thumbnail test fails on a fresh CI-like run (phase 27, blocks CI).** `coverOf` in
   `cms/src/admin/products/data.ts` returns null for a product with six photos; a REST read of the same media as the
   owner succeeds. Suspects: `viewerOf` (`payload.auth({ headers })` inside a list cell) returning no user in this
   environment (`ADMIN_HOST` unset, as in CI), or the `findByID` select. The phase-27 agent's run passed it with its
   `.env.local`. Owner: phase 27.
2. **Indonesian product page shows English fixed copy (phase 27).** Seed `site-settings.shop.productPage` in
   Indonesian, or keep the lexicon's per-locale wording as the fallback.
3. **Shop home script budget: 268 B left** (153,332 of 153,600). The next client-side addition fails CI.
4. **0-px gates need re-shots.** Two shots here vary between paints on the same build (the gallery chat panel's
   foot; a broken lazy image's alt text). A pixel gate should take each page twice or settle those two.
5. **CI not evidenced.** Push, and read e2e.yml and the Lighthouse job on the real runner.
