# Gate: the shop in its own brand — the real logo, in Heritage (phase 20)

The request (the user, 2026-10-14): "this is new data from old east indies. make the changes to the site with these
new data and see the ui design and make it suitable to it", with the owner's logo (a PNG: "old east indies" in brown
hand lettering on cream paper) and six catalogue PDFs. **The PDFs match, byte for byte (md5), the files in
`indies-legacy-data/old-east-indies/catalogues/` imported on 2026-10-08**: their 152 designs, descriptions and codes
were already on the shop, so no data changed. The new thing was the logo, and the catalogues' look (each print in a
cream mat on a walnut wall; covers under a cream "Heritage Art Collection" band).

Cobalt, chosen the day before, and the phase 17 note "ruled out vintage" made the palette the owner's decision, so a
board of three was built on the real staging pages (CSS injected into the live page, the traced logo swapped in,
nothing released): **A Heritage**, **B Umber on white**, **C Cobalt kept**
(https://claude.ai/artifact/MDqJQsH74ZGBxkw3TBpMgz). The user, as the owner's proxy, chose **A Heritage**. The
direction contract is `engine/apps/web/.impeccable/surfaces/engine-apps-web-src-sites.md` (version 4); DESIGN.md's
"Heritage — the shop (phase 20)" records what shipped.

**Staging:** `production-20261014T060219Z-84aefe3b`, healthy, migrations unchanged (6 = 6). Smoke: both homes 200,
`/sell-to-us` 200 on the gallery, `/_media/uploads/x` 403; `/shop/logo.svg` (umber `#5d3c1d`),
`/shop/logo-on-dark.svg` (cream `#efe6d6`), `/gallery/logo-on-dark.svg`, `/favicon.ico`, `/apple-touch-icon.png`,
`/shop/og.png` 200; the shop's manifest `#f6f1e7`, the gallery's still `#1d3557`.

## What shipped (`81c065f8`, merged `84aefe3b`)

1. **Heritage.** A `--primitive-heritage-*` ramp in place of Cobalt's, sampled from the logo (ink `#5d3c1d`, paper
   `#f1e6d3`) and the catalogues (walnut `#1d1311`–`#301e1c`, mats `#f0e8dd`): the page `#f6f1e7`, linen tiles
   `#ece3d4` (`#e4d8c5` under the pointer), ink `#22180f`, muted `#67574a`, the hero field walnut `#2e1f16` with cream
   type `#f3e9d8`, the logo's umber `#5d3c1d` on the action, an espresso footer `#1e1510`. Every text pair AA: ink
   15.5:1, muted 4.9–6.6:1, the action's words 8.8:1, cream on walnut 13.2:1, the second voice on walnut 8.3:1, the
   footer 14.5:1 and 7.5:1, input boundaries 3.6:1 on the page. The shop's brand file only; no layout, copy or
   behaviour changed.
2. **The real logo.** Traced per word at 4× with potrace, lightly smoothed. The header and footer use one line from
   the logo's own letters (stacked, three lines at 40 px would set them near 11 px): umber in the header, cream on
   the footer through a new `logo-on-dark` site file (`SITE_ASSETS.logoOnDark`, `SiteShellVM.logoOnDark`); the
   gallery's `logo-on-dark.svg` is a copy of its current logo.
3. **Brand files.** Favicon (16 and 32 px), the 180 px home-screen icon and the 1200 × 630 social image ("Heritage
   Art Collection", "Printed in Bali · Stocked in 100+ shops") from the stacked logo on its paper; the manifest in the
   paper.

## Evidence

- **Axe and width on staging (`84aefe3b`):** 0 violations and no sideways scroll on 18 shop pages × 390 and 1280:
  `/`, `/shop`, a product (`/product/bali-island-dutch-map-1849`), `/collections`, `/collections/bali`, `/stores`,
  `/partnership`, `/bag`, `/track`, `/search?q=bali`, and in Indonesian `/id`, `/id/belanja`, `/id/produk/…`,
  `/id/koleksi`, `/id/toko`, `/id/kemitraan`, `/id/keranjang`, `/id/lacak`. Each answered 200 (the two
  partnership pages carry Turnstile, so they never reach network-idle; `curl` 200). On all 36 the header shows
  `/shop/logo.svg`, the footer `/shop/logo-on-dark.svg`, and the page is `#f6f1e7`.
- **The gallery did not change.** Before-shots taken on `8064261d` just before the release and after-shots on
  `84aefe3b`, compared pixel by pixel: home, browse, an antique (`/product/2049`), contact and the Indonesian home,
  at 390 and 1280, full page — **0 pixels differ in all 10**. The gallery's manifest keeps `#1d3557`.
- **Screens:** `heritage/after/` — the shop on `84aefe3b`: home, shop, product, collections, stores, partnership,
  bag and track at 390 and 1280, full page and first screen; the URLs in `pages.json`. The palette board's screens
  (before the choice) are in the artifact above.

## Checks before the release

prettier, eslint (changed files), the token lint, file size, `tsc` across the workspace, and the unit suite (323
files, 2,750 tests passed).

## Open

- **Staging's rehearsal product** (id 266, "REHEARSAL 10.4 human-pace product", the seed's "Greeting card set —
  frangipani · staging placeholder" picture) still leads the home's hero, "Begin with these" and the one-print
  "Antique Prints" collection. It waits for the owner to unpublish it in the admin (task 10.4's data).
- **The prints' white mounts** are in the images themselves (cut from the catalogues' matted mockups), so they stay
  white on the linen tiles; the catalogues' mats are cream.
- **CI** has not run on `84aefe3b`: pushing to GitHub waits for the user's OK.
