# Product — Indies Gallery and Old East Indies

<!-- impeccable:product-schema 1 -->

The product brief for both sites and the admin behind them. The spine is [docs/PLAN.md](docs/PLAN.md) (DR-1…DR-15);
the owner's answers are [owner-answers.md](docs/design/journeys/owner-answers.md) (cited **G1–G15**, **S1–S15**).
Behaviour: [EXPERIENCE-GALLERY.md](docs/EXPERIENCE-GALLERY.md), [EXPERIENCE-SHOP.md](docs/EXPERIENCE-SHOP.md),
[CONTENT-OPERATIONS.md](docs/CONTENT-OPERATIONS.md); look: [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md).

## Platform

web — one Next.js app with Payload, two hostnames, one admin at `/admin` (DR-1). Phone first.

## Users

**Indies Gallery** (`antiquemapsindonesia.com`, G1): **collectors** who read Latin and Dutch titles and want
collation, state, condition and references before they talk price; **institutions** whose acquisitions offices
write by email (none is named in public, G10); **interior designers, villas and hotels** buying by place, size and
look; **heritage buyers** searching for the town their family knew, often under its old name; and **people who want
to sell an antique** to the client (DR-4). Most land on one item page from search, on a phone.

**Old East Indies** (`oldeastindies.com`): **Instagram visitors** on a phone inside the app's browser; **tourists in
Bali** sending something to a villa before they fly; **residents and expats** buying for a home or a gift; **store
walk-ins**, the main buyers today (S9); and **hotels, villas, cafés and shops** that want to resell or furnish with
the client's goods (DR-8).

**The client's team in the admin** — the owner, editors, and staff in 100+ Bali stores who take orders on their
phones (DR-10). None are developers. Each works in English or Indonesian (G15).

## Product Purpose

The web home of one owner's business, bridging it to the people who matter to it (DR-2).

- **The gallery** shows antique maps, prints and photographs held in Singapore and Jakarta — a dealer trading
  **since 2001**, holding **over 9,500 authentic antiques**, each original with **a certificate** from its curator,
  Dr David E. Parry, under a **lifetime authenticity guarantee** (G6, G7, G13). It sells nothing online: every
  original is "Price on request" and every sale is a conversation on WhatsApp or email (DR-3, G3, G4).
- **The shop** is a real store for merchandise made from the archive: guest checkout in rupiah, delivery within
  reach of the nearest store that has the items, by Gojek or Grab, and one tracking link (DR-5…DR-7).
- **The AI guide** answers from the catalogue, hands visitors to the client with the item attached and records
  leads; the admin's drafting tool turns photos into listings a person verifies (DR-9).

## Positioning

One archive, told twice. The gallery is the authority on the cartography and imagery of the East Indies — deeper
in this region than the international marketplaces, with a certificate no competitor offers and a dealer you talk
to before you buy. The shop makes the same archive affordable and giftable: Indonesian archive imagery **with
provenance** at lifestyle prices, each product linked to the original it reproduces. Each site links to the other.

## Operating Context

The gallery's sale closes off the site: a WhatsApp message, an email or a call to the client, who negotiates; the
reply promise is **the same working day, Singapore time** (G9); shipping and duties are the buyer's, paid in full
before sending (G11). The shop's sale closes on the site: Midtrans (QRIS, bank transfer, cards); the server picks
the nearest store holding every item; the store books a driver and uploads the driver's details; the buyer follows
the status. Online shoppers message their own WhatsApp number (S6). Real catalogue, stock and store data arrive
later as spreadsheets; the sites are built on seed data first (DR-11).

## Brand Personality

**Shared:** exact, courteous, unhurried. Cormorant Garamond for display, Karla for reading (the owner's decision, 2026-10-02)
(DR-14). British spelling; Indonesian in the *Anda* register (DR-12, S15).

- **Gallery:** a good dealer's letter — quiet, scholarly, super premium. The sheet leads; the interface recedes.
  *Bahasa baku* in Indonesian.
- **Shop:** a friendly shopkeeper who knows the archive — warm, sunlit, a little playful in headings, never in a
  price or an error. Spoken, everyday Indonesian.

## Anti-references

- The vintage-poster print-on-demand look (Art Deco travel posters, stock "retro" type).
- Colonial nostalgia: VOC emblems, *tempo doeloe*, "the exotic Orient" — **no VOC imagery beyond the items
  themselves**, on either site.
- Dealer sites that oversell ("a stunning rare treasure"), and marketplace clutter around a one-of-one object.
- Gold-on-black "luxury" templates; default theme storefronts; carousels as a home page.
- Invented urgency — countdowns that reset, "12 people are looking", exit pop-ups.
- The current state of the shop: a Linktree, a WhatsApp catalogue and PDFs on Drive.
- References to *mix, not copy*: Etalage (detailed showcase catalogue), Everart (consistent framed catalogue,
  complete filters).

## Success Measures

Measured in the first-party analytics in the admin dashboard (DR-13, G12).

| Area | Measure |
| --- | --- |
| Gallery | item views that end in a WhatsApp, email or chat handoff; leads answered within the reply promise; sold pages still drawing visits and handoffs |
| Shop | Instagram visitor to paid order in **under 3 minutes**; checkout completion inside in-app browsers; paid orders accepted by a store within 30 minutes of opening |
| AI | chats that end in a handoff or a lead; **no price quoted, no deal agreed** by the guide — ever (AI.md) |
| Admin | the timed-test targets in CONTENT-OPERATIONS.md §7 met by people who never saw the admin; both sites filling up without developer help |
| Quality | WCAG 2.2 AA at 390 and 1280; LCP under 2.5 s on a mid-range Android over 4G |

## Product Principles

1. **The object leads.** Never crop a sheet; collation before persuasion.
2. **The conversation is the sale** on the gallery — WhatsApp and email are the path, not a fallback.
3. **Short and certain** on the shop — few steps, a clear fee, a status the buyer can follow.
4. **Never imply what the record lacks** — dates carry precision, attributions certainty, AI drafts stay marked
   until a person accepts them.
5. **The admin is half the product** — the client asked, in his own words, to save admin time.
6. **Ordinary where it can be** — Payload's built-ins first; effort goes to the AI, ease of use, safety and design.

## Accessibility & Inclusion

WCAG 2.2 AA is acceptance for both sites and the store staff's screens: keyboard-complete, visible focus, status as
text, 44 px touch targets, `prefers-reduced-motion` honoured absolutely, tested in the Instagram, WhatsApp and TikTok
in-app browsers. English and Indonesian throughout; dimensions in cm and inches; no dark mode (DR-14).

## Evidence on Hand

The owner's answers of 1 October 2026; the client's first form and the decisions of 11 September 2026
(`docs/design/input/claude-design-2026-09/project-notes.md`); the owner's design draft (draft input — its copy is not
fact unless an answer confirms it); the 1,823 crawled gallery records (DR-11). **Not to be invented:** prices and the
product list (S1, S2), store addresses and hours, the WhatsApp numbers and reply hours (S6), the welcome code's value
(S13), the condition-grade wording, the guarantee and any returns or refund wording (counsel), testimonials.
