---
version: 3
slug: "engine-apps-web-src-sites"
primary_target: "engine/apps/web/src/sites"
related_targets: ["engine/apps/web/src/shared/ui","engine/apps/web/src/shell","engine/apps/web/src/styles","engine/apps/web/src/shared/styles/tokens","engine/apps/web/src/app/(gallery)","engine/apps/web/src/app/(shop)"]
---

# Surface brief — the two public sites (Indies Gallery, Old East Indies)

**Mode:** Experience (the gallery's works and the shop's prints lead; the homes persuade inside that grammar).
**Scope:** every public page of both sites, both languages, the shared header, footer and chat launcher. The admin
has its own brief.

**Audience and job:** collectors, institutions, designers and heritage buyers judge an original and ask the dealer on
WhatsApp or email; Instagram and Bali visitors buy a print in a few taps. Most arrive on a phone; desktop visitors
are collectors and designers at a desk. One man owns both: two storefronts selling different things, each to look
premium in its own way.

**What hurt (the user, 2026-10-11):** both sites read as generic AI "luxury" and not expensive; desktop held in a
1340 px column. **Then (2026-10-12, as the owner's proxy):** the colour cleaner, more exclusive and premium, the
shop's pages tidied. **Then (2026-10-13):** the shop brighter, with a better theme colour, so it feels like an
exclusive merchandise store, premium; the name sounds historical, but the store has nothing to do with the old East
Indies: the client loves collecting things and buying and selling. Fastest route: tokens and the shop's own CSS,
checked on staging. **Must stay:** Cormorant Garamond and Karla (the client's pick); the placeholder logos until the
real ones arrive; full width on a desktop; every behaviour, price rule, access rule and word in the lexicons; the
gallery exactly as it is. **Feels wrong:** dark and moody, stark white minimal, vintage or colonial.

## Direction contract

THESIS: Two shops, two worlds on one structure. The gallery is Ivory and ink: colour spent only as a small accent,
space and large calm type carry the expense. The shop is Cobalt: a bright, exclusive store whose one saturated
colour is its signature, the way a house's box colour is. It refuses beige-and-gold "luxury", the colour band behind
every heading and the framed grid.

OWN-WORLD: near-black ink for all type; muted ink for the second voice; square edges; sentence case; no eyebrows.
**The gallery:** ivory paper `#f7f5f0`, cool stone `#eeebe4` for the few panels, deep green `#2d5b52` on the one
action, an ink footer `#1b1c1a`; an antique lies uncropped on the paper with no frame, tile or shadow. **The shop
(Cobalt):** a bright white page `#fbfbf9`, every print hung at its own shape on an even pale cool tile `#eef1f7`
with one soft, low shadow, cobalt `#1f3fae` for the home's hero field (white type, a white action with cobalt words)
and for the one action elsewhere, a navy footer `#0f1530`. A page's head sits on the paper. The bridge band wears
the sister's ground. Records are ruled running lists, facts tight right in tabular figures. Full width, fluid
gutters, grids that gain columns.

STORY: A collector lands on a sheet larger and clearer than any dealer site shows it, reads its record like a
catalogue entry and asks on WhatsApp. A visitor from Instagram lands on a cobalt field that names the house at a
glance, walks a bright wall of prints on pale tiles and adds one to the bag in a few taps.

FIRST VIEWPORT: Gallery home at 1440: the header on the paper; the newest original, uncropped and large, beside the
headline in Cormorant near 6rem on the ivory; Explore the collection in the green. Shop home at 1440: the header on
white; the headline in white Cormorant on the full cobalt field, the lede in pale cobalt, Shop prints as a white
button with cobalt words; the lead print hung across the field's lower edge with the print shadow; then the best
sellers on pale tiles.

SIGNATURE INTERACTION AND MOTION: a print lifts a few pixels off its tile under the pointer or focus, its shadow
deepening, the tile taking a cobalt mist (the shop). An antique's colour washes in over its engraved line once as it
enters the view and its window takes the stone on hover (the gallery). Reduced motion: no lift, no wash.

FORM: the shop's Cobalt, chosen by the client from three palettes (cobalt, vermilion, marigold) on 2026-10-13, over
the phase 17/18 structure (Outline Colour seed key dbb8b833): full width, the Crossing opening, ruled records, no
eyebrows. Fast path at the user's request: no direction tournament, code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## History

- Phase 17 (2026-10-12): Outline Colour; its structure stayed, its colour was replaced in phase 18.
- Phase 18 (2026-10-12): the client chose Ivory and ink for both sites; prints on even tiles (`PrintTile`).
- Phase 19 (2026-10-13): the shop moved to Cobalt (the gallery kept Ivory and ink); the `Crossing` gained an
  opt-in `strength="full"`; a premium layout pass on the shop's pages for phone and desktop.

## Unresolved

- The condition grade shows the dealer's code ("VG") while the home promises plain words; the grade wording is the
  owner's (PRODUCT.md: not to be invented).
- The real logos replace the placeholders later (site-settings swap). Some product photographs carry a grey scan
  margin inside the image (owner content).
- The gallery's bridge band to the shop still wears the shop's old warm panel (kept so the gallery is unchanged).
