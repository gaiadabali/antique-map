# Gate: the client's palette, Ivory and ink, and the shop tidied (phase 18)

The request (the user, as the owner's proxy, 2026-10-12): "for both websites. we need to change the color theme to
be better. going towards, clean, exclusive and premium. the layout also need to be tidy up a little bit. especially
the ecommerce page. Remember this is a 1 man shop with 2 strorefronts to sell different type of products. so it
should showcase the premium layout too … kinda personal preference from the client". From a palette board of four
the client chose **A · Ivory and ink**, as **two distinct shops**, with the shop's prints **on even tiles with a soft
shadow**, and every shop page tidied (the grid, the product page, the home, collections and stores). The direction
contract is `engine/apps/web/.impeccable/surfaces/engine-apps-web-src-sites.md` (version 2); DESIGN.md's "Ivory and
ink — both public sites (phase 18)" records what shipped.

**Verdict: ship.** The finish review (2026-10-12) returned eight material fixes — card prices out of line, the
product's print small at 1920 and two column systems on one page, the shop home's sets and trade as leftovers of the
old bands, the gallery's makers-and-places entries with their ink rules, the bridges too close to their neighbours'
stone, the stores' area row, a faded bronze slab for sold out — all applied in one round (`14ae321b`) and checked on
the rebuilt pages.

**Staging:** `production-20261012T091240Z-0aefa272` (the CI fixes below), after `production-20261012T083302Z-efc859c1`
(the redesign) — each healthy at try 1 (app, database, storage, queue), migrations
unchanged (6 = 6); smoke passed: both homes, the shop's grid, collections, stores, a product and partnership 200,
`/sell-to-us` and `/contact` 200, `/api/health` 200, `/admin/login` 200 on the shop host and 404 on the gallery's, an
antique's short address 308 to its full one, a derivative 200 with the gallery's `access-control-allow-origin`,
`/_media/uploads/x` 403.

## What shipped

1. **The palette (18.1).** The gallery on ivory `#f7f5f0` with ink type, a deep green `#2d5b52` on its one action
   and an ink footer; the shop on a warmer white `#faf8f4` with a warm-stone panel `#e9e1d4` behind its hero, bronze
   `#8a5a2b` on its action and an espresso footer. Every text pair AA, input boundaries 3.6:1. A page's head sits on
   its paper on both sites; the colour bands and the outline stripes of phase 17 are retired; the bridge to the
   sister site wears the sister's own ground. The chat launcher is a quiet paper button. A new shared `PrintTile`
   hangs a print at its own shape on an even stone tile with one soft shadow; it lifts under the pointer.
2. **The shop's grids (18.2, a Sonnet agent, orchestrator review).** Browse, a collection and search: the head on
   the paper, one bar of categories and sort over a hairline, prints on tiles four across at most, captions aligned
   with the price at each card's foot. Collections: three large tiles across. Stores: the areas as an even grid,
   each area's stores a ruled list.
3. **The product page (18.3, a Sonnet agent, orchestrator review).** The print large on a wall of stone the width
   of its column, never taller than the screen; the other views as small square tiles; the details held to 32rem
   and kept in view as the page scrolls; Add to bag the one bronze action, sold out a quiet outline; the story on
   the same two columns.
4. **The homes (18.4).** The shop: headline, actions and the owner's facts on the warm panel, the lead print hung
   across its edge; "Shop by" as an index; best sellers on tiles; sets, process and trade on the paper under
   hairlines; the bridge to the gallery on its cool stone, flush on the footer. The gallery: unchanged in structure,
   re-toned; its makers-and-places entries under hairlines; the item page's Zoom and other views back right under
   the sheet (the stripe they had avoided is gone).

## Evidence

- **axe** (wcag2a/aa, 2.1 aa, 2.2 aa): 0 violations, and no sideways scroll, on every public page of both sites at
  390, 1280 and 1920 in English and Indonesian — 56 pages × 3 widths on a local production build, run twice (before
  and after the review's fixes); and on staging after the release, the same 54 pages (the style guide is local only)
  at the three widths — 162 runs, 0 violations; the three form pages checked on page load because the bot-check
  widget never lets the network settle.
- **Static gates:** typecheck, eslint (0 warnings), prettier, the token lint, file size ≤ 300 lines, 723 unit tests.
- **Behaviour** (local production build, the staging catalogue copy): sort by price ascends; page 2 shows other
  prints; the Botanicals tab narrows the grid and marks itself current; Add to bag puts _Arja Dancer with
  Headdress, 1940_ in the bag; a sold-out choice disables the button and says so.
- **CI** on `0aefa272` (run 38228030820): green — static checks, unit and database tests, Lighthouse, and e2e 167
  passed (1 flaky, passed on retry). The run before it on `30c8f430` (38226921598) failed three shop product tests:
  the suite finds a sold-out product by the add button's class ending its list, and the new sold-out class had been
  put after it (the order restored, the look unchanged); the same run's gallery scan once read a random CSP nonce
  beginning "Rp5" as a rupiah figure (the scan now ignores the nonce).
- **Screens** (staging): `ivory-and-ink/*.png`.

## Open — the owner's

- **Condition grades read as the dealer's code ("VG")**, the grade wording is the owner's to give (PRODUCT.md).
- **Some product photographs carry a grey scan margin inside the image**; on a tile it reads as an inner mount.
  Trimming the scans at upload fixes it everywhere.
- **The placeholder logos** stay until the real ones arrive (a site-settings swap).
- **Staging's public shop lists 26 "REHEARSAL 10.4" products** from the purchase rehearsal, among them a placeholder
  "Greeting card set — frangipani"; unpublishing them is an admin action for the owner or the lead.

## Not run

- `.impeccable/design.json` (Impeccable's design sidecar) was not written; DESIGN.md is the project's record.
