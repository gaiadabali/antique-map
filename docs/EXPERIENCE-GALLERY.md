# Experience — Indies Gallery

How the gallery site behaves. Written so a designer and a developer read the
same thing (KOI). The research behind every decision is in RESEARCH.md §1–2;
the visual world is chosen in the Design stage and recorded in
`engine/apps/gallery/DESIGN.md`.

**Feeling to aim for:** a Dutch Golden Age print room re-hung as a modern museum
— warm paper, iron-gall ink, generous margins, the object on a mat with a soft
contact shadow and never cropped. The interface recedes; the sheet leads. Nothing
on the page may make a USD 38,800 map look like a USD 38 poster.

**Research evidence — not a pinned direction.** The benchmark proposed "Print
Room" (Newsreader or DTL Elzevir, Inter Tight, IBM Plex Mono; paper `#F4EFE6`,
laid `#E9E1D3`, ink `#1E1B16`, iron-gall `#4A3F35`, verdigris `#3F6B63`, madder
`#8E3B2E`, gilt `#B08D57`), "Spice Route" (Fraunces + Manrope) and "Chart Table"
(Spectral + IBM Plex). Those are also what a premium dealer site already looks
like — the category default. The Design stage therefore runs impeccable's full direction
round (seven candidates from the collectors' own world, a concept-seed roll,
challengers, a pick and a canon card — TASKS.md 12.1), in which **each research
direction may enter as at most one candidate**. Nothing above binds the outcome.

**Decided 2026-09-28 (D9's shape, TASKS.md):** both sites share **one base system** — layout, components, buttons and type, **Cormorant Garamond + Karla** (the client asked to keep them) — and differ only in **accents**: palette and signature details, inside the token contract's overridable subset. The references are Etalage and Everart, mixed, not copied; the owner's draft (`docs/design/input/claude-design-2026-09/`) is the lead candidate. The research directions below are background, not candidates.

**Decided 2026-10-01 (D50, the owner interview G3–G5, superseding D30): the gallery is enquiry-only.** No price is shown on any original — every one reads "Price on request" — and there is no bag, no checkout, no reserve button and no online offer. Every original leads to a conversation: a call or WhatsApp with the gallery in Singapore, where the price is negotiated. Once it is agreed, staff issue an **invoice**, which holds the piece until its due date and which the buyer pays online through the site's gateway, or by bank transfer; the piece ships when it is paid in full, shipping and duties the buyer's (§5, COMMERCE.md §7). The shop keeps its checkout. The gallery's brand config says all of this — `commerce.uniquePrices: "on-request"`, `purchase.checkout`, `purchase.offers` and `purchase.holds` off, one purchase tier led by WhatsApp — and the engine keeps every capability the shop or a future brand uses.

**Decided 2026-10-01 (D54, following D50 and D51): no collector accounts.** The gallery is simply buy and sell, so it has **no sign-up, no sign-in and no account area** — `accounts.buyers` is off. A buyer reaches an invoice by its link in the WhatsApp chat or the email, an order by its email's link or the order lookup (its number and email), a want-list by its confirmation email, and a viewing by its confirmation's link or on WhatsApp. The wishlist stays on the visitor's device (`retention.deviceWishlist`, as the shop's, D35), so a designer's shortlist and a viewing's pull list need no account. A request to see, correct or erase one's data goes to the gallery by email and is done by staff (COMPLIANCE.md §7). The old site's customers become staff-side records — no account and no "claim your account" email (MIGRATION.md §5).

---

## 1. Who it serves, in order

1. **Collectors** — know Valentijn from Van Keulen, read Latin titles, want
   collation, state, condition and references before they will talk price.
2. **Institutions** — museums, national libraries, universities, which already buy
   from the gallery. **None is named in public** (the owner's answer to G10,
   2026-10-01): the client list in
   `docs/design/input/claude-design-2026-09/project-notes.md` is for the team only,
   and a piece an institution bought shows only "Sold". They need proformas, PO
   numbers, provenance, export papers.
3. **Interior designers, villas and hotels** — buy by place, size and colour,
   present to clients, need framing and installation.
4. **The diaspora and heritage buyers** — Dutch-Indonesian families, returning
   visitors: search by their town, read in Dutch or Indonesian, buy one piece
   with meaning.

## 2. Information architecture

**Header:** logo · Maps & Charts · Prints · Photographs · Books · Places ·
Makers · Stories · Catalogues — with a utility row: search · ship-to · wishlist
(on this device) · WhatsApp · Call. There is **no basket** (D50: the gallery has no
bag) and **no account entry** (D54: no one signs in), and the ship-to names a
country, never a currency — no price is shown — because it still decides export
gating: a `domestic-only` original seen from abroad says so (§5).

**Footer:** Visit (locations, by appointment) · Sell to us · Guarantee & terms
of sale · Authentication · Condition grades · Shipping & insurance · Framing &
conservation · The certificate (Parry) · Institutions · Newsletter · the sister
strip ("Prints from our archive at Old East Indies") · seller identity (legal
name, address, registration) · language.

**On a phone** the eight navigation items and the utility row collapse into one
menu with a prioritised order (browse by type, places, makers, search first;
stories, catalogues and visit after), and the three-level place tree opens as a
drill-down, never a 100-link list.

**Axes:** type × place × maker × period × theme. One primary place per work plus
capped secondary tags; counts roll up to parents; themes (VOC, Spice trade, the
de Houtman voyage, Wayang, Batik, Temples, Costume, Flora & fauna) are
**curations**, not branches of the tree.

**Place hierarchy — two levels deeper than anyone:** Sumatra (Aceh, Padang,
Palembang) · Java (Batavia/Jakarta, Banten, Buitenzorg/Bogor, Semarang,
Yogyakarta, Surakarta, Surabaya) · Bali & Lombok · Nusa Tenggara (Flores, Komodo,
Timor–Kupang) · Borneo/Kalimantan · Sulawesi/Celebes (Makassar) · Maluku (Banda,
Ambon, Ternate & Tidore) · Papua · beyond Indonesia (Singapore, Malaysia &
the Straits, the Philippines, mainland Southeast Asia, East Asia, the Indian
Ocean, Australia–Pacific).

**Beyond Indonesia is a root region** (confirmed 2026-10-01, TASKS.md 8.4.e): the
ninth root, after the eight Indonesian ones — a grouping with no point of its
own, so the places index stays the archipelago's. Counts roll up to it as to any
parent, and its slug leads its places' paths (`/places/beyond-indonesia/singapore`).
The islands stay roots, so a place added later moves no path: everything outside
the country goes under beyond Indonesia, whose regions above are where the
gazetteer seed starts, and the curator adds the rest the catalogue needs (36.1 —
the old site also files maps of Europe, Africa, the Americas and Arabia,
`indies-gallery/content/legacy/inventory/urls.tsv`). **Open for the curator
(36.1):** a map of the whole archipelago, or of a whole that holds it — Southeast
Asia, Asia, the world, each a category on the old site — has no place in this
tree yet.

## 3. Home

Bands, ordered by the CMS homepage global (DESIGN-SYSTEM.md §2), never a
carousel:

1. **One object**, full attention — a single featured work, its hook title, one
   line of why it matters, one way in. Not a slider.
2. **New arrivals** — the last 30 days, with the date they arrived.
3. **Browse by place** — the archipelago as the index (a flat, fast map of island
   groups with counts; the Archipelago Explorer in v2).
4. **Curations** — two or three current collections or a catalogue.
5. **Makers** — the names collectors search for, with available counts.
6. **Stories** — the essays, which are the gallery's voice.
7. **Trust** — the facts the owner has confirmed, and only those (G13): **since
   2001**, **over 9,500 authentic antiques**, and **a certificate with every
   original** from Dr David E. Parry (G7); the **lifetime authenticity guarantee**,
   the owner's commitment (G6), published in counsel's words (D11); how the gallery
   sells — a conversation, then an invoice (D50) — and how shipping and insurance
   work. No institution is named (G10).
8. **Newsletter** — the fortnightly new-arrivals letter (now real: generated from
   inventory, §10).

## 4. Browse

- **Default: available items**, with a visible *Available · On hold · Sold*
  toggle — the sold archive is a feature, not a filter nobody finds.
- **Facets:** availability (incl. new in 30/60/90 days) · date
  (range slider, century chips, "VOC era 1602–1799") · maker (with counts) ·
  photographer/studio · source work · technique · colour · condition grade · size
  (cm and inches: presets and min/max H/W) · place · theme · text language.
  Counts follow the all-but-this-facet rule. **No price facet** (D50): with no
  price shown, a price range would only let a visitor work out the price it hides.
  (The engine keeps the price facet — a slider with "include price on request" and
  presets per market currency from brand config, rupiah alone for Indonesia — for
  a brand whose prices are shown.)
- **Sort that works:** newest · date of the work · maker — and no price sort, for
  the same reason.
- **Named facet URLs** for the combinations people search: `/antique-maps`,
  `/antique-maps/java`, `/antique-maps/java/batavia`, `/photographs/bali`,
  `/makers/valentijn`. Parameter combinations beyond those are canonicalised.
- **Cards:** the image on its mat (never cropped — the image treatment in
  DESIGN.md says how a 3.5 : 1 coastal profile and a 0.3 : 1 costume print share a
  grid), hook title, maker and date, dimensions, and one status line — "Price on
  request" · "On hold until Fri" · "Sold" (never a price, D50). One card is one link (KOI
  accessibility rule); the wishlist button sits **outside** the link, overlaid,
  with its own focus stop.
- Mobile: facets in a bottom sheet with applied-filter chips, a live count on the
  apply button, sticky apply/clear, and number inputs beside every range slider;
  a two-column grid.
- **Zero results** never dead-end: "We hold about 9,500 works and not all are
  online — ask us", with an enquiry prefilled with the query; historical-name and
  spelling suggestions (Celebes → Sulawesi); Indonesian-language queries handled;
  and a want-list alert.

## 5. The item page

The heart of the site. Top to bottom on a phone; a two-column working surface on
a desktop (media left, the record and the purchase panel right, sticky).

**Title block**
- H1 = the hook title ("Bali by François Valentijn, 1726 — the first large-scale
  map of the island"). Under it the **original title** in italic transcription.
  Most migrated items will not have a hook title on day one, so the **fallback is
  designed**, not accidental: the original title becomes the H1 and the maker line
  is promoted. A content sprint writes hook titles for the top 500 (TASKS.md 43.7).
- Maker line: `VALENTIJN, François (1666–1727)` with the engraver and publisher
  roles; certainty shown ("attributed to", "after").
- Stock number in the mono face (`M.0500`) — also the WhatsApp reference.

**Media**
- Deep zoom of **recto, verso, cartouche details, raking-light and
  transmitted-light** shots where they exist; a framed or in-room view — an in-room
  composite is labelled "Digital mockup" and never first; a **scale view at
  launch** — a static SVG of the sheet beside a person and an A4 page, cheap to
  build, and misjudged size is a leading cause of returns.
- The primary image is a real, crawlable `<img>` with alt text and is the LCP;
  the IIIF viewer attaches on intent (§6). It is **the recto itself** — the
  photograph of the whole sheet, cropped outside the sheet, never into it — never a
  photograph of its own, a detail or a synthetic image (C9 `primaryImageIndex()`,
  CONTENT-MODEL.md §1, §9). Every image of condition — recto, verso, detail,
  raking, transmitted — is a photograph, never retouched (the imagery rules,
  `docs/design/imagery/retouching-and-labelling.md` §1, §5).
- **Books and atlases** show binding, pagination and plates, completeness, several
  openings, the spine and the cover — the collation of a volume, not of a sheet.

**The record** — a definition list, the collation block collectors expect:
place, publisher and date of this issue · first edition · date on plate · source
work · verso and text edition · state and edition notes · technique · colour ·
dimensions (image and sheet, mm **and** inches; framed if framed) · condition
(the grade, linked to the published scale, plus the cataloguer's specific notes —
never "study images carefully") · references (each linking to its source page;
Parry numbers first) · provenance · stock number.

**The purchase panel — a conversation, never a checkout (D50).** It shows no price
and sells nothing by itself: it starts the conversation in which the price is
agreed, and holds the piece once staff have issued its invoice (COMMERCE.md §7).
Its states are the item's status × export status × ship-to, designed before they
are built (TASKS.md 34.1.a). There is no viewer relation to design for
(DESIGN-SYSTEM.md §3's "held for me", "in my checkout", "my offer pending"): no one
signs in (D54), there is no checkout and no offer, so every visitor reads the same
panel — the invoice's buyer included, who pays through the invoice's own link:

| Status | What every visitor reads | Leads with |
| ------ | ------------------------ | ---------- |
| available | "Price on request" | WhatsApp, prefilled with the stock number and title in the page's language · Call the gallery (its Singapore number shown, a tap on a phone) — then Request price · Enquire · Book a viewing · Proforma for institutions |
| held — an invoice is out | "On hold until {due date}" | the same conversation, and "Tell me if it becomes available" |
| sold | "Sold" — nothing else: no price, no buyer named (G10) | "Own a print of this map" and the available example (§8) |
| no recorded location or export status | "Price on request" | Enquire · WhatsApp · Book a viewing — the enquiry-only panel (COMMERCE.md §2) |

It reserves its height and reads "Checking availability…" until availability
resolves — no control before then. **Request price is answered by a person, never
in place:** after an email or WhatsApp number the visitor reads when a specialist
will reply — the reply promise beside every enquiry button, the same working day,
Singapore time (G9) — and the lead is logged. No Buy, Reserve or Make an offer
appears in any state. The rest of the panel:
- the reassurance row: the Parry certificate with every original (G7); the
  **lifetime authenticity guarantee** (G6) in counsel's words; **a final sale** —
  said plainly beside the guarantee, since no original is returned on a change of
  mind (the owner's answer, counsel confirming it, D11); **ships from**
  (Singapore / Jakarta); shipping, insured and quoted on the invoice (G11); the
  export note when the item is `domestic-only` (COMPLIANCE.md §1);
- a conservation framing quote link (UV glazing, rag mat, reversible hinges).

**From conversation to payment.** On WhatsApp or the phone the buyer and the
gallery agree the price. Staff then build the **invoice** in the admin on their
phone — the piece at the agreed figure, the insured shipping, any duties, the due
date — and share its link into the buyer's WhatsApp chat (a `wa.me` share), or
email it. The link opens **the invoice on the gallery's own page**, `/pay/{token}`,
in the gallery's design and never a gateway's: its number, the piece with its stock
number, the figure, shipping and duties, the total, the due date, the seller of
record, the buyer (and an institution's PO number) and the PDF — and two ways to
pay, **the Stripe Payment Element in the page** (card, Apple or Google Pay, PayNow,
iDEAL or SEPA) and **bank transfer** against the PDF. Its states are designed: open
— "On hold until {due date}" — bank transfer pending, paid, and expired or voided
with the ways to reach the gallery (COMMERCE.md §7, PAYMENTS.md §5). From the moment
the invoice is issued the piece is **on hold until its due date** for everyone else;
the buyer is reminded a day before it; unpaid by then, the piece is released by
itself and the link stops taking payment (D45). It ships only once the invoice is
paid in full (G11).

**Context**
- The essay (the existing long-form descriptions, restructured with subheads).
- The maker, collapsed ("Read full biography · 18 available works by Valentijn").
- A small locator map of the place depicted.
- **Related:** same maker · same place · same source work · other states · sold
  examples.

**Utilities** — wishlist (kept on this device, no account: D54) and "tell me when
another example arrives" · share
(WhatsApp first) · print description · factsheet PDF (designers present these:
the piece, "Price on request", the gallery's contact and the date it was printed —
no price, G14) ·
**"Prints of this map from Old East Indies"** (the exact products, not a home
page) · a "Similar to sell?" micro-block linking to consignment.

## 6. The deep-zoom viewer

- Loads **on intent**: first tap or hover on the image, or idle after LCP. Before
  that, the primary image is an ordinary responsive image.
- One viewer, many images: recto, verso (a flip, not a separate page), details,
  lighting views; a filmstrip of what exists.
- Controls are real buttons in the tab order: zoom in, zoom out, reset, full
  screen, next/previous image. Keyboard: `+`/`−`, arrows pan, `0` resets, `Esc`
  exits full screen.
- On a phone: pinch and double-tap zoom; one-finger pan only once zoomed (the
  page keeps its scroll at rest — KOI's map rule); a clear exit. `touch-action`
  stops the viewer's pinch fighting the page's zoom.
- **Full screen is a fixed overlay**, not the Fullscreen API (iOS Safari offers it
  only for video), on the dark lightbox rung (DESIGN-SYSTEM.md §4). Tiles are
  512 px WebP/AVIF; the viewer stays within the memory ceilings of in-app webviews
  and is verified on a browser matrix (Safari iOS, Chrome Android, the Instagram
  and WhatsApp webviews).
- A **loupe** on desktop hover for the fine detail collectors look for (plate
  marks, colour, repairs), which the viewer then opens at that point.
- `prefers-reduced-motion` → no animated zoom transitions, only cuts.
- Everything the viewer shows is also in the page as text (DESIGN-SYSTEM.md §9).

## 7. Places, makers, sources, curations, stories

- **Place pages** (`/places/java/batavia`): the modern and historical names, a
  short history of how it was mapped, the available works, the sold ones, and
  stories set there. These are the landing pages that beat programmatic
  marketplace pages for "antique maps of Java".
- **Maker pages** (`/makers/valentijn`): bio, life dates, portrait if one exists,
  what they made, what is available, what has sold.
- **Source pages** (`/sources/tooley`): the bibliography entries references link
  to — the seed of the Parry cartobibliography (§12).
- **Curations**: collections, **web-native catalogues** with live availability
  (replacing Issuu; the printable PDF follows in v2), exhibitions and fair
  presentations.
- **Stories**: essays with "originals in this story" and "prints from this
  story" rails, written with the scholarly blocks — `zoomFigure` ("see the
  cartouche" opens the viewer at that region), `compare` (two states of one
  plate), and sidenotes citing their sources (DESIGN-SYSTEM.md §5).

## 8. Sold, holds and want-lists

- A sold page stays indexed. It says "Sold" and nothing more about the sale — no
  price, no "price realised", and no buyer, institution or "private collection"
  named (D50, G10) — offers **the available example** when a
  `sameEdition` work is in stock ("The item below has been sold, but the example
  shown above is currently available"), and — **in the primary position, where an
  available piece's WhatsApp button stands** — "Own a print of this map" from Old
  East Indies when a design exists; then similar works and "Tell me when another
  example arrives". Sold
  pages are the sister shop's best placement.
- A held item — an invoice is out for it — says "On hold until {the invoice's due
  date}" and offers "Tell me if it becomes available"; if the invoice lapses unpaid
  the piece is simply available again (D45), and everyone who asked gets the alert
  at once.
- Want-lists are saved searches by maker, place, date, type and size, from any
  browse page ("Alert me about new maps of Bali"), delivered **within 15 minutes or
  in a daily digest**, the subscriber's choice. They take **no budget** here, since
  no price is shown (D50); a brand whose prices are shown keeps one, in the viewer's
  market currency. Every list — a saved search, "Tell me if it becomes available",
  "Tell me when another example arrives" — is an **email's**, since no one signs in
  (D54): the visitor leaves an email address, and the list starts watching only
  once confirmed — a **double opt-in**: the confirmation email's link opens the
  want-list page, whose button confirms it (a mail scanner following the link
  confirms nothing), and the same courteous, admits-nothing answer goes out
  whoever asks and however often (D39).

## 9. Trust pages — the gap competitors fill and this site does not

All in the CMS as pages, all linked from the purchase panel:

- **Guarantee & terms of sale** — the **lifetime authenticity guarantee**, the
  owner's commitment (G6), and the terms of sale: an original is a **final sale**,
  with no change-of-mind return (the owner's answer, 2026-10-01; counsel confirms it
  is allowed, D11), the guarantee being the one promise after it — both in counsel's
  words (COMMERCE.md §11).
- **Authentication** — "How do you know it's real?": chain lines, watermarks,
  plate marks, verso text; "if doubt remains, we do not offer the item for sale".
- **Condition grades** — the published scale with definitions and A–D
  equivalents.
- **The certificate** — Dr David E. Parry, author of *The Cartography of the
  East Indian Islands*; every original comes with one (G7); how to keep it with
  insurance papers. No sample certificate is shown until Dr Parry agrees (G7).
- **Shipping & insurance** — how originals travel (flat, boxed, insured,
  signature), from where, and duties by destination: the buyer's, quoted on the
  invoice, and nothing ships before the invoice is paid in full (G11).
- **Framing & conservation** — including tropical humidity guidance for Bali.
- **Institutions** — how institutions buy — a proforma request, the staff-issued
  invoice with the PO number, bank transfer, export papers — naming none of them
  (G10).
- **Visit** — Singapore and Jakarta, by appointment only (G2), a map, and booking.
  Viewing slots show their time zone explicitly (Singapore UTC+8, Jakarta WIB
  UTC+7), confirm by email with an `.ics` attached, remind on WhatsApp, and can be
  rescheduled or cancelled through the confirmation's own link — or on WhatsApp —
  never through an account (D54).
- **FAQ** — replacing today's "work in progress" page.

**Forms that behave like the gallery, not like a CMS:** consignment uses the phone
camera directly, accepts HEIC, shows per-file progress and retries on weak
networks, and ends with a "what happens next" timeline; the framing quote has its
own short flow; an institution asks for a **proforma** on one piece or several
through the quote form (the PO number, the pieces, when it needs it) — there is no
cart to turn into one (D50). Staff answer within the stated reply promise by
issuing the invoice (§5) — the same pay page as every invoice, carrying the PO
number and the PDF the finance office pays from, bank transfer beside the card — so
"Proforma for institutions" promises that, never a PDF at once. There is no
"Reserve" form: a piece is held when its invoice is issued (D45).

## 10. Retention, without accounts

**No accounts (D54).** The gallery has no sign-up, no sign-in and no account area:
each thing a buyer comes back to has its own way back, and none needs a password.

| What | How the buyer reaches it again |
| ---- | ------------------------------ |
| an invoice | its link, in the WhatsApp chat or the email it came in |
| an order, its certificate and invoice PDFs | the order email's link, or the order lookup — its number and the buyer's email |
| a want-list or an item alert | its confirmation email, and every alert, open the want-list page |
| a viewing | its confirmation's link (reschedule, cancel; the `.ics` attached to the email), or WhatsApp |
| a price request, an enquiry, a consignment | the reply, by email or WhatsApp, within the reply promise (G9) |
| the wishlist | this device — the heart in the header, as at the shop (D35) |
| one's data — a copy, a correction, an erasure | an email to the gallery; staff do it in the admin (COMPLIANCE.md §7) |

- Wishlist → **viewing pull list**: booking a viewing sends the pieces saved on this
  device to the gallery, so they are out of the drawer.
- Want-lists and item alerts, each with its stop button. There is no separate
  unsubscribe landing page: every alert email and its own confirmation open
  the **same want-list page**, which moves the list's token into a cookie on
  the way, so the page reads and stops that list by a plain POST — never a GET
  link a mail scanner could trigger by prefetching it. The one exception is
  RFC 8058's one-click unsubscribe, the single POST a mail client sends
  straight from its own "unsubscribe" action, carrying the token in the URL
  itself rather than the page.
- Orders with **certificate and invoice downloads**, on the order page its email's
  link opens; there are no offers or holds to list (D50).
- An old link to the previous site's account pages (`/account/…`) is answered with a
  page that says the gallery keeps no accounts and how to reach an order, an invoice
  or an alert — never a mirror of an account area and never a bare 404 (MIGRATION.md
  §6).
- A legacy `/product/{id}-{slug}` that no longer resolves turns its slug into a
  prefilled search with similar works; an item removed from inventory shows
  the designed Gone page — a 404, noindex and out of the sitemap, since a page
  cannot answer 410 (a real `410` comes only from the legacy handler, for an old URL
  the redirects collection marks gone); a sold item is never gone.
- The newsletter is **generated from inventory** (new arrivals since the last
  issue, curated order, one story), sent fortnightly and archived as HTML; a
  WhatsApp broadcast opt-in sits beside it.
- v2: "My Collection" — register pieces you own (bought here or not), as
  raremaps does; shareable sets — the first thing that would need an account again
  (D54).

## 11. SEO

- Title template `{hook title} – {maker}, {year} | {brand.name}` (the brand name
  comes from config — no brand literal in the app); H1 = title.
- JSON-LD `VisualArtwork` with `artMedium`, `artworkSurface`, dimensions,
  `creator` (Person with life dates, `sameAs`), `dateCreated`, `locationCreated`,
  `spatialCoverage` (Place with coordinates) and the stock number as `identifier`
  — and **no `Product` or `Offer`** while no price is shown (D50): an `Offer`
  without a price fails the search engines' product validation, and inventing one
  would contradict the page. Plus `BreadcrumbList`, `ArtGallery` per location,
  `ImageObject`. (For a brand that shows its prices the builder adds `Product` with
  `sku`, `itemCondition: UsedCondition` and `offers` — `InStock` · `Reserved` ·
  `SoldOut`, the price only when priced.)
- No shopping feed: Google's Merchant listing needs a price, and none is shown.
- Crawlable images with real alt text, slugged filenames, `og:image`, an image
  sitemap; sitemaps **include sold items**; `hreflang` pairs; canonicals on
  sort and parameter pages.
- Legacy product URLs unchanged (MIGRATION.md §6).

## 12. Scope

**MVP (launch):** URL parity + redirect map; the new item page (collation,
condition scale, references, multi-image deep zoom with a crawlable image, hook
+ original titles, maker bio, related); **no price on any original** and the
enquiry-led panel (D50) — WhatsApp prefilled with the stock number, Call, Request
price answered by a person, Enquire, Book a viewing, Proforma for institutions;
**staff-issued invoices** that hold the piece until their due date (D45), paid
online through the seller's gateway (cards, PayNow, iDEAL/SEPA) or by bank
transfer, shipped once paid in full (G11); "On hold until"; the working sort and
facet set (no price facet); sold archive with notify-me; the wishlist on the device
and want-lists by email — no accounts (D54); the guest order lookup;
all trust pages; the Parry certificate page; Singapore and Jakarta viewing
booking; the generated newsletter; consignment with photo upload; place and maker
pages; stories; **web-native catalogue pages** with live availability; Old East
Indies deep links; the data clean-up (MIGRATION.md §4); WCAG 2.2 AA and the
budgets.

**Not at launch (D50, D22), kept in the engine:** the bag and checkout for
originals, Buy, Reserve, online offers, shown prices and the instant price reveal.
The domain and the contracts keep them behind config (`commerce.uniquePrices`,
`purchase.checkout`, `purchase.offers`, `purchase.holds`); the gallery app builds
none of their flows at launch — its purchase panel maps every C2 state, as an
exhaustive map must, but the bag, checkout, offer and reserve screens are not
built — and its `supports.ts` refuses those three modules, so bringing them back to
the gallery is a build (TASKS.md phase 34), not only a switch. **Collector
accounts** (D54) are not at launch either, the same way: `accounts.buyers`,
`retention.wishlist` and `retention.wantList` (an account's lists) are refused by
the app, whose account area is not built.

**v2:** binding offers (an accepted offer is a contract to buy); the catalogue
as a printable PDF; reserve with deposit; instalments; in-room and AR views (the
static scale view ships at launch);
map-based browse; Dutch (and Chinese) locales; My Collection; a trade/designer
programme with project boards; testimonials.

**Later — the gaps no dealer owns** (RESEARCH.md §1.10): georeferenced then/now
overlays of Indonesian maps on modern Indonesia (Allmaps, IIIF); the Archipelago
Explorer with a 1590–1950 time slider; voyage story maps (de Houtman, the VOC
routes, Wallace); **the Parry cartobibliography online** — every East Indies map
with its Parry number and states, marked in stock, sold or wanted; photo
scholarship cross-linked to institutional copies; diaspora search by family
town; hospitality curation for Bali villas and hotels; a verifiable QR
certificate; image licensing.
