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

---

## 1. Who it serves, in order

1. **Collectors** — know Valentijn from Van Keulen, read Latin titles, want
   collation, state, condition and references before they will talk price.
2. **Institutions** — museums, national libraries, universities (the gallery
   already sells to NLA, NLS, the National Museum of Singapore, Louvre Abu Dhabi,
   Leiden): need proformas, PO numbers, provenance, export papers.
3. **Interior designers, villas and hotels** — buy by place, size and colour,
   present to clients, need framing and installation.
4. **The diaspora and heritage buyers** — Dutch-Indonesian families, returning
   visitors: search by their town, read in Dutch or Indonesian, buy one piece
   with meaning.

## 2. Information architecture

**Header:** logo · Maps & Charts · Prints · Photographs · Books · Places ·
Makers · Stories · Catalogues — with a utility row: search · ship-to/currency ·
wishlist · account · basket · WhatsApp.

**Footer:** Visit (locations, by appointment) · Sell to us · Guarantee &
returns · Authentication · Condition grades · Shipping & insurance · Framing &
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
7. **Trust** — the Parry certificate, the lifetime authenticity guarantee, the
   institutions who buy here, how shipping and insurance work.
8. **Newsletter** — the fortnightly new-arrivals letter (now real: generated from
   inventory, §10).

## 4. Browse

- **Default: available items**, with a visible *Available · On hold · Sold*
  toggle — the sold archive is a feature, not a filter nobody finds.
- **Facets:** availability (incl. new in 30/60/90 days) · price (slider with
  "include price on request", and presets **per market currency**, set in brand
  config — e.g. < US$350 · 350–1k · 1–5k · 5k+ for export destinations, and
  < Rp 5 juta · 5–15 juta · 15–75 juta · 75 juta+ for Indonesia, where the
  rupiah rule allows no dollar figure at all) · date
  (range slider, century chips, "VOC era 1602–1799") · maker (with counts) ·
  photographer/studio · source work · technique · colour · condition grade · size
  (cm and inches: presets and min/max H/W) · place · theme · text language.
  Counts follow the all-but-this-facet rule.
- **Sort that works:** newest · price ↑ ↓ · date of the work · maker.
- **Named facet URLs** for the combinations people search: `/antique-maps`,
  `/antique-maps/java`, `/antique-maps/java/batavia`, `/photographs/bali`,
  `/makers/valentijn`. Parameter combinations beyond those are canonicalised.
- **Cards:** the image on its mat (never cropped — the image treatment in
  DESIGN.md says how a 3.5 : 1 coastal profile and a 0.3 : 1 costume print share a
  grid), hook title, maker and date, dimensions, and one status line — price ·
  "Price on request" · "On hold until Fri" · "Sold". One card is one link (KOI
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
  transmitted-light** shots where they exist; a framed or in-room view; a **scale
  view at launch** — a static SVG of the sheet beside a person and an A4 page,
  cheap to build, and misjudged size is a leading cause of returns.
- The primary image is a real, crawlable `<img>` with alt text and is the LCP;
  the IIIF viewer attaches on intent (§6).
- **Books and atlases** show binding, pagination and plates, completeness, several
  openings, the spine and the cover — the collation of a volume, not of a sheet.

**The record** — a definition list, the collation block collectors expect:
place, publisher and date of this issue · first edition · date on plate · source
work · verso and text edition · state and edition notes · technique · colour ·
dimensions (image and sheet, mm **and** inches; framed if framed) · condition
(the grade, linked to the published scale, plus the cataloguer's specific notes —
never "study images carefully") · references (each linking to its source page;
Parry numbers first) · provenance · stock number.

**The purchase panel** — modes by price tier, status and **the viewer's relation
to the item** (DESIGN-SYSTEM.md §3): a state matrix of tier × status (available ·
held by someone else · held for me · in my checkout · my offer pending · sold ·
sold with price realised) × export status × ship-to × signed in, designed before
it is built (TASKS.md 34.1.a). It reserves its height and reads "Checking
availability…" until availability resolves — no purchase control before then.
Request price answers **in place**: after an email or WhatsApp field, the price
appears on the page and the lead is logged; items marked sensitive say "A
specialist will reply within {hours}" instead. The rest of the panel
(COMMERCE.md §7):
- the price in the buyer's market currency, with a converted estimate only for
  export destinations; or "Price on request";
- **status:** Available · "On hold until {date}" · Sold;
- primary and secondary actions: Buy · Reserve · Make an offer · Request price ·
  Enquire · Book a viewing · Proforma for institutions;
- the reassurance row: lifetime authenticity guarantee, the Parry certificate,
  14-day returns (as counsel words it), insured shipping estimate to the
  ship-to country, **ships from** (Singapore / Jakarta), and the export note when
  the item is `domestic-only` (COMPLIANCE.md §1);
- a conservation framing quote link (UV glazing, rag mat, reversible hinges).

**Context**
- The essay (the existing long-form descriptions, restructured with subheads).
- The maker, collapsed ("Read full biography · 18 available works by Valentijn").
- A small locator map of the place depicted.
- **Related:** same maker · same place · same source work · other states · sold
  examples.

**Utilities** — wishlist and "tell me when another example arrives" · share
(WhatsApp first) · print description · factsheet PDF (designers present these) ·
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

- A sold page stays indexed. It says "Sold", shows no price (optionally "price
  realised" to signed-in buyers), offers **the available example** when a
  `sameEdition` work is in stock ("The item below has been sold, but the example
  shown above is currently available"), and — **in the primary position, where
  "Buy" was** — "Own a print of this map" from Old East Indies when a design
  exists; then similar works and "Tell me when another example arrives". Sold
  pages are the sister shop's best placement.
- A held item says "On hold until Friday 14:00" and offers the same alert.
- Want-lists are saved searches by maker, place, date and budget, from any browse
  page ("Alert me about new maps of Bali under US$2,000" — the budget in the
  viewer's market currency, stored with it), delivered **within 15 minutes or
  in a daily digest**, the subscriber's choice. A signed-in collector's saves at
  once; a guest leaves an email with no account, which starts watching only
  once confirmed — a **double opt-in** link the confirmation email carries, so
  the same courteous, admits-nothing answer goes out whoever asks and however
  often (D39).

## 9. Trust pages — the gap competitors fill and this site does not

All in the CMS as pages, all linked from the purchase panel:

- **Guarantee & returns** — lifetime authenticity guarantee; returns as counsel
  words them (research default: 14 days, less shipping and insurance).
- **Authentication** — "How do you know it's real?": chain lines, watermarks,
  plate marks, verso text; "if doubt remains, we do not offer the item for sale".
- **Condition grades** — the published scale with definitions and A–D
  equivalents.
- **The certificate** — Dr David E. Parry, author of *The Cartography of the
  East Indian Islands*; a sample certificate; how to keep it with insurance papers.
- **Shipping & insurance** — how originals travel (flat, boxed, insured,
  signature), what it costs, from where, and duties by destination.
- **Framing & conservation** — including tropical humidity guidance for Bali.
- **Institutions** — who has bought here, with permission.
- **Visit** — each location, by appointment, a map, and booking. Viewing slots
  show their time zone explicitly (Singapore UTC+8, Jakarta WIB UTC+7, Bali WITA
  UTC+8), confirm by email with an `.ics`, remind on WhatsApp, and can be
  rescheduled.
- **FAQ** — replacing today's "work in progress" page.

**Forms that behave like the gallery, not like a CMS:** consignment uses the phone
camera directly, accepts HEIC, shows per-file progress and retries on weak
networks, and ends with a "what happens next" timeline; the framing quote has its
own short flow; institutions can turn a **cart of several items into a proforma**
(PO field, PDF, and a "pay this proforma" page — the `Quote` surface).

## 10. Accounts and retention

- Wishlist → **viewing pull list**: booking a viewing sends the wishlist to the
  gallery so the pieces are out of the drawer.
- Want-lists and item alerts, each with its stop button. There is no separate
  unsubscribe landing page: every alert email and its own confirmation open
  the **same want-list page**, which moves the list's token into a cookie on
  the way, so the page reads and stops that list by a plain POST — never a GET
  link a mail scanner could trigger by prefetching it. The one exception is
  RFC 8058's one-click unsubscribe, the single POST a mail client sends
  straight from its own "unsubscribe" action, carrying the token in the URL
  itself rather than the page.
- Orders with **certificate and invoice downloads**.
- The gallery's conversations, in one place: **my offers** (with the counter's
  countdown), holds, price requests, viewings (reschedule, cancel, `.ics`), and
  consignments with their status timeline.
- A legacy `/product/{id}-{slug}` that no longer resolves turns its slug into a
  prefilled search with similar works; an item removed from inventory shows
  the designed Gone page — a 404, noindex and out of the sitemap, since a page
  cannot answer 410 (a real `410` comes only from the legacy handler, for an old URL
  the redirects collection marks gone); a sold item is never gone.
- The newsletter is **generated from inventory** (new arrivals since the last
  issue, curated order, one story), sent fortnightly and archived as HTML; a
  WhatsApp broadcast opt-in sits beside it.
- v2: "My Collection" — register pieces you own (bought here or not), as
  raremaps does; shareable sets.

## 11. SEO

- Title template `{hook title} – {maker}, {year} | {brand.name}` (the brand name
  comes from config — no brand literal in the app); H1 = title.
- JSON-LD `["Product", "VisualArtwork"]` with `artMedium`, `artworkSurface`,
  dimensions, `creator` (Person with life dates, `sameAs`), `dateCreated`,
  `locationCreated`, `spatialCoverage` (Place with coordinates), `sku`,
  `itemCondition: UsedCondition`, and `offers.availability` `InStock` ·
  `Reserved` · `SoldOut`; price only when priced (POR omits it). Plus
  `BreadcrumbList`, `ArtGallery` per location, `ImageObject`.
- Crawlable images with real alt text, slugged filenames, `og:image`, an image
  sitemap; sitemaps **include sold items**; `hreflang` pairs; canonicals on
  sort and parameter pages.
- Legacy product URLs unchanged (MIGRATION.md §6).

## 12. Scope

**MVP (launch):** URL parity + redirect map; the new item page (collation,
condition scale, references, multi-image deep zoom with a crawlable image, hook
+ original titles, maker bio, related); Buy, Enquire and instant Request price;
WhatsApp prefilled with the stock number; checkout lock and "On hold"; **make an
offer — non-binding** (accept / counter / decline in the admin, an accepted offer
becomes a private pay link and a hold; D22); cards, PayPal, bank transfer and
proforma; currency by destination; working sort and the full facet set; sold
archive with notify-me; wishlist and want-lists; all trust pages; the Parry
certificate page; locations and viewing booking; the generated newsletter;
consignment with photo upload; place and maker pages; stories; **web-native
catalogue pages** with live availability; Old East Indies deep links; the data
clean-up (MIGRATION.md §4); WCAG 2.2 AA and the budgets.

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
