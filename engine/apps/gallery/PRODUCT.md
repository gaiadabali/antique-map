# Product — Indies Gallery (the `gallery` storefront)

<!-- impeccable:product-schema 1 -->

Drafted from research on 2026-09-25 (docs/RESEARCH.md §1–2, docs/MIGRATION.md
§1). Facts marked **(to confirm)** await the owner interview in Phase 1 (task 1.1).
This app is named for its archetype — a catalogue of one-of-one objects — and
serves Indies Gallery through configuration.

## Platform

web

## Users

**Collectors** of antique maps, prints and photographs of the Indonesian
archipelago and Southeast Asia: they know Valentijn from Van Keulen, read Latin
and Dutch titles, and want collation, state, condition and references before they
talk price. **Institutions** — the gallery already sells to the National Museum of
Singapore, the National Library of Singapore, the National Library of Australia,
the Louvre Abu Dhabi and Leiden University — need proformas, PO numbers,
provenance and export papers. **Interior designers, villas and hotels** buy by
place, size and colour and present to clients. **Heritage buyers** — the Dutch-
Indonesian community and returning visitors — search by the town their family
knew. Most arrive from search onto a single item page; many are on phones.

## Product Purpose

The web home of a gallery with 25+ years of trading and 9,500+ authentic
antiques, 15th–20th century, each with a certificate of authenticity from its
curator, Dr David E. Parry, author of *The Cartography of the East Indian
Islands*. Replaces a dated store (antiquemapsindonesia.com) that has the stock,
the essays and the rankings but no deep zoom, no terms, broken sorting and no
structured data. Success is a collector trusting a USD 5,000 purchase without
emailing first, an institution buying on a proforma, and demand for what is
*not* in stock captured as want-lists.

## Positioning

The authority on the cartography and imagery of the East Indies — deeper in this
region than raremaps (192 Indonesia items) or 1stDibs (152) — with the Parry
certificate no competitor can offer, Southeast Asian commerce (IDR/SGD, WhatsApp,
viewings in Singapore, Jakarta and Bali **(to confirm)**), and a sister shop
selling prints of its archive.

## Operating Context

A buyer compares states, zooms into plate marks and the verso, checks condition
against a published scale, asks about shipping and duties, and often wants a
conversation before paying: request price, make an offer, reserve for 48 hours,
book a viewing, receive a proforma. Items sell once; the sold archive keeps the
traffic and turns it into alerts. Content is mostly migrated, then catalogued
continuously.

## Capabilities and Constraints

- Every original is unique; availability is guaranteed by a reservation service.
- Deep zoom from static IIIF tiles; the primary image is always a crawlable image.
- Purchase modes by price tier (buy, reserve, offer, request price, enquire,
  viewing, proforma) — docs/COMMERCE.md §7.
- **Selling entity and stock locations (to confirm):** the site says "based in
  Singapore" beside a +62 number and a Jakarta gallery. Items held in Indonesia
  may need export clearance before an international sale (docs/COMPLIANCE.md §1).
- Legacy product URLs (`/product/{id}-{slug}`) stay byte-identical.

## Brand Commitments

- The object leads; the interface recedes. Never crop a sheet; show it on its mat.
- The Parry certificate, the lifetime authenticity guarantee and the institutions
  are the trust, and they sit beside the price.
- Honest status: "Sold", "On hold until…", "Price on request" — never invented
  urgency.
- Stock numbers (`M.`, `P.`, `F.`) are part of the identity and shown in a mono face.
- **The visual direction is open until Phase 1's direction round** (TASKS.md 1.4).
  The research's "Print Room" (Newsreader / Inter Tight / IBM Plex Mono) is
  evidence and may enter as one candidate; it is also the category default that
  the round exists to test against. Nothing here pins a font or a colour.

## Evidence on Hand

- The live site's catalogue shape, category tree, fields, URLs and defects
  (docs/MIGRATION.md §1); benchmark findings (docs/RESEARCH.md §1).
- **Absences that must not be invented:** the published grading scale's wording,
  returns and guarantee terms, the legal entity, gallery addresses and opening
  hours, institutional client permissions, testimonials, memberships, real
  photography beyond the current single images.

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
