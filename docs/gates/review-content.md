# 10.6.f content gate — the owner's real content on staging

QA run, 2026-10-08, against staging (`https://indies-gallery.gaiada.com`, `https://old-east-indies.gaiada.com`, release
`production-20261008T050109Z-410136e8` or later), anonymous reads only, no writes, no sign-in. Specs:
`tests/e2e/review/` (`playwright.config.ts`: projects `data` HTTP-only, `mobile` 390x844, `desktop` 1280x800).
Run: `npx playwright test -c tests/e2e/review/playwright.config.ts` (workers 1; override origins with
`E2E_BASE_GALLERY` / `E2E_BASE_SHOP`; the price sample path with `E2E_PRICE_SAMPLE`; the browser with `E2E_CHROME`).

**Runs (back to back, the whole suite):** run 1 `51 passed (5.5m)`, run 2 `51 passed (4.9m)`. 0 failed, 0 skipped, 0 flaky.
(9 data + 21 per viewport x 2.)

## The Check, clause by clause

| Clause | Verdict | Evidence |
|---|---|---|
| Gallery lists every published record (390 and 1280) | **PASS** | See 1. |
| An item zooms on its full-size photograph | **PASS** | See 2. |
| No price figure in any gallery HTML, RSC or JSON | **PASS** | See 3. |
| Owner reads `askingPrice`, an editor does not | **NOT RE-RUN** (evidenced by the orchestrator) | See 4. |
| Shop lists the designs with their real pictures | **PASS** | See 5. |
| Both footers link the right Instagram | **PASS** | See 6. |

### 1. Every published record (`gallery-list.data.spec.ts`, `browse.ui.spec.ts`)
- The default `/browse` lists **available** works only and states "1,513 works". "Include sold" is the facet link
  `/browse?availability=sold` (it counts 196) and states "1,709 works".
- Every page was read, 24 cards a page, one request at a time: **available** 64 pages, **1,513 distinct** `/product/<id>`
  links, equal to the stated count; **with sold** 72 pages, **1,709 distinct** links, equal to the stated count.
  Available is a subset of the sold-included list; the difference is exactly **196** (the database's sold count).
  1,513 = 63 x 24 + 1 and 1,709 = 71 x 24 + 5, so the last pages hold 1 and 5 cards (asserted in the browser at both widths).
- All 70 sample works are on the default browse. The sample CSV holds only `available` works, so a sold item was taken
  from the list itself: item 1905 (sold-only) opens 200 with `data-status="sold"`, item 2049 (available) with `data-status="available"`.
- Browser, 390 and 1280: the count text, 24 cards a page, a card opens its item with the lead photograph decoded and the Zoom button.
- Drafts (104) and held works (10) are not on the site: the counts equal the published counts exactly.

### 2. Zoom on the full-size photograph (`zoom.ui.spec.ts`)
Items 507, 1237, 468 (tiled lead images), each at 390 and 1280. No `iiif/` request before Zoom; after the Zoom click `info.json` 200 and
tiles 200 from the same folder; the viewer canvas draws; no console error naming CORS, WebGL or texture; the browser never asks for `uploads/`.
Run 2, desktop (mobile alike): 507 `https://old-east-indies.gaiada.com/_media/iiif/b325326692a00198c884c32ecd3832be/info.json` 200, 3 tiles 200, canvas 11,524 colours;
1237 `.../iiif/5da06b6ec5d7760329bc744306566dc9/info.json` 200, 5 tiles, 27,372 colours; 468 `.../iiif/0fbce08141906d374839cb4f51327ea3/info.json` 200, 5 tiles, 17,624 colours.
Mobile: 507 3 tiles / 11,606 colours, 1237 5 / 27,434, 468 5 / 17,636. (Items 692 and 467 were not driven: three were asked for.)

### 3. No price figure (`no-price.data.spec.ts`)
- 70 sample works (the CSV, whole USD, including the 10 highest, max 280,000) x en (`/product/<id>`) and id (`/id/produk/<id>`) x HTML and RSC (`RSC: 1`)
  = **280 documents, 280 x 200**, each scanned for: `askingPrice` (any case); the word `USD`; a quoted `price`, `offers`, `priceCurrency`,
  `lowPrice`, `highPrice` JSON key; the work's figure beside a currency word or sign; the figure as a standalone number.
  **0 hits.**
- Standalone regex (`figureRegex` in `support.ts`): the figure bare or thousands-grouped (`,` `.` space, no-break space between triples),
  not preceded by a word character, `-`, `/`, a digit plus `.` or `,`, or a `.`, and not followed by a word character, `-`, `/` or `.`/`,` plus a digit:
  `` (?<![\w\-/]|\d[.,]|\.)280[,.  ]?000(?![\w\-/]|[.,]\d) ``. Currency form: `(USD|US$|$|IDR|Rp.?|SGD|S$|EUR|€|£)\s*<figure>` or `<figure>\s*(USD|dollars?|US$|IDR|EUR)`.
- **Limit, stated plainly:** the standalone check runs for figures of 1,000 and over that are not plausible years. Seven works have a price
  between 1000 and 2100 (1256=1380, 1590=1400, 1090=1900, 53=1190, 47=1190, 1255=1500, 1501=1400); a bare "1900" cannot be told from the work's own date
  ("c. 1900" on item 1090 matched on the first run, and is the work's date), so those seven take the currency, key and JSON-LD checks only. Prices under 1000 likewise
  take the currency check only (a bare "95" is everywhere in markup). The `askingPrice` and `USD` checks are unconditional for all 70.
- **JSON-LD:** the gallery item pages emit **0 JSON-LD blocks** (the spec parses any it finds and rejects `price`/`offers` keys; none exist to scan). The shop product pages do carry Product JSON-LD with `offers` (the shop sells; not in scope).
- `/browse`, `/browse?availability=sold`, `/id/jelajah`, `/search?q=bali` (HTML and RSC) and `/sitemap.xml` (3,816 `<loc>`): all 200; no `askingPrice`, no `USD`, none of the 70 figures beside a currency.
- Not checked: the figure standalone on listing pages (every listing carries years and counts); the earlier lists above stand for the item pages, the highest-risk surface.

### 4. Owner reads `askingPrice`, an editor does not — NOT RE-RUN by QA
No credentials here; no sign-in tried. Evidenced by the orchestrator on staging on 2026-10-08: owner `GET /api/works?where[stockNumber][equals]=M.0856` returns `askingPrice: 280000`;
a store user gets "You are not allowed"; anonymous gets no `askingPrice`; the gallery host's `/api` is 404. The editor case is covered by
`engine/packages/cms/src/collections/works/works-price.db.test.ts`, test **"shows the asking price to the owner alone, and never to an editor or the public"**
(it is `describe.skipIf(!server)`, a database-backed test; the board records it was not run locally while Docker was down, and no editor exists on staging).

### 5. The shop (`shop.data.spec.ts`, `shop.ui.spec.ts`)
- `/shop` states "156 products"; the 7 pages list **156 distinct** `/product/<slug>` cards; no page holds `SEED-SHOP-`, "Mock seed" or "Produk seed".
- 390 and 1280, `/shop` pages 1 and 2: 24 cards each; all 24 images carry a `srcset` (320w ladder), decode in the browser (`naturalWidth > 0`), and each `src` answers 200 `image/webp`.
- Catalogue products `bali-island-road-map-1937`, `balinese-girl-with-jepun-flowers-1957`, `east-indies-travel-guide-c-1938`: product page 200, the derivatives it loads 200 `image/webp`, the main image decoded,
  variants "Mounted print" Rp 450.000 and (after selecting) "Framed print" Rp 950.000, **no** "Digital mockup" anywhere in the page.
- Instagram products `exotic-bali-1930s`, `balinese-legong-dancer-1925`, `balinese-dancer-photograph-c-1927`, `lombok-turtle-snorkelling`: same checks plus "Digital mockup" visible on the page; Indonesian `/id/…` of `exotic-bali-1930s` says "Mockup digital".
- Retired mock `/product/greeting-card-set-frangipani`: **404**, no "Add to bag", no Product JSON-LD, no `SEED-SHOP-`, no Rp price. (The soft 200-not-found noted on the board is not seen on this URL now.)
- Observation, not a failure: the **Lombok Turtle** card on the listing shows no "Digital mockup" label (its lead picture is the plain artwork); its product page does (4 labelled mock-up pictures). The other three Instagram cards are labelled.

### 6. Footers (`footers.ui.spec.ts`)
Gallery `/` and `/id`: Instagram `https://www.instagram.com/indiesgalleryantiques/`, Facebook `https://www.facebook.com/IndiesGallery/`.
Shop `/` and `/id`: Instagram `https://www.instagram.com/oldeastindiesart/`, Facebook `https://www.facebook.com/OldEastIndies`. Exactly one link of each in the footer, exact `href`,
`rel="me noopener noreferrer"`, at 390 and 1280. 4 pages x 2 widths = 8/8 cases per run.

### 7. Screenshots (`screens.ui.spec.ts`), not committed (about 4.4 MB)
`tests/e2e/review/__screens__/`: `gallery-browse-{390,1280}.png`, `gallery-item-zoomed-{390,1280}.png` (item 1237, viewer open), `shop-listing-{390,1280}.png`, `shop-instagram-product-{390,1280}.png`.

### 8. axe (`screens.ui.spec.ts`)
Gallery `/browse` and `/shop`, 390 and 1280: **0 violations** (0 serious, 0 critical) in all four, both runs.

## What failed
Nothing in the final runs. During authoring: a price figure of 1900 matched item 1090's date (a test-design limit, handled above); the first sold-list crawl missed `&amp;page=` links (a spec bug, fixed).

## Not re-run
Clause 4 (credentials). Items 692 and 467 zoom. Standalone-figure checks for years-like and sub-1000 prices (the limits above). Home pages and listings other than those named were not scanned for prices.
