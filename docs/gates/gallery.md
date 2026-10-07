# Gallery gate — phase 5 (5.5.d) — DRAFT, not passed yet

QA on the claude seat (Opus), branch `w/5.5a`, 2026-10-07. Staging: gallery `https://indies-gallery.gaiada.com`,
shop/admin `https://old-east-indies.gaiada.com`, release `production-20261007T030310Z-61b3b26` (the /browse perf fix
and 5.3sold), with the gallery sample seeded (48 published works).

> **Status: NOT PASSED.** Two product defects are being fixed (TODO 1 and TODO 2 below). After the release that
> carries both, 5.2e and 5.5a are rerun and the 390 px **Done when** walk-through (TODO 3) is done. The clauses
> already evidenced are below.

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
| 5.2.e Sold: "Sold", only "Ask for another example", no "Price on request" | visible page: PASS ×4 (en, id). Whole document: **FAIL** — the `<head>` meta description says "Price on request" | staging runs 3–4 on 61b3b26 | **TODO 1** |
| 5.2.e No price in HTML, RSC or JSON | 2 works × 2 locales; `askingPrice` is stored, never served | staging ×4 | **PASS** |
| 5.3.d Ask → `wa.me` naming the item and stock number; Sell-to-us creates a lead and an email; bot, oversize, `.exe` and 11th post refused | e2e 6/6, refusals 403/413/415/429 | main `f7cad4b`, `docs/reports/workers/5.3.md`. Staging: the 5.5a journey, 8/8 | **PASS** |
| 5.3sold A status change shows at once | One E2E work, page warmed. Sold → one fetch → `sold`, Sold badge, no "Ask about this", "Ask for another example". Available → one fetch → "Ask about this" | staging 61b3b26, scratch probe, cleaned up | **PASS** (except the `<head>` text, TODO 1) |
| 5.4.c Maker and place list their items; an edited page appears after tag invalidation; axe at both widths | e2e 9/9, re-passed | main `6ef7de0`, `docs/reports/workers/5.4.md` | **PASS** |
| 5.5.a Journey: search → item → zoom → Ask → Sell to us, 390 and 1280 px, en and id | `tests/e2e/gallery/journey.spec.ts`: every step passes 8/8 except **zoom**, 1/8 | staging, `docs/reports/workers/5.5a.md` | **TODO 2** |
| 5.5.b No cart, checkout, sign-in, price or "offer" in the built HTML | `no-commerce.spec.ts`: 33 pages, both locales, 0 violations | main, `docs/reports/workers/ds-5.5b.md` | **PASS** (local build; rerun on staging in TODO 3) |
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

## e2e outputs (staging)

- **5.2e** (`tests/e2e/gallery/item.spec.ts`, `--workers=1`): on 188996d, 5 passed (3.2m) and 5 passed (2.6m). On
  61b3b26 with the whole-document sold check, 3 passed and 2 failed twice: both sold tests, `Error: in head —
  Expected substring: not "Price on request"` (id: "Harga atas permintaan"). Full outputs:
  `docs/reports/workers/5.2e.md` (on `w/5.2e`).
- **5.5a** (`tests/e2e/gallery/journey.spec.ts`, `--workers=1`): run 1 had 1 passed, 3 failed; run 2 had 4 failed.
  Each failure is only the two soft zoom assertions ("the viewer opens the image", "no CORS error"). Full outputs:
  `docs/reports/workers/5.5a.md`.
- Screenshots: `docs/reports/workers/5.2e/*.png` (on `w/5.2e`) and `docs/reports/workers/5.5a/*.png`.

## TODO before this gate can pass

1. **TODO 1: the sold `<meta>` description (code fix in progress, orchestrator).**
   `app/(gallery)/gallery/[locale]/item/[idSlug]/page.tsx` `generateMetadata` always appends `price.onRequest`.
   - Sold should say `status.sold`, and on-hold `status.onHold`.
   - Then rerun `item.spec.ts` ×2 with `--workers=1`. Expect 5/5.
2. **TODO 2: the viewer cannot open an image without tiles (nginx fix in progress, devops).**
   - Symptom: on an image ≤ 2400 px the viewer shows "This image cannot be opened in the viewer just now", and the
     console shows a CORS block on `…/_media/derivatives/v1/<asset>/<w>.webp`.
   - Cause: the lead `<img>` caches the same URL without CORS. `/_media/` sends no `Vary: Origin` and no
     allow-origin header to a request without Origin, so the browser reuses that cached copy for OpenSeadragon's
     CORS request.
   - Then rerun `journey.spec.ts` ×2 with `--workers=1`. Expect 4/4.
3. **TODO 3: the 390 px Done-when walk-through** on staging after TODO 1 and TODO 2. Run the no-commerce scan
   against staging and add axe on the item, search and sell-to-us pages if the walk-through finds gaps.
4. **Board:** `pnpm tasks:report 5.5.a 5.5.c` once green. 5.2.e and 5.5.d are Checks, ticked by the orchestrator.

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
- **F6 Known gaps:** no header search box, no Esc/close on the viewer. At 390 px the header shows the logo lockup
  and a wrapped wordmark.
