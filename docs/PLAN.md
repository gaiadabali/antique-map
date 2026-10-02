# Plan — the Indies Platform, simplified

**Replanned 2026-10-01.** The earlier plan (44 phases, 186 tasks, a multi-brand engine) is archived in
[`docs/archive/2026-10-replan/`](archive/2026-10-replan/). This file is the spine: every other doc and
[`TASKS.md`](../TASKS.md) follows it. If a doc disagrees with this file, this file wins.

## What we are building

Two websites, one CMS, one owner.

- **Indies Gallery** (`antiquemapsindonesia.com`) shows the client's **antique maps, prints and photographs**,
  held in **Singapore**. It is a catalogue with deep zoom and a fast way to contact the client. It sells nothing
  online.
- **Old East Indies** (`oldeastindies.com`) is a real **online store** for the client's **merchandise** (prints,
  stationery, homeware, gifts), stocked in **100+ physical stores across Bali**. A buyer pays on the site; the
  nearest store that has the item sends it by Gojek/Grab.
- **One CMS** (Payload) is the admin dashboard and the system of record for both sites: products, stock per store,
  orders, partners, leads and analytics.
- **Everything belongs to one owner, the client.** He supplies all content and data. We seed realistic data now;
  when he is happy with the sites he hands over the real data and it is imported.

The websites **bridge** the client's offline business. People who want to sell an antique, hotels who want to
resell his goods, and buyers with questions all end up talking to the client on **WhatsApp or email**. The AI
chat helps them get there faster and with the right context.

## The shape

```
 antiquemapsindonesia.com ─┐                       ┌─ Gallery site  (catalogue, deep zoom, enquiry)
                           ├─►  ONE Next.js 16 app ─┤
 oldeastindies.com ────────┘     Payload 3 embedded └─ Shop site     (catalogue, cart, checkout, tracking)
                                 ONE Postgres database
                                 ONE admin at /admin  (owner · editor · store staff)
```

The hostname picks the site; records that belong to one site carry a `site` field (`gallery` | `shop`). One
deploy, one set of collections, one analytics store.

## Settled decisions

| # | Decision |
| --- | --- |
| **DR-1** | **One Next.js app, one Postgres database, two hostnames.** Not a database per brand, not two apps. Staging hostnames are `indies-gallery.gaiada.com` and `old-east-indies.gaiada.com`. |
| **DR-2** | **One owner.** All stock is the client's. There are no sellers of record, consignors' accounts or multi-entity tax: the site shows the owner's price in rupiah and nothing more. |
| **DR-3** | **The gallery is enquiry-only.** No cart, checkout, accounts, offers, holds or invoices. No price on any original — "Price on request". The deal is made on WhatsApp or email (G3, G4). A staff-issued invoice with an online pay page (earlier D51) is **deferred to v2**. |
| **DR-4** | **Selling an antique to the client** is the same path: a "Sell to us" page whose buttons open WhatsApp or email with a prepared message, plus an optional form that creates a **lead**. The client makes the deal. |
| **DR-5** | **The shop is a normal store.** Guest checkout, Midtrans (QRIS, bank transfer, cards), Indonesia only, rupiah only (S3). No refunds; a damaged item is replaced on a photo (S12). Free shipping over Rp 500.000 and a welcome code (S13). |
| **DR-6** | **Stock is per store.** A quantity per product (or variant) per store. The buyer drops a **map pin**; the server picks the nearest store that has every item; staff can reassign. The store sends the goods by **Gojek/Grab or any courier the client chooses — we do not integrate a courier**. Only a pin inside the last delivery band can check out, one store must hold every line (no split orders), and there is no online pickup at launch. |
| **DR-7** | **Fulfilment tracking is simple and proper.** Statuses: *payment received → processing → waiting for driver → picked up, on the way → delivered* (plus *cancelled* and *expired*). Staff upload the **driver's details as an image**. The buyer follows one tracking link. Every status change is recorded with who and when. |
| **DR-8** | **Partners are records.** A hotel or shop that resells the client's goods is a row in the CMS (contact, terms, products carried, notes). No partner login, portal or price tier. All contact is WhatsApp or email. (Supersedes the retailer accounts, trade tiers and approval flow of the old D31–D40.) |
| **DR-9** | **AI chat, guide and hand off, with lead capture.** It answers from the catalogue (read-only), never quotes a price or agrees a deal, hands the visitor to the client on WhatsApp or email with the item attached, and can record a **lead** in the CMS. A CMS tool drafts listings from photos; a human verifies before anything publishes. Safety rules are in [AI.md](AI.md). |
| **DR-10** | **Roles:** `owner` (everything), `editor` (catalogue, content and orders — the owner's team), `store` (only their own store's orders and stock; may hand an order back with a reason). Leads, partners, discounts, site settings and an antique's asking price are owner-only. Nothing else signs in. |
| **DR-11** | **Seed first, real data later.** The shape is built on seed data (the 1,823 crawled gallery records, mock merchandise, mock stores). The client's real catalogue, stock and store list arrive later as **spreadsheets** and go in through one idempotent import (upsert by stock number / SKU / store code). |
| **DR-12** | **English and Indonesian**, the default locale unprefixed, Indonesian at `/id/…`; the register is *Anda*; British spelling; the admin in both languages for every staff member (S15, G15). |
| **DR-13** | **Analytics are first-party only**, shown in the admin dashboard (D55). No GA4, no Meta Pixel. |
| **DR-14** | **Design:** the design team's delivered system is the base (`docs/design/input/claude-design-2026-09/`) — the owner's type decision, Cormorant Garamond + Karla (DESIGN-SYSTEM.md §2), not the design system's Inter — with a different palette per site, each in its own token file (the client's final colours are open, Q16); no dark mode; phone first. |
| **DR-16** | **Build end to end first, polish the UI after.** The first-run UI comes from the design team's work and is built only from tokens and shared components, so the owner's later UI/UX pass is a token and component change, not a rebuild. |
| **DR-15** | **What we keep from before:** the owner's answers ([owner-answers.md](design/journeys/owner-answers.md)), D12 (RustFS object storage), D13 (staging mail is Mailpit), D19/D20 (no photographer, no native review), D41–D43 and D53 (legacy reads and simulation), D49 (host-only secrets), the Helios go-ahead. See [archive/2026-10-replan/DECISIONS.md](archive/2026-10-replan/DECISIONS.md). |

## What is out (and where it went)

Multi-brand configuration (module flags, per-brand databases, the synthetic `test` brand, brand-literal lint);
sellers of record, tax and FX; reservations and state machines (replaced by one atomic stock decrement);
offers, holds, gift cards, returns and refunds; a courier or fulfilment router; the sister-site API;
customer and retailer accounts, wishlists and want-lists; the thirteen frozen contracts. They are not "later":
if the business changes, they are designed then, against the real need.

## Where the engineering effort goes

1. **The AI** — the visitor chat, lead capture, and the CMS drafting tool.
2. **Ease of use** — a fast phone-first shop, a short checkout, an admin the client can run without training.
3. **Safety** — see [SECURITY.md](SECURITY.md): server-side prices, verified payment webhooks, roles, an AI that
   cannot be talked out of its rules, validated uploads, backups.
4. **Design** — see [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) and each site's experience doc.

Everything else is ordinary: pages, a catalogue, a cart, an order. Use Payload's built-in features before
writing our own.

## Phases

Eleven phases, each ending in something you can open. The executable version — tasks, subtasks, checks, owners —
is [`TASKS.md`](../TASKS.md). The code that exists today is judged in [CARRY-OVER.md](CARRY-OVER.md): about 60%
carries over, 40% is deleted, and phases 1–2 do that.

| # | Phase | Ends in |
| --- | --- | --- |
| 1 | **Triage, gates and one app** | work in flight settled; brand gates and unused contracts deleted; one `apps/web`; `pnpm verify` green |
| 2 | **One database, two hosts** | the hostname picks the site; brand directories dissolved; collections trimmed; migrations reset; the app runs two placeholder sites from one process (staging follows in phase 3) |
| 3 | **The CMS and its data** | an admin the client can run: collections, roles, spreadsheet import, seed data |
| 4 | **Early UI from the design team** | the design team's tokens and components in the app, a palette per site, both home pages and the partnership page built, a style guide |
| 5 | **Gallery site** | browse, search, an item page with deep zoom, Ask and Sell-to-us handoffs |
| 6 | **Shop: catalogue to payment** | browse, product page, cart, guest checkout with a map pin, Midtrans (sandbox) |
| 7 | **Shop: fulfilment and tracking** | the store staff panel, statuses, the driver image, the buyer's tracking page |
| 8 | **AI** | the visitor chat with lead capture; the CMS listing-drafting tool; its safety evaluation |
| 9 | **Partners, leads, analytics and SEO** | the leads inbox, partner records, the dashboard, metadata, redirects |
| 10 | **Hardening and the staging rehearsal** | security review, performance, accessibility, a full rehearsal on staging, timed admin tests |
| 11 | **Launch** | both sites live together on `oldeastindies.com` and `antiquemapsindonesia.com`; the 30-day follow-up |

Phases 3 and 4 run side by side after phase 2. Phases 5 and 6 run side by side after both. Phase 8 starts once
the catalogue (3) and both sites (5, 6) have a place for the chat.

## Rules that stay

- **Money is integer minor units, priced on the server.** Never trust a price from a request.
- **Stock decrements atomically** (one SQL statement that fails if the quantity is short): a one-of-one item or
  the last unit sells once.
- **Public reads are published-only and projected**: `overrideAccess: false`, `_status: 'published'`, `select`
  only the fields shown. The Local API's default would leak drafts, costs and notes.
- **Payment webhooks are verified, idempotent, and applied in one transaction.**
- **No file over 300 lines.** Split by responsibility.
- **Never hand-edit generated files**; never commit a migration your dev server generated.
- **The build never touches a database.**
- **Never touch the current live sites.** What we take from them is a copy.
- **Secrets never go into the repo, a build argument, a log or a chat.**
- **Writes to Helios, DNS, production deploys and live credentials need the owner's go-ahead.**

## Owner items (the long-lead ones)

The store list with addresses and coordinates; the stock quantities per store; the product catalogue and prices;
the Midtrans sandbox and production accounts; the WhatsApp number and hours for each site; counsel's legal
pages; the domains' DNS at cutover. None needs engineering and each blocks a phase if late — listed in
[TASKS.md](../TASKS.md) as 👤 items.
