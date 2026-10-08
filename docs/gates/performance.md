# Performance and accessibility gate — phase 10 (10.2)

Senior FE seat (DSG + QA), branch `worktree-agent-aa631d14b8accce70`, 2026-10-08. Merged from main 4a83afec and
later (10.5 and the chat redesign 8.2.c are in).

> **Status: evidence gathered; the orchestrator ticks the Check.** Item and product pages measure at least 90
> performance and exactly 100 accessibility on a local production build with real image bytes (the stand-in media
> origin below); axe finds nothing at any impact on every page walked at 390 and 1280 px in English and Indonesian,
> locally and on staging; the keyboard and accessibility-tree notes are below. **Not met and not claimable from page
> changes: the LCP budget of 2.5 s (F1)**, and staging has not yet been re-measured on a release carrying these
> fixes (nothing here is deployed).

## How it was measured

- **Local production build** of this worktree (`pnpm build`, then `node tests/e2e/a11y/serve-local.mjs`, port 4417),
  hosts `gallery.localhost` and `shop.localhost`, Postgres 16 on `localhost:5433` (database `indies_p10_dsg`, made
  with `pnpm db:fresh` under `PGHOST=localhost PGPORT=5433`; Docker Desktop is down), seeded with the vocabulary,
  `gallery-sample --publish`, `shop` and `shop-catalogue --publish` (`LEGACY_DATA_DIR` set). `MIDTRANS_MODE=simulate`.
- **Lighthouse** 12.x, mobile preset, simulated throttling, `node tests/e2e/a11y/lighthouse.mjs` (the installed CLI
  directly: `lhci collect` still crashes on this Windows host, `docs/gates/shop-payment.md` finding 2). Three runs per
  page; the table shows the median score and the worst accessibility score. Budgets come from `lighthouserc.json`.
- **The stand-in media origin.** A local build has no object storage, so no page shows a derivative and Lighthouse
  measures pages without their pictures. `tests/e2e/a11y/media-proxy.mjs` serves `/derivatives/v1/<any>/<width>.<format>`
  from one real staging derivative of the same width and format (real bytes, both formats, CORS open); the local media
  rows were marked `derivatives_status = 'ready'` with `width`/`height` x 5 (`UPDATE media SET width = width*5, height =
height*5, derivatives_status = 'ready' WHERE width < 2400`) and the app started with `MEDIA_PUBLIC_URL=http://127.0.0.1:9100`.
  Every image is the same picture: it measures weight and loading, not content. The "before" rows without this rig
  have no pictures at all.
- **The host is shared and was saturated by other sessions** for much of the run (Lighthouse's CPU benchmark read
  1,300 to 2,500 against 3,800 to 4,100 when idle; TBT and LCP read two to five times high then). The runner records
  the benchmark, retries a slow run up to three times and keeps the best, and the tables show the benchmark. Runs made
  at a benchmark under 2,500 were discarded from the tables below. Raw reports: one per page (the median-score run)
  under `docs/gates/performance/`.
- **Staging** (`https://indies-gallery.gaiada.com`, `https://old-east-indies.gaiada.com`) was read-only: nine Lighthouse
  runs on the gallery (before any change, while the catalogue was loading), and axe, keyboard and tree passes on both
  sites' public pages and the open chat (no message sent, no order placed). Nothing was written there.

## Lighthouse mobile, final local run (stand-in media origin)

| Page                             | Perf (median of runs) | A11y (worst) | LCP ms | CLS   | TBT ms | Script KB | Weight KiB | CPU bench |
| -------------------------------- | --------------------- | ------------ | ------ | ----- | ------ | --------- | ---------- | --------- |
| gallery home                     | 97 (97 · 97 · 96)     | 100          | 2549   | 0.000 | 39     | 143       | 249        | 3821      |
| gallery listing `/browse`        | 92 (92 · 92 · 91)     | 100          | 3347   | 0.000 | 72     | 146       | 335        | 3075      |
| **gallery item**                 | **94** (25 · 94 · 94) | **100**      | 3012   | 0.010 | 91     | 145       | 281        | 3415      |
| shop home                        | 95 (92 · 97 · 95)     | 100          | 2728   | 0.000 | 52     | 143       | 598        | 2938      |
| shop listing `/shop`             | 90 (96 · 87 · 90)     | 100          | 3556   | 0.000 | 59     | 143       | 644        | 3250      |
| **shop product**                 | **94** (96 · 94 · 93) | **100**      | 2997   | 0.000 | 75     | 150       | 313        | 3061      |
| shop bag (cookie, one line)      | 98 (99 · 98 · 95)     | 100          | 2249   | 0.001 | 41     | 145       | 242        | 2877      |
| shop checkout (cookie)           | 96 (96 · 96 · 95)     | 100          | 2700   | 0.000 | 87     | 152       | 240        | 3736      |
| shop order page (awaiting quote) | 96 (95 · 96 · 97)     | 100          | 2697   | 0.010 | 71     | 145       | 233        | 3078      |
| shop tracking (a paid order)     | 97 (97 · 97 · 97)     | 100          | 2519   | 0.000 | 48     | 143       | 231        | 3363      |

- The gallery item's first run (25) is the first request after the server restarted: the page cache was cold (a
  slow first byte). The other two runs and the median are warm.
- Every accessibility score is 100 on every run of every page. CLS is at most 0.010 (budget 0.05). TBT is at most 91 ms
  (budget 200). First-party script is 143 to 152 KB: the home and listing budget is 150 KB, the product budget 180 KB,
  checkout and tracking 200 KB (`docs/DESIGN-SYSTEM.md` §9).
- **The only budget missed is LCP (below).** `lighthouserc.json` therefore fails every page on LCP, as the runner's
  last column would say; it is kept at 2,500 ms as the budget, not weakened.
- The bag, checkout, order and tracking runs sent a bag cookie (`cart=…`) on every request; the order and tracking
  pages are those of an order the walk placed (`purchase-path.spec.ts`), moved to `paid` for tracking by one SQL
  `UPDATE orders SET status = 'paid'` on the throwaway local database (a staff quote and the simulator's Settle are the
  payment gate's, `docs/gates/shop-payment.md`).

### Before and after

| Page            | Before (run)                                                                                                                                                                 | After                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| gallery home    | local, no pictures: 95, LCP 2886 (`baseline-gallery`); staging 93, LCP 2956 (`baseline-staging-gallery`); staging after 410136e8, orchestrator: 98, LCP 2.4 s, **2,042 KiB** | 97, LCP 2549, **249 KiB**                 |
| gallery listing | local: 93, LCP 3213; staging 96, LCP 2686                                                                                                                                    | 92, LCP 3347 (now with pictures: 335 KiB) |
| gallery item    | local: 96, LCP 2817; staging 93, LCP 3184                                                                                                                                    | 94, LCP 3012 (with the lead picture)      |
| shop `/shop`    | orchestrator, staging before 410136e8: 81, LCP 5.1 s, 2,993 KiB; after: 96, LCP 2.3 s, **1,845 KiB**                                                                         | 90, LCP 3556, **644 KiB**                 |
| shop product    | shop-payment gate, local: 96                                                                                                                                                 | 94, LCP 2997                              |

Read these with care. The "before" rows are three different rigs: local without pictures (a page with no image reads
fast), staging over the workstation's real route, and the orchestrator's staging runs. The "after" rows add the
pictures through the stand-in origin, so the same page weighs more and its LCP is the picture's. What the rows do show:
the weight of the pages that carry pictures fell (gallery home 2,042 to 249 KiB, shop listing 1,845 to 644 KiB) and every
page the Check names holds 90 and 100 with its picture. Staging was not re-run: it needs a release carrying these
changes.

## What was found and fixed

| #   | Finding                                                                                                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                                                  | Where                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P1  | An italic Cormorant face (39 KB) was **preloaded on every page**, and only the item's original title uses italic                                                                                                                                                                       | Two `next/font` declarations of one family: roman preloaded, italic `preload: false` (fetched only where used). Home 95 to 97 and item 96 to 97 at the same CPU benchmark (`after1-gallery`)                                                                         | `shared/styles/fonts.ts`                                                                                 |
| P2  | **Gallery home featured works** loaded one full-size derivative each (the 10.6 originals are up to 6,000 px)                                                                                                                                                                           | `imageSrcSet` from `derivativeSrcSetOf`, drawn through `ResponsiveImage` with `sizes="(min-width: 80rem) 25rem, 30vw"`                                                                                                                                               | `server/gallery/home/load-featured-works.ts`, `sites/gallery/home/featured-works.tsx`, `home.module.css` |
| P3  | Every srcSet listed WebP only, though the pipeline publishes **AVIF at every width** (about half the bytes: the 1024 px rung is 48 KB against 93 KB)                                                                                                                                   | `ResponsiveImage` serves the same ladder as AVIF through `<picture><source type="image/avif">`, WebP kept on the `<img>` as the fallback; a lead image preloads the AVIF rung. `avifLadderOf()` only rewrites a ladder whose every candidate is `.webp`; tests added | `shared/ui/responsive-image/*`                                                                           |
| P4  | The **bag's thumbnails** used Payload's staff-only file URL (`media.url`, 403 to the public) with no ladder and no "Digital mockup" alt                                                                                                                                                | `displayFor` reads the catalogue's `imageOf` (public derivative, ladder, provenance); the bag draws a 5 rem thumbnail with `srcSet` and `sizes="5rem"` and the label-prefixed alt (`imageAlt`). Checkout shows no thumbnails                                         | `server/shop/bag/display.ts`, `read-bag.ts`, `read-checkout.ts`, `sites/shop/bag/bag-view.tsx`           |
| P5  | The shop listing's first-row card images were `loading="lazy"` (Lighthouse: LCP image lazy-loaded, 240 ms late)                                                                                                                                                                        | `ProductCard` takes `lead`; the first two cards of the listing and of search load eagerly at high priority, as the gallery's do                                                                                                                                      | `sites/shop/browse/*`                                                                                    |
| A1  | **The skip link was invisible when focused**: `position: absolute`, no `z-index`, so the sticky header's logo covered it (WCAG 2.4.7, 2.4.11)                                                                                                                                          | `z-index: 10000` (above the header 100 and the menu sheet 9999)                                                                                                                                                                                                      | `styles/site.css`                                                                                        |
| A2  | **The checkout's pin fields all carried one name.** The use-my-location button, the paste-link field, latitude and longitude, and the search box were wired to `checkout.mapPinRequired` / `checkout.pinLatLng`, so a screen reader heard "Or type latitude and longitude" three times | Five distinct keys (`checkout.pinUseLocation`, `pinPasteLink`, `pinLatitude`, `pinLongitude`, `pinSearch`), both languages                                                                                                                                           | `sites/shop/checkout/{checkout-view.tsx,copy.ts}`, `sites/shop/lexicon/{en,id}.json`                     |
| A3  | **Typing a coordinate key by key lost the decimal point**: each keystroke re-wrote both fields from the parsed numbers ("115." became "115"), so "115.2126" was sent as 1152126 and the server refused the pin. The keyboard-only walk found it                                        | `typeLatLng` no longer writes back into the fields it reads from                                                                                                                                                                                                     | `sites/shop/checkout/pin-picker.tsx`                                                                     |
| A4  | The paste-link input sat in a `<form>` **inside the checkout's `<form>`** (invalid HTML; the server's parser drops the inner one, so hydration disagrees)                                                                                                                              | A `div`; Enter reads the link and never submits the order                                                                                                                                                                                                            | `shared/ui/map-pin-shell/map-pin-shell.tsx`                                                              |
| A5  | On a 390 px bag, each line's total paragraph **was stretched over the quantity form** and lay over the Update button: half its taps hit the paragraph and its focus was "hidden behind another element"                                                                                | `align-self: flex-start`                                                                                                                                                                                                                                             | `sites/shop/bag/bag.module.css`                                                                          |
| A6  | The variant picker's `radiogroup` was named by its first radio ("Mounted print") and every radio carried the same `id`                                                                                                                                                                 | Named by the fieldset's legend ("Choose an option"); the duplicate ids removed                                                                                                                                                                                       | `sites/shop/product/variant-picker.tsx`                                                                  |

The unit tests for the web app pass (683 passed, 80 skipped, the skips being database tests that need Postgres on 5432),
as do `format:check`, `lint`, `typecheck`, `check:filesize` and `tasks:lint`.

### F1, the LCP budget (2.5 s): analysis, not closed

LCP is 2.5 to 3.5 s on every page in simulated mobile throttling (1.6 Mbps, 150 ms RTT, 4x CPU). The reports say why
(`tests/e2e/a11y/lh-lcp.mjs <report>` prints the phases and the waterfall):

- The workstation's own, unthrottled LCP is 0.1 to 1.2 s. Lighthouse's simulated LCP is "everything the page requested
  before its observed LCP, downloaded over the simulated link": about 285 KB on the item page (HTML 10, fonts 62,
  CSS 15, the lead picture 48, JavaScript 150). It follows the page's bytes, not any one resource.
- JavaScript is the floor: React DOM 72 KB and Next's client router 35 KB gzipped, with 25 KB of everything this
  repository wrote. Fonts are two files (62 KB) on a page without italics. The picture is 48 KB as AVIF.
- What moved it: the italic preload (39 KB), AVIF (45 KB a picture), the ladder, the eager lead cards. What did not:
  the framework. A further 100 ms needs about 18 KB less on every page, which no page-level change here provides.
- **Open for the owner/architect:** (a) accept 2.5 s as a real-phone budget measured in the field (the Bali phone check of
  `docs/DESIGN-SYSTEM.md` §9) and treat the simulated number as advisory; (b) loosen `lighthouserc.json` to the
  measured 3.0 s; or (c) cut the framework (no client router prefetch, fewer client components). This gate does none of
  them. The 90 / 100 Check does not depend on it.

## The CI Lighthouse budget on the shop home after 10.1 (reported by the orchestrator)

CI run 37760908165 (main 7733d424) failed `lighthouserc.web.json` on `http://shop.localhost:4200/`: LCP 2,925, 2,865
and 2,899 ms against 2,500. Run 37743514696 (0d861b0a) passed. Both runs' `.lighthouseci` artifacts were downloaded
(`gh run download <id> -n lighthouse`) and compared with `node tests/e2e/a11y/lh-compare.mjs <dir>`.

**The CSP nonce is not what moved it, and the budget is passing or failing by luck.**

| Run              | Shop home, three runs (LCP ms) | Gallery home          | Page bytes (18 requests) | Observed paint (ms) |
| ---------------- | ------------------------------ | --------------------- | ------------------------ | ------------------- |
| 0d861b0a, passed | 2,666 · 2,899 · **2,144**      | 2,133 · 2,887 · 2,888 | 277,700                  | 118 to 156          |
| 7733d424, failed | 2,925 · 2,865 · 2,899          | 2,291 · 2,898 · 2,897 | 284,400                  | 148 to 203          |

- `lhci`'s default aggregation is **optimistic**: a page passes if its best run does (the failing report's `actual` is the
  minimum, 2,865). The metric is bimodal on this page: about 2,900 ms in most runs and 2,150 in some. The passing run
  owed its pass to one 2,144 ms run; the gallery home passes only through its cold first run (2,133 / 2,291, a slow
  first byte, so a late paint). The typical value, 2,880 to 2,900 ms, is the same before and after 10.1 (the gallery's
  typical runs read 2,887/2,888 before and 2,898/2,897 after).
- Why bimodal: the request waterfall of a 2,144 ms run and of a 2,899 ms run is the same (same requests, same sizes, the
  paint at 118 and 128 ms). The simulated figure differs by about 750 ms, one simulated round trip, so a request is
  in or out of Lighthouse's graph for reasons of tens of milliseconds. I did not isolate which request (the favicon,
  which starts after the paint in every run, is not it). Three samples a side cannot show whether 10.1 changed the
  odds of the low mode; they show the typical value did not change.
- What 10.1 changed, measured: the document's first byte took about 25 ms longer (52 ms against 25 in CI), its HTML grew
  1.9 KB (the nonce on 15 inline scripts and the `Link` header's nonce), every response carries about 380 bytes of the
  new static headers (+7 KB over 18 requests), and the paint is 30 to 80 ms later. Reproduced locally on a database
  that is migrated and empty, as CI's: shop home 2,690 ms with the CSP, 2,662 without it (the CSP removed from `proxy.ts`
  for the experiment, then restored; the static headers stayed on), first byte 42 ms against 27. The nonce costs about
  15 ms of first byte (Next renders with the nonce in the stream rather than resuming a shell) and about 30 ms of
  simulated LCP. Both builds answer `Cache-Control: private, no-store`: the page was already rendered in full on every
  request (`htmlLimitedBots`), so the nonce did not make it dynamic.
- **Nothing was changed in the CSP, `proxy.ts` or `src/security/`.** `script-src` keeps its nonce and `strict-dynamic`.

What this branch already does about the same budget: the italic font was preloaded on every page (39 KB; the CI waterfalls
show three fonts, 38 + 40 + 25 KB); `fonts.ts` now preloads two. That removes about 0.2 s of simulated LCP on the home
pages (gallery home 2,886 to 2,642 ms at the same CPU benchmark, `after1-gallery`), so more runs land in the low mode.
It does not make the typical run pass 2,500 ms: the framework floor (F1) is higher.

Options for the orchestrator, none taken here (a budget or policy change is not this seat's call):

1. **Set the home pages' LCP budget to 3,000 ms** in `lighthouserc.web.json`. It is what the page measures, before and after
   10.1. Honest, and stops a coin flip from deciding a merge.
2. Keep 2,500 ms and set `aggregationMethod` to `median`: it then fails every run until F1 is solved; not useful now.
3. Keep the budget and re-run on failure: it passes about as often as the low mode occurs; this is what has been happening.
4. **A hash-based CSP in place of the nonce** (Next's experimental `sri`, `docs/01-app/02-guides/content-security-policy.md`
   "Subresource Integrity"): it keeps the static shell and saves the nonce's 15 ms first byte, but it is a change of policy
   (`script-src` would list hashes, not a nonce) and it is experimental. Not done; recorded for the architect.
5. Cut bytes on the home pages until the typical run is under 2,500 ms: about 80 KB, which is more than the app's own
   code (25 KB); only the framework is that large.

## axe

`tests/e2e/a11y/public-pages.spec.ts`, `chat.spec.ts`, `purchase-path.spec.ts`: every axe rule (best practices
included), both widths, zero violations of any impact is the bar.

| Where                     | Pages                                                                                       | Result                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Local, gallery            | home, listing, item, search, sell-to-us (390 and 1280, English) and home, item (Indonesian) | **0 violations** (`a11y/axe-gallery.json`)                                 |
| Local, shop               | home, listing, product, search (English) and home, product (Indonesian)                     | **0 violations** (`a11y/axe-shop.json`)                                    |
| Local, shop purchase path | product, bag, checkout, order, tracking                                                     | **0 violations** (`axe-shop-purchase-path.json`, `axe-shop-tracking.json`) |
| Local, chat               | launcher closed, panel open, both sites                                                     | **0 violations** (`axe-*-chat.json`)                                       |
| Staging, both sites       | the same public pages, the open chat                                                        | **0 violations** (`staging/a11y/axe-*.json`)                               |

Two things the first runs taught about the method: axe's contrast check reads half-transparent pixels while the chat
panel slides in (the spec waits 1.5 s), and `page-has-heading-one` fired once on `/search` when axe ran before the
streamed heading was there (the spec waits for the `<h1>`). Both are timing in the test, not defects in the pages.

## Keyboard pass

Evidence: `a11y/keyboard-*.md` (every Tab stop with role and name, at both widths) and the keyboard-only run in
`purchase-path.spec.ts`. The walk records, per stop: an accessible name, a visible focus indicator (outline or
shadow), the stop not covered by another element (WCAG 2.4.11), no trap.

- **Product to tracking by keyboard alone, passing:** Tab to "Add to bag" and Enter (status "Added to your bag."); on the
  bag Tab to "Checkout", Enter; on the checkout Tab to each field and type (full name, WhatsApp, email, address,
  latitude, longitude), Tab to "Continue to payment", Enter; the order is placed and its page opens; the tracking
  page opens. No stop needed a pointer.
- Tab order on every page: skip link, brand, menu (390) or primary nav (1280), page content in reading order, footer,
  "Chat with us" last. The product page's variants are one stop (a radio group, arrows inside it). Closing the 390 px
  menu returns focus to its button.
- **Fixed by this pass:** A1 (skip link hidden), A3 (a decimal point lost when typing), A5 (Update covered), A2, A4.
- **After the fixes: no problem on any local page at either width.** On staging, which does not carry the fixes, the
  only recorded problem is the skip link (16 pages), plus the **Cloudflare Turnstile widget on `/sell-to-us` at 390 px:
  three Tab stops with no role or name** after the consent checkbox. That is the third party's iframe container, not
  repository code, and axe does not flag it; it is the one keyboard finding left open (below).
- Chat (the redesigned panel, merged): opening moves focus into the dialog (to "Close chat" locally, where the AI is
  not configured; to "Your message" on staging); Tab inside the panel visits "Privacy notice" and then leaves it (the
  panel is non-modal, so leaving is allowed); **Escape closes it and focus returns to "Chat with us"** at both widths on
  both sites. Passing locally and on staging after the final spec (`a11y/keyboard-*-chat.md`).

## Screen-reader pass — a tree audit, not NVDA

This is an audit of the accessibility tree the browser exposes (Playwright's aria snapshot and `page.accessibility`),
which is what a screen reader is handed: roles, names and reading order. **It is not NVDA, VoiceOver or TalkBack**, and
it says nothing about how any reader speaks them; `docs/DESIGN-SYSTEM.md` §10 still wants a real-reader pass on a phone
before the site phases close. Trees: `a11y/tree/*.yml` (local) and `staging/a11y/tree/*.yml`.

Reading order and names, the buy path:

- **Product:** skip link; banner (brand link "Old East Indies, home", "Open menu"); `main` > `article`: "Breadcrumb"
  navigation (Shop, category, the product as plain text), the pictures as `figure "Digital mockup"` with alts
  prefixed "Digital mockup: …", `h1` the product name, "Reproduction", the SKU, the option group, the price, "Add to
  bag", "In stock", the delivery sentence, `h2` "About this product". After A6 the radio group is named "Choose an option".
- **Bag:** `region "Your bag"` > `h1`; per line a thumbnail (alt "Digital mockup: …"), the product link, the variant,
  the unit price, "Quantity" spinbutton, "Update", "Remove <product>", the line total; the voucher field and "Apply";
  Subtotal and Total as term/definition pairs; the "Checkout" link.
- **Checkout:** `region "Your order"` > `h1`, the line list, the totals, the delivery-price note, "Back to the bag", and
  `form "Delivery"` with `h2` "Contact" (Full name, WhatsApp number, Email, each with its hint), `h2` "Delivery"
  (Address) and the group "Pin your delivery spot on the map": "Use my location", "Or paste a Google Maps link",
  **"Latitude"**, **"Longitude"** (after A2; before, three fields read the same words), notes, gift note, "Continue to
  payment". Errors are `role="alert"` and the invalid pin group carries `aria-invalid` and `aria-describedby`.
- **Order and tracking:** `h1` "Order #…", an ordered list "Order #…" of the five stages with
  `aria-current="step"` on the current one (the snapshot omits `aria-current`; `shared/ui/status-timeline` sets it),
  Items, totals, "Delivering to" (the address and a masked contact), "Sending from".
- **Chat:** `dialog "Chat with us"`: heading with the shop's name, "AI assistant · replies instantly", "Close chat", `log
"Conversation"` with the greeting, `group "Suggested questions"`, `textbox "Your message"`, "Send", the disclosure
  with a "Privacy notice" link. Errors arrive as `alert`.

Findings left from the tree audit (none blocks the Check):

1. Three product pictures of one product share an alt ("…close view of the artwork"), so a reader hears three
   identical figures in a row. Seed data (`seed/catalogue/images.ts` alts), owner: content.
2. A bag with two lines has two buttons named "Update" (the "Remove" button names its product, "Update" does not).
   Owner: FE; wants a `bag.updateLine` key in both languages.
3. On the tracking page the delivery contact is masked ("A\*\*\* · a\*\*\*…") for privacy; fine, noted so it is not
   mistaken for a name defect.

## Findings recorded, not fixed here

- **A soft 404 on an unpublished product (reported by another session): not reproduced as described.** Against a local
  production build: a never-published slug answers 404; a draft product's address answers 404 cold and again; after
  an unpublish plus invalidation (`POST /api/x/revalidate`, tags `catalogue:shop` and `product:<id>`), the **first**
  request still answers 200 with the **old product page** (add button and all), and the second and every later one 404
  with `noindex`. That is stale-while-revalidate by design: editorial tags expire with `'max'`
  (`@engine/cache` `EDITORIAL_EXPIRY`). No answer was a 200 with the not-found page. If an unpublished product must
  disappear at once, `productTag` would take the immediate expiry that stock and price tags already use; that is
  `engine/packages/cache` and the CMS hooks, outside this seat's paths. Recorded for the architect.
- **`/collections` answers 404** on the shop (and the footer, the nav and the home's "See the gallery walls" all link
  to it); `/about`, `/delivery`, `/faq`, `/contact` and the other CMS information pages are likewise unseeded on this
  database (gallery gate finding F7). Content, not accessibility.
- **Turnstile on `/sell-to-us` at 390 px**: three unnamed Tab stops (above). Cloudflare's widget; if it matters, the
  fix is the widget's own mode (`interaction-only`) or a wrapper that takes it out of the Tab order until challenged.
- **Shop listing weight**: 644 KiB with 24 cards at 640 px AVIF (17 KB each); the cards below the first two are lazy
  but a phone's lazy-load margin fetches most of the first page. Smaller first pages or a 320 px rung for a
  two-column phone grid would halve it. Not done: the 640 px rung is right for a 2.75x phone.
- The skipped middle of the chat on staging: the AI answer path was not exercised (no message sent), and locally the
  chat opens in its error state (no AI key), so its controls are disabled in the local axe run; the staging run covers
  the live state.

## Not run, and why

- A real screen reader (NVDA, VoiceOver, TalkBack): none available to this seat.
- Lighthouse on staging after these changes: they are not deployed. Staging was measured once, before them.
- Lighthouse on the **checkout and order pages with two lines or a failing pin**, and on the admin: out of scope.
- Real-phone LCP (Galaxy A15 over 4G, Bali): `docs/DESIGN-SYSTEM.md` §9's field check is the owner's.
- The full `pnpm verify` and the database test suites: Postgres on 5432 and Docker are down; the web app's unit tests,
  lint, format, typecheck, file-size and board checks ran.
- A re-run of Lighthouse after A5 and A6 (a CSS alignment and an attribute change): the a11y specs were re-run on that
  build, the scores were not repeated.

## Reproduce

```bash
PGHOST=localhost PGPORT=5433 pnpm db:fresh                   # database for this worktree
pnpm data:seed --layer vocabulary --publish                    # then gallery-sample --publish, shop,
LEGACY_DATA_DIR=…/indies-legacy-data pnpm data:seed --layer shop-catalogue --publish
pnpm build && node tests/e2e/a11y/serve-local.mjs              # port from .env.local (PORT)
node tests/e2e/a11y/media-proxy.mjs 9100                       # the stand-in media origin (see above)
node tests/e2e/a11y/lighthouse.mjs --out docs/gates/performance/local/gallery --runs 3 \
  home=http://gallery.localhost:$PORT/ item=http://gallery.localhost:$PORT/product/200-…
E2E_PORT=$PORT A11Y_STATE=/tmp/state.json pnpm exec playwright test tests/e2e/a11y --project=gallery-a11y --project=shop-a11y
```

Staging, read-only: `A11Y_ORIGIN=https://indies-gallery.gaiada.com A11Y_EVIDENCE=docs/gates/performance/staging pnpm exec
playwright test tests/e2e/a11y/public-pages.spec.ts tests/e2e/a11y/chat.spec.ts --project=gallery-a11y` (and the shop
host with `--project=shop-a11y`). `tests/e2e/a11y/lh-summary.mjs <dir>` tabulates a folder of reports; `lh-lcp.mjs
<report>` reads one.

## Evidence index

- Screenshots at 390 and 1280 px: `docs/gates/performance/shots/` (gallery: home, listing, item, search, sell-to-us,
  chat open; shop: home, listing, item, search, product, bag, checkout, order, tracking, chat open).
- Lighthouse reports (median-score run per page): `local/gallery/`, `local/shop/` (final); `baseline-gallery/` (local
  before, no pictures); `after1-gallery/` (local after the font change, no pictures); `baseline-staging-gallery/`
  (staging before).
- axe, keyboard walks and trees: `a11y/` (local) and `staging/a11y/`.
- Runners and specs: `tests/e2e/a11y/{audit.ts, public-pages.spec.ts, purchase-path.spec.ts, chat.spec.ts,
lighthouse.mjs, lh-summary.mjs, lh-lcp.mjs, media-proxy.mjs, serve-local.mjs}`; budgets `lighthouserc.json`.
