# Commerce

How money, stock and orders behave — for a gallery selling one-of-one objects
and a shop selling variant merchandise, on one domain model. All of it lives in
`@engine/domain` as pure, unit-tested modules; the HTTP handlers in
`@engine/http` are thin; the storefront apps only call the commerce API (C6).

Payments are in PAYMENTS.md; the legal reasons behind several rules below are in
COMPLIANCE.md.

---

## 1. Principles

1. **Priced on the server, every time.** Requests carry ids and quantities only.
   Totals are recomputed at every checkout step and again when the payment
   attempt is created. The one place a price is *computed* in the browser is the
   configurator's display, from a price table the server sent with the page for
   that destination — display only; adding to the bag re-prices on the server,
   and a difference is shown, never charged silently (`PriceChanged`).
2. **Snapshots, not references,** on everything that has been sold: line title,
   image, SKU, unit price, tax, discount, FX rate, seller identity.
3. **One `reserve()` for every channel** (ARCHITECTURE.md §6).
4. **One seller per checkout.** Everything the buyer sees — currency, taxes,
   methods, legal identity — follows from which seller of record serves this
   destination.
5. **Honest states.** "On hold until 14:30", "Only 2 left", "Made to order, ships
   in 3–5 days" are displayed only when the data says so.

## 2. Sellers of record and routing

A brand declares one or more sellers (BRANDS.md §3): each has a legal entity, the
stock locations and destinations it serves, a tax regime, the currencies it may
charge, and its payment providers.

```ts
routeSeller({ lines, destination }): { seller } | { blocked: LineProblem[] }
```

1. For each line, find sellers that can serve it: the line's stock location (or
   fulfilment route for made-to-order and print-on-demand) is in the seller's
   `serves.stockLocations`, and the destination is in `serves.destinations`.
2. **Export status gates unique items**: an item located in Indonesia whose
   export status is not `cleared` can only be sold to an Indonesian destination
   (COMPLIANCE.md §1). The line is flagged, not silently dropped: *"This map is
   held in Jakarta and can only be delivered within Indonesia. Ask us about
   export."*
3. **An unknown location sells nowhere.** A unique item with no recorded location
   or export status — every migrated item until the owner's item register is
   loaded (MIGRATION.md §9) — is routable to **no** destination. It still
   publishes (its URL, essay and images stay live) but its purchase panel is
   enquiry-only. Nothing is ever defaulted into exportability.
4. If one seller can serve every line, it is chosen. If lines need different
   sellers — rare, and only when a gallery cart mixes Singapore and Jakarta stock —
   the cart shows two checkouts rather than inventing a cross-entity order.
5. A Singapore seller selling Singapore-held stock to an Indonesian destination
   prices and charges in **IDR** (the rupiah rule applies to what the buyer sees)
   — default until the advisers rule otherwise (D29).

The **ship-to selector** in the header ("Ship to: Netherlands · EUR") sets the
destination before an address exists, defaulted from the visitor's country and
remembered in one `shipTo` cookie. It is the only input to the market — routing,
currency, prices, price facets and duties everywhere on the site follow from it
(ARCHITECTURE.md §9).

## 3. Money, currencies and price lists

- `Money = { amount: number, currency }` (C5) — `amount` is a **safe integer**
  in minor units (never a float, never a bigint across the wire). Exponents from
  ISO 4217.
- **Currency is decided by destination and seller, not by IP or language.**
  Delivering in Indonesia → **IDR only, with no foreign amount beside it**
  (the rupiah rule; COMPLIANCE.md §1) — on item pages, tiles, price facets,
  curations, the bag and the sister links alike. Export destinations → the
  market's currency, with a converted estimate allowed where the seller charges
  in another currency ("≈ €1,020 — charged in USD 1,100").
- **Market price lists** — a market is a currency plus its rules:

  | Source | Used for | How |
  | ------ | -------- | --- |
  | explicit | OEI's international lists; any hand-priced original | a stored price for that currency on the product or variant |
  | product-type table | OEI merchandise | `table[format × size × frame × mount × glazing][market]` × the artwork multiplier (licensed or hero works fund royalties) |
  | derived | IG's non-base currencies | base price → daily FX → + FX buffer (3–5%, per market) → rounded |

- **Rounding happens at named points, each with its method** (C5) — "round once"
  is impossible when percentage discounts, PPN on an 11/12 base, FX and partial
  refunds all produce fractions:

  | Point | Method |
  | ----- | ------ |
  | market unit price (derived) | up to the market's clean price point (Rp 95.000, Rp 1.450.000; USD 10 for originals) |
  | line discount | half-even to the minor unit |
  | order discount across lines | largest-remainder allocation, so lines sum to the order figure exactly |
  | tax per line | half-even on the tax base; the order's tax is the sum of its lines |
  | FX conversion | half-even, then the market price point where one applies |
  | partial refund across lines | largest-remainder allocation |

  Every rounded figure is stored, so a document can be reproduced to the rupiah.
- **FX** refreshes daily (DEPLOYMENT.md §5). Every order stores the rate it used
  (`fx` snapshot); a displayed estimate always says which currency is charged.
- **"From" prices** on tiles are the cheapest *valid* variant for this market and
  destination, never a variant that cannot ship there.

### The pricing pipeline

```
unit price   (market list: explicit | product-type table × multiplier | derived)
→ customer price list          trade / wholesale tiers (v2)
→ line discounts               bundles, multi-buy ("3 for 2" cards)
→ order discounts              codes, first-order offer, automatic rules (the free-shipping threshold)
→ shipping                     rate or quote (§8)
→ tax                          per seller regime and destination (§9)
→ gift card                    applied last, never below zero
→ grand total                  in the charge currency
```

Each step is a pure function with its own tests; the order stores every
intermediate figure so an invoice can be reproduced exactly.

## 4. Inventory and reservations

| Inventory model | Examples | Availability |
| --------------- | -------- | ------------ |
| `unique` | an original map, a photograph | one; a reservation makes it unavailable |
| `edition` | numbered facsimiles #12/100 | each unit reserved like a unique item |
| `stocked` | postcards, notebooks, totes, top prints | per location: on hand − reserved |
| `made-to-order` | giclée printed in Bali, teak frames | lead time, no count |
| `pod` | print-on-demand abroad | provider availability, no count |
| `service` | framing, conservation | quote |

**Stock locations** are data: the Denpasar showroom, a Bali stockroom, the
Jakarta gallery, Singapore storage, and a virtual `print-on-demand` location.
Showroom stock carries an "In the showroom now" badge and powers click & collect.

**Reservation kinds**

| Kind | Taken when | TTL (named in C1) | Public status |
| ---- | ---------- | ----------------- | ------------- |
| `checkout-lock` | the buyer presses "Continue to payment" | `checkoutLockMinutes` (15), then **extended** to the chosen method's `sessionTtl` + margin | "On hold" (unique only) |
| `hold` | staff grant a buyer's reserve request | `holdDefaultHours` (48), at most `holdMaxHours` (72) | "On hold until {date}" |
| `offer` | an offer is accepted | `offerHoldHours` (48); a counter-offer stays open `offerCounterHours` (72) | "On hold" |
| `invoice` | a proforma invoice is issued | `invoiceHoldDays` (7) or the invoice's due date | "On hold" |

`reserve(target, qty, kind, owner, ttl)` is the **only** writer, with
`reserveAll` (several targets, all or nothing), `extend`, `release`, `convert`
(sold), `reverse` (an order cancelled after payment, or an accepted return —
never a refund alone) and the sweep's `expireDue` (C8). It writes the scalar
`targetKey` the unique index guards (ARCHITECTURE.md §6); it first expires any
lapsed `active` rows for the same target **in the same transaction**, judged by
the database clock (`statement_timestamp()`); and it returns a reservation or a
typed conflict — never a database error at a buyer. A buyer is never blocked by
their own reservation: the same owner gets it back, and a hold or an offer hold
paid through checkout is superseded by the checkout lock in the same call. A
returned stocked item is a stock adjustment, not a reversed reservation.
Cash-at-retail methods are never offered for a unique item, because they cannot
complete inside any reasonable hold.

**One transaction, one lock order.** Every domain write runs in one READ
COMMITTED transaction — never REPEATABLE READ or SERIALIZABLE, where a second
buyer's `reserve()` aborts instead of waiting — and takes rows in one order: the
dedupe row, the request being answered, the order, its payment attempts,
reservations by target key, stock levels by variant and location, then counters
(discount usage, gift-card balances, the document sequence last). A bag reserves
all its lines in one call, whatever order they sit in, so two bags holding the
same items cannot deadlock; sweeps skip rows a buyer holds. The rules, the
timeouts and what "never aborts" cannot promise (a timeout, a lost connection)
are C8 (`domain/contracts/transactions.ts`); the indexes and checks they stand on
are listed for SCH in `domain/contracts/storage.ts`.

The checkout lock shows the buyer a countdown — *"We're holding this for you for
14:52"* — because it is true. Marketing urgency is not allowed (DESIGN-SYSTEM.md §10).

## 5. Cart and checkout

**Cart.** Guest carts identified by a hashed token cookie; merged into the
account on sign-in; 30-day expiry for guests. Lines hold product, variant,
quantity and configuration (for configured prints, the option set). **A cart
never reserves** — only checkout does. A unique item in someone else's checkout
shows "On hold — check back in 15 minutes" and offers the want-list.

**Checkout is data, not pages.** `CheckoutVM.steps` is computed from the seller,
destination and lines; the apps render whichever steps are present:

1. **Contact** — email; for Indonesian destinations the **WhatsApp number first**
   (order updates arrive there), normalised to `+62`, with a "this is my WhatsApp"
   toggle; **one full-name field** (many Indonesians have a single name);
   institution fields (organisation, tax id, PO number) when the buyer says so.
2. **Delivery** — ship-to country (from the selector), address in that country's
   shape (Indonesia: searchable pickers for province → city → district →
   sub-district, postal code filled from the sub-district, resolved to the
   courier's area id, the map pin optional); a "deliver before" date for visitors
   (hotel or villa delivery before departure); or **pickup** at a location with
   stock. A bag whose destination moves into Indonesia re-prices to IDR with a
   visible notice.
3. **Shipping method** — rates with price and delivery estimate; same-day where
   the courier offers it; *quote required* for originals above the insured
   threshold or oversize framed work (§8).
4. **Payment** — the methods routing allows (PAYMENTS.md §3). The checkout lock
   is taken here, extended when a method is chosen, and the payment attempt
   created with the recomputed total.
5. **Confirmation** — the order, the seller's identity, what happens next, and
   for manual/transfer methods the instructions in the editor's own words.

Gift options (wrap, note, hide prices), discount and gift-card codes, terms
acceptance and the **separate, unticked** marketing consent sit where the brand's
app places them; the rules are the engine's. Express wallets (Apple Pay /
Google Pay through Stripe) collapse steps 1–4 where the seller supports them.

## 6. State machines (C8)

Five machines, each one table (`domain/*/machine.ts`). **Order and payment are
orthogonal**: an order carries its fulfilment lifecycle, its payments carry the
money's — so "paid, then partially refunded, then shipped" is expressible without
a combinatorial status.

**Order** (the lifecycle of the sale)

| From | Event | To |
| ---- | ----- | -- |
| — | checkout reaches payment | `pending_payment` |
| `pending_payment` | its payment reaches `paid` | `paid` |
| `pending_payment` | buyer or staff cancel before payment | `cancelled` (reservation released, session cancelled) |
| `pending_payment` | attempt expired / failed, no retry in window | `abandoned` (reservation released) |
| `abandoned` | a **late** payment arrives | `paid` if the item can be re-reserved, else stays `abandoned` and the payment is refunded or voided |
| `paid` | first shipment dispatched / pickup ready | `fulfilling` |
| `fulfilling` | all lines delivered or collected | `completed` |
| `paid`, `fulfilling` | staff cancel | `cancelled` → refund |
| `completed` | an accepted return | `completed` (lines marked returned; stock or item restored) |

**Payment** (per attempt) — `created → pending → (requires_action) →
authorised → paid`, or `failed | expired | voided`; after `paid`:
`partially_refunded → refunded`, and `disputed → dispute_won | dispute_lost`.
Monotonic: a late `pending` event after `paid` changes nothing.

**Reservation** — `active → converted | released | expired`; `active → active`
on `extend`; `converted → reversed` when an order is cancelled after payment or a
return is accepted (which releases the item again). A refund alone never
reverses: a refund issued at the provider leaves the item sold until staff decide.

**Availability** (per unique item or edition unit, derived — never typed) —
`available → reserved → sold`, back to `available` when a reservation expires,
is released or reversed; `withdrawn` when staff take it off sale. It is computed
from reservations and product status, and every change emits an event that
revalidates the pages showing it.

**Offer** — `submitted → countered ⇄ submitted → accepted | declined | expired |
withdrawn`; `accepted` creates an `offer` reservation and a payment link.

Nothing else may change a status field, and every change is written as a
compare-and-set (`WHERE id = $1 AND status = $from`, exactly one row). Every
transition emits a **domain event** (`order.paid`, `offer.accepted`,
`hold.expiring`…) written to an **outbox** (`engine.domain_events`) **in the same
transaction** as the change, and dispatched at least once afterwards to
notifications, analytics, sister sync and cache invalidation — so a crash after
commit loses nothing and a rolled-back transaction sends nothing.

## 7. Buying a one-of-one object

The gallery's purchase panel shows the modes the item's price tier and status
allow. Tiers are brand config (`purchaseTiers`, in the seller's base currency),
defaulting to the research (RESEARCH.md §2). Offers are **in scope for launch**
as non-binding offers (D22); binding offers are v2.

| Tier (base price) | Primary | Secondary |
| ----------------- | ------- | --------- |
| up to ~USD 5,000 | Buy now | Enquire · WhatsApp |
| ~USD 5,000–25,000 | Buy now | Reserve for 48 h · Make an offer · Enquire |
| above ~USD 25,000, institutions, or price on request | Request price / Enquire | Book a viewing · Proforma invoice |

- **Request price** answers in place: after an email or WhatsApp field, the price
  is revealed on the page and the lead is logged; an item marked sensitive queues
  for a human with a stated reply time instead.
- **Make an offer**: amount, currency, message. A private floor (percent of
  price) auto-declines politely below it; staff accept, counter (valid 72 h) or
  decline. Acceptance creates the `offer` hold and a payment link. v2 makes
  offers *binding* by collecting a payment method with the offer where the
  seller's gateway supports it (Stripe), as Artsy does.
- **Reserve** requests a staff hold; a deposit option is v2.
- **Proforma invoice** for institutions — for one item or **a whole cart**: PO
  number, bank transfer, `invoice` holds on every line until the due date, a PDF,
  and a "pay this proforma" page (the `Quote` surface); "payment must be received
  and confirmed before an order is considered complete".
- **Sold** items stay published: no price (optionally "price realised" for
  signed-in buyers), available alternatives, and "Tell me when another example
  arrives" (want-list).

## 8. Shipping and fulfilment

**Shipping profiles** belong to products or product types: `flat-portfolio`
(originals, unframed), `framed-crate`, `tube` (sturdy posters, large wall maps
only), `parcel` (merchandise), `oversize`, `digital`, `pickup-only` (glass-glazed
frames outside Bali).

**Rate sources**, per seller and destination: a flat table by zone; a carrier API
(Biteship for Indonesian couriers; DHL Express for international); **quote
required** (fine-art insurance above the carrier's limits, framed and oversize
work); pickup (free). Couriers cap art cover (FedEx USD 1,000 declared; DHL
restricts fine art), so originals above the seller's threshold ship with a
separate fine-art transit policy, recorded on the shipment.

**Delivery promises read a holiday calendar** (a CMS global): Nyepi closes Bali
— showroom, couriers and the airport — for a day, and Lebaran stops couriers
nationwide for longer. A promise that ignores them is a promise broken.

**Duties** are estimated per destination and shown before payment (DAP default;
DDP per seller when enabled). International shipments get a generated commercial
invoice with HS codes (COMPLIANCE.md §4).

**Fulfilment routing** (OEI), per line — print-on-demand abroad is **not part of
the launch** (D23): at launch, export orders ship from Bali stock or local
production (DAP), and the POD rung below switches on in v2 with no change to the
router:

```
stocked at a location that serves the destination?  → own stock (showroom first for Bali)
made-to-order locally and destination is Indonesia? → local production job
destination abroad and a POD route exists?          → print-on-demand near the buyer (Prodigi fine art, Gelato paper goods)
otherwise                                           → not offered for this destination
```

Never ship Indonesian orders from abroad (import duty above USD 3 — COMPLIANCE.md
§5); never ship international print-on-demand orders from Bali when a local
partner is closer. One order may produce several shipments; each carries its own
tracking, which feeds WhatsApp and email updates.

## 9. Tax

Per seller: `ID-PPN` (PKP only: 12% on an 11/12 base = **11% effective**; exports
zero-rated), `SG-GST` (9% when registered; exports zero-rated with evidence),
or `none`. Price lists declare whether they include tax; the tax step produces
tax lines and the order stores rate, base and amount per line. Tax invoices
(e-Faktur/Coretax) are **exported for the accountant in v1**, not filed by the
engine (the tax export is TASKS.md 5.16). Tax rules are data with an effective
date, because they change.

## 10. Discounts, gift cards, bundles, gift wrap

- **Discount codes**: percent, fixed or free shipping; scope (products,
  collections, product types, first order); minimum spend; start/end; usage
  limits enforced atomically; never combinable unless marked. Indonesian
  shoppers expect a visible voucher field and a free-shipping progress bar.
- **Automatic rules** are discounts without a code — **the free-shipping
  threshold is one** (per market, minimum spend), edited by a manager with an
  audit trail, not a free-text global an editor can change.
- **Gift cards**: digital, hashed code, currency-bound, balance ledger, expiry per
  local law **(confirm)**; applied after tax as a payment-like deduction.
- **Bundles and sets**: postcard sets, print + frame, gallery-wall sets (10–15%
  off), "3 for 2" stationery — line-level rules.
- **Gift wrap** is a product (kind `service`) added as a line, so its price lives
  with every other price; gift notes are free; "hide prices" suppresses prices on
  the packing slip.

## 11. Returns and refunds

Policy text per seller comes from counsel — Indonesian law does not allow "all
sales final" (COMPLIANCE.md §6). The gallery's research default: 14-day returns,
a lifetime authenticity guarantee, and the Parry certificate. The engine
supports — as a domain of its own (TASKS.md 5.15), not only admin screens — a
buyer's return request per order line with reason and photos (from the account or
the order lookup), staff approval, return shipping instructions, inspection,
restock (location) or write-off, the reservation's `converted → reversed` for a
returned original, and the refund (PAYMENTS.md §5). Returns of originals route to the
seller's stock location — **never re-import an antique into Indonesia to accept
a return** without advice (it reopens the export question).

## 12. Documents

Generated from the order snapshot, per seller, in the buyer's language (EN/ID):
order confirmation, proforma invoice, receipt / tax invoice data, **certificate of
authenticity** (IG: item photo, collation, stock number, curator's signature
block, verification QR in v2), commercial invoice for export, packing slip,
return authorisation. PDFs are built by a Payload job and attached to the order.
Order, proforma and invoice numbers come from **gapless sequences per seller**,
with prefixes from the seller's config — tax invoices must not skip numbers, and
no brand name is baked into the engine.

## 13. What the engine emits

Every state change is a domain event with a stable name (ANALYTICS.md), written
to the outbox in the same transaction (§6) and dispatched at least once. Consumers:
email and WhatsApp templates (NTF), analytics, sister sync (a sold original
updates the merch shop's "own the original" link), and cache revalidation
(availability is never stale in a cached page — ARCHITECTURE.md §9).
