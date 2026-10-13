# Gate: the shop in Cobalt, and its premium layout (phase 19)

The request (the user, as the owner's proxy, 2026-10-13): "fully upgrade the UI for old-east-indies … to be brighter,
and better theme color. so it feels like exclusive merchandize store … it has to be premium feels. plan the fastest
and quickest UI update". The name sounds historical, but the store has nothing to do with the old East Indies: the
client loves collecting things and buying and selling. From three palettes (cobalt, vermilion, marigold) the client
chose **Cobalt**. The user then asked for agents in parallel, a layout pass for phone and desktop, checks on staging
("use live directly, don't do local"), and, after reviewing staging, a redesign of three home sections: "Shop by",
the sets ("unclickable and have no purpose") and the numbered process. The direction contract is
`engine/apps/web/.impeccable/surfaces/engine-apps-web-src-sites.md` (version 3); DESIGN.md's "Cobalt — the shop
(phase 19)" records what shipped.

**Staging:** `production-20261013T133020Z-ed3bbb15`, healthy at try 1, migrations unchanged (6 = 6). Before it, the
same day: `-124951Z-9b199aeb` (Cobalt), `-130616Z-52a35640` (the layout pass), `-131924Z-89d551e7` (the home
sections). Smoke passed on each: both homes, the shop's grid and bag 200, `/sell-to-us` and `/contact` 200 on the
gallery, `/_media/uploads/x` 403. Two of six builds on Helios failed fetching Cormorant from Google Fonts inside
`next build` and passed on a plain retry (follow-up below).

**CI:** green on `ed3bbb15` (run 38404810061): static checks, unit, database, end-to-end (168 passed, 25 skipped) and
Lighthouse. The run before it (38403166389, on `89d551e7`) failed on two things this phase caused and fixed in
`ed3bbb15`: axe `color-contrast` on the cobalt hero (the white copy stood on a field drawn as a separate layer, so
axe measured it against the white page; the copy now wears the field's colour itself) and the before-shots' capture
script (lint and format; it left the repo). The admin roles "invalid save … in id" case failed once and passed on
retry in that run, as it has before.

## What shipped

1. **Cobalt (19.1, `9b199aeb`).** A new `--primitive-cobalt-*` ramp and the shop's roles on it: a bright white page
   `#fbfbf9`, prints on pale cool tiles `#eef1f7` (a cobalt mist `#e4e9f4` under the pointer), ink `#14161c`, muted
   `#5a5f6b`, cobalt `#1f3fae` for the home's hero field and the one action, a navy footer `#0f1530`. Every text pair
   AA (ink 17.5:1, muted 6.2:1, white on cobalt 8.8:1, pale cobalt on cobalt 6.1:1), input boundaries 3.6:1. The
   shared `Crossing` gained an opt-in `strength="full"`: the field at its pigment's full colour, every ink role on the
   copy re-pointed to the field's own type (a white button with cobalt words). The placeholder logo, favicon,
   home-screen icon, manifest colour and the social image are cobalt; the social image no longer says "placeholder".
2. **The premium layout pass (19.2, `52a35640`).** The hero headline 56 px on a phone to the 96 px ceiling, the
   owner's facts one ruled row; calmer phone rhythm (64 px sections, 24 px between two-up prints, 18–22 px card
   names); the product name at section size, a clearer buy block (56 px Add to bag), the lead print edge to edge on
   a phone; collections one large tile across on a phone; quiet links on the grid's edge; the stores' areas an ink
   index. The picker's rules moved to `product/picker.module.css` (class names unchanged).
3. **The home's sections (19.2, `89d551e7`).** "Shop by" is the shop's real collections as picture tiles, each one
   link to its collection: a rail that snaps tile by tile on a phone, one whole row on a desktop (4, 6 from 90rem).
   The island and room words (all opening `/shop`) and the placeholder sets (no picture, no link) are gone. How a
   print is made is a ruled list on the pale tile band, the title held at the left on a desktop, no numerals.

## Evidence

- **The gallery did not change.** Its before-shots (`cobalt/before/gallery-*`) and after-shots taken on
  `89d551e7` compared pixel by pixel: home, browse, an antique (`/product/2049-…`), contact and the Indonesian home,
  at 390 and 1280, full page and first screen — **0 pixels differ in all 20**. The gallery's manifest keeps
  `#1d3557`. The old shell ramp stays only for the gallery's bridge band to the shop.
- **Axe and width on staging (`ed3bbb15`):** 0 violations and no sideways scroll on 18 shop pages × 390 and 1280:
  `/`, `/shop`, a product, `/collections`, `/collections/bali`, `/stores`, `/partnership`, `/bag`, `/track`,
  `/search?q=bali`, and in Indonesian `/id`, `/id/belanja`, `/id/produk/…`, `/id/koleksi`, `/id/toko`,
  `/id/kemitraan`, `/id/keranjang`, `/id/lacak` (each 200).
- **Screens:** `cobalt/before/` (both sites, before) and `cobalt/after/` (the shop on `ed3bbb15`), each page at 390
  and 1280, full page and first screen; the URLs are in each folder's `pages.json`.
- **Checks on every change:** prettier, eslint, the token lint, file size, `tsc`, the shop's and shared UI's unit
  tests; the layout split checked so every class a component uses is defined in its own module and no module styles
  another's elements.

## Not done, and why

- **The finish review** (Impeccable's fresh-context reviewer) did not run: the user asked for the fastest route. It
  can run on the live shop at any time.
- **Staging's content undercuts the look**, not the design: the hero's lead print and the Antique Prints collection
  show the seed's "Greeting card set — frangipani · staging placeholder" picture, and two of the best sellers are the
  "REHEARSAL 10.4" products the timed admin tests published. The owner's real photographs, or unpublishing the
  rehearsal products, fix it; neither is a code change.
- **Follow-ups:** serve Cormorant and Karla from the repository (`next/font/local`) so a Helios build never depends on
  Google Fonts; the chat launcher overlaps the last card and the buy row on a phone (a shared offset); the shared
  quiet button's inline padding (three per-link workarounds now pull it back).
