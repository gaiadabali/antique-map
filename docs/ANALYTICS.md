# Analytics, consent and commerce data

**Goal:** first-party behavioural and commerce data that each brand owns
outright, and dashboards inside its own admin. Ad attribution through third-party
tags is engine capability, not part of the launch (G12, below).
The pipeline is KOI's (a beacon into an append-only, partitioned `events` table,
read by admin dashboards), extended with commerce funnels and the lead flows a
gallery lives on.

**The first-party record is the analytics (the owner's answer to G12,
2026-10-01):** "we need to log all our analytics ourselves and visible in the
dashboard". Every number the owner reads comes from this pipeline and the domain's
records, in each brand's admin (§3); nothing depends on an export from, or an
account at, Google Analytics. **No GA4 and no Meta Pixel at launch, even after
consent** (the owner's answer, 2026-10-01): the analytics are first-party only.
Neither brand config names a GA4 or a Meta id, so no third-party tag loads for
anyone, and the consent banner offers **no marketing-tag category** — it asks only
what the first-party beacon needs (the analytics row below). The third layer stays
in the engine, off: a brand that later wants ad attribution sets the ids in its
config, and with them the banner gains its marketing category, the CSP its
origins and D38's rule its subject — a build then (TASKS.md 40.2's cut work), not
only a switch.

---

## 1. Three layers

| Layer | What | Where | Consent |
| ----- | ---- | ----- | ------- |
| **Domain events** | server-side facts: order paid, offer accepted, hold expired, refund issued | written by `@engine/domain` to the outbox `domain_events` **in the same transaction as the change**, then dispatched by the jobs queue to analytics, email and the sister webhook (COMMERCE.md §13) | none needed — they are business records, not tracking |
| **First-party beacon** | page and interaction events | `POST /api/x/collect` → `analytics_events` (monthly partitions) | **cookieless until consent**: a per-session hashed id only, so every visit is counted with no consent at all — which is what G12 asks; **analytics consent** (C2 `ConsentVM` `analytics`) adds only the persistent first-party anonymous id that links a visitor's visits, still kept by the brand alone |
| **GA4 + Meta Pixel** — not at launch | ad attribution, audiences | client tags, loaded only after marketing consent and only where the brand config names an id — none does: the owner keeps analytics first-party (G12) | marketing consent, per EU/Indonesian rules (COMPLIANCE.md §7) — a banner category that exists only once an id is set |

The GA4 measurement id and the Meta Pixel id are **runtime brand config**
(`analytics.ga4Id`, `analytics.metaPixelId`, BRANDS.md §3), handed to the page
through `ShellVM` — never `NEXT_PUBLIC_*`, which would be baked into a build that
serves more than one brand — and the per-request CSP allows exactly their origins
(ARCHITECTURE.md §13). Both are `null` for both brands at launch (G12).

**The page sends only what it can know; `/api/x/collect` stamps the rest.** A
beacon event carries its own props from the page's own view model, plus `at`,
`surface`, `locale` and `deviceClass` — never a session, an anonymous id or a
market, which the page cannot know and could forge. Collect **derives**
`sessionId` itself, at request time: a hash of a secret salt that rotates daily
and is then discarded, the site, the client's address and its user agent —
nothing is stored that could reverse it. `anonymousId` is the persistent id
collect keeps in its own HttpOnly `anon_id` cookie (390 days), set and read
only once analytics consent allows it. `market` is the ship-to market's id,
read from the `shipTo` cookie — `null` before one is set (C11
`CollectedContext`).

A domain event is never emitted from the browser and never from a webhook
handler directly: an `order.paid` that reached GA4 while its transaction rolled
back would be revenue that does not exist. The outbox dispatcher is the only
thing that sends a domain event anywhere, and it sends each one at least once
with its event id, so every consumer dedupes.

The beacon is batched, sent with `navigator.sendBeacon`, at most one request per
5 s per tab, flushed on `visibilitychange`, fire-and-forget; bots are filtered
server-side; `ensure_partition(ts)` runs before every insert (KOI — a partition
created only by cron can fail silently at midnight on the first). **No PII in
events** — ids and categories only; an email address never enters the events
table.

## 2. Event taxonomy (C11)

Naming is `object.verb`, past tense. Add to this list; **never rename** an
existing event — dashboards depend on the string.

**Discovery**
`listing.viewed` (facets, result count) · `facet.applied` · `search.submitted`
(query — redacted and capped at `/api/x/collect` before it is stored, because a
visitor can type an email address or a phone number into a search box — result
count, `zeroResults`) · `place.viewed` · `maker.viewed` ·
`curation.viewed` · `story.viewed` · `reading.depth` (25/50/75/100 on stories and
essays)

**Item**
`item.viewed` (product id, kind, inventory model, price band, status) — sent
once the purchase panel **resolves**: `priceBand` and `status` are its own
`analytics` (C2 `PurchaseVM`), which only the streamed part knows, and
`status` is `null` when availability could not be read (the `unverified`
panel); where a brand's unique prices are on request (the gallery, D50) every
unique item's band is `on-request` — a tier worked out from a private price would
tell anyone reading the page's beacon what range the price lies in ·
`item.zoomed` (image role, max zoom) · `item.versoViewed` ·
`item.roomViewOpened` · `item.factsheetDownloaded` · `item.shared` (channel) ·
`item.saved` · `item.unsaved` (both: product id, variant id, the list's new
size — the wishlist's contents never leave the device, D35) · `alert.created`
(want-list · item-alert, from which surface — the demand dashboard counts the
domain's `wantList.started` instead, never this) ·
`sister.clicked` (direction: to-original · to-prints, the link's own `workUid`) ·
`configurator.changed` (axis) · `configurator.completed`

**Leads — the gallery's real funnel, and at launch its only one** (D50: every
original is sold by conversation and invoice)
`price.requested` · `offer.submitted` · `hold.requested` · `enquiry.submitted`
(topic) · `viewing.booked` · `consignment.submitted` · `whatsapp.clicked`
(context: item · checkout · footer · business) · `call.clicked` (context: item ·
footer — the gallery's Call button, added with C11 v1.5) ·
`retailerApplication.submitted` (shop type only, never who it is). No brand sends
`offer.submitted` or `hold.requested` at launch (D22, D50); the names stay. These
feed the funnel's steps (and GA4's `generate_lead` and Meta's `Lead` once a brand sets a tag
id — none at launch, G12); the **Leads
dashboard's own counts** (§3) come from the domain's stored records instead, which
a blocked script, a failed beacon post or a reload cannot move. A call or a
WhatsApp chat leaves no record on the site, so its tap is the one lead step only
the beacon can see — counted, never mistaken for a sale.

**Purchase**
`cart.added` (product id, variant id, quantity, `value` — the added line's own
subtotal as the cart's answer states it, the unit's charge × quantity, never
an estimate and never recomputed in the page) · `cart.removed` · `cart.viewed` ·
`checkout.started` · `checkout.stepCompleted` (step) · `checkout.lockTaken` ·
`checkout.lockExpired` · `payment.methodSelected` · `payment.attempted` ·
`payment.failed` (`reasonClass`, C7's failure class) · and, from the domain:
`order.paid` · `order.refunded` · `order.partiallyRefunded` · `proforma.issued` and
`invoiceHold.expired` (the gallery's invoice issued, and lapsed unpaid, D50) ·
`offer.accepted` · `hold.granted` · `hold.expired` (no brand at launch: D22, D50 — the
names stay for a brand that takes offers or reserve requests) ·
`reservation.conflicted` (someone else was
first) · the leads as stored — `offer.received` · `holdRequest.received` (neither at
launch) · `priceRequest.received` · `enquiry.received` · `consignment.received` ·
`appointment.booked` · `quote.requested` (a partner's brief or reorder, an
institution's request: who asked and how, never who they are) · `retailer.applied` · `retailer.reapplied` · `retailer.approved` ·
`retailer.declined` (the shop's partner funnel, D31: applications — first and
again — and staff's decisions, with the hours they took; never the applicant's
name, NPWP or contact) · `wantList.started` (a saved search or item alert kept
— an address's once confirmed, D39, or an account's once saved where a brand has
buyer accounts, none at launch, D54; what the demand dashboard counts as unmet
demand, §3).

The two refund events reverse revenue, so the domain emits them only for the
payment that paid the order: giving back a late or a duplicate payment is the
payment's own fact (`payment.refunded`) and never reaches a dashboard as a
refund of revenue that was never counted.

**People and performance**
`newsletter.subscribed` · `newsletter.confirmed` · `account.created` ·
`account.signedIn` (at launch the shop's partners alone sign in: the gallery has no
accounts, D54) · `consent.updated` · `vitals.reported` (LCP/INP/CLS per
surface and device class — field data, not just lab)

### Mapping to GA4 and Meta (consented only — not at launch, G12)

Kept for the day a brand sets a tag id; no brand does at launch, so nothing below
fires.

| Ours | GA4 | Meta |
| ---- | --- | ---- |
| `listing.viewed` | `view_item_list` | — |
| `item.viewed` | `view_item` | `ViewContent` |
| `item.saved` | `add_to_wishlist` | `AddToWishlist` |
| `cart.added` / `cart.removed` | `add_to_cart` / `remove_from_cart` | `AddToCart` |
| `checkout.started` | `begin_checkout` | `InitiateCheckout` |
| shipping / payment step | `add_shipping_info` / `add_payment_info` | `AddPaymentInfo` |
| `order.paid` | `purchase` | `Purchase` |
| `order.refunded` · `order.partiallyRefunded` | `refund` (with the refunded value) | — |
| `price.requested` · `offer.submitted` (a brand that takes offers) · `enquiry.submitted` · `viewing.booked` · `retailerApplication.submitted` | `generate_lead` | `Lead` |
| `search.submitted` | `search` | `Search` |
| `newsletter.confirmed` | `sign_up` | `Subscribe` |

Purchase values are sent in the **charge currency** with the order's FX snapshot
recorded server-side, never recomputed in the browser. The browser's `purchase`
tag fires from the order-confirmation page with the order id as GA4's
`transaction_id` and Meta's `eventID` (so each dedupes a reload) — and when the
payment lands while the payment-pending page polls, from its re-render once the
poll answers paid, since the poll's answer carries no conversion; a server-side conversion API, if added later, reads
from the outbox, not from the webhook. Every tag converts a `Money` to the
decimal figure GA4 and Meta expect by its currency's exponent
(`CURRENCY_EXPONENT`, @engine/config/schema) — IDR 95000 is `95000`, USD 1000
is `10.00` — the one place in the pipeline a minor-unit integer becomes a
float, and only for the platforms that require one.

## 3. Dashboards (in each brand's admin)

**These are the analytics** (G12): with no third-party tag at launch, every figure
the owner reads about traffic, leads and sales is on these screens, from the beacon
and the domain's records alone — no number waits on, or is checked against, GA4.

One brand per dashboard, labelled as such — a Payload process binds one
database, so a cross-brand total would be a claim the screen cannot back (NOW!
DESIGN-SYSTEM §5).

- **Funnels** — each brand's own, by market, destination, device class and
  source. The shop's: listing → item → cart → checkout → paid. **The gallery's**
  (D50): listing → item → lead (a WhatsApp or call tap, a price request, an
  enquiry, a viewing, a proforma request) → **invoice issued** (`proforma.issued`)
  → **paid** (`order.paid`), or **lapsed unpaid** (`invoiceHold.expired`) — so the
  owner sees how many conversations become invoices and how many invoices are paid.
- **Demand the stock does not meet** — zero-result searches and want-lists kept
  (the domain's `wantList.started`, never the beacon's `alert.created`)
  grouped by maker and place — and by budget only where prices are shown (the
  gallery's want-lists take none, D50). For the gallery this is a **buying list**:
  what collectors want that is not in the drawers.
- **Leads** — price requests, enquiries, viewings, proforma and quote requests and
  retailer applications (and offers and holds, where a brand takes them), counted
  from the domain's stored records (§2), with response time to first reply — the
  gallery promises the same working day, Singapore time (G9) — and conversion to an
  invoice and to paid.
- **The sold archive** — traffic to sold pages and the alerts they create.
- **Payments** — method mix, failure reasons, reconciliation corrections,
  late-payment refunds.
- **Merchandise** — configurator completion, top designs, format ladder mix,
  attach rate of frames and gift wrap, showroom vs online, pickup share.
- **Web Vitals** by surface and device class, against DESIGN-SYSTEM.md §7.

**Done means visible:** a funnel is "done" when it renders in the dashboard for a
real session, not when rows exist in the table (KOI CONVENTIONS — the dashboard
that 500'd behind a green test).

## 4. Retention

Raw events 14 months, then rolled up into `analytics_rollups` (per day ×
event × entity × locale × device class: count and sessions) **before** anything
is dropped. Domain events and orders follow the retention the accountant and
COMPLIANCE.md require, not the analytics window.
