# Product — the Indies Platform (shared engine and admin)

<!-- impeccable:product-schema 1 -->

This file covers what both brands share: the platform and **the admin**. Each
storefront has its own brief — `engine/apps/gallery/PRODUCT.md` (Indies Gallery)
and `engine/apps/emporium/PRODUCT.md` (Old East Indies). Drafted from research on
2026-09-25; facts marked **(to confirm)** await the owner (Phase 1, task 1.1).

## Platform

web

## Users

**Primary: the two companies' staff, working in the admin.** A cataloguer at
Indies Gallery works through drawers of originals — maps, prints, photographs —
entering title, maker, date, technique, dimensions, condition and references,
often from the object in hand; there are ~9,500 in inventory and ~2,090 online
today. A shop manager at Old East Indies turns archive works into products,
keeps showroom stock right, and answers WhatsApp. Fulfilment staff pack fragile
paper and gifts. Managers answer offers, holds and price requests. None of them
are developers; several work in Indonesian.

**Secondary: the buyers**, for whom the staff's work is the product — described
in each storefront's brief.

**Third: a maintaining developer or agent** who did not build this and must add a
field, a module, a provider or a third brand without archaeology.

## Product Purpose

One engine and one CMS for two sister companies that sell the same archive to
two markets — originals to collectors and institutions, merchandise to tourists,
expats and gift buyers — with separate databases, sellers of record, payment
gateways and looks. Success is **both sites filling up without developer help**,
every one-of-one object selling exactly once, and every sale lawful where it is
made.

## Positioning

Not two websites and not a marketplace: one archive, told twice. The gallery is
the authority on the originals; the shop makes the archive affordable and
giftable; each links to the other.

## Operating Context

The admin is where both products are actually made. Cataloguing accretes —
a work is publishable with a title, object type, date (any precision), a place or
maker and a primary image, and deepens later. Corrections are daily work: a
misattributed maker, a better date, a new verso photograph. Merchandise is made
in bursts: one engraving becomes a dozen products in one sitting. Orders,
offers and holds arrive at all hours from several countries; WhatsApp is a
primary channel in Indonesia.

## Capabilities and Constraints

- Payload CMS 3 embedded in Next.js 16 apps, PostgreSQL 18, Node 22 on a shared
  CloudPanel VPS (Helios), one process per brand, pull-based deploys.
- One Payload config and one migration set for both brands; modules switch
  capabilities on and off per brand without changing the schema.
- Bilingual throughout (English and Indonesian; Dutch-ready).
- Purpose-built admin screens beside the standard collection UI: the desk,
  fast cataloguing, bulk image upload, AI-assisted drafting (flagged,
  human-verified), the merch-from-work wizard, order operations, the offers /
  holds / enquiries inbox, stock and showroom sales, homepage editing with preview.
- **Never imply certainty the record lacks**: dates carry precision,
  attributions carry certainty, AI drafts stay flagged until verified.
- Legal constraints are enforced, not documented: IDR-only for Indonesian
  delivery, export-status gating for antiques in Indonesia, payment caps,
  separate consents (docs/COMPLIANCE.md).

## Brand Commitments

- Each brand's admin wears its own storefront's colours (KOI's owner directive:
  the CMS matches the public site's world).
- Plain language on every screen a non-developer sees, in English and
  Indonesian: "Web address", not "slug"; "What it depicts", not "places".
- Status is shown as form and colour and text — never colour alone.

## Evidence on Hand

- The live Indies Gallery store and its category tree, fields and URLs
  (docs/MIGRATION.md §1), and four research streams (docs/RESEARCH.md).
- **Absences that must not be invented:** the selling entities and their tax
  registrations; real prices for merchandise; the grading scale's wording; the
  returns policy; Hofker rights; photography of the showroom; the owner's
  answers to the Phase 1 interview.

## Product Principles

1. **The admin is half the product.** If cataloguing or making merchandise is
   slow, neither site fills up.
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
