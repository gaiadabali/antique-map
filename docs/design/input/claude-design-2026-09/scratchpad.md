# Onboarding Document — Outline for Review
**Client:** Old East Indies / Antique Maps Indonesia · **Prepared by:** Gaia Digital Agency · **Meeting:** 10 Sept 2026
**Deck:** 19 slides, 1920×1080, content language English.

---

## A. Template system extracted from "GDA Report Template.pptx"

Read from the file itself (slide size 9144000 × 5143500 EMU = 960×540pt → 1920×1080 at 2×). No new layouts invented.

| Item | Value from template |
|---|---|
| Brand yellow | `#FED756` (sampled from both background images) |
| Text colour | `#000000` (master `titleStyle` + `bodyStyle`) |
| Typeface | Arial (theme major **and** minor font); cover text box uses Calibri |
| **Layout A — Cover** (tpl slide 1 → `slideLayout1`, bg `image1.jpg`) | Left 50.0% yellow panel carrying the Gaia tree logo, right 50% white. Title placeholder x=66px, y=156px, w=1790; subtitle y=596px |
| **Layout B — Section title** (tpl slide 2 → `slideLayout2`) | Solid `#FED756`, no shapes |
| **Layout C — Content** (tpl slide 3 → `slideLayout2`, bg `image2.png`) | Yellow band top 21.1% (0–228px), Gaia logo at x=85px y=28px w=153px; white body below. Content margins x=132 / 1788 (from layout title+body placeholders), footer row y=1002 |

Layout repeat plan: A ×1, B ×3, C ×15 (agenda uses C).

**Client logo placement (cover):** `Old East Indies Logo.jpg` sits on the white right half — the template's cover pairs the yellow Gaia panel with a white field, and the brief specifies "logo on white background". Gaia's logo stays in the yellow panel, so both marks appear once, side by side.

---

## B. Research log — all three URLs reachable, nothing invented

| URL | Pages actually read |
|---|---|
| antiquemapsindonesia.com | Homepage · category `/category/1-all-antique-maps` (347 maps, 11 pages) · product `/product/2049-…de-bry` |
| bartelegallery.com | Homepage · `/jakarta-collection/` (1,411 results, 71 pages) |
| 1stdibs.com | Homepage · dealer storefront `/dealers/bartele-gallery/shop/` |

**On the "sister website" framing:** what the sites show is a *dealer → marketplace* relationship, not two peer brands. bartelegallery.com carries no prices, no cart and no accounts; its "Shop Online Worldwide" button (in the header, and in the sticky mobile bar) links out to `1stdibs.com/dealers/bartele-gallery/`. 1stDibs is where the transaction happens. Worth confirming with the client, because one detail needs their input: that storefront is labelled "Bartele Gallery · 19,323 Results", but the browser title reads "Bartele Gallery – 1stDibs | zillerthal", every item is "Located in Langweer, NL" (European maps, botanicals, mineralogy — not the Jakarta Asia/Dutch East Indies stock), and the Category facet files all 19,323 items under **Furniture**. Flagged as an open question, not stated as fact in the deck.

---

## C. Title sequence (read these alone — the story should hold)

1. Website Revamp — Onboarding Document
2. Agenda
3. **01 — References & Analysis**
4. Current Website Audit
5. Reference 1 — Bartele Gallery (Catalogue)
6. Reference 2 — 1stDibs (E-commerce)
7. Takeaways for the Revamp
8. **02 — UX Design Guide**
9. Sitemap & Three-Platform Architecture
10. Core User Flows
11. Connecting Originals & Reproductions
12. Homepage Wireframe — Above the Fold
13. Homepage Wireframe — Continued
14. Search, States & Mobile Principles
15. **03 — UI Design Guide**
16. Typography Recommendations
17. Colour Palette
18. Components & Spacing
19. Open Questions & Next Steps

---

## D. Slide-by-slide content

### 1 — Cover · Layout A
- Title: **Website Revamp — Onboarding Document**
- Subtitle lines: Old East Indies · Antique Maps Indonesia — Client onboarding meeting, 10 September 2026 — Prepared by Gaia Digital Agency
- Client logo on the white half; Gaia logo in the yellow panel (from template background).

### 2 — Agenda · Layout C
Three numbered rows, no bullets:
- **01 References & Analysis** — Current site audit and two market references, read page by page
- **02 Design Guide UX** — Sitemap for three platforms, core flows, homepage wireframe
- **03 Design Guide UI** — Typography, colour, components and spacing

### 3 — 01 — References & Analysis · Layout B
Large "01" numeral + title on solid yellow. Kicker: three sites read in detail — catalogue, storefront and marketplace.

### 4 — Current Website Audit · Layout C
Six findings, two columns of three. Each = headline + one concrete line. Right rail: three "keep" chips.
1. **Three brand names on one page** — header reads "Indies Gallery — Antique Maps & Prints of Indonesia", the footer says "Indies Gallery, based in Singapore", the copyright says "© 2026 Antique Maps Indonesia", and the Catalogues link leaves for indiesgallery.com.
2. **The taxonomy is the navigation** — 100+ categories, three levels deep, rendered twice on every page (desktop + mobile copies), with the whole tree and the homepage slider repeated on product pages.
3. **No filters, only sorts** — 347 maps over 11 pages offer just Lowest/Highest Price, Recently Added, Sold, Unsold. No century, region, cartographer or price-range facet — although `/mapmaker/…` pages already exist in the data.
4. **Cards carry noise, not signal** — the De Bry map lists seven parent categories on one card; price is printed twice; condition codes ("G+ / Study images carefully", "VG+") appear with no legend.
5. **Catalogue data is uneven** — `Year: null`, `Year: Leiden`, `Size: 40 b7 22 cm.`, and sizes mixed between mm and cm on adjacent cards.
6. **Six CTAs, no primary** — the product page stacks Product Inquiry, Request Price, Add to Wishlist, Sell To Us, Email a Friend, Share; two purchase paths (Add to Basket vs Price on Request) sit side by side in one grid, and the page renders the inquiry modal twice.
- **Keep:** the curator's authority (certificate of authenticity from Dr David E. Parry, author of *The Cartography of The East Indian Islands*), the institutional client list (National Museum of Singapore, National Library of Australia, Louvre Abu Dhabi, University of Leiden), the scholarly object descriptions.

### 5 — Reference 1: Bartele Gallery · Layout C
Two columns, 3 PROS / 3 CONS, each headline + 1–2 lines.
**Pros** — (1) *Five nav items, one decision*: Maps of Asia, Dutch East Indies, Jakarta Collection, Visit Us, Contact. (2) *The title is the metadata*: "Antique Map of South-East Asia by Blaeu (c.1640)" — type, subject, cartographer, date in one scannable line. (3) *Physical gallery as the trust anchor*: sticky mobile bar gives Visit Gallery / WhatsApp / Shop Online / Location; footer states Lobby Level Hotel Indonesia Kempinski, Mon–Sun 10:00–20:00.
**Cons** — (1) *1,411 results, 71 pages, one search box*: no filter or sort anywhere in the Jakarta Collection. (2) *Sold is a text suffix*: "… – J.W Clarke (c.1820) – SOLD" written into the product title instead of a UI state. (3) *No price, no cart, and the brand ends at the handoff*: the 1stDibs storefront carries none of Bartele's story and offers no route back.

### 6 — Reference 2: 1stDibs · Layout C
**Pros** — (1) *Facets with counts*: Period down to the decade (19th Century 11,001 · 17th Century 1,539 · 1720s 199 · 16th Century 129), plus Creator with counts and its own search (Victor Levasseur 102, F. Valentijn 88). (2) *A card that answers the antique buyer's questions*: title, "Located in Langweer, NL", description snippet, a compound category ("Antique Early 18th Century Dutch Baroque Maps"), Materials, View Full Details. (3) *Trust and editorial as product*: Purchase Protection (authenticity, money-back, 24-hour cancellation, protected global delivery), Our Vetting Process, Introspective Magazine, and price-tier edits like The Under $1,000 Edit.
**Cons** — (1) *Not responsive*: the homepage ships `viewport width=1024, maximum-scale=3`, so phones get a scaled desktop page. (2) *Facet overload*: ~50 Period buckets in one column, many with counts of 1–16 (1610s 16 · 15th Century and Earlier 3 · 21st Century 1). (3) *Category collapses on the dealer storefront*: all 19,323 Bartele Gallery items filed under Furniture, so the one facet a map buyer needs first is useless.

### 7 — Takeaways for the Revamp · Layout C
Five numbered principles, each one line of consequence:
1. **One brand, three storefronts** — fix the Indies Gallery / Antique Maps Indonesia / Old East Indies split before anything else is designed.
2. **Facets, not a category tree** — century, region, cartographer, price and condition as filters with counts; retire the 100-item sidebar.
3. **Make the curator the differentiator** — Dr Parry's certificate and the museum client list belong above the fold, not in the footer.
4. **One primary action per product** — Add to Basket *or* Request Price, chosen by price visibility; everything else demoted.
5. **Mobile and Indonesian reality first** — WhatsApp as a first-class channel, responsive from the smallest breakpoint up, lean pages.

### 8 — 02 — UX Design Guide · Layout B

### 9 — Sitemap & Three-Platform Architecture · Layout C
Native vector diagram: one shared brand bar across the top, three columns below.
- **oldeastindies.com** — Home · Collection (catalogue) · Cartographers · Editorial/Journal · The Curator · Visit / Contact
- **Originals shop** — Shop home · Maps · Prints · Books · Posters · Photography · Tribal Art · Product · Inquiry / Checkout · Account
- **Reproductions shop** — Shop home · Wall Prints · Posters · Homeware (mugs, tote bags) · Gifts · Product + variants · Cart · Checkout
Cross-links drawn as dotted connectors; shared account and shared search shown as a band underneath.

### 10 — Core User Flows · Layout C
Three flow rows, each with 4–5 grayscale low-fi wireframe thumbnails (boxes, rules, placeholder blocks — vector only) plus a step caption.
- **A · Targeted search** — Search/filter (region, year, cartographer) → results with facets → product detail → Request Price / Add to Basket → inquiry confirmation.
- **B · Discovery** — Editorial or curator's collection → collection grid → product detail → related by cartographer.
- **C · Not ready for an original** — Original product page → "Available as a reproduction" → reproduction product → variant picker → cart.

### 11 — Connecting Originals & Reproductions · Layout C
Two-panel diagram with a labelled seam between them; six annotations:
shared header and brand system · cross-link from original PDP to its reproduction (one-way, never the reverse in the hero) · separate carts and checkouts · one account, two order histories · positioning split (rare/one-of-one vs affordable/repeatable) · prestige guardrails: reproductions never appear in original grids, no "cheaper alternative" language, different photography treatment, own domain/subdomain.

### 12 — Homepage Wireframe — Above the Fold · Layout C
Full-width vector wireframe, numbered annotations 1–5, each with a one-line function note: 1 utility + brand bar (WhatsApp, account, search) · 2 primary nav (Collection, Cartographers, Editorial, Curator, Visit) · 3 hero — one object, its story, one CTA · 4 search-first entry with three facet shortcuts (Region · Century · Cartographer) · 5 trust strip (certificate, museum clients, gallery address).

### 13 — Homepage Wireframe — Continued · Layout C
Annotations 6–11: 6 featured collection rail · 7 curator's note / editorial teaser · 8 browse by cartographer · 9 reproductions cross-sell band · 10 newsletter + WhatsApp · 11 footer with catalogue archive. Same grid and annotation style as slide 12.

### 14 — Search, States & Mobile Principles · Layout C
Four quadrants:
- **Search & filter** — facets with counts, chips for applied filters, no dead ends, "sold" as a toggle not a sort.
- **States to design** — loading (skeleton), empty (with facet-relaxing suggestions), error, success, sold, reserved.
- **Mobile-first** — 360px up, sticky WhatsApp/inquiry bar, 44px targets, image weight budget.
- **Inquiry form** — 4 fields, object context pre-filled, expected reply time stated, confirmation that names the object.

### 15 — 03 — UI Design Guide · Layout B

### 16 — Typography Recommendations · Layout C
Three pairings, each with rationale + live H1–H4 / body / caption scale (size / line-height / letter-spacing):
- **Option A — Cormorant Garamond + Inter.** Old-style heritage headline, neutral UI body. H1 64/1.1/−0.01em · H2 44 · H3 32 · H4 24 · Body 17/1.65 · Caption 13/1.4/0.04em.
- **Option B — Libre Baskerville + Source Sans 3.** Bookish, high-legibility at small sizes; closest to catalogue typesetting. H1 56/1.15 · Body 17/1.7.
- **Option C — Fraunces + Public Sans.** Most contemporary; variable optical size lets display and caption share one family. H1 60/1.1 · Body 17/1.6.
Recommendation: Option A, on legibility at Indonesian mobile sizes plus the closest match to the logo's soft geometry.

### 17 — Colour Palette · Layout C
Swatches with name, HEX, usage and measured contrast (all computed, all AA at body size on both surfaces):
- Brand Brown `#593D21` — primary, sampled from the logo strokes — 7.99:1 on Parchment
- Ink `#241B14` — body text — 13.60:1
- Parchment `#F1E5D3` — primary surface, sampled from the logo ground
- Paper `#FDFBF7` — cards and sheets
- Patina `#2F5D57` — secondary / links — 5.98:1
- Brass `#8A6A1F` — accents, price, rarity marks — 4.06:1
- Neutrals: `#241B14` · `#4A3B2E` · `#6B5A46` · `#B8A992` · `#E7DECE` · `#F7F1E7`
- Semantic: Success `#3F6B45` (4.97:1) · Warning `#8A5B12` (4.71:1) · Error `#8E3B2E` (6.00:1) · Info `#2F5D57`
- Note: `#B8A992` and lighter are borders and dividers only, never text.

### 18 — Components & Spacing · Layout C
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96 (4px base).
- Grid: 12 columns, 24px gutters, 1200px max content; breakpoints 360 · 768 · 1024 · 1440.
- Component previews, drawn native: button (default / hover / focus / disabled / loading), form field (rest / focus / error / helper), product card (image, title, cartographer, year, price or "Price on request", condition chip), nav bar (desktop + mobile).

### 19 — Open Questions & Next Steps · Layout C
**Questions for the meeting** (onboarding form not yet submitted): (1) Which name leads — Old East Indies, Antique Maps Indonesia or Indies Gallery, and what happens to indiesgallery.com? (2) One domain with two shops, or separate domains? (3) Is the 1stDibs storefront staying, and is the Langweer/Furniture listing set correct? (4) Prices public or on request, and above what value? (5) Who owns catalogue data cleanup, and is there an inventory system of record? (6) Print-on-demand partner and fulfilment for reproductions? (7) Languages and currencies at launch?
**Next steps** — content and data audit → IA + wireframes → UI direction → design system → build handoff, with owners and dates left as fields to fill in the meeting.

---

## E. Layout notes for build
- Content slides: title in white area below the yellow band; body region y 356–1000; footer strip with slide number right, "Gaia Digital Agency · Old East Indies Onboarding" left.
- Type scale (1920×1080): `--type-title 60` · `--type-subtitle 40` · `--type-h 34` · `--type-body 28` · `--type-small 24`. Arial throughout, per template.
- Diagrams, sitemap, flows and wireframes: native HTML/CSS boxes and rules in grayscale — no raster, no generated imagery.
- Max 6 items per slide; one accent (`#FED756`) plus black and white only, so the deck stays inside the template's palette.
