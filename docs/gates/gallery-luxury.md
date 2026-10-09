# Gate — phase 14, the gallery's luxury pass (task 14.8)

Checked on staging, read-only, on 2026-10-09 and 2026-10-10. Nothing was created on staging.

## Release

`production-20261009T154502Z-ca01da38` (commit `ca01da38`), live on `indies-gallery.gaiada.com` and
`old-east-indies.gaiada.com`.

## Every page, 390 and 1280 px (gallery)

Checker: Playwright with `@axe-core/playwright`, full-page shots at 390 and 1280. Every row, at both widths, was
`sideways=false`, `h1=1`, `brokenImages=0`, `axe=[]`, `consoleErrors=0`, except the notes below the table.

| Page           | Address                                   | Status          | axe  | Sideways | Broken images |
| -------------- | ----------------------------------------- | --------------- | ---- | -------- | ------------- |
| Home           | `/`, `/id`                                | 200             | none | no       | 0             |
| Browse         | `/browse`, `/id/jelajah`                  | 200             | none | no       | 0             |
| A type page    | `/antique-maps`, `/id/peta-antik`         | 200             | none | no       | 0             |
| Search         | `/search?q=batavia`, `/id/cari?q=batavia` | 200             | none | no       | 0             |
| Search, none   | `/search?q=zzzqx`                         | 200             | none | no       | 0             |
| Item           | `/product/746`, `/id/produk/746`          | 200             | none | no       | 0             |
| Item, sold     | `/product/2049`                           | 200             | none | no       | 0             |
| Item, zoomable | `/product/507`                            | 200             | none | no       | 0             |
| Makers         | `/makers`, `/id/pembuat`                  | 200             | none | no       | 0             |
| A maker        | `/makers/abraham-ortelius`                | 200             | none | no       | 0             |
| Places         | `/places`, `/id/tempat`                   | 200             | none | no       | 0             |
| A place        | `/places/bali-lombok`                     | 200             | none | no       | 0             |
| Sell to us     | `/sell-to-us`, `/id/jual-ke-kami`         | 200 (curl)      | none | no       | 0             |
| Contact        | `/contact`, `/id/kontak`                  | 200 (curl)      | none | no       | 0             |
| Not found      | `/no-such-page`, `/id/tidak-ada`          | 404 (by design) | none | no       | 0             |

- **Sell and contact (four pages):** the checker's `page.goto` waits for network idle, which the Turnstile widget
  never allows, so it timed out and printed no status; the page still rendered and axe, sideways and image checks ran
  on it (all clean, both widths). The 200 is from `curl -w %{http_code}` (0.16 to 0.61 s each).
- **Not found:** the one console line at each width is the browser's own "Failed to load resource: ... 404".
- **Stories: not run.** Staging has no `pages` records, so there is no story to open. The story layout and a story's
  hero were checked on a local production build by the orchestrator (14.6 review), not here.

## No price, no institution

`curl -sL` of each page, regex `USD|US\$|S\$ ?[0-9]|askingPrice|asking_price`: **0 on all 25 addresses** (every
address in the table, including `/product/2049`, `/product/507` and both not-found pages). The institution regex
(`Louvre|National Museum|National Library|Museum Nasional|national collections|Museum-collected|two working days|dua
hari kerja`) on the home, `/` and `/id`: **0 and 0** (also 0 on every other page). "Price on request" is the only
price wording seen; it carries no figure.

## Behaviour, 1280 px

| Check                  | Result                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Sort tab               | "Date of the work: earliest first" goes to `/browse?sort=dateAsc`; 1,513 works; first cards change from 2049, 2048, 2047 to 1093, 477, 2050   |
| Paging                 | Next goes to `/browse?page=2`; 24 cards, first 2023, 2022, 2021                                                                               |
| Include sold           | `/browse?availability=sold`: 1,513 becomes 1,709 works                                                                                        |
| Maker disclosure       | "All 112 makers" opened, a listed maker clicked: `/browse?maker=14` (Berthe Hoola van Nooten), 16 works; the disclosure is open on the result |
| Year pair              | 1700 and 1800 then Apply: `/browse?date=1700-1800`, 371 works                                                                                 |
| Zoom (`/product/507`)  | "Zoom into the image" opens the viewer; `info.json` 200, then tiles 200 (`full/512,186`, `0,0,2048,1481/512,371`, `2048,0,2048,1481/512,371`); one canvas, 657 x 493, drawn (non-blank pixel sample) |
| Ask on `/product/746`  | Item panel button "Ask about this": `https://wa.me/6281100000000?text=Hello, I am interested in P.1180 ...`; the Indonesian page carries P.1180 too. See finding 1 |
| Empty Send, sell en    | one POST; "Please tell us your name." / "Please give a WhatsApp number or an email address." / "Please write a message of up to 2,000 characters." / "Please tick the box so we may answer you." |
| Empty Send, contact en | the same four messages                                                                                                                        |
| Empty Send, sell id    | "Mohon tuliskan nama Anda." / "Mohon berikan nomor WhatsApp atau alamat email." / "Mohon tuliskan pesan hingga 2.000 karakter." / "Mohon centang kotaknya agar kami bisa membalas." |
| Empty Send, contact id | the same four messages                                                                                                                        |

Nothing was created (an empty Send fails field validation before any record). Turnstile did not refuse first.

## The shop looks as it did (`old-east-indies.gaiada.com`)

| Page        | Address                                      | Status                                                    | axe  | Sideways | Broken images |
| ----------- | -------------------------------------------- | --------------------------------------------------------- | ---- | -------- | ------------- |
| Home        | `/`                                          | 200                                                       | none | no       | 0             |
| Browse      | `/shop`                                      | 200                                                       | none | no       | 0             |
| Product     | `/product/balinese-dancer-photograph-c-1927` | 200                                                       | none | no       | 0             |
| Partnership | `/partnership`                               | rendered (status line lost to the same Turnstile timeout) | none | no       | 0             |

Eyebrow marks on the shop home, computed style, at 1280 and at 390 (6 marks each): the five outside the dark trade
band read `60px x 5.625px`, 1px `rgb(110, 90, 67)` border, stripes `repeating-linear-gradient(90deg, rgb(110, 90, 67)
0px, rgb(110, 90, 67) 25%, rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 0) 50%)`; the one inside the dark band (background
`rgb(89, 61, 33)`) reads border and stripes `rgb(241, 229, 211)`. All as expected.

Compared with the pre-phase-14 staging shots: the shop home at 1280 was opened beside `shop/home-1280.png` and the
two are the same by eye (same hero, bands, cards, footer; same height, 4952 px). The browse, product and partnership
pages were **not** compared by eye against the old shots; for them the evidence is axe clean, no sideways scroll, no
broken image.

## Looked at

First screens at 390 and 1280 of home, browse, item, makers and sell (linked below), the full 1280 home, and the shop
home. Judged against the language: prints whole on mats, hairline eyebrows, serif heads, museum captions with
"Price on request" and the stock tag, proof points, hairline rules, square corners. All present and consistent. The
full pages of browse, item, makers and sell were not opened (first screens only); the other pages were judged by the
checker's numbers, not by eye.

| Page   | 390                                         | 1280                                          |
| ------ | ------------------------------------------- | --------------------------------------------- |
| Home   | [home-390](gallery-luxury/home-390.png)     | [home-1280](gallery-luxury/home-1280.png)     |
| Browse | [browse-390](gallery-luxury/browse-390.png) | [browse-1280](gallery-luxury/browse-1280.png) |
| Item   | [item-390](gallery-luxury/item-390.png)     | [item-1280](gallery-luxury/item-1280.png)     |
| Makers | [makers-390](gallery-luxury/makers-390.png) | [makers-1280](gallery-luxury/makers-1280.png) |
| Sell   | [sell-390](gallery-luxury/sell-390.png)     | [sell-1280](gallery-luxury/sell-1280.png)     |

## Found (none blocks the check)

1. **The footer's "Ask on WhatsApp" is a bare `wa.me/6281100000000`** with no message. The requirement that Ask carry
   the stock number is met by the item panel's "Ask about this" button (P.1180); the footer link is sitewide by
   design. Not a defect; named so nobody reads the footer link as the item's.
2. **The floating chat button covers content** on browse at 1280 (the fourth card's stock tag) and at 390 (cards,
   maker list). Known from phase 12's follow-ups; owner: frontend.
3. **Home, the curator section** shows an empty mat with the note "The curator at work": the photo is not supplied
   yet (D19). Placeholder by design; it needs the owner's photo before launch.
4. **Placeholder contact on staging:** the email reads `gallery@example.com` on the item and sell pages.
5. **Zoom tiles are served from `old-east-indies.gaiada.com/_media/iiif/...`** (the shop host) for a gallery page;
   they answer 200 across origins and the viewer draws. Noted in case media should come from the gallery's own host.
6. The 390 browse sort row is cut off ("Date of the work: earliest firs...") and scrolls inside its own strip; the page
   itself has no sideways scroll. Cosmetic.
