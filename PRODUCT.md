# Product — the Indies Platform (shared engine and admin)

<!-- impeccable:product-schema 1 -->

This file covers what both brands share: the platform and **the admin**. Each
storefront has its own brief — `engine/apps/gallery/PRODUCT.md` (Indies Gallery)
and `engine/apps/emporium/PRODUCT.md` (Old East Indies). Drafted from research on
2026-09-25; conformed to impeccable's product schema on 2026-10-01 (TASKS.md 6.1.a)
against the decisions answered by then (TASKS.md, Decisions › Answered).

**How to read the marks.** A statement with a source is a fact. A statement marked
**(open — pending the owner interview, OA2 · Gn / Sn)** is not yet sourced: it is
the working assumption, and the owner's answer to that question in
`docs/design/journeys/owner-interview.md` folds in exactly there (TASKS.md 6.1.b).

## Platform

web

## Users

**Primary: the two companies' staff, working in the admin.** A cataloguer at
Indies Gallery works through drawers of originals — maps, prints, photographs —
entering title, maker, date, technique, dimensions, condition and references,
often from the object in hand; there are ~9,500 in inventory and ~2,090 online
today (MIGRATION.md §1). A shop manager at Old East Indies turns archive works into
products, keeps showroom stock right, and answers WhatsApp. Managers answer offers,
holds and price requests. None of them are developers. Who exactly does each job,
how many people, and in which language each works — the draft assumed several work
in Indonesian and that fulfilment staff pack fragile paper and gifts — is
**(open — pending the owner interview, OA2 · G15)**. The two observation sessions
(OA13, TASKS.md 23.1.a) watch a real cataloguer and the real shop manager.

**Secondary: the buyers**, for whom the staff's work is the product — described
in each storefront's brief.

**Third: a maintaining developer or agent** who did not build this and must add a
field, a module, a provider or a third brand without archaeology.

## Product Purpose

One engine and one CMS for two sister companies that sell the same archive to
two markets — originals to collectors and institutions, merchandise to tourists,
expats, gift buyers and retail partners — with separate databases, sellers of
record, payment gateways and accents. What the client asked for in its first form
(design input, `project-notes.md`): sell online, look credible to serious buyers,
explain what they actually do, **save admin time**, and bring old customers back.
Success is **both sites filling up without developer help**, every one-of-one
object selling exactly once, and every sale lawful where it is made.

## Positioning

Not two websites and not a marketplace: one archive, told twice. The gallery is
the authority on the originals; the shop makes the archive affordable and
giftable; each links to the other — the client asked for a two-way bridge between
the sites (`project-notes.md`; BRANDS.md §5). A third site for the same client,
Kingdoms of Indonesia, is **not** part of this platform and shares nothing with it
(TASKS.md Log, 2026-09-28).

## Operating Context

The admin is where both products are actually made. Cataloguing accretes —
a work is publishable with a title, object type, date (any precision), a place or
maker and a primary image, and deepens later. Corrections are daily work: a
misattributed maker, a better date, a new verso photograph. Merchandise is made
in bursts: one engraving becomes a dozen products in one sitting. WhatsApp is a
primary channel in Indonesia (RESEARCH.md §1.6–1.9, §3.2). Orders, offers and holds
are expected from several countries and time zones (Singapore UTC+8, Jakarta
UTC+7, Bali UTC+8 — EXPERIENCE-GALLERY.md §9); who answers them, and in which
hours, is **(open — pending the owner interview, OA2 · G9, S6)**.

## Capabilities and Constraints

- Payload CMS 3 embedded in Next.js 16 apps, PostgreSQL 18, Node 22 on a shared
  CloudPanel VPS (Helios), one process per brand, pull-based deploys.
- One Payload config and one migration set for both brands; modules switch
  capabilities on and off per brand without changing the schema (BRANDS.md §4).
- Bilingual throughout (English and Indonesian; Dutch-ready). The default locale
  is English for both, Indonesian at `/id/…` — D18's default, still open.
- Purpose-built admin screens beside the standard collection UI: the desk,
  fast cataloguing, bulk image upload, AI-assisted drafting (flagged,
  human-verified; D16 open), the merch-from-work wizard, order operations, the
  offers / holds / enquiries inbox, partner applications (D31), stock and showroom
  sales, homepage editing with preview.
- **Never imply certainty the record lacks**: dates carry precision,
  attributions carry certainty, AI drafts stay flagged until verified.
- Legal constraints are enforced, not documented: IDR-only for Indonesian
  delivery, export-status gating for antiques held in Indonesia, payment caps,
  separate consents (COMPLIANCE.md).
- **Undecided, and owned by advisers rather than the owner interview:** the selling
  entities and their tax registrations (D1, D2, D4), export clearance (D5), returns
  wording (D11), Hofker rights (D6) — each has a default in TASKS.md, Decisions.

## Brand Commitments

- **One shared base, distinct accents (D9's shape, answered 2026-09-28):** both
  sites share layout, components, buttons and type — **Cormorant Garamond + Karla**,
  which the client asked to keep — and differ only in palette and signature details,
  inside the token contract's overridable subset. The references are Etalage and
  Everart, mixed, not copied; the owner's draft (`docs/design/input/claude-design-2026-09/`)
  is the lead candidate, as draft input. The owner still picks the base candidate
  and each brand's accents (D9, TASKS.md 13.1).
- Each brand's admin wears its own storefront's accents (the KOI owner directive:
  the CMS matches the public site's world) — chrome and accents only (TASKS.md 13.3).
- Plain language on every screen a non-developer sees, in English and
  Indonesian: "Web address", not "slug"; "What it depicts", not "places".
- Status is shown as form and colour and text — never colour alone.

## Evidence on Hand

- The live Indies Gallery store's catalogue shape, category tree, fields and URLs,
  as measured from its public pages (MIGRATION.md §1), and four research streams
  (RESEARCH.md). The old catalogue export itself is outstanding (OA9; D42's mock
  dump stands in).
- The owner's first design draft and the client's decisions of 11 Sept 2026
  (`docs/design/input/claude-design-2026-09/`, `project-notes.md`) — draft input:
  its copy (years in trade, prices, production claims) is not confirmed fact.
- **Absences that must not be invented:** the selling entities and their tax
  registrations; real prices for merchandise; the grading scale's wording; the
  returns policy; Hofker rights; photography of the showroom; the staff roster; the
  owner's answers to the owner interview (OA2 — pending).

## Product Principles

1. **The admin is half the product.** If cataloguing or making merchandise is
   slow, neither site fills up — and the client asked, in its own words, to save
   admin time.
2. **Correcting is as cheap as creating.**
3. **A one-of-one object sells once** — through every channel, guaranteed by the
   database.
4. **Never imply certainty the record lacks.**
5. **A brand is configuration, never code.**

## Accessibility & Inclusion

WCAG 2.2 AA is an acceptance criterion for the admin as much as the storefronts:
keyboard-complete screens, visible focus, AA contrast validated in code, 44 px
touch targets, `prefers-reduced-motion` honoured. Cataloguers work long sessions,
so contrast, density and target size are ergonomic requirements, not only
compliance ones.
