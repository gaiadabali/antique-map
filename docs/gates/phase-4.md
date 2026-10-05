# Phase 4 gate — evidence for 4.1.e, 4.2.c, 4.2.d and 4.3.e

Ticket 4.qa, `qa` on the claude seat, branch `w/4qa`, 2026-10-05.

**Setup.** Production build (`pnpm build`, then `pnpm --filter @engine/web start -p 4216`) on worktree port
4216, database `indies_p4_w4qa` (`pnpm db:fresh`). `GALLERY_HOSTS=gallery.localhost`, `SHOP_HOSTS=shop.localhost`.
Seed: the 3.7.c shop files through the 3.7.a importer (120 stores, 80 products, 7 227 stock rows) plus three
antiques (`M.QA001`, `M.QA002`, `P.QA003`). The six shop categories had to be created as terms first, and the
seeded rows were published directly in this worktree's own database: the importer's publish check needs product
images, and local media storage cannot provide them (see Findings, F5). Screenshots are in `docs/gates/phase-4/`.
The failing output from before the fixes is in `docs/gates/phase-4/before-fix.txt`.

**Spec.** `tests/e2e/a11y/phase-4.spec.ts` runs in each host's a11y project, next to the existing `a11y.spec.ts`:
`E2E_PORT=4216 pnpm exec playwright test --project gallery-a11y --project shop-a11y` passes 31 of 31 after the
fixes. Set `PHASE4_SHOTS=docs/gates/phase-4` to write the screenshots. `node tests/e2e/phase-4/shoot-design.mjs 4216`
captures the design team's drawings and prints both outlines.

| Check | Verdict |
| --- | --- |
| 4.2.c style guide | **PASS** |
| 4.1.e palettes, fonts, token lint | **PASS** |
| 4.2.d keyboard, axe, contrast, lint | **PASS** after fix 1 |
| 4.3.e homes and partnership | **PASS** — F1–F4 closed by ticket 4.3-r3 (branch `w/4.3r3`), see the updated section below |

## Fixes made (one commit each, each with its before and after)

1. `a077a6c` **The style guide's sample footer nav needed a name.** axe reported `landmark-unique` on `/style-guide`
   at 390 and 1280 px on both hosts. `Footer` now takes an optional `navLabel`, and the style guide passes one.
2. `ce14b68` **Gallery home.** axe reported `color-contrast` (serious) on the plate captions, which used muted text
   on the deep surface (4.36:1), and `heading-order` because the trust cards used h3 directly under the h1. The
   captions now use the full ink, and the trust-card titles are paragraphs.
3. `73ea6fe` **Shop home.** axe reported `color-contrast` (serious) on the trade band, where the eyebrow was muted
   brown and the secondary button bronze, both on the brown band. It also reported `heading-order` because the
   product h3s had no h2 above them. The dark band now points its muted, accent and focus roles at the on-dark ink,
   and the best-sellers eyebrow is the section's h2.
4. `0634c53` **Every page scrolled sideways at 390 px.** The shared header's actions (language switch and chat)
   ended at 596–668 px. At ≤ 1024 px the bar now holds only the logo and the burger, and the drawer holds the nav
   and the actions. `scrollWidth` is 390 on every page, and the spec asserts it. A spec case also opens the drawer
   from the keyboard and finds the nav and both language links inside it.

## 4.2.c — the style guide shows every component and state — PASS

- `/style-guide` on both hosts has `robots: noindex, nofollow`. It holds one section per folder under
  `engine/apps/web/src/shared/ui`, 25 of 25. The spec compares the two lists: badge, breadcrumbs, button, card,
  chat-shell, checkbox, dialog, eyebrow, facet-chip, footer, form-message, hairline, header, input, map-pin-shell,
  pagination, price, responsive-image, select, skeleton, status-timeline, text-link, textarea, toast, zoom-shell.
  States shown: button default, secondary, quiet, small, disabled and loading; input default, error and disabled;
  form message info, success and error; badge in four tones; card in three tones.
- Both palettes: each host renders it in its own palette. Screenshots: `gallery-style-guide-{390,1280}.png` and
  `shop-style-guide-{390,1280}.png`.
- Reported on the board: `pnpm tasks:report 4.2.c` ticked it.

## 4.1.e — own palette from the same components; self-hosted fonts within budget; the lint catches a planted colour — PASS

- **Palettes.** The spec resolves every `--color-*` role on each host through a probe element and loads the other
  host. Gallery: surface `rgb(244,241,234)` (linen), text `rgb(26,25,22)` (off-black), `data-site="gallery"`.
  Shop: surface `rgb(241,229,211)` (cream), text `rgb(89,61,33)` (brown), `data-site="shop"`. The same Button
  carries an identical CSS-module class on both hosts, so the components are the same and only the tokens differ.
  Compare `gallery-home-en-1280.png` with `shop-home-en-1280.png`.
- **Fonts.** These are the network responses of type `font` on each home, from a cold load to `document.fonts.ready`:

  ```
  /_next/static/media/01e4147cff8141ee-s.p.3huc2loe0ie8a.woff2 37776 B
  /_next/static/media/8bd76523131fa0fc-s.p.1pvupmngxrt5z.woff2 39304 B
  /_next/static/media/f287e533ed04f2e6-s.p.2ijos0_3tnz-u.woff2 24264 B
  3 files, 101 344 B (99 KB)        — budget (DESIGN-SYSTEM §9): ≤ 3 files, < 150 KB
  requests to fonts.googleapis.com / fonts.gstatic.com: 0
  ```

  The result is the same on both hosts.
- **Planted raw colour.** `background: #ff0000` was put in `shared/ui/badge/badge.module.css` `.critical`:

  ```
  $ pnpm check:tokens
  engine\apps\web\src\shared\ui\badge\badge.module.css:30:15	hex colour	#ff0000
  [ELIFECYCLE] Command failed with exit code 1.
  ```

  After the revert, `pnpm check:tokens` reports `No raw colours or font-family declarations found outside token
  files.` The revert left no diff.

## 4.2.d — keyboard, focus ring, axe on the style guide, AA contrast, token lint — PASS

- **Keyboard.** At 1280 px on `/style-guide`, the spec marks every visible control that should take focus by Tab.
  It then presses Tab until each one has been reached and records whether the focused element shows an outline or
  a box shadow. Result on both hosts: every control is reached and none lacks a ring. Space toggles the checkbox.
  Enter on "Open dialog" opens the dialog, and Escape closes it. On a phone, Enter on the burger opens the drawer.
- **axe on `/style-guide`** in en and id at 390 and 1280 px, both hosts (`a11y.spec.ts`): 0 violations after fix 1.
- **Contrast.** These ratios are computed from the live token values on each host (`phase-4.spec.ts`, which
  asserts every floor):

  | Pair | Use | Gallery | Shop | AA floor |
  | --- | --- | --- | --- | --- |
  | text on surface | body text | 15.58 | 7.99 | 4.5 |
  | text on surface-raised | text on cards | 17.58 | 9.93 | 4.5 |
  | text on surface-deep | deep band, plate captions | 14.14 | 8.81 | 4.5 |
  | text-muted on surface | muted text, eyebrows | 4.92 | 4.83 | 4.5 |
  | text-muted on surface-raised | muted text on cards | 5.55 | 6.00 | 4.5 |
  | text-on-dark on surface-dark | dark band | 17.58 | 7.99 | 4.5 |
  | accent on surface | links, secondary and quiet buttons | 5.81 | 5.27 | 4.5 |
  | accent on surface-raised | links on cards | 6.55 | 6.55 | 4.5 |
  | accent-contrast on accent | primary button label | 6.55 | 6.55 | 4.5 |
  | danger on surface | error message | 6.52 | 5.92 | 4.5 |
  | success on surface | success message | 7.07 | 6.42 | 4.5 |
  | caution on surface | caution message | 5.25 | 4.77 | 4.5 |
  | accent-secondary on surface-raised | hover title, 25 px (large) | 3.06 | 3.06 | 3 |
  | focus on surface | focus ring (1.4.11) | 5.81 | 5.27 | 3 |
  | focus on surface-raised | focus ring on cards | 6.55 | 6.55 | 3 |

  Not a palette pair: muted text on the deep surface fails on the gallery (4.36:1). No component draws it now,
  since fix 2 removed the last use. Champagne on paper (3.06) passes only as large text, so keep it off
  body-size text.
- **Token lint:** `pnpm check:tokens` is green (above) and runs inside `pnpm verify`.

## 4.3.e — both homes and the partnership page on a production build — PASS

Ticket 4.3-r3 (sonnet, branch `w/4.3r3`) closed the two fails below: F1–F3 (`src/styles/site.css`,
`shell/**`, `shared/ui/{header,dialog}/**`) and F4 (the missing drawn sections, ruled into 4.3 by
the orchestrator). Re-run on a production build, port 4200, database `indies_p4_w43r3`.

**PASS.**
- **axe:** clean in en and id at 390 and 1280 px on the gallery home, the shop home, `/partnership` and
  `/id/kemitraan`. This covers `a11y.spec.ts` (homes) and `phase-4.spec.ts` (homes and partnership), after fixes 2–4.
- **No sideways scroll:** the spec asserts `scrollWidth ≤ viewport` on each of those pages at both widths.
- **Lexicon:** `pnpm vitest run engine/apps/web/src/sites/lexicon.test.ts` passes 6 of 6. It checks that every key
  has `en` and `id` and that none is unused.
- **No raw colour outside the tokens:** `pnpm check:tokens` is green. The only raw values left are
  `#7a5e3e` and `#1a191699` in `sites/shop/tokens/brand.css`, which is a token file the lint exempts.
- **Partnership:** the page ends in `#enquire`, the last section. The spec asserts that this section holds the form
  with name, email and message plus the WhatsApp and email buttons (when `site-settings` has the contact), and that
  the page has no password field or sign-in text.
- **Both languages and both widths:** screenshots `{gallery,shop}-home-{en,id}-{390,1280}.png` and
  `shop-partnership-{en,id}-{390,1280}.png`.
- **No hard-coded copy in the home and partnership components:** a grep for JSX text and literal
  `aria-label`/`alt`/`title`/`placeholder` over `sites/{gallery,shop}/home`, the partnership route and `shell/`
  finds nothing — F3's fix gave `Header`/`Dialog` label props, filled from the shell lexicon, so this now covers
  the shared UI too (`shell.menu.open`/`shell.menu.close`/`shell.menu` in `en` and `id`; verified no English
  `aria-label` remains on `/id`, both hosts).
- **No layout cap at 1280 px:** `.site-main`'s 66ch cap stays the default (product, bag, search, not-found keep
  it); the homes' own `.wrap` now breaks out of it the same way `browse.module.css`'s `.page` already does (F1).
  Browse, search, product and bag are unchanged — they never read the removed cap in the first place (browse
  already broke out of it; product and bag never touch 1280 px wide content).
- **h2/h3 typography:** `.site-main`'s bare h2/h3 now fall back to `--text-h2`/`--text-h3` (Cormorant), via
  `:where()` so a component's own heading class (a card title, a rail number) still wins (F2).

**Structure beside the drawing.** These are the h1 and h2 outlines printed by `shoot-design.mjs` at 1280 px, read
together with the screenshots `design-*-{390,1280}.png` and the built pages:

| Gallery home: drawing | Built | Match |
| --- | --- | --- |
| Hero on a dark band, film poster, h1 "The islands, first drawn.", three trust cards | Hero on a dark band, poster plate, same h1; the three trust cards follow in their own light strip | ✔ (treatment fixed, F1/F4) |
| About + three signals | About + three signals | ✔ |
| "The collection" rail: three categories with Explore | Featured works rail: three latest published works, Explore | ✔ (data-driven instead of fixed categories) |
| Curator | Curator | ✔ |
| "Recently placed": sold archive | "Recently placed": three placeholder cards (no price), marked for phase 5 | ✔ (placeholder until the sold archive ships) |
| "Live with the collection": bridge to the shop's printed editions | "Live with the collection": the same bridge, a real cross-site link | ✔ |
| — | "Makers and places" entry points | added; TASKS 4.3.b asks for it |
| Enquiry with an inline form | Enquiry with a CTA button and Sell to us | ~ (form deferred to phase 5's Ask flow) |

| Shop home: drawing | Built | Match |
| --- | --- | --- |
| Announcement bar | Shown when `site-settings.announcement` is set (none in this database, so none renders) | ✔ (real feature, not placeholder) |
| Hero, h1 "Old maps, new walls.", two print slots | Same h1, two slots, now the drawing's full width | ✔ |
| Island and room chips | Eight placeholder chips (four islands, four rooms), linking to the shop until browse has the facets | ✔ (placeholder until the owner's content / phase 6 facets) |
| Best sellers, four cards | Best sellers, four cards from the catalogue | ✔ |
| "Sets that hang together": gallery walls | Three placeholder sets, linking to the collections surface | ✔ (placeholder until phase 6) |
| How we make them, three steps | Same | ✔ |
| Trade & gifting, dark band | Same, dark band | ✔ |
| The originals: bridge to the gallery | Same | ✔ |

| Partnership: drawing | Built | Match |
| --- | --- | --- |
| Hero, h1 "Buying for a shop, a hotel, or a company.", Apply + Partner sign-in | Same h1, Apply only | ✔ (sign-in removed by design) |
| Four signals strip | Same | ✔ |
| Resellers, Company gifting, Hotels & villas (spec rows, CTA, image) | Same three, same rows | ✔ |
| "One form, whichever you are." | "Tell us what you are buying for.": WhatsApp, email, short form | ✔ (the enquiry CTA 4.3.c asks for) |
| "Sign in to your prices." | — | ✔ removed on purpose (4.3.c) |

All rows now match (gallery's "Makers and places" and the deferred enquiry form stand as previously-accepted,
deliberate deviations, not fails).

## Findings

F1–F4 below are closed by ticket 4.3-r3; F5 and F6 remain, outside this ticket's owned paths.

- **F1 — FIXED.** `.site-main` keeps its 66ch cap as the default (product, bag, search, not-found). The homes'
  `.wrap` now breaks out of it with the same `width: min(100vw - 2*gutter, 80rem); margin-inline-start: 50%;
  translate: -50% 0` trick `browse.module.css`'s `.page` already used — no prop plumbing through the shared
  layout, no risk to a page outside this ticket's owned paths.
- **F2 — FIXED.** `.site-main` now styles `:where() h2`/`h3` from `--text-h2`/`--text-h3`. `:where()` carries no
  specificity, so a section's own heading class (a card title, a rail number) still wins over the default.
- **F3 — FIXED.** `Header` (`openLabel`, `closeLabel`, `menuLabel`) and `Dialog` (`closeLabel`) take optional label
  props, defaulting to their old English strings so call sites outside this ticket's owned paths (the style
  guide's demo, `shared-ui.test.tsx`) are unchanged; `shell/site-shell.tsx` fills them from new shell-lexicon keys
  (`shell.menu.open`, `shell.menu.close`, reusing `shell.menu`) in `en` and `id`. Verified: no English `aria-label`
  left on either host's `/id`.
- **F4 — FIXED, built on seeded/real data where it exists, a typed placeholder constant otherwise (marked
  `// placeholder until the owner's content` or the phase that ships it), never a price on the gallery.** Gallery:
  the dark hero band (the same `.band`/`.bandDark` pattern the shop's trade band already used); "Recently placed"
  (three placeholder cards — the sold archive is phase 5); "Live with the collection" (a real cross-site link to
  the shop, via `siteHref`/`siteOrigin`, the same way the shop's own sister bridge is built). Shop: the
  announcement bar (wired to the real, already-modelled `site-settings.announcement` field — not placeholder;
  shows on any site the owner sets one on, hidden here since none is seeded); island and room chips (eight
  placeholder labels linking to the shop, until browse has those facets); "Sets that hang together" (three
  placeholder sets linking to the `collection` surface, until phase 6's collections ship).
- **F5 — the importer CLI loses its arguments.** `engine/packages/cms/src/import/cli.ts` run as `payload run
  src/import/cli.ts --file … --kind …` answers "Name the file to import." because Payload's runner consumes the
  flags. With `--` it exits 0 silently and imports nothing. `@engine/cms` also has no `import` script, although the
  CLI's usage line names one. The seed went through a throwaway wrapper that calls `runImportFile`. The 3.7 seed
  finish also needs the six categories as terms (`Prints`, `Map reproductions`, `Textiles`, `Homeware`,
  `Stationery`, `Gifts`) and product images before `--publish` can pass.
- **F6 — minor.** The gallery's `.entryCard:hover` and the shop's `.productCard:hover .cardTitle` turn titles
  champagne at 3.06:1. That passes only because the titles are 25 px. Inline `style={{ aspectRatio }}` props in
  `gallery-home.tsx`, `shop-home.tsx` and `featured-products.tsx` are one-off styles; they are token-safe, but
  CSS-module classes would be cleaner. The drawer wraps the shell's `<nav>` in a second `<nav>`
  (`shared/ui/header/header.tsx`, the mobileNav element).

## For the orchestrator

`4.1.e` and `4.2.d` were ticked on merging `w/4qa`. After merging `w/4.3r3`:

```bash
pnpm tasks:tick 4.3.e
```
