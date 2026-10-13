# Design source — Indies Platform

What the design team delivered, what we adopted, what we added, and the swap points for the owner's UI/UX pass.

## Source

The design team's system lives in `docs/design/input/claude-design-2026-09/_ds/luxury-minimalist-design-system-c156e5b1-7edc-4777-82f1-e102cdc8a274/`.
Relevant files: `readme.md`, `styles.css`, `tokens/{colors,fonts,spacing,typography}.css`,
`components/components.css` and the two home-page HTML drawings. The system is **brand-neutral**:
it exposes a three-tier token model (primitive → brand → semantic) and expects a palette per product.

## Adopted

- **Three-tier tokens.** Tier-1 primitives are raw scales (colour ramps, type sizes, 4 px space scale,
  radii, shadows, motion). Tier-2 brand variables live in one file per site. Tier-3 semantic aliases are
  the only values components read.
- **Type pairing.** Cormorant Garamond for display and numerals, Karla for everything read or clicked —
  the owner's decision from the client's deck slide 7. Both load via `next/font/google` and are served
  from our own origin at runtime (self-hosted by Next.js).
- **Square, borderless, paper-on-ground look; 80 px header; zebra section tones; edge-to-edge bands with
  a locked 1340 px inner boundary.** Kept as the shared component language; exact padding and overrides
  from the design team's page drawings are re-expressed as tokens.
- **Motion rules.** `cubic-bezier(0.22, 0.61, 0.36, 1)`, 320 ms in / 200 ms out, `prefers-reduced-motion`
  absolute.

## Added or changed

- **A palette per site** (phase 4) — **superseded by Ivory and ink (phase 18, below)** for the gallery and by
  **Cobalt (phase 19, below)** for the shop.
  The design team's linen, off-black, bronze and champagne survive as primitives only because the admin reads
  them (`tokens/admin.css`).
- **Accessibility overrides to the kit.** Hairlines and focus are at least 1 px / 2 px and pass 3:1;
  input boundaries are darker than the decorative 0.5 px rule.
- **Font variable names.** The semantic tokens `--font-display` and `--font-body` fall back to the
  Google family names and only resolve to the self-hosted faces once `fontVariables` is applied to
  `<html>` (task 4.3).
- **Lint gate.** `engine/tooling/token-lint/cli.mjs` fails the build on any raw hex, `rgb()/rgba()/hsl()/hsla()`,
  or `font-family` outside the token files.

## Cobalt — the shop (phase 19, 2026-10-13)

The user, as the owner's proxy: "fully upgrade the UI … brighter, and better theme color, so it feels like exclusive
merchandize store … it has to be premium feels". The name sounds historical, but the store has nothing to do with the
old East Indies: the client loves collecting things and buying and selling. From three palettes (cobalt, vermilion,
marigold) the client chose **Cobalt**. The gallery keeps Ivory and ink, unchanged to the pixel. The structure of
phases 17–18 stays (full width, the `Crossing` opening, prints on even tiles, ruled records, no eyebrows). The
direction contract is the surface brief `engine/apps/web/.impeccable/surfaces/engine-apps-web-src-sites.md`
(version 3).

**Palette (`shared/styles/tokens/primitives.css`, the `--primitive-cobalt-*` ramp; contrast checked 2026-10-13, every
text pair AA).**

| Role                                 | Old East Indies (Cobalt)                         |
| ------------------------------------ | ------------------------------------------------ |
| Paper (`--color-surface`)            | a bright white `#fbfbf9`                         |
| Raised (inputs)                      | `#ffffff`                                        |
| Tile (`--surface-deep`, `--field`)   | pale cool `#eef1f7`; under the pointer `#e4e9f4` |
| Ink / muted ink                      | `#14161c` (17.5:1) / `#5a5f6b` (6.2:1)           |
| Rule / input boundary                | `#e3e6ee` / `#7f8594` (3.6:1)                    |
| The action and the hero field        | cobalt `#1f3fae` (the paper on it 8.5:1)         |
| The action pressed                   | `#18318a`                                        |
| Type on the field / its second voice | `#ffffff` (8.8:1) / `#cdd6f5` (6.1:1)            |
| Footer / its type / its muted        | navy `#0f1530` / `#e9ecf6` (15.2:1) / `#aab3d0`  |

**How colour is spent.** Cobalt is the shop's signature, like a house's box colour: the home's hero is a full cobalt
field with white type, the lede in pale cobalt, Shop prints a white button with cobalt words; everywhere else
cobalt is only the **one action** a view asks for (Add to bag, Checkout). Ink for all other type; the current page,
a chosen option and the pager's current number stay ink. Prints hang on pale cool tiles with the one soft shadow.
The footer closes each page in navy.

**The roles (`sites/shop/tokens/brand.css`).** Pigment 1 is the shop's everyday ground (paper, the tile as its tint,
navy as its full). Pigment 2 is the hero: its `full` is cobalt with white type (`-on-full` white, `-on-full-muted`
pale cobalt), its `wash` a pale cobalt mist. Pigment 3 is the gallery's cool stone, for the bridge to the originals.
The old shell ramp (`--primitive-shell-*`) stays only because the gallery's bridge band to the shop still wears its
warm panel, which keeps the gallery unchanged.

**The `Crossing` at full strength.** `strength="full"` (opt-in; default `wash`) lays the pigment's `full` as the
field and re-points every ink role on the copy to the field's own type, the action included: a white button with the
field's colour as its words, a white focus ring, hairlines mixed from white. Only the shop's home hero uses it.

**Brand files (`public/shop/`).** The placeholder logo, the favicon (32 and 16 px), the 180 px home-screen icon and the
manifest's theme colour are cobalt; the 1200 × 630 social image is cobalt with "Old East Indies" in Cormorant and
"Printed in Bali · Stocked in 100+ shops" in Karla (it no longer says "placeholder"). Rendered from HTML with
Playwright's Chromium; the real logos replace them later.

**The shop's premium layout (19.2).** Fewer, larger things, calmer on a phone:

- **Home hero:** the headline 56 px on a phone, up to the 96 px display ceiling on a wide screen (12ch); the owner's
  three facts are one wrapping row in small type under a white hairline on the field, never a tall stack.
- **Rhythm on a phone:** sections part by 64 px (96 px from 48rem); a two-up grid keeps at least 24 px between its
  prints; card names scale 18–22 px so a long name does not run to four lines in a half column; grid rows part by
  4rem from 48rem.
- **Product:** the name at section-title size (`--text-h2`), so the print leads; the details grouped tight, the buy
  block after a clear gap, the price larger, Add to bag 56 px high; below 64rem the lead print's wall runs edge to
  edge. The picker's and buy block's rules live in `product/picker.module.css` (the product file was near 300 lines).
- **Collections:** one large tile across on a phone, two from 36rem, three from 75rem.
- **Quiet links** at a grid's edge (Shop all prints, Start browsing) are pulled out by the button's own padding so
  their words sit on the edge.
- **Stores:** the area names are body-size ink, an index that reads as navigation.

## Ivory and ink — the gallery (phase 18, 2026-10-12; the shop until phase 19)

The client asked, through the user, for a colour that is "clean, exclusive and premium" and for the shop's pages to
be tidied: "a 1 man shop with 2 storefronts to sell different type of products". From a palette board of four the
client chose **Ivory and ink**, as **two distinct shops** on one clean base, with the shop's prints **on even tiles
with a soft shadow**. The structure of phase 17 (full width, the `Crossing` opening, ruled records, no eyebrows)
stayed; its colour world, Outline Colour, was replaced. The direction contract is the surface brief
`engine/apps/web/.impeccable/surfaces/engine-apps-web-src-sites.md` (version 2). Recorded here from the shipped CSS
and components (worktree `feat/p18-dsg`).

**Palette (`shared/styles/tokens/primitives.css`; contrast checked 2026-10-12, every text pair AA, input boundaries
3.6:1).**

| Role                      | Indies Gallery                | Old East Indies                         |
| ------------------------- | ----------------------------- | --------------------------------------- |
| Paper (`--color-surface`) | ivory `#f7f5f0`               | a warmer white `#faf8f4`                |
| Raised (inputs)           | `#fdfcfa`                     | `#fffefc`                               |
| Stone (`--surface-deep`)  | cool stone `#eeebe4`          | warm stone `#efeae1` — every print tile |
| Panel                     | —                             | `#e9e1d4`, the home's hero only         |
| Ink (`--color-text`)      | `#1b1c1a` (15.7:1)            | `#221e1a` (15.6:1)                      |
| Muted ink                 | `#5c5b56` (6.3:1)             | `#675f56` (5.9:1)                       |
| Rule / input boundary     | `#e2ded6` / `#858179` (3.6:1) | `#e6dfd3` / `#8b8274` (3.6:1)           |
| The action                | deep green `#2d5b52`          | bronze `#8a5a2b`                        |
| Footer                    | ink `#1b1c1a`                 | espresso `#2a211b`                      |

**How colour is spent.** Ink for all type; muted ink for the second voice. The site's accent is the **one action**
a view asks for (Explore the collection, Ask about this, Shop prints, Add to bag, Checkout) and nothing else; the
current page, a chosen option and the current pager number are ink. A page's head sits **on its paper** on both
sites: no colour band behind a heading. Stone is spent sparingly: the gallery's house-and-curator band; the shop's
hero panel and its tiles. The band that bridges to the sister site wears the sister's own ground (the gallery's
bridge on the shop's warm panel, the shop's on the gallery's cool stone). The footer closes each page in its dark
ground. Square and flat everywhere; the one shadow is a print's on its tile.

**The roles behind it (`sites/{gallery,shop}/tokens/brand.css`).** The phase 17 pigment roles stay as names:
`--pigment-1-wash` is each site's paper (so a `Band pigment={1}` head is simply on the paper), `-tint` its stone,
`-full` its footer; the shop's `--pigment-2-wash` is the warm panel its hero asks for; the bridges use the sister's
role (gallery `2`, shop `3`). The Outline Colour ramps remain in the primitives only as the semantic fallbacks.

**The print tile (`shared/ui/print-tile`, the shop).** An even 4 : 5 tile (or `tile="square"`) of the site's stone;
the print laid in it whole **at its own shape** (`printRatioOf()` from the image's pixels, 0.4–2.5), set a little
above centre, with one soft, low shadow (`--shadow-print`) that falls from the print's own edges. Inside a link the
print lifts a few pixels and its shadow deepens; reduced motion: no lift. `size="large"` (a product's lead: a
narrower margin), `size="small"` (thumbnails). Every shop print uses it: the grids, the best sellers, collections, a
product's views. The gallery's antiques never do: a sheet lies uncropped on the paper with no frame, tile or shadow,
its window taking the stone on hover (`Mat`).

**The shop's pages.**

- **Grids** (browse, a collection, search): the head on the paper; one bar, the categories at left and sort at
  right, over a hairline; prints on tiles, two across on a phone, three at 48rem, four from 75rem and never more;
  under each tile the name in Cormorant, one muted line, and the price in tabular figures at the card's foot, so a
  row's prices share a line.
- **Product:** two columns from 64rem (7 : 5). At left a wall of stone the width of its column, never taller than
  84 % of the screen, the print hung large in it, the other views as small square tiles under it; at right the
  details held to 32rem and kept in view as the page scrolls: category, name, Reproduction and SKU, the price,
  options as square chips (chosen in ink), Add to bag in bronze (sold out a quiet outline), delivery, the original,
  then the proof points under a hairline. The story follows on the same two columns.
- **Home:** the headline, the actions and the owner's facts on the warm panel, the lead print hung across its
  lower edge with the print shadow; "Shop by" as an index; the best sellers on tiles; the sets, the process and the
  trade offer on the paper, each under a hairline; the bridge to the gallery on its cool stone, flush on the footer.
- **Collections:** three large tiles across. **Stores:** the areas as an even grid of names over a hairline; each
  area's stores a ruled running list in three columns.

**Type, frame and records (unchanged from phase 17).** Cormorant for display (`--text-display` 48–96 px, `--text-h1`
40–72, `--text-h2` 30–48, `--text-card-title` 22), Karla 16 px body, `--text-label` 500 14 px sentence case; no
eyebrow or kicker, no tracked capitals. Full width at every desktop size: the page wrap is the viewport less a fluid
gutter (20–96 px); text keeps `--measure-text` (38rem); sections parted by `--section-space` (64–160 px) or a
hairline. Records are ruled running lists, the label left in muted small type, the value right in tabular figures.
The browser's own surfaces carry the palette: selection a tint of the action, caret and focus in ink, the scrollbar
in the input-boundary grey. The chat launcher is a quiet paper button with a hairline.

**Known gaps.** The condition grade shows the dealer's code ("VG") although the home promises plain words — the
grade wording is the owner's to give (PRODUCT.md). Some product photographs carry a grey scan margin inside the
image. The placeholder logos stay until the real ones arrive. The `.impeccable/design.json` sidecar has not been
written.

## Outline Colour (phase 17, 2026-10-12) — superseded by Ivory and ink

Both sites full width, every region held by flat colour: copperplate ink on a mineral paper, three map-colourists'
pigments (verdigris, gamboge, madder) in three strengths, one pigment per site, the full pigment drawn as an outline
stripe along a field's edge. The structure it introduced (`Band`, `Crossing`, the clear `Mat` window, ruled records,
no eyebrows, grids that gain columns) is what phase 18 kept; its colour and stripes are retired. The gate record is
`docs/gates/outline-colour.md`.

## Swap points

The owner's later look-and-feel pass changes only these:

| What to change                    | File(s)                                                                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Final colours (Q16)               | the ivory and cobalt ramps in `shared/styles/tokens/primitives.css`; their use per site in `sites/{gallery,shop}/tokens/brand.css` |
| Font family                       | `engine/apps/web/src/shared/styles/fonts.ts`                                                                                       |
| Hero media (film, poster, images) | CMS `pages` and `media` (not code)                                                                                                 |
| Logo lock-up                      | `site-settings` assets + the logo component in 4.3                                                                                 |
| Motion per site                   | `shared/styles/tokens/primitives.css` motion section + component CSS Modules in 4.2                                                |

No dark mode. No raw colour or `font-family` is allowed outside the token files.

## The admin (phase 16, 2026-10-11)

The Payload admin at `/admin` wears the Indies world built for work: light only (`admin.theme: 'light'`, DR-14), linen ground, white paper panels with one hairline, ink type, bronze for the one primary action, the current selection and focus. Recorded from the shipped CSS and components, not the brief.

**Where it lives.** Tokens: `engine/apps/web/src/shared/styles/tokens/admin.css` (raw values live here alone; the token lint covers it). Mount order in `app/(payload)/layout.tsx`: `@payloadcms/next/css`, `primitives.css`, `admin.css`, then `app/(payload)/admin/` `theme-base`, `theme-shell`, `theme-signin`, `theme-forms`, `theme-record`, `theme-lists`, `wall` (imports `wall-cards`), `panels` (imports `panels-controls`, `panels-analytics`). The brand faces come from `fontVariables` on `<html>`. **Rule: admin feature CSS reads only `--admin-*` tokens (and `--primitive-space-*`, `--base`); no raw colour or `font-family` outside the token files; a lint enforces it.**

**How it is themed.** Payload's CSS sits in `@layer payload-default`; the admin's CSS is unlayered, so it wins without `!important`. Theming retunes Payload's own scales in `admin.css` (`--color-base-*`, `-success-*`, `-warning-*`, `-error-*`, and `-blue-*`, its accent, now bronze-brown) and its `--theme-*`, `--font-*`, `--style-radius-*` and `--accessibility-outline` variables, so unstyled Payload screens still speak the palette. Buttons are driven through Payload's own `--bg-color`, `--color`, `--hover-bg`, `--hover-color`, `--btn-border`, `--hover-btn-border` per `.btn--style-*`; do not restyle `.btn` per screen.

**Palette (roles in `admin.css`).**

| Role                                                                | Value                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `--admin-ground` / `-paper`                                         | `--primitive-linen` `#f4f1ea` / `--primitive-paper` `#ffffff`                              |
| `--admin-sidebar` / `-wash`                                         | `#efebe2` / `#f7f5f0`                                                                      |
| `--admin-ink` / `-ink-strong`                                       | `#26231e` / `--primitive-off-black`                                                        |
| `--admin-muted`                                                     | `#675f52` (base-500)                                                                       |
| `--admin-hairline` / `-rule`                                        | `#e3ddd1` / `#d5cec0`                                                                      |
| `--admin-input-border`                                              | `#8f8674`                                                                                  |
| `--admin-accent` / `-accent-strong` / `-accent-tint` / `-accent-on` | bronze `#6e5a43` / `#5a4936` / `#f6f2ec` / paper                                           |
| `--admin-focus`                                                     | bronze; `2px solid`, offset 2px                                                            |
| success, warning, danger (+ `-tint`)                                | `--primitive-positive`, `-caution`, `-critical`; tints `#eef4ef`, `#faf3e6`, `#fbefee`     |
| `--admin-mat` / `-mat-edge` / `-selection`                          | `#f4f1ea` / `#d9d2c3` / `#e4d9ca`                                                          |
| shadows                                                             | `--admin-shadow-popup`, `--admin-shadow-lift`, for popups and lifts only; panels have none |

Contrast as the file records it (checked 2026-10-11): ink on linen 13.9:1; muted on linen 5.6:1, on the sidebar 5.3:1; paper on bronze 6.6:1; input boundary on paper 3.6:1; base-400 (Payload's quieter labels) on linen 5.0:1; every status tone on its tint 5.4:1 or more.

**Type.** Karla (`--admin-font-body`) for everything read or clicked; Cormorant Garamond (`--admin-font-display`) only for page and record titles. Root is 14 px (15 px under 768 px, with `--base-body-size: 15`). The admin sets a face only through the shorthand roles (weight size/line family): `--admin-text-title` 500 32 px/1.15 display, `-record` 500 24 px/1.2 display, `-heading` 700 16 px/1.35, `-body` 400 14 px/1.5, `-strong` 700 14 px/1.5, `-small` and `-data` 400 13 px/1.45, `-label` 700 11 px/1.3 (with `--admin-tracking-label: 0.08em`, uppercase where used), `-figure` 700 1.75 rem/1.1 body (the analytics figures, lining and tabular: Cormorant's old-style numerals read ragged). Numerals are tabular. Dates read `9 Oct 2026, 22:34` (`admin.dateFormat: 'd MMM yyyy, HH:mm'`); a price reads `Rp 95.000` in either admin language (Indonesian grouping, as the shop and the Order panel write it; `RupiahCell` in `packages/cms/src/admin/cells.jsx` for list columns, display only).

**Shape, size, motion.** Panels and cards are square (`--admin-radius: 0`) on paper with a 1 px hairline; controls take `--admin-radius-control` (2 px). Control height `--admin-control-height` 40 px; touch targets `--admin-target` 44 px (chips, strip items, pager links, buttons on a phone). Pills become square tags in words, tone supporting; notices are a tinted ground and its own ink, no side stripe. Motion is `--admin-dur` 180 ms on `--admin-ease` (`cubic-bezier(0.22, 0.61, 0.36, 1)`) for colour, border and a 2 % picture ease; no page-load choreography; under `prefers-reduced-motion` transitions drop to 0.01 ms and the card's picture does not move.

**Shell.** The sidebar is the second neutral (`--admin-sidebar`) parted by one hairline; its current link is paper with a hairline, in strong ink, marked by a 6 px bronze square (`.nav__link-indicator`). Group labels are `--admin-text-label` uppercase muted. The wordmark is type, no image (`packages/cms/src/admin/brand/marks.jsx`, wired as `admin.components.graphics`): "Indies" in Cormorant over a rule and "Indies Gallery · Old East Indies" on sign-in; "Indies" alone in the sidebar and breadcrumbs. Sign-in is a 26 rem paper card on linen. The sidebar is open on a laptop as on a desktop: Payload closes it on load at 1440 px and under, so `packages/cms/src/admin/nav-open.jsx` (inside the sidebar) opens it once per breakpoint between 1025 and 1440 px; a tablet or phone keeps the menu, and a person who closes it keeps it closed.

**The Catalogue Wall** (the dashboard view, `views.dashboard` to `CatalogueWall`; code in `packages/cms/src/admin/wall/`, CSS in `wall.css`, `wall-cards.css`). Top to bottom: a head row with the `.wall__title` "Catalogue" in `--admin-text-title` and the search at its right (under it, full width, on a phone), so the filter row of chips fits one line beside the open sidebar; one paper strip of today's counts, each a link (Orders to act on, New leads, AI drafts to check, Drafts) with a quiet link at its end; filter chips (site, then state); the wall of cards; the pager. A card is paper with a hairline holding a square matted picture (`.wall-mat`, `aspect-ratio: 1 / 1`), a title clamped to two lines, site and reference, and exactly one state tag. `PAGE_SIZE = 24`. Columns: 4 above 1100 px, 3 at 1100 px and under, 2 at 760 px and under. Hover or focus darkens the hairline to ink and scales the picture 1.02. The state tag (`wall-tag`) is derived in `state.ts`, most urgent first: `needsPhoto`, `aiDraft`, `draft`, then `outOfStock` (products) or `sold` (works), else `published`. Square, uppercase label type, hairline; tone: published success, aiDraft warning, needsPhoto and outOfStock danger, others neutral wash.

**The custom views' shared pieces** (`panels.css`, `panels-controls.css`, `panels-analytics.css`; used by Order panel, Leads inbox, Import stock, the analytics dashboard). `ix-page` (60 rem measure, `--wide` 80 rem), `ix-title` (title role), `ix-record` (record role), `ix-card` (paper, hairline, square), `ix-muted`, `ix-empty`, `ix-tag` (square, hairline, label role; `--success`, `--warning`, `--danger` tones). One `ix-btn--primary` (bronze) per screen; the other buttons are paper with a hairline. `ix-actions--bar` is a plain row on desktop and, under 768 px, sticks to the screen's foot on the ground colour with a top hairline, its buttons full width and the primary first. **Lists are one panel, not cards** (`panels-lists.css`): `ix-list` is one paper panel of hairline-ruled rows, each row an `ix-item` link (44 px minimum, wash on hover, focus ring inset). The owner's orders (`ix-item--cols`) are columns at 769 px and up: number, store, buyer, the tag (12 rem) and the total (9 rem, right-aligned): fixed, because every row is its own grid. On a phone a row is two lines: number and tag, then store · buyer (ellipsised) with the total at the right edge. The store queue and the leads inbox use the same rows; the owner's orders page 50 at a time. **Native controls** (`panels-native.css`): selects lose the browser's arrow for a thin line chevron like Payload's own (two 1.2 px gradient strokes in `currentColor`), full width on a phone, file inputs get a paper button, date inputs the input box; all at the control height on a desktop and 44 px on a phone. The analytics view sits inside the admin frame like the others. Every `ix-page` sits on the shell's gutter (`--gutter-h`), left-aligned like Payload's lists and records, so its title lines up with the breadcrumbs.

**Phone rules (390 px, fixed in review).** Nothing may be wider than the screen. The wall's filter row is `position: relative` (its visually hidden search label is absolute and had widened the page to 898 px); the strip and chip rows scroll sideways inside themselves. Header breadcrumbs give way with an ellipsis, the actions keep their room and the locale button shows its value alone. The list selection bar is pinned to the screen's edges (`inset-inline: 0; inline-size: auto`). List tables scroll inside their panel; title cells keep 12 rem so the next column shows. Breadcrumbs drop their last crumb (the page's own title, set large below) and its separator; a record's status line wraps and Created gives way to Last modified. Payload's account-page settings rules span the gutters exactly (they had held the page 75 px too wide). Beside the open sidebar at 1440 px and under, list cells pad less, the title keeps 12 rem and long column labels wrap, so the default columns fit at 1280.

**Long forms.** A record opens on what is filled every time: rarely-filled sections fold into closed unnamed collapsibles (`packages/cms/src/fields/fold.ts`, no data-path change): the antique's First edition, Date on the plate, Publication, Physical record (staff only), Rights, From the old site and SEO (Condition and Cataloguing stay open: a grade and the AI-draft checks are read on every work); the order's History, Payment, Driver, Handed back and Store as sold. An array's rows inside a paper panel are ruled, not boxed.

**How to change it.** The owner's later UI/UX pass edits `engine/apps/web/src/shared/styles/tokens/admin.css` (roles, type shorthands, radii, control height, durations, and the Payload scales), and the shared pieces (`wall-*`, `ix-*`, the marks). Do not add colours, faces or one-off values to feature CSS or to a single view.
