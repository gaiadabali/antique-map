# Design system — one base, two palettes

The design brief and the rules both sites are built to (DR-14, DR-16). **One shared base** — type, spacing, grid,
components, motion and accessibility rules — and **a distinct palette per site**, with a few signature details.
Phase 4 ports the design team's values and records in `DESIGN.md` what it adopted, what it added and the swap
points; the client's final colours and reading face wait for him (Q15, Q16) and for the UI/UX pass after the build
(TASKS.md v2.0).
Behaviour per site is in [EXPERIENCE-GALLERY.md](EXPERIENCE-GALLERY.md) and [EXPERIENCE-SHOP.md](EXPERIENCE-SHOP.md).

**The design source** is the design team's delivered work in `docs/design/input/claude-design-2026-09/`: their
system in `_ds/luxury-minimalist-design-system-*/` — `readme.md`; three-tier tokens (`tokens/colors.css`:
primitives → editable brand variables → semantic aliases; `typography.css`, `spacing.css`, `fonts.css`);
`components/components.css` (buttons ghost and solid in two sizes, card, badge, separator, floating-label input,
header with its drawer, footer, section tones, a sticky hero) — the home pages
`Home - Antique Maps Indonesia.dc.html` and `Home - Old East Indies.dc.html`, the shop's
`Old East Indies/Partnership.dc.html`, the hero film `assets/hero-film.mp4`, and their project notes, `CLAUDE.md`.
The readme also lists React sources, a UI kit and a token dashboard that were not delivered; the components' props
survive in `_adherence.oxlintrc.json` and the compiled `_ds_bundle.js`. Behind it sit the client's two references,
to mix, not copy: Etalage (a detailed showcase catalogue) and Everart (a consistent catalogue in artistic frames,
complete filtering).

**Ported, not pasted.** Their tokens and component CSS are the base: tiers 1 and 3 and the fonts go to
`src/shared/styles/`, each site's tier 2 to `src/sites/<site>/tokens/` (ARCHITECTURE.md §4), the component CSS into
one CSS Module per shared component. The pages are references for composition and content: their page-level
overrides (their own reading face, one green palette for both sites) and inline values (`#1C201C`,
`padding-block: 70px`) are re-expressed in tokens, never copied into feature code. The surfaces they did not draw
— the item page, product page, bag, checkout, tracking page, chat, map pin, status timeline and zoom viewer — are
built in the same language: the same tokens, hairlines, square corners, type and motion.

## Built to be restyled (DR-16)

The whole product is built end to end on this early UI, and the owner's UI/UX pass comes after the build. So the
first-run UI is the real UI, made so that a redesign is a token and component change, never a rebuild:

- **Every visual value is a token** — colour, type family, size and line, spacing, radius, hairline, shadow, blur,
  opacity, duration and easing. Tier 1 holds raw values, tier 2 a site's palette (§4), tier 3 the semantic
  aliases; components read tier 3 only.
- **Pages are thin compositions** of shared components fed by view models. A page or feature module arranges
  components on the grid and holds no colour, size or font of its own; a one-off look becomes a component variant.
- **No words in components** — every string is a lexicon key or CMS text (§11).
- **The swap points are named** in `DESIGN.md`: the two palette files, the two font-family tokens (§2), the hero
  media, the logo lockups.
- **Checks.** (1) A lint and a unit test fail on a raw colour (hex, `rgb()`, `hsl()`, a named colour) or a
  `font-family` outside the token files, and on a raw length or an inline `style` value in components and pages
  (media queries excepted, since CSS cannot read a custom property there) — the design team's
  `_adherence.oxlintrc.json` warns on raw hex, raw px and foreign fonts; ours fails, in TSX and CSS Modules alike.
  (2) The `/style-guide` page (§5) shows every component in every state, in both palettes, at 390 and 1280: a
  restyle is judged there before any page. (3) CI checks every text pairing's contrast from the token values (§4).

## 1. The two sites, one family

| | Indies Gallery | Old East Indies |
| --- | --- | --- |
| Sells | one-of-one originals, by conversation | merchandise, through a checkout |
| Must feel | super premium, quiet, scholarly; the sheet leads | warm, sunlit, giftable, a little playful |
| Palette (tier 2, §4) | quiet luxury, starting from the design team's linen `#F4F1EA`, off-black `#1A1916`, bronze `#6E5A43` and champagne `#A39174`; the accent used sparingly (links, focus, the primary button) | warmer and friendlier: warmer grounds and a livelier accent, starting from the logo's brown `#593D21` and cream `#F1E5D3` (measured from the logo) |
| Signature details (candidates) | every image on a toned **mat** with even margins; the **stock-number tag**; hairline rules; the original title in italic | the **SKU / archive tag** on products; warmer image grounds; cartographic small details (scale-bar rules, place labels) — never VOC emblems |
| Density | generous margins, few elements per screen | tighter grids, more products per screen |

Shared without exception: layout grid, type families and scale, button and form shapes, component behaviour, motion
rules, accessibility, copy rules — the two are siblings, as the design team's notes ask. What differs is only the
palette (§4) and the signature details. Each site's root layout loads its own palette file; no component branches
on the site.

## 2. Type

- **Cormorant Garamond** — display only: page titles, item titles, section headings, large quotes. Its small x-height
  makes it hard to read small, so **never below 20 px**, never for body text, buttons, form fields, prices or
  long Indonesian compounds in narrow columns.
- **Inter** — everything else: body, interface, labels, prices, the record (the design team's system and the
  owner's choice, 2026-10-02). Numbers that are compared — prices, dimensions, stock numbers, times — use **tabular
  figures**.
- **Italic** Cormorant for transcribed original titles (gallery) — the one italic in the system.
- Each family is one token (`--font-display`, `--font-body`), so the reading face is a one-line change (Open).

| Role (design team's token) | Family | Size / line | Use |
| --- | --- | --- | --- |
| Hero | Cormorant | fluid, `clamp()` up to 80–92 px (the home pages' hero) | home hero, one per page at most |
| Display (`h1`) | Cormorant | 40/60 | page H1 |
| Title (`h2` · `h3`) | Cormorant | 32/50 · 24/40 | section headings · subsections and card titles |
| Lede (`body-lg`) | Inter | 18/30 | the first paragraph, the status line |
| Body (`body-md`) | Inter | 16/25 | running text, the record |
| Small (`body-sm`) | Inter | 14/25 | captions, metadata, helper text; nav and button labels in bold |
| Caption (`caption`) | Inter | 12/18 | eyebrows and badges only, uppercase with `0.10em` tracking; never a sentence |

The hero steps fluidly (`clamp()`), never by breakpoint jumps. One reading measure (about 65 characters) for running
text. The home pages tighten some steps (H2 38/44, body 15/25); the port keeps one value per token and never sets
running text below 16 px on a phone.

**Fonts are self-hosted**, subset to Latin plus Latin Extended for Indonesian and Dutch diacritics, checked against
real original titles (long s `ſ`, ligatures, accents). Fallback fonts carry metric overrides so the swap causes no
layout shift. The design team delivered Cormorant Garamond Regular and Bold as TTF (about 640 KB each) and Inter
Regular and Bold as WOFF (about 180 KB each), and their pages load Google Fonts; the port serves subset WOFF2 files
of its own within §9's budget, and adds Cormorant's italic.

## 3. Space, grid and shape

- **Spacing scale** (the design team's `spacing.css`): 10 · 15 · 20 · 30 · 40 · 50 · 60 · 100 px, 15 only inside a
  card. Components use scale steps only; no ad-hoc values (the pages' 70 px bands become a step).
- **Grid:** 4 columns at 390, 8 at 768, 12 at 1280, under the design team's layout law: every band runs edge to
  edge and its content is locked to 1340 px by one `--layout-gutter` token (50 px; 40 at ≤ 1024; 20 at ≤ 768).
- **Shape** (the design team's): zero radius everywhere, 0.5 px hairlines at 18 % ink, borderless cards, no shadow
  but the scrolled header's. Two accessibility limits override it: an **input or control boundary needs 3:1
  contrast** against its ground, so the floating input's 0.5 px underline at 18 % is ported darker and at least
  1 px (a decorative hairline may stay light); and **focus is a solid ring of at least 2 px at 3:1**, not the
  kit's thin outline.
- **Breakpoints:** the system is designed at **390** and checked at **1280**; it must reflow to 320 without
  sideways scrolling, and 768 is checked once per component.

## 4. Colour

Components use **roles** (tier 3), never raw values. **Each site's palette is tier 2** — its brand variables, in one
file per site: `sites/gallery/tokens` and `sites/shop/tokens` — and both define every role. The gallery is quiet and
luxurious, starting from the design team's linen, off-black, bronze and champagne (§1); the shop is warmer and
friendlier, distinct from the gallery yet visibly its sibling — the same layout, buttons and type. The client has
not chosen colours (Q16): his final ones are an edit to those two files and nothing else. (The design team's two
home pages re-point tier 2 to one deep green, `#2F3E31`, and a bronze-gold, `#6E5418`, for both sites — the
mechanism we keep, with a palette per site.)

| Role | Meaning (the design team's alias, where one exists) |
| --- | --- |
| `ground` · `surface` · `surface-deep` | page background (`--surface-page`), raised panels (`--surface-card`), a deeper band (their tint tone) |
| `ink` · `ink-soft` | primary text (`--text-primary`); secondary text (derived to pass AA on every ground it sits on — never a faded opacity, so not their 60 % `--opacity-muted`) |
| `rule` | hairlines and dividers (`--hairline`) |
| `accent` · `accent-ink` · `accent-2` | the site's accent and the text that sits on it (`--accent`, `--text-on-accent`); the secondary accent (`--accent-secondary`) |
| `band-dark` · `band-dark-ink` | their dark section tone: the shop's trade band and the partnership enquiry |
| `focus` | the focus ring |
| `positive` · `caution` · `critical` | paid / in stock · on hold / pending · errors / sold out — always with text |
| `viewer` · `viewer-ink` | the deep-zoom full-screen surface |
| `scrim` | behind a dialog, sheet or the viewer (`--overlay-scrim`) |

Rules: every text pairing passes WCAG AA on the grounds it sits on (4.5:1 body, 3:1 large text and UI parts),
checked in CI from the token values; status never relies on colour; errors are legible text in `critical`, never a
faint tint (not the kit's error line in the accent at 60 %); a hover fade never takes text below AA. The first-run
values are phase 4's; the client's come later (Open). The shop's palette passes a **cultural review** by
Indonesian designers and buyers before it is final.

**No dark mode.** Paper on a warm ground is the product; a dark theme would misrepresent every sheet's tone. No
`prefers-color-scheme` styles on either site. The dark band and the viewer's full-screen surface are designed
surfaces, not a theme. Emails are designed to survive mail apps that invert colours.

## 5. Components

Kept to what the two sites need. Every component is designed in every state — default, hover, focus-visible,
active, disabled (with its reason shown), loading, error, empty — and rendered on a `/style-guide` page (noindex)
from fixtures, in both locales, in both palettes, at 390 and 1280. The design team's kit supplies the header and
its drawer, the footer, buttons, card, badge, separator, the floating-label input, the section tones and the hero;
every other row is built in the same language and appears on the `/style-guide` before any page uses it.

| Component | G | S | Notes |
| --- | --- | --- | --- |
| Header, menu sheet, footer, skip link | ● | ● | the kit's: transparent over a hero, frosted once scrolled; the phone menu is its full-height drawer |
| Locale switcher | ● | ● | maps the URL to its translation, keeps the scroll place |
| Button — solid (primary), ghost (secondary), quiet | ● | ● | the kit's 40 and 35 px heights; on touch the hit area is 44 px; labels name the outcome; never wraps; loading keeps width |
| Contact buttons (WhatsApp, email, guide) with the reply promise | ● | ● | the site's button style with the WhatsApp mark, not WhatsApp's green |
| Form fields — text, email, WhatsApp number, textarea, select, radio group, checkbox, photo upload | ● | ● | visible labels, hint, inline error, error summary; 16 px inputs |
| Search field with suggestions (combobox) | ● | ● | historical-name suggestion on the gallery |
| Card — work | ● | | image on its mat, title, maker and date, dimensions, status line |
| Card — product | | ● | image, name, price, Reproduction, sold out |
| Image (responsive, reserved, mat) | ● | ● | §7 |
| Media viewer — deep zoom and lightbox | ● | ● | gallery: tiles, verso flip; shop: the product images in the lightbox |
| Facets — checkbox list with counts, place tree, year range with number inputs, sort, applied chips, filter sheet | ● | ● | live result count on Apply |
| Status text / badge | ● | ● | Available · On hold · Sold · Price on request · In stock · Sold out · Reproduction |
| Record (definition list) | ● | | the gallery's collation block |
| Price | | ● | server-formatted rupiah; "From" for variant ranges |
| Option group, quantity stepper | | ● | real radio groups; stepper with buttons and a typed number |
| Bag parts — line, summary, free-delivery progress, voucher field, "added" confirmation | | ● | |
| Checkout parts — section with summary and Change, map-pin picker, delivery line, payment-method list, VA panel with Copy, QRIS panel, deadline line | | ● | |
| Status timeline | | ● | the tracking page's steps with times |
| Chat launcher and panel | ● | ● | sheet on a phone, side panel at 1280; labelled AI; "Talk to a person" fixed |
| Notice — info, caution, critical; empty state; error page | ● | ● | one or two sentences that explain and instruct |
| Content blocks — prose, figure, zoom figure, gallery, work/product rail, FAQ, call to action | ● | ● | the renderers for `pages` |
| Breadcrumbs, pagination | ● | ● | pagination keeps real URLs |

**The admin is not part of this system.** Payload's own admin is used as it is, with the site's logo and accent on
its chrome only; custom admin views (the store staff order panel) are built from Payload's own UI components.

## 6. Motion

1. Out is faster than in — the kit's 280 ms in, 180 ms out, 520 ms for a large surface.
2. One easing curve per site, declared once — the kit's `cubic-bezier(0.22, 0.61, 0.36, 1)` to start.
3. Nothing moves that the visitor did not cause. No parallax, no scroll hijacking — the wheel always scrolls the
   page (the kit's sticky hero is plain `position: sticky`, so it may stay). **The one autoplay is the gallery's
   hero film**: muted, with a visible pause button (WCAG 2.2.2), its poster frame the LCP image; it loads after
   first paint, never plays under `prefers-reduced-motion` or `Save-Data`, and is re-encoded from the delivered
   9.7 MB to at most 2 MB at phone width.
4. **`prefers-reduced-motion` is absolute**: transitions become cuts or short cross-fades. No exceptions.
5. Every animation is interruptible and never delays input.
6. CSS and the View Transitions API first; no animation library by default.

`DESIGN.md` names **at most six motions** per site with trigger, duration, easing and reduced-motion fallback —
candidates: the hero film, the gallery's About map revealed under the cursor (hover screens only), card → item,
viewer open/close, the verso flip, the filter sheet, the bag confirmation, a tracking step arriving.

## 7. Image treatment

- **Never crop an original.** Gallery images are contained on a mat with even margins (the kit's plates crop to
  fill: `cover` suits only room, hand and workshop photographs); extreme aspects (a 3.5 : 1 coastal profile, a
  0.3 : 1 costume print) share one grid by sitting on the same mat box.
- **Never retouch away a defect** on an original: the condition notes and the image must agree.
- **Mockups are labelled** ("Digital mockup") on the image and in the alt text, and never lead while a photograph
  exists.
- Every image reserves its dimensions, carries a blurred placeholder from the media record, is served as AVIF with
  WebP fallback, and is never larger than rendered size × device pixel ratio. `Save-Data` selects a smaller ladder.
- Shop photography: sun, hands, rooms, packaging, the showroom; gallery photography: the object, studio light,
  raking light, no people. The capture guides are `docs/design/imagery/`.

## 8. Honesty rules

- A reproduction is always labelled "Reproduction" and says what it reproduces.
- No invented urgency: no resetting countdowns, no "12 people are looking"; a deadline is shown only when real
  (a payment window) and says what happens when it ends.
- Sold items stay visible as sold. Dates carry their precision ("c. 1750"), attributions their certainty
  ("attributed to"). A band with no real data is omitted, never filled.

## 9. Performance budgets

Measured at p75 on a mid-range Android (Samsung Galaxy A15 class) over 4G, in Lighthouse CI on every change and on a
real phone in Bali before each site phase closes.

| Metric | Home / browse | Item / product | Checkout / payment / tracking |
| --- | --- | --- | --- |
| LCP | < 2.5 s | < 2.5 s (the primary image, preloaded) | < 2.5 s |
| INP | < 200 ms | < 200 ms | < 200 ms |
| CLS | < 0.05 | < 0.05 | < 0.05 |
| First-party JS (gzip) | < 150 KB | < 180 KB — viewer, chat and map load on intent | < 200 KB — the payment script only on the payment step, the map only once the delivery section opens |

- **Fonts:** at most **3 files on first paint** (Cormorant roman, Cormorant italic where used above the fold,
  Inter), together under 150 KB, `font-display: swap`, the display face preloaded.
- **No third-party scripts** beyond the payment provider on the payment step and Google Maps once the checkout's
  delivery section opens (SECURITY.md B6); analytics are first-party (DR-13).
- The chat, the zoom viewer, the map and the hero film never load on first paint.

## 10. Accessibility

**WCAG 2.2 AA is acceptance, not a later pass.** Every surface is checked at **390 px and 1280 px**, at 200 % zoom,
with keyboard only, and with a screen reader (VoiceOver on iOS, TalkBack on Android) for the buy path and the
handoffs.

- Keyboard-complete; focus always visible (§3) and **never obscured** by a sticky bar, the chat launcher or a
  banner (2.4.11) — the bottom of a phone screen is one slot with a priority order.
- Targets at least 24 px, 44 px on touch; inputs 16 px.
- Status is text, never colour alone. Price and status changes are announced politely; new chat messages too.
- Forms: visible labels, errors that explain and instruct, never cleared on error, an error summary that links to
  each field.
- **Dragging always has an alternative** (2.5.7): number inputs beside ranges, buttons for viewer pan and zoom,
  search and pasted links for the map pin.
- `lang` per page and per passage (a Dutch or Latin title carries its own); dimensions in cm and inches.
- Dialogs and sheets trap focus and return it to their opener; `Esc` closes them.
- Tested in Safari iOS, Chrome Android, and the Instagram, WhatsApp and TikTok in-app browsers.

## 11. Copy and the lexicon

**Keys in code, values in content.** Components never hold words. Each site's interface strings are **message
keys** defined in code with neutral defaults (the lexicon, one module per area); the **values** per site and locale
live in copy files outside the components; **marketing text** — headings, page bodies, home bands — lives in the
CMS. `checkCopy()` in `@engine/i18n` fails CI on a missing value, an unknown key or a value whose `{placeholders}`
differ from the default's. *Reshape note:* today the keys are `engine/apps/<app>/src/messages/` and the values
`indies-gallery/site/copy/` and `old-east-indies/site/copy/`; phase 2 moves both to
`engine/apps/web/src/sites/<site>/lexicon/`.

How each site sounds — register, principles, settled words — is `docs/design/gallery/voice.md` and
`docs/design/emporium/voice.md`. The rules both share:

- **English in British spelling; Indonesian in the *Anda* register** (DR-12), capitalised; never *kamu*. The
  gallery's Indonesian is *bahasa baku*; the shop's is spoken and lightly colloquial. Indonesian values are drafts
  until a native writer reviews them.
- Sentence case everywhere; uppercase only for eyebrows and badges. No emoji.
- **Controls name their outcome** ("Ask on WhatsApp", "Pay Rp 185.000"), never "Submit" or "Click here".
- **Errors explain and instruct** in one or two sentences; no "Oops", no apology without a next step.
- **No figure typed into copy**: prices, dates, counts, hours and times are `{placeholders}` the page fills from
  data or `site-settings`; a promise the data does not hold is not shown.
- Status words are fixed lexicon entries, one meaning each: Available · On hold · Sold · Price on request ·
  In stock · Sold out · Reproduction.
- Prefilled WhatsApp messages are in the visitor's voice and the page's language, short enough to edit.

## 12. Phase 4 deliverables and the design gate

Phase 4 produces (TASKS.md 4.1–4.3): the ported tokens and fonts, one palette file per site; `DESIGN.md` — what was
adopted, what was added, the swap points, the named motions; the shared components above with their states; the
`/style-guide` page; the token-only lint; both sites' chrome, both home pages and the shop's partnership page from
the design team's drawings. **The gate**, at the end of phase 4 and of each site phase: a senior UI/UX review runs
impeccable `critique` and `audit` on real-phone screenshots at 390 and 1280, in English and Indonesian, against the
design team's pages; no P0 or P1 finding remains. The owner sees the screenshot set; his look-and-feel sign-off is
the UI/UX pass after the build (DR-16).

## Open

- **The client's final colours** (Q16) — before launch. Default: phase 4's two palettes (§4); the change is an
  edit to the two palette files.
- **Karla for reading** (Q15) — the design team's notes (`CLAUDE.md`, 11 Sept 2026) say the client loves Karla as
  the reading face and wants it kept, and their home pages set text in it; their system, and the owner on
  2026-10-02, chose Inter. Default Inter; `--font-body` is one token, so Karla is a one-line change.
- **Which Cormorant weights** (and whether the variable font fits the font budget) — phase 4, measured.
- **The shop's cultural review** — who reviews (Indonesian designers and buyers), owner to name them.
