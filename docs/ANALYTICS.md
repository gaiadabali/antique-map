# Analytics, consent and commerce data

**Goal:** first-party behavioural and commerce data that each brand owns
outright, dashboards inside its own admin, and ad attribution only with consent.
The pipeline is KOI's (a beacon into an append-only, partitioned `events` table,
read by admin dashboards), extended with commerce funnels and the lead flows a
gallery lives on.

---

## 1. Three layers

| Layer | What | Where | Consent |
| ----- | ---- | ----- | ------- |
| **Domain events** | server-side facts: order paid, offer accepted, hold expired, refund issued | written by `@engine/domain` to the outbox `engine.domain_events` **in the same transaction as the change**, then dispatched by the jobs queue to analytics, email and the sister webhook (COMMERCE.md §13) | none needed — they are business records, not tracking |
| **First-party beacon** | page and interaction events | `POST /api/x/collect` → `engine.analytics_events` (monthly partitions) | **cookieless until consent**: a per-session hashed id only; a persistent anonymous id after analytics consent |
| **GA4 + Meta Pixel** | ad attribution, audiences | client tags, loaded only after marketing consent | marketing consent, per EU/Indonesian rules (COMPLIANCE.md §7) |

The GA4 measurement id and the Meta Pixel id are **runtime brand config**
(`analytics.ga4Id`, `analytics.metaPixelId`, BRANDS.md §3), handed to the page
through `ShellVM` — never `NEXT_PUBLIC_*`, which would be baked into a build that
serves more than one brand — and the per-request CSP allows exactly their origins
(ARCHITECTURE.md §13).

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
panel) · `item.zoomed` (image role, max zoom) · `item.versoViewed` ·
`item.roomViewOpened` · `item.factsheetDownloaded` · `item.shared` (channel) ·
`item.saved` · `item.unsaved` (both: product id, variant id, the list's new
size — the wishlist's contents never leave the device, D35) · `alert.created`
(want-list · item-alert, from which surface — the demand dashboard counts the
domain's `wantList.started` instead, never this) ·
`sister.clicked` (direction: to-original · to-prints, the link's own `workUid`) ·
`configurator.changed` (axis) · `configurator.completed`

**Leads — the gallery's real funnel**
`price.requested` · `offer.submitted` · `hold.requested` · `enquiry.submitted`
(topic) · `viewing.booked` · `consignment.submitted` · `whatsapp.clicked`
(context: item · checkout · footer · business) · `retailerApplication.submitted`
(shop type only, never who it is). These feed GA4's `generate_lead`, Meta's
`Lead` and the funnel's steps; the **Leads dashboard's own counts** (§3) come
from the domain's stored records instead, which a blocked script, a failed
beacon post or a reload cannot move.

**Purchase**
`cart.added` (product id, variant id, quantity, `value` — the added line's own
subtotal as the cart's answer states it, the unit's charge × quantity, never
an estimate and never recomputed in the page) · `cart.removed` · `cart.viewed` ·
`checkout.started` · `checkout.stepCompleted` (step) · `checkout.lockTaken` ·
`checkout.lockExpired` · `payment.methodSelected` · `payment.attempted` ·
`payment.failed` (`reasonClass`, C7's failure class) · and, from the domain:
`order.paid` · `order.refunded` · `order.partiallyRefunded` · `offer.accepted` ·
`hold.granted` · `hold.expired` · `reservation.conflicted` (someone else was
first) · `retailer.applied` · `retailer.reapplied` · `retailer.approved` ·
`retailer.declined` (the shop's partner funnel, D31: applications — first and
again — and staff's decisions, with the hours they took; never the applicant's
name, NPWP or contact) · `wantList.started` (a saved search or item alert kept
— an address's once confirmed, an account's once saved, D39; what the demand
dashboard counts as unmet demand, §3).

The two refund events reverse revenue, so the domain emits them only for the
payment that paid the order: giving back a late or a duplicate payment is the
payment's own fact (`payment.refunded`) and never reaches a dashboard as a
refund of revenue that was never counted.

**People and performance**
`newsletter.subscribed` · `newsletter.confirmed` · `account.created` ·
`account.signedIn` · `consent.updated` · `vitals.reported` (LCP/INP/CLS per
surface and device class — field data, not just lab)

### Mapping to GA4 and Meta (consented only)

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
| `price.requested` · `offer.submitted` · `enquiry.submitted` · `viewing.booked` · `retailerApplication.submitted` | `generate_lead` | `Lead` |
| `search.submitted` | `search` | `Search` |
| `newsletter.confirmed` | `sign_up` | `Subscribe` |

Purchase values are sent in the **charge currency** with the order's FX snapshot
recorded server-side, never recomputed in the browser. The browser's `purchase`
tag fires from the order-confirmation page with the order id as `transaction_id`
(so GA4 dedupes a reload); a server-side conversion API, if added later, reads
from the outbox, not from the webhook. Every tag converts a `Money` to the
decimal figure GA4 and Meta expect by its currency's exponent
(`CURRENCY_EXPONENT`, @engine/config/schema) — IDR 95000 is `95000`, USD 1000
is `10.00` — the one place in the pipeline a minor-unit integer becomes a
float, and only for the platforms that require one.

## 3. Dashboards (in each brand's admin)

One brand per dashboard, labelled as such — a Payload process binds one
database, so a cross-brand total would be a claim the screen cannot back (NOW!
DESIGN-SYSTEM §5).

- **Funnels** — listing → item → (cart | lead) → checkout → paid, by market,
  destination, device class and source.
- **Demand the stock does not meet** — zero-result searches and want-lists kept
  (the domain's `wantList.started`, never the beacon's `alert.created`)
  grouped by maker, place and budget. For the gallery this is a **buying list**:
  what collectors want that is not in the drawers.
- **Leads** — requests, offers, holds, enquiries, viewings and retailer
  applications, counted from the domain's stored records (§2) with response
  time to first reply and conversion to paid.
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

Raw events 14 months, then rolled up into `engine.analytics_rollups` (per day ×
event × entity × locale × device class: count and sessions) **before** anything
is dropped. Domain events and orders follow the retention the accountant and
COMPLIANCE.md require, not the analytics window.
