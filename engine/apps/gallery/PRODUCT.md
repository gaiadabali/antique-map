# Product — Indies Gallery (the `gallery` storefront)

<!-- impeccable:product-schema 1 -->

Drafted from research on 2026-09-25 (docs/RESEARCH.md §1–2, docs/MIGRATION.md
§1); conformed to impeccable's product schema on 2026-10-01 (TASKS.md 6.1.a).
This app is named for its archetype — a catalogue of one-of-one objects — and
serves Indies Gallery through configuration. A statement marked **(open — pending
the owner interview, OA2 · Gn)** is the working assumption until the owner answers
question Gn in `docs/design/journeys/owner-interview.md`; the answer folds in there.
The journeys this brief serves are `docs/design/journeys/gallery/`.

## Platform

web

## Users

**Collectors** of antique maps, prints and photographs of the Indonesian
archipelago and Southeast Asia: they know Valentijn from Van Keulen, read Latin
and Dutch titles, and want collation, state, condition and references before they
talk price. **Institutions** — the gallery already sells to the National Museum of
Singapore, the National Library of Australia, the Louvre Abu Dhabi and Leiden
University (the client's own list, `project-notes.md`) — need proformas, PO numbers,
provenance and export papers; whether the National Library of Singapore, which
EXPERIENCE-GALLERY.md §1 adds, is also a client, and which institutions may be named
in public, is **(open — pending the owner interview, OA2 · G10)**. **Interior
designers, villas and hotels** buy by place, size and colour and present to clients.
**Heritage buyers** — the Dutch-Indonesian community and returning visitors — search
by the town their family knew. These four are the research's audiences
(EXPERIENCE-GALLERY.md §1); how buyers really arrive — the draft says most from
search onto a single item page, many on phones — and which of them buy most is
**(open — pending the owner interview, OA2 · G3, G12)**.

## Product Purpose

The web home of a gallery holding over 9,500 authentic antiques, 15th–20th
century (the current site's own copy, MIGRATION.md §1), each offered with a
certificate of authenticity from its curator, Dr David E. Parry, author of *The
Cartography of the East Indian Islands* (`project-notes.md`). How long the gallery
has traded — the draft said "25+ years", the owner's design draft "Est. 2001" — is
**(open — pending the owner interview, OA2 · G13)**. It replaces a dated store
(antiquemapsindonesia.com) that has the stock, the essays and the rankings but no
deep zoom, no terms, broken sorting and no structured data (MIGRATION.md §1).
**The gallery keeps online sales** — reserve, checkout, offers and pay links
(D30, answered 2026-09-28; the design note of 11 Sept 2026 recording "no
transactions, enquiry by email form only" is superseded). Success is a collector
trusting a USD 5,000 purchase without emailing first, an institution buying on a
proforma, and demand for what is *not* in stock captured as want-lists.

## Positioning

The authority on the cartography and imagery of the East Indies — deeper in this
region than raremaps (192 Indonesia items) or 1stDibs (152) against the gallery's
347 maps, 1,428 prints and 182 photographs (RESEARCH.md §1.1) — with the Parry
certificate no competitor can offer, Southeast Asian commerce (IDR and the buyer's
currency, WhatsApp), and a sister shop selling prints of its archive. Where the
originals can be viewed — the research assumed Singapore, Jakarta and Bali — is
**(open — pending the owner interview, OA2 · G2)**. The name the site carries in
public — Indies Gallery, Antique Maps Indonesia, or both, which today's site mixes
on one page (design input, `scratchpad.md` slide 4) — is **(open — pending the
owner interview, OA2 · G1)**; the domain stays as D8's default.

## Operating Context

A buyer compares states, zooms into plate marks and the verso, checks condition
against a published scale, asks about shipping and duties, and often wants a
conversation before paying: request price, make an offer, reserve, book a viewing,
receive a proforma. Items sell once; the sold archive keeps the traffic and turns it
into alerts. Content is mostly migrated, then catalogued continuously. How sales
close today — online, on WhatsApp, by email or in person — is **(open — pending the
owner interview, OA2 · G3)**.

## Capabilities and Constraints

- Every original is unique; availability is guaranteed by a reservation service
  (`reserve()`, COMMERCE.md §4).
- Deep zoom from static IIIF tiles; the primary image is always a crawlable image.
- Purchase modes by price tier (buy, reserve, offer, request price, enquire,
  viewing, proforma) — COMMERCE.md §7. The tier thresholds (~USD 5,000 and
  ~USD 25,000) and the 48-hour reserve are the research's defaults; where the owner
  draws the lines, and whether any price is shown in public above them, is
  **(open — pending the owner interview, OA2 · G4, G5)**.
- **Offers are non-binding in v1** (D22's default): staff accept, counter or
  decline; an accepted offer becomes a hold and a private pay link. The private floor
  and which items take offers are **(open — pending the owner interview, OA2 · G8)**.
- A proforma from a checkout takes `invoice` holds on its unique lines; whether
  those holds start at once or only after staff approve is an open owner decision
  (COMMERCE.md §7, senior-be F13) — **(open — pending the owner interview, OA2 · G5)**.
- **Selling entity and stock locations:** the current site says "based in
  Singapore" beside a +62 number and a Jakarta gallery (COMPLIANCE.md §2). D1's
  default is a Singapore seller for Singapore stock and export and an Indonesian
  seller for Jakarta stock sold domestically; where the originals physically are is
  **(open — pending the owner interview, OA2 · G2)**, and the per-item location and
  export status come from the item register (D24, OA10). Items held in Indonesia may
  need export clearance before an international sale (COMPLIANCE.md §1): an item
  with no register row publishes enquiry-only and sells nowhere online.
- How originals are shipped and insured, and who pays duties, is **(open — pending
  the owner interview, OA2 · G11)**; the engine's default is quote-based shipping
  with fine-art transit insurance above the courier's limits, duties DAP
  (COMMERCE.md §8).
- Legacy product URLs (`/product/{id}-{slug}`) stay byte-identical.

## Brand Commitments

- The object leads; the interface recedes. Never crop a sheet; show it on its mat.
- The Parry certificate and the institutions are the trust, and they sit beside
  the price. What exactly the certificate covers (every object, or originals of a
  kind) is **(open — pending the owner interview, OA2 · G7)**; the **lifetime
  authenticity guarantee** and the 14-day returns are the research's adopted default,
  subject to counsel (RESEARCH.md §2, COMMERCE.md §11, D11) — whether the gallery
  promises them is **(open — pending the owner interview, OA2 · G6)**.
- Honest status: "Sold", "On hold until…", "Price on request" — never invented
  urgency.
- Stock numbers (`M.`, `P.`, `F.`) are part of the identity and always shown
  (MIGRATION.md §1); they are also the WhatsApp reference.
- **One shared base with the shop, the gallery's own accents** (D9's shape): layout,
  components, buttons and type — Cormorant Garamond + Karla, which the client asked
  to keep — are shared; the gallery differs in palette and signature details, "super
  premium" for one-of-one originals (TASKS.md 12.2.a). The owner picks the base
  candidate and the accents in TASKS.md 13.1. The research's "Print Room" and its
  siblings (EXPERIENCE-GALLERY.md) are background, not candidates.

## Evidence on Hand

- The live site's catalogue shape, category tree, fields, URLs and defects, read from
  its public pages (MIGRATION.md §1); benchmark findings (RESEARCH.md §1).
- The client's form and the decisions of 11 Sept 2026 (`project-notes.md`), and the
  owner's design draft (`Home - Antique Maps Indonesia.dc.html`) — draft input: its
  copy ("Est. 2001", "25 years", "4 national collections", "We reply within two
  working days", "Nothing here is sold online" — the last superseded by D30) is not
  confirmed fact.
- **Absences that must not be invented:** the published grading scale's wording
  (D10), returns and guarantee terms (D11), the legal entity (D1), gallery addresses
  and opening hours, institutional client permissions, testimonials, memberships,
  press, years in trade, real photography beyond the current single images (D19). The
  reply time the purchase panel promises is **(open — pending the owner interview,
  OA2 · G9)**; whether a designer's factsheet shows the price is **(open — pending the
  owner interview, OA2 · G14)**.

## Product Principles

1. **The sheet is the hero.** Every design decision is judged by how it presents
   paper.
2. **Collation before persuasion.** The record collectors need is complete and
   structured before any sales copy.
3. **A sold page is still a page.** It keeps its URL, its essay and its demand.
4. **Never imply certainty the record lacks.**
5. **A conversation is a conversion.** Request price, offer, hold and viewing are
   first-class, not fallbacks.

## Accessibility & Inclusion

WCAG 2.2 AA. The zoom viewer is keyboard-operable with a text alternative; status
is text; dimensions in millimetres and inches; English and Indonesian (Dutch
later); `prefers-reduced-motion` honoured absolutely.
