# Product — Indies Gallery (the `gallery` storefront)

<!-- impeccable:product-schema 1 -->

Drafted from research on 2026-09-25 (docs/RESEARCH.md §1–2, docs/MIGRATION.md
§1); conformed to impeccable's product schema on 2026-10-01 (TASKS.md 6.1.a); the
owner's interview answers folded in on 2026-10-01 (TASKS.md 6.1.f,
`docs/design/journeys/owner-answers.md`, cited below as **G1–G15**). This app is
named for its archetype — a catalogue of one-of-one objects — and serves Indies
Gallery through configuration. Every interview question for the gallery is answered;
nothing in this brief waits on the owner interview. What waits on an adviser or on the
architect's replan (TASKS.md 6.4) says so where it stands. The journeys this brief
serves are `docs/design/journeys/gallery/`.

## Platform

web

## Users

**Collectors** of antique maps, prints and photographs of the Indonesian
archipelago and Southeast Asia: they know Valentijn from Van Keulen, read Latin
and Dutch titles, and want collation, state, condition and references before they
talk price. **Institutions** — museums, national libraries and universities — need
proformas, PO numbers, provenance and export papers. The client's own notes list four
institutions that have bought here (`project-notes.md`), but **no institution is named
in public**: their pieces show only "Sold" (G10). **Interior designers, villas and
hotels** buy by place, size and colour and present to clients. **Heritage buyers** —
the Dutch-Indonesian community and returning visitors — search by the town their
family knew. These four are the research's audiences (EXPERIENCE-GALLERY.md §1).

Every one of them reaches the sale the same way: **a conversation with the gallery in
Singapore** — a call or a WhatsApp message, or an enquiry or proforma request that starts
one — where the price is negotiated (G3). Which of them buys most was
not answered, and how buyers arrive is not measured: no Google Analytics export comes
from the old site (G12). The gallery's own first-party analytics, shown in the admin
dashboard, will measure it (G12; ANALYTICS.md, phase 40). Until then the journeys assume
the interview's default: phones first, most visitors landing on an item page from
search.

## Product Purpose

The web home of a gallery trading **since 2001**, holding **over 9,500 authentic
antiques**, 15th–20th century, **each original with a certificate of authenticity**
from its curator, Dr David E. Parry, author of *The Cartography of the East Indian
Islands* (G13, G7; `project-notes.md`). It replaces a dated store
(antiquemapsindonesia.com) that has the stock, the essays and the rankings but no deep
zoom, no terms, broken sorting and no structured data (MIGRATION.md §1).

**The gallery is enquiry-only (D50, answered 2026-10-01; supersedes D30).** No price is
shown on any original — every one reads "Price on request" (G4). There is no cart, no
reserve button and no online offer (G3, G8, D22). Every original leads to a call or a
WhatsApp message to negotiate. Once a price is agreed, **staff issue an invoice and the
buyer pays it online through the site's gateway** (G3b). The piece shows "On hold" until
the invoice's due date and is released if it stays unpaid (G5, D45). It ships only once
paid in full, with shipping and duties the buyer's, quoted on the invoice (G11). How the
gallery's commerce is rebuilt around this — the purchase panel, the invoice and its pay
page, what of reserve, cart and offers stays in the engine — is the architect's replan
(TASKS.md 6.4.a).

Success is every enquiry answered the same working day, a price agreed on the phone
arriving as an invoice the buyer can pay without a second conversation, an institution
paying a proforma, and demand for what is *not* in stock captured as want-lists.

## Positioning

The authority on the cartography and imagery of the East Indies — deeper in this
region than raremaps (192 Indonesia items) or 1stDibs (152) against the gallery's
347 maps, 1,428 prints and 182 photographs (RESEARCH.md §1.1) — with the Parry
certificate no competitor can offer, a dealer you talk to before you buy, and a sister
shop selling prints of its archive. The originals are kept in **Singapore and Jakarta**,
and viewings are **by appointment in those two cities only** (G2). The site carries the
name **Indies Gallery**; antiquemapsindonesia.com stays its web address (G1, D8).

## Operating Context

A buyer compares states, zooms into plate marks and the verso, checks condition
against a published scale and asks about shipping and duties — then talks. A sale
closes in a conversation: a call or WhatsApp to the gallery in Singapore (G3), a viewing
in Singapore or Jakarta (G2), an email from an institution's acquisitions office. The
site's job is to make that conversation start well — the stock number, the title and the
buyer's question already in the message — and to end it well: an invoice that says
exactly what was agreed, paid online. **The reply promise beside every enquiry button is
"the same working day, Singapore time"** (G9). Items sell once; the sold archive keeps
the traffic and turns it into alerts. Content is mostly migrated, then catalogued
continuously.

## Capabilities and Constraints

- Every original is unique; availability is guaranteed by the reservation service
  (`reserve()`, COMMERCE.md §4). On the gallery the one hold a buyer meets is the
  **invoice's**: it starts when staff issue the invoice — staff-approved by construction
  — and lasts until the due date the staff set, released automatically if unpaid (G5,
  D45).
- Deep zoom from static IIIF tiles; the primary image is always a crawlable image.
- **The purchase panel has no price and no purchase control.** It shows "Price on
  request", the status (Available · "On hold until {date}" · Sold), and the ways to start
  a conversation: WhatsApp prefilled with the stock number and title, a call, an enquiry
  by email, a viewing in Singapore or Jakarta, a proforma for institutions — each with
  the same-working-day reply promise (G3, G4, G9). The panel's exact modes, and whether
  price tiers survive in the engine at all, are 6.4.a's.
- **No price anywhere in public** — not on the item, a tile, a factsheet (G14), a sister
  link, a feed or structured data (G4). JSON-LD `offers` and the merchant feeds follow
  (TASKS.md 39.4); a price facet or a price sort would leak what the page hides (routed
  to 6.4.a).
- **No online offers** (G8, D22): a price is negotiated by phone or WhatsApp and paid by
  invoice.
- **Selling entity and stock locations:** the originals are in Singapore and Jakarta
  (G2). D1's default — a Singapore seller for Singapore stock and export, an Indonesian
  seller for Jakarta stock sold domestically — stays with the adviser; the per-item
  location and export status come from the item register (D24, OA10). Items held in
  Indonesia may need export clearance before an international sale (COMPLIANCE.md §1);
  an item with no register row stays enquiry-only and is never invoiced for export.
- **Shipping and duties are the buyer's**, quoted on the invoice, and nothing ships
  before the invoice is paid in full (G11). The engine's default for how originals
  travel — fine-art transit insurance above the courier's limits, duties DAP
  (COMMERCE.md §8) — stands until the replan says otherwise.
- **Analytics are first-party and shown in the admin dashboard** (G12). Whether GA4 and
  Meta still fire after consent is to confirm with the owner (TASKS.md 6.4.c).
- Legacy product URLs (`/product/{id}-{slug}`) stay byte-identical.

## Brand Commitments

- The object leads; the interface recedes. Never crop a sheet; show it on its mat.
- **The Parry certificate and the lifetime authenticity guarantee are the trust**, and
  they sit beside "Price on request" and the enquiry. Every original comes with a
  certificate; **no sample certificate is shown** until Dr Parry agrees (G7). The
  gallery promises a **lifetime authenticity guarantee**, published only in counsel's
  words (G6, D11). Returns of an original were not asked about beyond that; nothing is
  promised until counsel's wording arrives (D11).
- Honest status: "Sold", "On hold until…", "Price on request" — never invented
  urgency. A sold piece says "Sold" and nothing about its buyer (G10).
- Stock numbers (`M.`, `P.`, `F.`) are part of the identity and always shown
  (MIGRATION.md §1); they are also the WhatsApp reference.
- **The VOC and the colonial archive:** the same stance as the shop — **no VOC imagery
  beyond the items themselves** (owner's answer, 2026-10-01; TASKS.md Decisions ›
  Voice). The originals are what they are and are catalogued truthfully, VOC charts
  included; the brand's own chrome, voice and decoration borrow no VOC logo, monogram or
  colonial nostalgia.
- **British spelling** in English (owner's answer, 2026-10-01); Indonesian in the *Anda*
  register (decided in the gallery's voice, docs/design/gallery/voice.md, TASKS.md 6.3.d).
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
  owner's design draft (`Home - Antique Maps Indonesia.dc.html`) — draft input. Of its
  copy, "Est. 2001" is now confirmed as "since 2001" (G13). "Nothing here is sold
  online" is still not the line: there is no cart, but an agreed invoice is paid online
  (D50). "25 years", "4 national collections" and "We reply within two working days" are
  not used — no institution is named (G10) and the reply promise is G9's.
- The owner's interview answers of 1 October 2026 (`docs/design/journeys/owner-answers.md`).
- **Absences that must not be invented:** the published grading scale's wording
  (D10), the guarantee's and any returns' wording (D11), the legal entity (D1), the
  gallery's addresses and the hours of its Singapore and Jakarta viewings, the number
  buyers call (not asked in the interview — to confirm with the owner), testimonials,
  memberships, press and fairs (G13 confirmed none of them), real photography beyond the
  current single images (D19), a sample certificate (G7).

## Product Principles

1. **The sheet is the hero.** Every design decision is judged by how it presents
   paper.
2. **Collation before persuasion.** The record collectors need is complete and
   structured before any sales copy.
3. **A sold page is still a page.** It keeps its URL, its essay and its demand.
4. **Never imply certainty the record lacks.**
5. **The conversation is the sale.** WhatsApp, a call, an enquiry, a viewing and the
   invoice that follows are the path to buying, not fallbacks from a missing cart.

## Accessibility & Inclusion

WCAG 2.2 AA. The zoom viewer is keyboard-operable with a text alternative; status
is text; dimensions in millimetres and inches; English and Indonesian (Dutch
later); `prefers-reduced-motion` honoured absolutely.
