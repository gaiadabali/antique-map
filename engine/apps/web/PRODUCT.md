# Product — Indies Gallery (the `gallery` storefront)

<!-- impeccable:product-schema 1 -->

Drafted from research on 2026-09-25 (docs/RESEARCH.md §1–2, docs/MIGRATION.md
§1); conformed to impeccable's product schema on 2026-10-01 (TASKS.md 6.1.a); the
owner's interview answers folded in on 2026-10-01 (TASKS.md 6.1.f,
`docs/design/journeys/owner-answers.md`, cited below as **G1–G15**). This app is
named for its archetype — a catalogue of one-of-one objects — and serves Indies
Gallery through configuration. Every interview question for the gallery is answered;
nothing in this brief waits on the owner interview. The architect's replan (TASKS.md 6.4:
D50–D56) is folded in (6.6); what still waits on an adviser says so where it stands. The
journeys this brief serves are `docs/design/journeys/gallery/`.

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
one — where the price is negotiated (G3). **None of them signs up or signs in** (D54):
there are no collector accounts, and each thing a buyer comes back to has its own link.
Which of them buys most was not answered, and how buyers arrive is not measured: no
Google Analytics export comes from the old site (G12). The gallery's own first-party
analytics, shown in the admin dashboard, will measure it (G12, D55; ANALYTICS.md, phase
40). Until then the journeys assume the interview's default: phones first, most visitors
landing on an item page from search.

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
buyer pays it online through the site's gateway** (G3b) — on **the gallery's own pay
page**, `/pay/{token}`, in its design, the Stripe Payment Element embedded and bank
transfer beside it, never a gateway-hosted page; staff build it on a phone and share its
link into the buyer's WhatsApp chat (D51). The piece shows "On hold until {due date}" —
three days out unless staff set another date, the buyer reminded 24 hours before — and is
released if it stays unpaid (G5, D45). It ships only once paid in full, with shipping and
duties the buyer's, quoted on the invoice (G11). The purchase panel, the invoice and its
pay page are EXPERIENCE-GALLERY.md §5's and COMMERCE.md §7's; reserve, cart and offers
stay in the engine, off for the gallery.

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
  — and lasts until the due date the staff set (three days by default, a reminder 24
  hours before), released automatically if unpaid (G5, D45).
- Deep zoom from static IIIF tiles; the primary image is always a crawlable image.
- **The purchase panel has no price and no purchase control.** It shows "Price on
  request", the status (Available · "On hold until {date}" · Sold), and the ways to start
  a conversation: WhatsApp prefilled with the stock number and title, a call, an enquiry
  by email, a viewing in Singapore or Jakarta, a proforma for institutions — each with
  the same-working-day reply promise (G3, G4, G9). Every visitor reads the same panel —
  there is no viewer relation, since no one signs in (D54); its modes are
  EXPERIENCE-GALLERY.md §5's, one conversation tier for every original (COMMERCE.md §7).
- **No price anywhere in public** — not on the item, a tile, a factsheet (G14), a sister
  link, a feed or structured data (G4). JSON-LD `offers` and the merchant feeds follow
  (TASKS.md 39.4); there is no price facet or price sort, which would leak what the page
  hides (COMMERCE.md §7).
- **No online offers** (G8, D22): a price is negotiated by phone or WhatsApp and paid by
  invoice.
- **No accounts** (D54): no sign-up, no sign-in and no account area. An invoice is
  reached by its link in the chat or the email, an order by its email's link or the order
  lookup, a want-list by its confirmation email, and a viewing by its confirmation's link
  or on WhatsApp. The wishlist lives on the visitor's device and becomes a viewing's pull
  list; every want-list is an email's, confirmed by double opt-in (D39). The old site's
  customers are staff-side records (MIGRATION.md §5), and its `/account` pages get a
  designed answer, not a mirror.
- **Selling entity and stock locations:** the originals are in Singapore and Jakarta
  (G2). D1's default — a Singapore seller for Singapore stock and export, an Indonesian
  seller for Jakarta stock sold domestically — stays with the adviser; the per-item
  location and export status come from the item register (D24, OA10). Items held in
  Indonesia may need export clearance before an international sale (COMPLIANCE.md §1);
  an item with no register row stays enquiry-only and is never invoiced for export.
- **Shipping and duties are the buyer's**, quoted on the invoice, and nothing ships
  before the invoice is paid in full (G11). The engine's default for how originals
  travel — fine-art transit insurance above the courier's limits, duties DAP — is
  COMMERCE.md §8's.
- **Analytics are first-party only and shown in the admin dashboard** (G12, D55): no GA4
  and no Meta Pixel at launch, even after consent.
- Legacy product URLs (`/product/{id}-{slug}`) stay byte-identical.

## Brand Commitments

- The object leads; the interface recedes. Never crop a sheet; show it on its mat.
- **The Parry certificate and the lifetime authenticity guarantee are the trust**, and
  they sit beside "Price on request" and the enquiry. Every original comes with a
  certificate; **no sample certificate is shown** until Dr Parry agrees (G7). The
  gallery promises a **lifetime authenticity guarantee**, published only in counsel's
  words (G6, D11). **No returns of originals** is the owner's intention (D56): a sale of
  an original is final. It is in tension with UU 8/1999 art. 18 and still for counsel
  (D11, not yet confirmed), so until counsel answers no page promises a return or prints
  the rule.
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
  (D10), the guarantee's and any returns' wording (D11; D56 is the owner's intention, not
  yet confirmed), the legal entity (D1), the
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
