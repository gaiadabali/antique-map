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
   attempt is created. The one place a price *changes* in the browser is the
   configurator's display, looked up in a price table the server sent with the
   page for that destination — one row per variant, its `Money` beside the
   server's display string, so the browser neither sums nor formats
   (CONVENTIONS.md §6) — display only; adding to the bag re-prices on the
   server, and a difference is shown, never charged silently (`PriceChanged`).
2. **Snapshots, not references,** on everything that has been sold: a line's
   title, its chosen options with the labels the buyer read (never re-read from
   the product), stock number, the reproduction label, its image by C9 asset id
   (never a URL a new derivative version would leave behind), unit price, tax,
   discount, FX rate, seller identity.
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
   sellers — rare: a basket of Singapore and Jakarta stock — the cart shows two
   checkouts rather than inventing a cross-entity order, and at the gallery, which
   has no cart (§7), staff issue one invoice per seller.
5. A Singapore seller selling Singapore-held stock to an Indonesian destination
   prices and charges in **IDR** (the rupiah rule applies to what the buyer sees)
   — default until the advisers rule otherwise (D29).

The **ship-to selector** in the header ("Ship to: Netherlands · EUR") sets the
destination before an address exists, defaulted from the visitor's country and
remembered in one `shipTo` cookie. It is the only input to the market — routing,
currency, prices, price facets and duties everywhere on the site follow from it
(ARCHITECTURE.md §9).

**A destination no market lists is one the brand does not deliver to.** The
selector offers only the countries a market lists, and a visitor from anywhere
else starts at the brand's **home market** — the market priced in its base
currency. Nothing is priced, estimated or offered for a destination the brand
does not deliver to. This is the shop at launch: its one market and its one seller
list Indonesia alone (S3, 2026-10-01; D47 answered), so a visitor abroad browses in
rupiah for delivery within Indonesia, every product page and the bag say once,
plainly, that the shop delivers within Indonesia only for now, and a checkout takes
an Indonesian address — a Bali hotel or villa, a home, or pickup at the showroom —
or none. The export design that waits for the owner is §3.

## 3. Money, currencies and price lists

- `Money = { amount: number, currency }` (C5) — `amount` is a **safe integer**
  in minor units (never a float, never a bigint across the wire). **The
  exponent is the engine's, not ISO 4217's** — `CURRENCY_EXPONENT` in
  `@engine/config/schema`: IDR is 0 here (Rp 95.000 is `95000`) though ISO
  lists two, while USD/SGD/EUR/AUD/GBP are 2 as ISO has them. A provider that
  counts in other units (IDR in hundredths) is converted both ways in its own
  C7 adapter — never in the domain, never twice.
- **Currency is decided by destination and seller, not by IP or language.**
  Delivering in Indonesia → **IDR only, with no foreign amount beside it**
  (the rupiah rule; COMPLIANCE.md §1) — on item pages, tiles, price facets,
  curations, the bag and the sister links alike. Export destinations → the
  market's currency, with a converted estimate allowed where the seller charges
  in another currency ("≈ €1,020 — charged in USD 1,100"). A market is priced and
  charged in its own currency only where the routed seller charges it (C1
  `sellers[].charge`); otherwise the seller's charge currency is the exact figure
  and the market's is the estimate beside it.
- **The shop sells within Indonesia only at launch (S3, 2026-10-01 — D47
  answered).** There is no checkout to an address abroad, so no "≈" estimate in a
  foreign currency is shown anywhere on the shop and no payment is charged in one:
  every price, total and charge is the exact rupiah, and PayPal is not offered
  (PAYMENTS.md §6). The rupiah rule above already governs every page, since every
  ship-to the shop delivers to is Indonesian (§2). A visitor's foreign card is charged
  that exact rupiah total, and the payment step says, in one line, that their card
  issuer may convert it again into their own currency at its own rate.
- **A buyer abroad at the shop — D47's design, off at launch.** What follows is
  the design for when the owner opens export (the owner and the adviser decide,
  D2): kept, so the engine is ready, and switched on by configuration alone — a
  market and a seller that serve the destinations abroad, `charge: ["IDR"]`,
  estimate-only markets and `paypal` among the seller's providers (TASKS.md 17.2.e
  builds it with that change, not before). The shop's one seller is an Indonesian
  PT (D2): its gateway charges rupiah, cards from abroad included (COMPLIANCE.md
  §1–2), and PayPal, its one method in another currency, takes no rupiah at all.
  So, once export opens:
  - **one price list, in rupiah, for every destination.** The seller prices and
    charges IDR alone (`charge: ["IDR"]`); there is no hand-set EUR, AUD, SGD or USD
    list until a seller that can charge those currencies exists (the v2 Singapore
    seller, EXPERIENCE-SHOP.md §11). Exports are zero-rated where PPN applies (§9);
  - **the exact figure is the rupiah** — every price, total and document — and a
    card is charged exactly that rupiah total;
  - **the "≈" figure is the market's currency** — euros for the eurozone, Australian
    and Singapore dollars, US dollars elsewhere — a display-only estimate of the
    rupiah at the day's reference rate with no buffer, in whole units, always beside
    the rupiah it estimates: "≈ €46 — charged in Rp 812.000" (C5 `PriceSet`
    `converted`: `charge` in IDR, `estimate` in EUR). Price facets and price-named
    gift presets for an export market read that estimate ("under €25"), refreshed
    with the rate — display only, like the estimate itself;
  - **PayPal charges US dollars**: at the payment step the order's rupiah total is
    converted once, at the day's rate plus the brand's USD buffer (C1
    `money.fx.bufferPct`, which covers PayPal's own conversion when the PT withdraws
    to rupiah), half-even to the cent at the `fx-conversion` point. That dollar
    figure is exact: the PayPal option shows it before the buyer chooses it
    ("PayPal — USD 51.20"), and the payment attempt stores it as its charge with its
    FX snapshot, the order staying in rupiah (PAYMENTS.md §6). The figure the option
    showed is the figure charged: a rate that moved in between answers `PriceChanged`
    with the new figure, never a silent charge. A refund of that payment is the
    refunded rupiah converted at the attempt's own rate — never the day's — and never
    more than the attempt took;
  - the payment step says, in one line, that the card issuer or PayPal may convert
    again into the buyer's own currency at its own rate.
- **Market price lists** — a market is a currency plus its rules:

  | Source | Used for | How |
  | ------ | -------- | --- |
  | explicit | any hand-priced original; OEI's lists abroad once export opens | a stored price for that currency on the product or variant |
  | product-type table | OEI merchandise | `table[format × size × frame × mount × glazing][market]` × the artwork multiplier (licensed or hero works fund royalties) |
  | derived | IG's non-base currencies — at launch only staff's view of a private asking price in the buyer's currency, since no gallery price is published (D50, §7) | base price → daily FX → + FX buffer (3–5%, per market) → rounded |
  | agreed | a staff-issued invoice or proforma, an accepted quote (and an accepted offer, where a brand takes them) | the figure agreed with the buyer, stored on the server as C5 `AgreedPrice` when the document is issued — never from a request |

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
  **An estimate is display-only, in whole major units** — converted half-even
  at the `fx-conversion` point to a multiple of the currency's exponent and
  shown with no fraction digits after "≈" ("≈ €1,020 — charged in USD 1,100"):
  never charged, never summed into a total, never sent back by a client.
  `formatMoney` (`@engine/i18n`, CONVENTIONS.md §3) fixes an amount's fraction
  digits to `CURRENCY_EXPONENT` itself and never takes the runtime's ICU
  default, which differs between runtimes (some browsers give IDR two); symbols
  and spacing still differ, so it runs on the server only and a Client
  Component shows the string it made (CONVENTIONS.md §6).
- **"From" prices** on tiles are the cheapest *valid* variant for this market and
  destination, never a variant that cannot ship there.

### The pricing pipeline

```
unit price   (market list: explicit | product-type table × multiplier | derived —
              or an already-agreed price: an issued invoice's, quote's or proforma's line,
              or an accepted offer's where a brand takes offers)
→ customer price list          an approved retail partner's trade tier only (D32); no wholesale list
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

**The shop sells from stock at launch (S7, 2026-10-01: "everything in stock").**
Its config lists `stocked` and `service` only: every product it offers is counted at
a location, no variant is made to order, and no page promises a lead time — the
configurator offers the variants on the shelf (EXPERIENCE-SHOP.md §5). The
`made-to-order` and `pod` models, and the router's rungs for them (§8), stay in the
engine for when the owner offers them.

**Stock locations** are data: the gallery's Singapore storage and Jakarta gallery,
which route an original's seller (§2), and the shop's. **The shop's stock is one pool
at launch** (D52, 2026-10-01, the developer's input to TASKS.md 6.4): every
merchandise unit counts as one quantity per variant, in **one** shop location — the
Denpasar showroom, where online orders are packed and collected (pickup, S4) and
walk-ins buy (a showroom sale against the same pool, TASKS.md 24.4.c). `stock_levels`
stays keyed by variant × location, so the next phase adds locations without a
migration while launch reads one row per variant; there are no transfers between
locations, and no "In the showroom now" badge or filter — with one pool, every unit in
stock is in the showroom, so "in stock" says it. The merchandise also sells through
hundreds of partner shops across Bali, which report sales and restocking over WhatsApp
as today, staff correcting the pool in the admin; who owns the stock on a shop's
shelf — wholesale, consignment, a branch — is the point-of-sale phase's (TASKS.md
backlog v2.19), not launch's.

**Reservation kinds**

| Kind | Taken when | TTL (named in C1) | Public status |
| ---- | ---------- | ----------------- | ------------- |
| `checkout-lock` | the buyer presses "Continue to payment" (the shop's bag), or starts paying a staff-sent link (the gallery's invoice, §7) | `checkoutLockMinutes` (15), then **extended** to the chosen method's `sessionTtl` + margin; a link's lock lasts at least as long as the hold it supersedes | "On hold" (unique only) |
| `invoice` | staff issue an invoice — the gallery's one way to sell an original (D50, §7) — or a proforma | to the invoice's **due date**, which staff set (D45) and may change per invoice; `invoiceHoldDays` (3, the owner's answer) is the term the order builder proposes | "On hold until {due date}" |
| `hold` | staff grant a buyer's reserve request — **no brand at launch** (D50: the gallery has no reserve button; the shop takes no holds) | `holdDefaultHours` (48), at most `holdMaxHours` (72) | "On hold until {date}" |
| `offer` | an offer is accepted — **no brand at launch** (D22 answered: neither site takes offers) | `offerHoldHours` (48); a counter-offer stays open `offerCounterHours` (72) | "On hold" |

All four stay in `reserve()` (C8): a brand turns on the flows behind `hold` and
`offer` with `purchase.holds` and `purchase.offers`. An invoice hold starts **only
when staff issue the invoice** — staff-approved by construction (D45) — and ends at
its due date by itself, read as available the moment the date passes, before any
sweep; staff re-date it before then with `extend()` or cancel it with `release()`.

`reserve(target, qty, kind, owner, ttl)` is the **only** writer, with
`reserveAll` (several targets, all or nothing), `extend`, `release`, `convert`
(sold), `reverse` (an order cancelled after payment, or an accepted return —
never a refund alone) and the sweep's `expireDue` (C8). It writes the scalar
`targetKey` the unique index guards (ARCHITECTURE.md §6); it first expires any
lapsed `active` rows for the same target **in the same transaction**, judged by
the database clock (`statement_timestamp()`); and it returns a reservation or a
typed conflict — never a database error at a buyer. A buyer is never blocked by
their own reservation: the same owner gets it back, and an invoice hold paid
through its link (or a hold or an offer hold, where a brand takes them) is
superseded by the checkout lock in the same call. A
returned stocked item is a stock adjustment, not a reversed reservation.
Cash-at-retail methods are never offered for a unique item, because they cannot
complete inside any reasonable hold.

**One transaction, one lock order.** Every domain write runs in one READ
COMMITTED transaction — never REPEATABLE READ or SERIALIZABLE, where a second
buyer's `reserve()` aborts instead of waiting — and takes rows in one order: the
dedupe row, the request being answered, the order, its payment attempts, their
refunds, reservations by target key, stock levels by variant and location, then
counters (discount usage, gift-card balances, the document sequence last). A bag
reserves all its lines in one call, whatever order they sit in, so two bags
holding the same items cannot deadlock; sweeps skip rows a buyer holds. No
transaction calls a payment provider while it holds a reservation it has written:
before a capture, the buyer's hold is secured — extended or re-taken to outlast
the call — and committed on its own, so another buyer of the same item is never
kept waiting on a slow gateway. The rules, the timeouts and what "never aborts"
cannot promise (a timeout, a lost connection) are C8
(`domain/contracts/transactions.ts`); the indexes, checks and triggers they stand
on are listed for SCH in `domain/contracts/storage.ts`.

The checkout lock shows the buyer a countdown — *"We're holding this for you for
14:52"* — because it is true. Marketing urgency is not allowed (DESIGN-SYSTEM.md §10).

## 5. Cart and checkout

**The bag and checkout are module `purchase.checkout`** (C1, C10, C13 v1.5): on at
the shop, **off at the gallery**, which sells by conversation and invoice (D50,
§7) — so the gallery has no bag, no checkout and no basket in its header, and a
crafted post to the cart answers 404. Everything below is the shop's at launch,
and any brand's that turns the module on in an app that renders it — the gallery
app does not at launch: its `supports.ts` refuses the module (TASKS.md phase 34).

**Cart.** Guest carts identified by a hashed token cookie; merged into the
account on sign-in where a brand's buyers sign in and buy online (at launch none: the
shop's shoppers are guests and its partners order by quote, D31–D32, and the gallery
has no cart and no buyer accounts, D50, D54); 30-day expiry for guests. Lines hold product, variant,
quantity and configuration (for configured prints, the option set). **A cart
never reserves** — only checkout does. A unique item in someone else's checkout
shows "On hold — check back in 15 minutes" and offers the want-list. A unique
item whose price is on request never enters a bag: it has no list price to
charge.

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
| `pending_payment` | a payment lands after its lock lapsed and the item sold elsewhere | `abandoned`, and the payment is refunded or voided |
| `abandoned` | a **late** payment arrives | `paid` if the item can be re-reserved, else stays `abandoned` and the payment is refunded or voided |
| `cancelled` | a late payment arrives | stays `cancelled`; the payment is refunded or voided |
| `paid`, `fulfilling`, `completed` | a **second** payment settles (another attempt already paid the order) | unchanged; the second payment is refunded or voided whole |
| `paid` | first shipment dispatched / pickup ready | `fulfilling` |
| `fulfilling` | all lines delivered or collected | `completed` |
| `paid`, `fulfilling` | staff cancel | `cancelled` → refund; the item is back on sale |
| `completed` | an accepted return | `completed` (lines marked returned; stock or item restored) |

A refund or a lost dispute at the provider moves no order: the order stands, its
item stays sold, and staff are alerted to cancel it or accept a return. Money no
transition keeps always goes back under a deterministic refund key (PAYMENTS.md
§5), so it is never kept in silence and never refunded twice.

**A buyer never reads the machine's own state — only `BuyerOrderStatus`**
(`awaiting-payment` · `not-paid` · `paid` · `shipped` · `ready-for-pickup` ·
`completed` · `cancelled` · `refunded`), the one status every buyer-facing
answer shows: a lookup, a checkout's or a pay link's order, the payment poll,
an order email's page, and — where a brand has accounts — the account's order
detail. One pure function derives it from the order's own
status, the attempt that paid it (or the latest, before one has) and its
shipments (C6 `orders.ts`), total over all three, so a dispute — won or lost —
and a refused duplicate payment never reach a buyer: they change what staff
see, never what the order reads as. First, whatever the stage: `cancelled` for
a cancelled order, `refunded` when the attempt that paid it is refunded in full
(a refused late payment reads so too); then by the order's status:

| Order | Buyer reads |
| ----- | ----------- |
| `pending_payment` | `awaiting-payment` — a failed or expired attempt is the page's retry state |
| `abandoned` | `not-paid` |
| `paid` | `paid` |
| `fulfilling` | `shipped` if a shipment has left (an exception or a return to sender included), else `ready-for-pickup` if a pickup is ready, else `paid` |
| `completed` | `completed` |

An order with nothing to ship — a digital gift card — reads `paid` until its
last card is sent, when the machine completes it.

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

**Offer** (engine capability — no brand takes offers at launch: D22, D50) —
`submitted → countered ⇄ submitted → accepted | declined | expired |
withdrawn`; `accepted` creates an `offer` reservation, stores the agreed figure —
the proposal or the counter, converted once into the charge currency with its FX
snapshot — and a payment link that charges exactly that. An open offer closes as
`declined` when its item sells or is withdrawn, and the buyer is told the item is
no longer available rather than that the offer was turned down.

Nothing else may change a status field, and every change is written as a
compare-and-set (`WHERE id = $1 AND status = $from`, exactly one row). Every
transition emits a **domain event** (`order.paid`, `offer.accepted`,
`hold.expiring`…) written to an **outbox** (`domain_events`) **in the same
transaction** as the change, and dispatched at least once afterwards to
notifications, analytics, sister sync and cache invalidation — so a crash after
commit loses nothing and a rolled-back transaction sends nothing.

## 7. Buying a one-of-one object

**The gallery at launch sells by conversation and invoice** (D50, 2026-10-01; it
supersedes D30). The owner negotiates every original by phone or WhatsApp, with the
gallery in Singapore (G3), and the site shows no price (G4). Online buying stays
engine capability — the shop's checkout, and any brand that turns it on (below) —
and the gallery's difference is configuration alone:

- **No price, anywhere** — `commerce.uniquePrices: "on-request"` (C1 v1.5). No unique
  item's price reaches a page, a card, a facet or a sort, a want-list budget, the
  factsheet (G14), a social image, structured data, a feed, the sister shop's
  snapshot (C12 `OriginalListing.pricing: 'on-request'`) or an analytics event (the
  band is `on-request`). Every original reads **"Price on request"**. The asking price
  staff record stays private — the start of a negotiation and the insured value. A
  **price request is a lead a person answers, never revealed in place**, within the
  reply promise the panel states (G9: the same working day, Singapore time; C2
  `reply`).
- **The conversation leads** — one purchase tier, every original alike:

  | Tier | Primary | Secondary |
  | ---- | ------- | --------- |
  | every original (`upTo: null`) | WhatsApp, prefilled with the stock number and title | Call (the gallery's Singapore number, C1 `call`) · Request price · Enquire · Book a viewing (Singapore or Jakarta, G2) · Proforma for institutions (C10 `quote`) |

- **No cart, no checkout, no reserve button, no online offer** — `purchase.checkout`
  is off, so the gallery has no bag and no checkout (§5); `purchase.offers` and
  `purchase.holds` are off (D22 answered: neither site takes offers). No tier offers
  Buy, Reserve or Make an offer, and C1 refuses Buy beside on-request prices.

**The invoice — the gallery's one way to pay for an original.** Once a price is
agreed in the chat or on the phone, staff build an **invoice** in the admin's order
builder — **on a phone**, since the sale started in a WhatsApp chat (TASKS.md 24.5). It
carries the piece at the agreed figure — C5 `AgreedPrice` (source `quote`), entered by
a role that may set prices and audited — the insured shipping as quoted (§8), the duties
where the seller ships DDP (under DAP it states the estimate and that they are paid on
arrival), the buyer and, for an institution, its PO number, and a **due date** staff set
(D45; the order builder proposes three days, `invoiceHoldDays`, and staff may change it per
invoice — the owner's answer, 2026-10-01). Issuing it is one transaction that:

1. **routes it like a checkout** — `routeSeller()` over its lines and the buyer's
   destination (§2): a piece with no recorded location or export status, or a
   `domestic-only` one for an address abroad, refuses the invoice with its reason
   (COMPLIANCE.md §1) — staff complete the record first, or the buyer views the piece
   where it is;
2. takes an `invoice` hold on every unique line through **`reserve()`** —
   `reserveAll()` for several pieces — until the due date: the one writer of
   reservations, as everywhere (§4). A piece already held or sold is a typed conflict
   the builder shows, and nothing is issued;
3. **places its order** (`pending_payment`, the order machine's `reach-payment` by
   staff), snapshotting every figure (§1), so its email's link and the order lookup
   find it from the start;
4. numbers the invoice from the seller's gapless proforma series and renders its PDF,
   the transfer details on the PDF only (§12);
5. creates its **payment link** (C6 `payLink`, reason `invoice`), open until the due
   date;
6. writes `order.created`, `proforma.issued` and `invoiceHold.taken` to the outbox (§13).

Staff then **share the link into the buyer's WhatsApp chat** from the same phone — a
`wa.me` share, no WhatsApp API needed (D14 is untouched) — or it goes by email.

**The invoice is our own page (D51).** The buyer opens it at the gallery's **`/pay/{token}`**,
in the gallery's design — never a page the gateway hosts (no Stripe Invoicing or
Payment Links): the `Pay` surface **is** the invoice, the bridge from the chat. It shows
the invoice's number, the piece with its stock number, the agreed figure, shipping and
insurance, the duties or their note, the total in the charge currency, the due date,
the seller of record, the buyer (and PO number) and the PDF, and two ways to pay: **the
Stripe Payment Element embedded** in the page (card, Apple/Google Pay, PayNow,
iDEAL/SEPA where enabled — Midtrans for an Indonesian seller's IDR invoice) and **bank
transfer** (its instructions; the SWIFT details on the PDF), confirmed by staff. Its
designed states: **open** — "On hold until {due date}"; **bank transfer pending** — the
instructions, and "payment must be received and confirmed"; **paid**; and **expired**
(its due date passed and the piece released) or **voided** (staff cancelled it), each
with the ways to reach the gallery, never a bare gateway error (PAYMENTS.md §5). An
institution's proforma is the same page: the PDF is what its finance office pays from.
An invoice issued on a price already agreed is **accepted** from the start: nothing is
left to accept. The gallery has no accounts (D54): the buyer comes back to the
invoice by its link, in the chat or the email, and to its order by the order lookup
(its number and the buyer's email), awaiting payment, the order page leading to the
same link.

**The hold until the due date (D45).** From issue every visitor reads **"On hold
until {due date}"** — the buyer too, who pays through the invoice's link: with no
sign-in there is no "held for you" (D54). **The buyer is reminded before the due date** —
`invoiceHold.expiring`, `invoiceNoticeHours` ahead (C1: 24 hours, the owner's answer), by email
(by WhatsApp once D14 is answered) — and staff see invoices nearing their date on the
desk. Paying moves the hold the usual way: `payLink.start` supersedes the invoice hold
with the order's checkout lock, lasting at least as long, and `applyPaymentEvent()`
converts it in the one transaction that marks the payment and the order paid (§6,
PAYMENTS.md §1). **Unpaid at its due date, the hold lapses by itself**: the piece reads
available the moment the date passes (`reserve()`'s lazy expiry, then the sweep), the
order is abandoned, the link stops taking payment, the invoice reads expired, and the
buyer and staff are told. **A visitor who asked on the held page to hear if it becomes
available** — a want list `like` that piece (C6, D39) — gets its alert the moment the
piece is available again, as anyone does when another example arrives. Staff may
re-date an invoice before its date (`extend()`) or void it (`release()`). A payment
that lands after the lapse takes the late-payment path (PAYMENTS.md §1): re-reserved
and sold if the piece is still free, refunded otherwise.

**It ships only when paid in full (G11).** The order is `paid` only when its payment
covers the invoice's total — there are no part payments; a short transfer leaves it
pending and staff write to the buyer — and nothing ships before `paid` (COMPLIANCE.md
§9). Shipping, insurance and duties are the buyer's: quoted on the invoice or, for
duties under DAP, estimated on it and paid on arrival.

**What the gallery does not use — engine capability that stays** for the shop or a
future brand: the bag and checkout, and with them a bag's `checkout-lock` (a pay link
still takes one); offers (`offer` holds, the offer machine, `offer.*`); staff holds on
a reserve request (`hold`, `hold.request`); the instant price reveal; and the
checkout's "Proforma instead" (`quote.proforma`). "Only `reserve()` writes a
reservation" holds unchanged: the invoice hold is `reserve()`'s `invoice` kind.

**Sold** items stay published: "Sold" and no price — no buyer is named (G10), and no
"price realised" where unique prices are on request — available alternatives, and
"Tell me when another example arrives". Every such link, and every saved-search alert
from browse or search, leads to the one **want-list page** (C10 `wantList`), which
saves it to the email address the visitor gives, confirmed by double opt-in before
the first alert goes out (C6 `wantList.*`, D39) — at the gallery always, since no
one signs in there (D54); a brand with buyer accounts saves a signed-in buyer's at
once.

### For a brand that lists its prices (engine capability, not at launch)

A brand with `commerce.uniquePrices: "shown"` — the default — and `purchase.checkout`
on shows the modes the item's price tier and status allow. Tiers are brand config
(`purchaseTiers`, in the seller's base currency); the research's ladder (RESEARCH.md
§2) was the gallery's before D50:

| Tier (base price) | Primary | Secondary |
| ----------------- | ------- | --------- |
| up to ~USD 5,000 | Buy now | Enquire · WhatsApp |
| ~USD 5,000–25,000 | Buy now | Reserve for 48 h · Make an offer · Enquire |
| above ~USD 25,000, institutions, or price on request | Request price / Enquire | Book a viewing · Proforma invoice |

- **Request price** answers in place: after an email or WhatsApp field, the price
  is revealed on the page and the lead is logged; an item marked sensitive queues
  for a human with the stated reply promise instead.
- **Make an offer** (`purchase.offers`): amount, currency, message. A private floor
  (percent of price) auto-declines politely below it; staff accept, counter (valid
  72 h) or decline. Acceptance creates the `offer` hold and a payment link. A later
  version makes offers *binding* by collecting a payment method with the offer where
  the seller's gateway supports it (Stripe), as Artsy does (backlog v2.1).
- **Reserve** (`purchase.holds`) requests a staff hold on its own short form (C10
  `hold`, posting `hold.request`); a deposit option is v2.
- **Proforma invoice** for institutions — **a whole cart** at its checkout's
  payment step ("Proforma instead", C6 `quote.proforma`, from the checkout's own
  contact and institution), or one item, even one on request, through the quote
  form (C10 `quote`) that staff issue as a proforma: PO number, bank transfer,
  `invoice` holds on every unique line until the due date, a PDF, and a "pay this
  proforma" page (the `Quote` surface); "payment must be received and confirmed
  before an order is considered complete". The checkout's id is bound to the
  cart cookie or the session, as every checkout operation's is (C13 `quotes`).
  **Answered by D45 (2026-10-01; senior-be F13):** an `invoice` hold starts only
  when staff issue the proforma — staff-approved by construction — so a checkout's
  proforma of a unique line is a request staff issue, holding nothing until they do,
  and no anonymous visitor can keep a one-of-one off the market with proformas; a
  proforma of counted stock alone stays instant.

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

**An original's shipping is on its invoice (G11, D50).** Staff quote the insured
shipping — a carrier's rate, or the fine-art quote above the threshold — onto the
invoice's own line, and it is paid with the piece: nothing ships until the invoice
is paid in full. The shop's rates at launch are Indonesian alone — Biteship, the
flat table, same-day where the courier offers it, and pickup at the showroom (S3,
S11); DHL Express carries the gallery's originals abroad.

**Delivery promises read a holiday calendar** (a CMS global): Nyepi closes Bali
— showroom, couriers and the airport — for a day, and Lebaran stops couriers
nationwide for longer. A promise that ignores them is a promise broken.

**Duties** are estimated per destination and shown before payment (DAP default;
DDP per seller when enabled). International shipments get a generated commercial
invoice with HS codes (COMPLIANCE.md §4).

**Fulfilment routing** (OEI), per line. At launch every line ships from own stock:
the shop delivers within Indonesia only (S3) and sells only what it holds (S7), so
the local-production rung below is unused and print-on-demand abroad is off (D23).
Each rung stays in the router, switched on by configuration — an inventory model,
a fulfilment provider, `fulfilment.pod` — with no change to the router:

```
stocked at a location that serves the destination?  → own stock (at launch the one pool, §4)
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
engine (the tax export is TASKS.md 20.5). Tax rules are data with an effective
date, because they change.

## 10. Discounts, gift cards, bundles, gift wrap

- **Discount codes**: percent, fixed or free shipping; scope (products,
  collections, product types, first order); minimum spend; start/end; usage
  limits enforced atomically; never combinable unless marked. Indonesian
  shoppers expect a visible voucher field and a free-shipping progress bar.
- **Automatic rules** are discounts without a code — **the free-shipping
  threshold is one** (per market, minimum spend), edited by a manager with an
  audit trail, not a free-text global an editor can change.
- **The shop at launch (S13, 2026-10-01):** free shipping over **Rp 500.000** (an
  automatic rule, the bag's progress bar reading it) and a **welcome code** — a
  first-order discount code given on newsletter sign-up, never before a first
  engagement; its value is the owner's to give (OA2's owed items). Both are set in
  the admin at launch, so neither is a promise in code.
- **Gift cards**: digital, hashed code, currency-bound, balance ledger, expiry per
  local law **(confirm)**; applied after tax as a payment-like deduction. **Not at
  launch** (S10: a gift note only, with prices hidden on the slip) — the engine keeps
  them behind `commerce.giftCards`.
- **Bundles and sets**: postcard sets, print + frame, gallery-wall sets (10–15%
  off), "3 for 2" stationery — line-level rules.
- **Gift wrap** is a product (kind `service`) added as a line, so its price lives
  with every other price — none is offered at launch (S10); gift notes are free;
  "hide prices" suppresses prices on the packing slip.

## 11. Returns and refunds

Policy text per seller comes from counsel (D11; COMPLIANCE.md §6 records what UU
8/1999 art. 18 allows). The gallery's commitments: a **lifetime authenticity
guarantee** (the owner's, G6) and the Parry certificate with every original (G7),
both published in counsel's words. **An original is a final sale** (the owner's
answer, 2026-10-01): no change-of-mind return, so no returns window is offered on any
page — the research's 14 days is dropped — and counsel confirms this is allowed. The
guarantee is the one promise after the sale, its remedy as counsel words it. The
shop's answer (S12) is **"no refund": no refunds and no change-of-mind returns, and a
print that arrives damaged replaced** on a photo. That answer is **in tension with
Indonesian consumer law** as COMPLIANCE.md §6 records it (UU 8/1999 art. 18 on
standard clauses refusing returns or refunds) — this doc does not decide it: counsel
does (D11), and the shop publishes only the damaged-print replacement until then. A
damaged print's replacement is staff's zero-priced order from the order builder
(TASKS.md 24.5), the claim's return closed with no refund. The engine
supports — as a domain of its own (TASKS.md 20.4), not only admin screens — a
buyer's return request per order line with reason and photos (from the order
lookup or the order email's page — an account's too, where a brand has one), staff
approval, return shipping instructions, inspection,
restock (location) or write-off, the reservation's `converted → reversed` for a
returned original — at the gallery only through the guarantee, never a change of
mind — and the refund (PAYMENTS.md §5). An original that does come back routes to
the seller's stock location — **never re-import an antique into Indonesia to accept
a return** without advice (it reopens the export question).

## 12. Documents

Generated from the order snapshot, per seller, in the buyer's language (EN/ID):
order confirmation, proforma invoice — at the gallery, **the staff-issued invoice
every original is sold on** (§7: the piece, the agreed figure, shipping, duties,
the due date, the transfer details) — receipt / tax invoice data, **certificate of
authenticity** (IG: item photo, collation, stock number, curator's signature
block, verification QR in v2), commercial invoice for export, packing slip,
return authorisation. PDFs are built by a Payload job and attached to the order.
The item factsheet designers hand their clients shows the piece, "Price on
request", the gallery's contact and the date it was printed — never a price (G14).
Order, proforma and invoice numbers come from **gapless sequences per seller**,
with prefixes from the seller's config — tax invoices must not skip numbers, and
no brand name is baked into the engine.

## 13. What the engine emits

Every state change is a domain event with a stable name (ANALYTICS.md), written
to the outbox in the same transaction (§6) and dispatched at least once. Consumers:
email and WhatsApp templates (NTF), analytics, sister sync (a sold original
updates the merch shop's "own the original" link), and cache revalidation
(availability is never stale in a cached page — ARCHITECTURE.md §9).

**What the business counts is counted from these records, never from the
beacon.** A lead — a price request, an enquiry, a proforma request, a consignment,
an appointment (and an offer or a hold request, where a brand takes them) — is
stored the moment it is received, and the Leads dashboard's response times and
conversion count that record, which a blocked script or a failed beacon post
cannot move (ANALYTICS.md §2–§3). At the gallery a sale is counted from the
invoice: `proforma.issued` when staff issue it, `invoiceHold.expired` when it
lapses unpaid, `order.paid` when it is paid. A
want list emits `wantList.requested` when it is asked for, `wantList.started`
once it is confirmed (or saved to an account, where a brand has them) — what the demand dashboard counts
as a kept want-list — `wantList.repeated` when an address already watching a
subject is asked again, and `wantList.stopped` when it is erased; none of the
four names the address or the query, which stay on the list itself for a
consumer to load until it is gone.
