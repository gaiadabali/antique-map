# Gate: both sites full width, in Outline Colour (phase 17)

The user's request (2026-10-11): "make all full width style for desktop. and ensure the luxury feels and not
regular ai slop design. both website is still dont have that expensive feels". Their answers: keep Cormorant
Garamond and Karla; free the cream grounds, the mats and the eyebrow marks; dark and moody, stark white and vintage
would all feel wrong; every page of both sites; keep the placeholder logos but drop the doubled wordmark. They chose
**Outline Colour** from a direction round (seed `dbb8b833`), built code-led. The direction contract is
`engine/apps/web/.impeccable/surfaces/engine-apps-web-src-sites.md`; DESIGN.md's "Outline Colour — both public
sites (phase 17)" records what shipped.

**Verdict: fix, with two owner items left** — the finish review's second round (2026-10-12) scored six of its eight
material fixes resolved; the two left open are the owner's content, not code (below). Its two regressions from the
first fix batch were fixed and released.

**Staging:** `production-20261012T032523Z-2bf9df3f` (the redesign), `production-20261012T040708Z-5ac2195b`
(finish review round two), then the release of `1c0deda9` (the chat log focusable, from CI).

## What shipped

1. **The world (17.1).** Copperplate ink on a mineral paper; verdigris, gamboge and madder each in three locked
   strengths, contrast checked; madder spent on the one primary action a view asks for; square and flat everywhere;
   no eyebrows; selection, caret, focus and scrollbar in the palette. Full width at every desktop size: the page
   wrap is the viewport less a fluid gutter (20–96 px); card grids gain columns (2 / 3 / 4 / 5). New shared pieces:
   `Band` (a full-bleed field that re-points the ink roles on a deep ground) and `Crossing` (copy on a field, the
   picture lying across its edge onto the paper, the pigment's full strength drawn as an outline along that edge).
   The mat became a clear window: the work's own paper meets the page's, sheets share one baseline, the tint shows on
   hover, the colour washes in as a work enters the view.
2. **The homes (17.2).** The gallery leads with the newest original crossing a verdigris field (De Bry, 1598, on
   staging); the shop with its lead print crossing an ochre field. Each site lives in its own pigment; the band that
   bridges to the sister site wears the sister's colour. No empty picture windows: the curator, the sets and the
   process are type.
3. **The pages (17.3–17.7, Sonnet agents, orchestrator review).** Every page opens on its site's field — a compact
   band with the page title, or a `Crossing` where one picture leads (an antique, a product, a story with a hero).
   Records are ruled running lists; makers and places are typographic A–Z indexes in columns; forms sit on a tint
   with no box.

## Evidence

- **axe** (wcag2a/aa, 2.1 aa, 2.2 aa): 0 violations on every page of both sites at 1280 and 390, in English and in
  Indonesian — locally on a production build (28 + 25 pages, plus the style guide at 390, 1280 and 1920) and on
  staging (the same 53 pages; the three form pages checked on page load because the bot-check widget never lets the
  network settle).
- **No sideways scroll** at 390, 1440 and 1920 on any page.
- **Static gates:** typecheck, eslint (0 warnings), prettier, the token lint, file size ≤ 300 lines, 723 unit tests.
- **e2e against a local production build:** the browser-based smoke, accessibility and host projects pass. The
  request-based checks (`/api/health`, `/admin/login`, a site's root files) cannot resolve `*.localhost` from Node on
  Windows; they were checked on staging instead: both homes and every listed page 200, `/api/health` 200 on both
  hosts, `/admin/login` 200 on the shop host and 404 on the gallery's, an unknown path 404, robots and favicons 200.
  The e2e found three real issues, fixed: the header must carry the site's name (now said, not drawn twice);
  a focused control could hide behind the chat button (`scroll-padding` on the root); the hero's streaming
  placeholder briefly put a second `h1` on the page. Local-only failures that are environment: seed scripts and
  lead routes need the Docker Postgres (stopped on this laptop by the owner's order), media uploads need MinIO,
  and the local catalogue copy has no in-stock unvarianted products for the two-product purchase.
- **CI on the redesigned code** (run 38202255270, `5ac2195b`): 167 passed, 1 failed — the chat log was a
  scrollable region with nothing focusable once the larger body text made the welcome overflow (axe
  `scrollable-region-focusable`), fixed in `1c0deda9`. Among the passes: **a guest buys two products; staff quote
  it; pays; the order is confirmed and emailed** (the purchase on the simulator), pay then Settle or Pending, an
  expired order refilling the bag, Add to bag with variants, out of stock refused, tracking, and **a visitor sends
  the Sell-to-us form: a lead the owner reads, and an email**.
- **Forms:** an empty Send is refused on staging — the shop's partnership form names every field; the gallery's
  sell-to-us and contact stop at the bot check in a headless browser (as recorded in phase 14).
- **Screens** (staging, round-two release): `outline-colour/*.png`.

## Open — the owner's

- **Condition grades read as the dealer's code ("VG")** while the gallery home promises the condition "in plain
  words rather than a code". The grade wording is the owner's to give (PRODUCT.md lists it among things not to be
  invented); once given, it maps in the lexicon.
- **Some product photographs carry a grey scan margin and an edge line inside the image** (e.g. *Arja Dancer with
  Headdress, 1940*). Trimming the scans at upload fixes it everywhere; a blanket CSS crop would also cut the
  watermark the owner places in the mockups.

## Not run

- `.impeccable/design.json` (Impeccable's design sidecar) was not written; DESIGN.md is the project's record.
