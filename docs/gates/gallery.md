# Gallery gate — phase 5 (5.5.d) — NOT PASSED (one product defect: axe on the item page)

QA (Sonnet seat), branch `w/5.5a`, 2026-10-07. Staging: gallery `https://indies-gallery.gaiada.com`, shop/admin
`https://old-east-indies.gaiada.com`, release `production-20261007T075619Z-643bffa` (main 643bffae), with the
gallery sample seeded (48 published works) and the vocabulary published (66 places, 127 makers, 110 terms).

> **Status: NOT PASSED.** Every clause passes except **"axe is clean"**: axe reports
> `landmark-complementary-is-top-level` on every item page (available and sold), because the Ask panel is an
> `<aside>` nested inside `<main><article>` (D1 below). The earlier defects (the sold `<meta>`, the viewer CORS
> failure) are fixed and proven on this release. Once D1 is fixed, `done-when.spec.ts` is rerun twice and the status
> becomes PASSED. Nothing else is open except the follow-ups.

**Phase 5 Done when** (TASKS.md): on staging, on a phone, a visitor searches by a place's old name, opens an item,
zooms into its detail, taps "Ask about this" and lands in WhatsApp with the item in the message. "Sell to us" opens
WhatsApp or sends a form that appears as a lead. A sold item is marked Sold. No price, cart or sign-in appears
anywhere. axe is clean and Lighthouse mobile meets the budget.

## Clause by clause

| Clause | Evidence | Where | Verdict |
| --- | --- | --- | --- |
| 5.1.d Search by old name finds the item; drafts never listed; no `askingPrice`; axe clean at both widths | e2e on a production build, passed twice on a warm server after the catalogue-tag fix | main `70db972`, board `c420c34`; `docs/reports/workers/5.1cache.md`. Staging: the 5.5a journey's Batavia search, 8/8 (draft twin hidden) | **PASS** |
| 5.2.e Zoom, tiles from `iiif/` at 390 px | `tests/e2e/gallery/item.spec.ts`: no `iiif/` request before Zoom; `info.json` and tiles 200 from one asset folder; holding `+` loads more; no WebGL/CORS error | staging ×4 (`w/5.2e`, `docs/reports/workers/5.2e.md`) | **PASS** |
| 5.2.e `uploads/` 403 anonymously | file route 403 (owner 200), bucket key 403 (`info.json` 200) | staging ×4 | **PASS** |
| 5.2.e Sold: "Sold", only "Ask for another example", no "Price on request" | visible page and whole document (head meta, og, twitter included), en and id | staging on 643bffa, 5/5 twice (`docs/reports/workers/5.2e.md` on `w/5.2e`) | **PASS** |
| 5.2.e No price in HTML, RSC or JSON | 2 works × 2 locales; `askingPrice` is stored, never served | staging ×4 | **PASS** |
| 5.3.d Ask → `wa.me` naming the item and stock number; Sell-to-us creates a lead and an email; bot, oversize, `.exe` and 11th post refused | e2e 6/6, refusals 403/413/415/429 | main `f7cad4b`, `docs/reports/workers/5.3.md`. Staging: the 5.5a journey, 8/8 | **PASS** |
| 5.3sold A status change shows at once | One E2E work, page warmed. Sold → one fetch → `sold`, Sold badge, no "Ask about this", "Ask for another example". Available → one fetch → "Ask about this" | staging 61b3b26, scratch probe, cleaned up | **PASS** (the head text is fixed on 643bffa) |
| 5.4.c Maker and place list their items; an edited page appears after tag invalidation; axe at both widths | e2e 9/9, re-passed | main `6ef7de0`, `docs/reports/workers/5.4.md` | **PASS** |
| 5.5.a Journey: search → item → zoom → Ask → Sell to us, 390 and 1280 px, en and id | `journey.spec.ts` on 643bffa, `--workers=1`: run 1 4/4, run 2 3/4, run 3 4/4. The one failure is a lost Zoom click (D2), 1 in 12 test runs, not the CORS defect: the viewer never opened, no CORS error. Zoom draws with no CORS error in every other run | staging, runs below | **PASS** (D2 intermittent, noted) |
| 5.5.d DPR 3 path: search → item → Zoom at 390 px, DPR 3 | `dpr3-navigation.spec.ts`: "Batavia" search, click card 746, lead `naturalWidth > 0`, Zoom, viewer canvas draws (> 8 distinct colours), no "cannot be opened", no console error naming CORS, WebGL or texture. 2/2 | staging 643bffa, `docs/gates/gallery/dpr3-search-to-item-zoom.png` | **PASS** |
| 5.5.d Old name → modern place with real data | `/search?q=Batavia` lists 746 (P.1180, catalogued under Jakarta), also 200 and 2013 | `done-when.spec.ts` step 1, both runs | **PASS** |
| 5.5.d axe clean on every page walked | home, browse, search results, sell-to-us: clean. **Item page (available) and a sold item: `landmark-complementary-is-top-level: 1`** | `done-when.spec.ts` ×2, identical both runs | **FAIL** (D1) |
| 5.5.b No cart, checkout, sign-in, price or "offer" in the built HTML | `no-commerce.spec.ts`: both locales, 0 violations | main, `docs/reports/workers/ds-5.5b.md` | **PASS** (staging run, 643bffa: 0 violations) |
| 5.5.c Lighthouse mobile ≥ 90 performance, 100 accessibility | browse 91, item 96, home 95 (medians); accessibility 100 on all 9 runs | below, `docs/reports/workers/5.5c.md` | **PASS** (TASKS 5.5.d as written). The LCP budget miss is a known follow-up for phase 10 (F1), not a gate failure |
| Empty search | `/search?q=zzzzqqq` and `/id/cari?q=zzzzqqq`: 200, "Nothing matches “zzzzqqq”." and "Ask us about “zzzzqqq”" | below | **PASS** (finding F3) |

## Lighthouse (5.5.c)

`MSYS_NO_PATHCONV=1 node tests/e2e/gallery/lighthouse/run.mjs --base https://indies-gallery.gaiada.com --out
docs/reports/workers/5.5c --runs 3 /browse /product/200-… /`. Mobile, simulated throttling, from the workstation.

| Page | Perf (median) | A11y | LCP ms | CLS | TBT ms | Script KB | Runner result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| /browse | 91 (92 · 91 · 91) | 100 | 3409 | 0.000 | 56 | 145 | FAIL (LCP) |
| /product/200-the-new-governor-general-palace-in-the-koningsplein-batavia | 96 (95 · 96 · 96) | 100 | 2852 | 0.000 | 54 | 145 | FAIL (LCP) |
| / | 95 (95 · 98 · 95) | 100 | 2943 | 0.000 | 32 | 142 | FAIL (LCP) |

**Verdict: PASS.** The gate holds to TASKS 5.5.d as written: performance ≥ 90 and accessibility 100 on the listing
and an item page. Both are met on all 9 runs. The runner's "FAIL" is the `lighthouserc.web.json` LCP budget
(≤ 2500 ms) alone. LCP was 2.85–3.45 s, measured from the workstation. Following the shop gate's precedent
(`docs/gates/shop.md`, LCP 2.0–2.7 s), the miss is recorded as a **known follow-up for phase 10 hardening** (F1),
not a gate failure. JSONs: `docs/reports/workers/5.5c/{browse,product-200,home}.json`. Per-run phases are in the
5.5c report.

## The empty search (390 px)

`docs/gates/gallery/empty-search-en-390.png`, `docs/gates/gallery/empty-search-id-390.png`. Each page answers 200 and
shows: the search box filled, "Results for “zzzzqqq”", "0 works", the "Include sold" link, "Nothing matches
“zzzzqqq”." (id: "Tidak ada yang cocok dengan “zzzzqqq”.") and "Ask us about “zzzzqqq”" (id: "Tanyakan “zzzzqqq”
kepada kami").

## e2e outputs (staging, 643bffa; `E2E_BASE_GALLERY=https://indies-gallery.gaiada.com E2E_BASE_SHOP=https://old-east-indies.gaiada.com`, `--workers=1`)

- **5.2e** `item.spec.ts` (on `w/5.2e`): `5 passed (1.2m)`, `5 passed (60.0s)`. Report: `docs/reports/workers/5.2e.md`.
- **DPR 3** `dpr3-navigation.spec.ts`: `1 passed (7.1s)` and `1 passed (24.1s)`. A first attempt failed on console
  *warnings* only (software-WebGL deprecation, my probe's ReadPixels stall); the assertion now reads console errors.
- **5.5a** `journey.spec.ts`: run 1 `4 passed (1.2m)`; run 2 `3 passed`, 1 failed (en 1280 px,
  `getByRole('group', { name: 'E2E 5.5a recto…' })` not visible 5 s after the Zoom click; the page snapshot shows the
  button clicked and no viewer); a 4x repeat of that case passed 4/4; run 3 `4 passed (59.2s)`.
- **no-commerce** `no-commerce.spec.ts`, once: `1 passed (1.1m)`. First attempt timed out on `/sell-to-us` (Turnstile
  keeps the network busy, so `networkidle` never came); the scan now waits for `load`. It then flagged "buy" in the
  Sell-to-us lede ("We buy antique maps…": the gallery buying from the visitor); that one lexicon sentence is now an
  allowed phrase. 13 CMS pages (`/about`, `/guarantee`, `/certificate`, `/condition`, `/shipping`, `/visit`,
  `/id/contact` and the id twins) answer 404 on staging and are listed "not built yet" (F7).
- **Walk-through** `done-when.spec.ts` (390 px, DPR 3), run twice, identical: `3 passed, 2 failed`.
  - pass: search "Batavia" opens 746; Sell to us (201, one `sell` lead, exactly one owner email); axe on home and browse.
  - fail: "opens an item, zooms…" and "a sold item is marked Sold", both at `axe on the item page` / `axe on a sold
    item`: `landmark-complementary-is-top-level: 1`.
  - With axe made soft (local experiment, reverted) the rest of both tests passes: the lead image loads, the viewer
    opens with no CORS error, the WhatsApp link carries the stock number and title; the sold page says Sold, has no
    "Ask about this" and no "Price on request". The axe failure is the only one.
- Screenshots: `docs/gates/gallery/walk-*.png` (390 px walk), `docs/gates/gallery/dpr3-search-to-item-zoom.png`,
  `docs/reports/workers/5.2e/*.png` (on `w/5.2e`), `docs/reports/workers/5.5a/*.png`.
- Staging after the runs: owner reads find 0 `E2E` works, leads, media and places, and gallery site-settings contact
  back to null / `leadNotifyEmails` [].

## Defects

- **D1 (blocks the gate) axe `landmark-complementary-is-top-level` on every item page.**
  `engine/apps/web/src/sites/gallery/item/ask-panel.tsx:45`, `:59`, `:70` render the panel as `<aside>`, which is
  inside `<main><article>`, so it is a nested complementary landmark. Fix: a `<section aria-label=…>` or a `<div>`
  (keep the `data-status` hooks the tests use). Owner: FE. Lighthouse a11y 100 did not catch it (different rule set).
- **D2 (intermittent, 1 in 12 runs) a Zoom click can be lost.** In one run the button was clicked and the viewer never
  opened within 5 s. Likely a click before hydration; unproven. Owner: FE (`item/zoom-viewer.tsx`: keep the button
  disabled until it can open, or queue the click). Not blocking.
- **D3 (low) search cards link to `/product/<id>` with no slug,** which answers a 308 to the slugged address (one extra
  hop). The e2e selectors now accept both. Owner: FE.

## To pass this gate

1. Fix D1, release, rerun `done-when.spec.ts` x2 (expect 5/5), then set the status to PASSED.
2. **Board:** `pnpm tasks:report 5.5.a 5.5.c`; 5.2.e and 5.5.d are Checks ticked by the orchestrator after D1.

## Findings (not blocking 5.5.d as written)

- **F1 LCP over budget (known follow-up, phase 10 hardening; not a gate failure).** All three pages measure
  2.85–3.45 s against ≤ 2.5 s, from the workstation. Leads, none proven:
  - **The media host has no `preconnect`.** /browse's first card image is preloaded at high priority and
    discoverable in the HTML. It still starts about 1.1 s late, because it comes from the cross-origin
    `old-east-indies.gaiada.com/_media/`.
  - **Home's text LCP has render delay** (about 2 s) behind 3 render-blocking CSS chunks. `font-display` passes.
  - **TTFB (650–740 ms simulated) includes the workstation's route.** A run from a container on the staging host,
    as the shop gate did, would remove that share.
  - Owner: FE/perf.
- **F2 Deleted media leave their public derivatives and tiles** in the bucket. Owner: media.
- **F3 "Ask us about …"** on the empty search is plain text, not a link, while the gallery has no contact channel
  (OA2 placeholder). Recheck once channels exist.
- **F4 A 1×1 PNG upload is recorded `failed`** by the derivative pipeline. The shared e2e fixture uses one, so those
  fixtures have no public image on staging. Owner: media.
- **F5 The "low-resolution photograph from the old site" notice** shows for any image under 1600 px, whatever its
  provenance. Owner: FE/copy.
- **F7 CMS pages not seeded on staging:** `/about`, `/guarantee`, `/certificate`, `/condition`, `/shipping`, `/visit`, `/id/contact` answer 404. Footer links to them, if any, are dead. Owner: seed/content.
- **F6 Known gaps:** no header search box, no Esc/close on the viewer. At 390 px the header shows the logo lockup
  and a wrapped wordmark.
