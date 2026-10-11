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

- **A palette per site.** The design team's single palette (linen `#F4F1EA`, off-black `#1A1916`, bronze
  `#6E5A43`, champagne `#A39174`) becomes the **gallery** default on `:root`. The **shop** overrides it
  inside `[data-site="shop"]` with a warmer cream ground (`#F1E5D3`) and brown ink (`#593D21`) while
  keeping the same bronze accent and square editorial feel — visibly a sibling.
- **Accessibility overrides to the kit.** Hairlines and focus are at least 1 px / 2 px and pass 3:1;
  input boundaries are darker than the decorative 0.5 px rule.
- **Font variable names.** The semantic tokens `--font-display` and `--font-body` fall back to the
  Google family names and only resolve to the self-hosted faces once `fontVariables` is applied to
  `<html>` (task 4.3).
- **Lint gate.** `engine/tooling/token-lint/cli.mjs` fails the build on any raw hex, `rgb()/rgba()/hsl()/hsla()`,
  or `font-family` outside the token files.

## The luxury pass (phase 12, 2026-10-09)

The user asked for the shop to feel luxury and premium; the home's hero was redesigned first, approved, and its
language carried to every shop page. Four shared pieces carry it, so a later change is still a component edit:

| Piece                   | What it is                                                                                                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Mat` (`shared/ui/mat`) | a framer's mat: paper ground, hairline edge, weighted at the foot, a hairline bevel just outside the window; `default` for a lead image, `compact` in a grid; `MatNote` for a window with no picture; a picture inside a link eases closer on hover (reduced motion: none) |
| `Eyebrow mark`          | the eyebrow opened by a map's scale bar — the shop's cartographic signature (DESIGN-SYSTEM.md §1)                                                                                                                                                                          |
| `SectionHead`           | a page's (`level={1}`) or a section's opening: marked eyebrow, balanced serif title, muted lede, an optional action                                                                                                                                                        |
| `ProofPoints`           | a row of short facts under a hairline, parted by hairlines; a stack on a phone                                                                                                                                                                                             |

The rules of the language: prints always sit in mats; museum captions under them (serif name, muted meta, price);
hairlines and square corners only (no pills, no new shadows); full breakout width for listing and landing pages,
the reading measure for long text; generous space. The shared header and footer were quietened for both sites.

**The gallery's hand (phase 14).** The same pieces carry Indies Gallery, with its own signatures (DESIGN-SYSTEM.md
§1) set by tokens, never by a component branching on the site:

| Piece                      | On the gallery                                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The eyebrow's mark         | one hairline rule, as on a museum label (`--brand-mark-*` in each site's brand file; the shop keeps its scale bar)                                                                       |
| `Mat fit="contain"`        | an original floats whole in its window on the mat's paper, a little in from the bevel — never cropped (§7). Every antique's picture uses it; a print or mockup on the shop keeps `cover` |
| `StockTag`                 | the stock number in spaced capitals in a hairline box, the reference a buyer quotes on WhatsApp; the label reads "Stock no." aloud                                                       |
| The work card              | a compact contained mat, then a museum caption: title (three lines at most), maker and date, dimensions, one status line (never a price) and the stock tag                               |
| `Pagination variant=quiet` | square, unfilled, 44 px targets; the numbers on their own row on a phone                                                                                                                 |

An empty mat's words take full ink on the gallery (`--brand-mat-note`): muted ink is 4.46:1 on its cream window.
The home leads with the newest available map whole on its mat, captioned, in place of the hero film's poster.

## Swap points

The owner's later look-and-feel pass changes only these:

| What to change                    | File(s)                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Final colours (Q16)               | `engine/apps/web/src/sites/gallery/tokens/brand.css`<br>`engine/apps/web/src/sites/shop/tokens/brand.css` |
| Font family                       | `engine/apps/web/src/shared/styles/fonts.ts`                                                              |
| Hero media (film, poster, images) | CMS `pages` and `media` (not code)                                                                        |
| Logo lock-up                      | `site-settings` assets + the logo component in 4.3                                                        |
| Motion per site                   | `shared/styles/tokens/primitives.css` motion section + component CSS Modules in 4.2                       |

No dark mode. No raw colour or `font-family` is allowed outside the token files.

## The admin (phase 16, 2026-10-11)

The Payload admin at `/admin` wears the Indies world built for work: light only (`admin.theme: 'light'`, DR-14), linen ground, white paper panels with one hairline, ink type, bronze for the one primary action, the current selection and focus. Recorded from the shipped CSS and components, not the brief.

**Where it lives.** Tokens: `engine/apps/web/src/shared/styles/tokens/admin.css` (raw values live here alone; the token lint covers it). Mount order in `app/(payload)/layout.tsx`: `@payloadcms/next/css`, `primitives.css`, `admin.css`, then `app/(payload)/admin/` `theme-base`, `theme-shell`, `theme-signin`, `theme-forms`, `theme-record`, `theme-lists`, `wall` (imports `wall-cards`), `panels` (imports `panels-controls`, `panels-analytics`). The brand faces come from `fontVariables` on `<html>`. **Rule: admin feature CSS reads only `--admin-*` tokens (and `--primitive-space-*`, `--base`); no raw colour or `font-family` outside the token files; a lint enforces it.**

**How it is themed.** Payload's CSS sits in `@layer payload-default`; the admin's CSS is unlayered, so it wins without `!important`. Theming retunes Payload's own scales in `admin.css` (`--color-base-*`, `-success-*`, `-warning-*`, `-error-*`, and `-blue-*`, its accent, now bronze-brown) and its `--theme-*`, `--font-*`, `--style-radius-*` and `--accessibility-outline` variables, so unstyled Payload screens still speak the palette. Buttons are driven through Payload's own `--bg-color`, `--color`, `--hover-bg`, `--hover-color`, `--btn-border`, `--hover-btn-border` per `.btn--style-*`; do not restyle `.btn` per screen.

**Palette (roles in `admin.css`).**

| Role | Value |
| --- | --- |
| `--admin-ground` / `-paper` | `--primitive-linen` `#f4f1ea` / `--primitive-paper` `#ffffff` |
| `--admin-sidebar` / `-wash` | `#efebe2` / `#f7f5f0` |
| `--admin-ink` / `-ink-strong` | `#26231e` / `--primitive-off-black` |
| `--admin-muted` | `#675f52` (base-500) |
| `--admin-hairline` / `-rule` | `#e3ddd1` / `#d5cec0` |
| `--admin-input-border` | `#8f8674` |
| `--admin-accent` / `-accent-strong` / `-accent-tint` / `-accent-on` | bronze `#6e5a43` / `#5a4936` / `#f6f2ec` / paper |
| `--admin-focus` | bronze; `2px solid`, offset 2px |
| success, warning, danger (+ `-tint`) | `--primitive-positive`, `-caution`, `-critical`; tints `#eef4ef`, `#faf3e6`, `#fbefee` |
| `--admin-mat` / `-mat-edge` / `-selection` | `#f4f1ea` / `#d9d2c3` / `#e4d9ca` |
| shadows | `--admin-shadow-popup`, `--admin-shadow-lift`, for popups and lifts only; panels have none |

Contrast as the file records it (checked 2026-10-11): ink on linen 13.9:1; muted on linen 5.6:1, on the sidebar 5.3:1; paper on bronze 6.6:1; input boundary on paper 3.6:1; base-400 (Payload's quieter labels) on linen 5.0:1; every status tone on its tint 5.4:1 or more.

**Type.** Karla (`--admin-font-body`) for everything read or clicked; Cormorant Garamond (`--admin-font-display`) only for page and record titles. Root is 14 px (15 px under 768 px, with `--base-body-size: 15`). The admin sets a face only through the shorthand roles (weight size/line family): `--admin-text-title` 500 32 px/1.15 display, `-record` 500 24 px/1.2 display, `-heading` 700 16 px/1.35, `-body` 400 14 px/1.5, `-strong` 700 14 px/1.5, `-small` and `-data` 400 13 px/1.45, `-label` 700 11 px/1.3 (with `--admin-tracking-label: 0.08em`, uppercase where used), `-figure` 700 1.75 rem/1.1 body (the analytics figures, lining and tabular: Cormorant's old-style numerals read ragged). Numerals are tabular. Dates read `9 Oct 2026, 22:34` (`admin.dateFormat: 'd MMM yyyy, HH:mm'`); a price reads `Rp 95.000` in either admin language (Indonesian grouping, as the shop and the Order panel write it; `RupiahCell` in `packages/cms/src/admin/cells.jsx` for list columns, display only).

**Shape, size, motion.** Panels and cards are square (`--admin-radius: 0`) on paper with a 1 px hairline; controls take `--admin-radius-control` (2 px). Control height `--admin-control-height` 40 px; touch targets `--admin-target` 44 px (chips, strip items, pager links, buttons on a phone). Pills become square tags in words, tone supporting; notices are a tinted ground and its own ink, no side stripe. Motion is `--admin-dur` 180 ms on `--admin-ease` (`cubic-bezier(0.22, 0.61, 0.36, 1)`) for colour, border and a 2 % picture ease; no page-load choreography; under `prefers-reduced-motion` transitions drop to 0.01 ms and the card's picture does not move.

**Shell.** The sidebar is the second neutral (`--admin-sidebar`) parted by one hairline; its current link is paper with a hairline, in strong ink, marked by a 6 px bronze square (`.nav__link-indicator`). Group labels are `--admin-text-label` uppercase muted. The wordmark is type, no image (`packages/cms/src/admin/brand/marks.jsx`, wired as `admin.components.graphics`): "Indies" in Cormorant over a rule and "Indies Gallery · Old East Indies" on sign-in; "Indies" alone in the sidebar and breadcrumbs. Sign-in is a 26 rem paper card on linen. The sidebar is open on a laptop as on a desktop: Payload closes it on load at 1440 px and under, so `packages/cms/src/admin/nav-open.jsx` (inside the sidebar) opens it once per breakpoint between 1025 and 1440 px; a tablet or phone keeps the menu, and a person who closes it keeps it closed.

**The Catalogue Wall** (the dashboard view, `views.dashboard` to `CatalogueWall`; code in `packages/cms/src/admin/wall/`, CSS in `wall.css`, `wall-cards.css`). Top to bottom: a head row with the `.wall__title` "Catalogue" in `--admin-text-title` and the search at its right (under it, full width, on a phone), so the filter row of chips fits one line beside the open sidebar; one paper strip of today's counts, each a link (Orders to act on, New leads, AI drafts to check, Drafts) with a quiet link at its end; filter chips (site, then state); the wall of cards; the pager. A card is paper with a hairline holding a square matted picture (`.wall-mat`, `aspect-ratio: 1 / 1`), a title clamped to two lines, site and reference, and exactly one state tag. `PAGE_SIZE = 24`. Columns: 4 above 1100 px, 3 at 1100 px and under, 2 at 760 px and under. Hover or focus darkens the hairline to ink and scales the picture 1.02. The state tag (`wall-tag`) is derived in `state.ts`, most urgent first: `needsPhoto`, `aiDraft`, `draft`, then `outOfStock` (products) or `sold` (works), else `published`. Square, uppercase label type, hairline; tone: published success, aiDraft warning, needsPhoto and outOfStock danger, others neutral wash.

**The custom views' shared pieces** (`panels.css`, `panels-controls.css`, `panels-analytics.css`; used by Order panel, Leads inbox, Import stock, the analytics dashboard). `ix-page` (60 rem measure, `--wide` 80 rem), `ix-title` (title role), `ix-record` (record role), `ix-card` (paper, hairline, square), `ix-muted`, `ix-empty`, `ix-tag` (square, hairline, label role; `--success`, `--warning`, `--danger` tones). One `ix-btn--primary` (bronze) per screen; the other buttons are paper with a hairline. `ix-actions--bar` is a plain row on desktop and, under 768 px, sticks to the screen's foot on the ground colour with a top hairline, its buttons full width and the primary first. **Lists are one panel, not cards** (`panels-lists.css`): `ix-list` is one paper panel of hairline-ruled rows, each row an `ix-item` link (44 px minimum, wash on hover, focus ring inset). The owner's orders (`ix-item--cols`) are columns at 769 px and up: number, store, buyer, the tag (12 rem) and the total (9 rem, right-aligned): fixed, because every row is its own grid. On a phone a row is two lines: number and tag, then store · buyer (ellipsised) with the total at the right edge. The store queue and the leads inbox use the same rows; the owner's orders page 50 at a time. **Native controls** (`panels-native.css`): selects lose the browser's arrow for a thin line chevron like Payload's own (two 1.2 px gradient strokes in `currentColor`), full width on a phone, file inputs get a paper button, date inputs the input box; all at the control height on a desktop and 44 px on a phone. The analytics view sits inside the admin frame like the others. Every `ix-page` sits on the shell's gutter (`--gutter-h`), left-aligned like Payload's lists and records, so its title lines up with the breadcrumbs.

**Phone rules (390 px, fixed in review).** Nothing may be wider than the screen. The wall's filter row is `position: relative` (its visually hidden search label is absolute and had widened the page to 898 px); the strip and chip rows scroll sideways inside themselves. Header breadcrumbs give way with an ellipsis, the actions keep their room and the locale button shows its value alone. The list selection bar is pinned to the screen's edges (`inset-inline: 0; inline-size: auto`). List tables scroll inside their panel; title cells keep 12 rem so the next column shows. Breadcrumbs drop their last crumb (the page's own title, set large below) and its separator; a record's status line wraps and Created gives way to Last modified. Payload's account-page settings rules span the gutters exactly (they had held the page 75 px too wide). Beside the open sidebar at 1440 px and under, list cells pad less, the title keeps 12 rem and long column labels wrap, so the default columns fit at 1280.

**Long forms.** A record opens on what is filled every time: rarely-filled sections fold into closed unnamed collapsibles (`packages/cms/src/fields/fold.ts`, no data-path change): the antique's First edition, Date on the plate, Publication, Physical record (staff only), Rights, From the old site and SEO (Condition and Cataloguing stay open: a grade and the AI-draft checks are read on every work); the order's History, Payment, Driver, Handed back and Store as sold. An array's rows inside a paper panel are ruled, not boxed.

**How to change it.** The owner's later UI/UX pass edits `engine/apps/web/src/shared/styles/tokens/admin.css` (roles, type shorthands, radii, control height, durations, and the Payload scales), and the shared pieces (`wall-*`, `ix-*`, the marks). Do not add colours, faces or one-off values to feature CSS or to a single view.
