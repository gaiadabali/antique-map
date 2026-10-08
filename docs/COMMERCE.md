# Commerce

**Purpose:** how the shop takes an order and gets it to the buyer — cart, checkout, delivery fee, stock per store,
Midtrans, statuses, tracking and notifications — and why the gallery has no transaction at all. Field
definitions are in [CONTENT-MODEL.md](CONTENT-MODEL.md); the threat model is [SECURITY.md](SECURITY.md).

## 1. Rules

1. **Priced on the server, every time** (DR-5). A request carries ids and quantities only. Totals are recomputed
   when the cart renders, at every checkout step and again when the order is created. A price in a request is
   never read as a price.
2. **Stock is taken when the order is created**, by one atomic SQL decrement per line (§4), and given back exactly
   once if the order expires or is cancelled before a driver collects it. A cart never holds stock.
3. **The payment webhook is verified, idempotent and applied in one transaction** (§6).
4. **Snapshots, not references.** An order line keeps the name, variant label, SKU, unit price and image it was
   sold with; editing or unpublishing a product later changes no order.
5. **Honest states.** "In stock", "Pay within 58 minutes", "On the way" are shown only when the data says so.

## 2. Money

- Integer rupiah, the minor unit being one rupiah (`95000` is Rp 95.000). No floats, no other currency (S3).
- **Rounding happens once**: a percentage discount is computed on the items subtotal, rounded half-up to the whole
  rupiah, and stored. Nothing else produces a fraction.
- **Totals:** `subtotal = Σ unitPrice × qty` · `discount` · `deliveryFee` · `total = subtotal − discount +
  deliveryFee`. Every figure is stored on the order.
- Midtrans receives the lines, the discount as one negative item and the delivery fee as one item, summing exactly
  to `gross_amount` (Midtrans refuses a mismatch). Item names are cut to its 50-character limit.

## 3. Cart and checkout

**Cart.** A guest cart in a first-party cookie, `cart`, holding only `{ productId, variantSku, qty }` per line
(at most 20 lines and 10 of one line — defaults). No account, no wishlist, no cart table, no localStorage: the
server reads the cookie and renders the cart priced and checked against stock, so it works without JavaScript. A
line nobody holds reads "Out of stock" and is left out of checkout.

**Checkout** is one short page in three steps, phone first. Every order is delivered: there is no online pickup at
launch (DR-6).

| Step | Asks | Validated on the server |
| --- | --- | --- |
| 1. Contact | full name (one field), WhatsApp number, email, language | WhatsApp normalised to E.164 (a foreign number is accepted: buyers are often visitors); email shape; all required |
| 2. Delivery | **a map pin** (lat/lng), the address as text, notes for the driver (landmark, villa name), an optional gift note (S10) | the pin is inside Indonesia and inside the last delivery band of a store that holds every line (§4); text ≤ 500 characters |
| 3. Review and pay | the lines, the sending area, the delivery fee, the discount code field, the total | the code (§5); the total recomputed and compared with the one shown |

The delivery step shows the fee from the same assignment the order will use (§4), without taking stock. The pay
button posts the cart, the contact, the pin and the total the buyer saw (`expectedTotal`, for comparison only). In
one transaction the server re-prices, assigns a store, takes the stock, writes the order (`pending_payment`) and
its first history entry, then opens Midtrans Snap (§6). If the recomputed total differs from `expectedTotal`,
nothing is created and the page shows the new figures. The map is Google Maps (EXPERIENCE-SHOP.md §6); without
JavaScript a pasted Google Maps link gives the pin. With `site-settings.shop.checkoutEnabled` off, the cart still
works and checkout offers WhatsApp.

## 4. Stores, assignment and stock

Stock is a quantity per product (or variant) per store (DR-6) in `stock-levels`. **`quantity` is what the store can
still sell**: its physical count less the units held by its orders in `pending_payment`, `paid`, `processing` or
`waiting_driver`, which stay on its shelf until a driver collects them (DATA.md §3).

**Assignment** — `assignStore(lines, pin)`, pure and unit-tested:

1. Candidates: `active` stores whose quantity covers **every** line.
2. Distance: haversine from the store's `lat`/`lng` to the pin, in km, rounded up to 0.1 km.
3. Drop candidates beyond the delivery reach: the last band's `upToKm` (§5).
4. Pick the nearest. Ties (equal to 0.1 km): the store holding more of the order's units, then the lower `code`.
   The result is deterministic.
5. **No single store holds every line** → no order: there are no split orders (DR-6). The checkout names the lines
   that cannot ship together and offers to remove one or to ask on WhatsApp with the cart attached.
6. No candidate within the reach → "We deliver within reach of our stores in Bali for now", with WhatsApp.

**The atomic decrement.** Inside the order's transaction, per line, in a fixed order (product id, then variant
SKU, so two orders never deadlock):

```sql
UPDATE stock_levels SET quantity = quantity - $qty
 WHERE store_id = $store AND product_id = $product AND variant_sku IS NOT DISTINCT FROM $variant
   AND quantity >= $qty                                     -- exactly one row, or the order fails
```

If any line updates no row (another buyer took the last unit), the transaction rolls back, assignment runs once
more on fresh counts, and if that fails too the buyer is told which item ran out; the cart is left as it was.

**Release** gives the units back to the store the order took them from, in the same transaction as the status
change that justifies it, guarded by a compare-and-set (`… WHERE id = $1 AND status = $from`, one row), so it
happens once:

| When | Status after |
| --- | --- |
| **the payment window** (`expiresAt`, `orderExpiryMinutes` after creation, one for every method) passes unpaid — the sweep (§6) | `expired` |
| Midtrans reports the last attempt `expire` or `cancel` and no time is left | `expired` |
| owner or editor cancels, before or after payment, until a driver collects the order (`on_the_way`) | `cancelled` |

A denied or failed card attempt does **not** release: the buyer can try another method until `expiresAt`. Nor does
a cancellation once `on_the_way`: the units have left the shelf, and any that come back return with the next count.

**Staff reassignment** (owner or editor, never store; `paid` or `processing`): one transaction decrements the new
store (fails if short), returns the units to the old one, sets `store` and `distanceKm`, and writes a history
entry. The delivery fee the buyer paid never changes.

**A count is the physical count.** Staff on the stock screen (a store user for their own store, an editor or the
owner for any) and the stock import enter what is on the shelf, units packed for an order but not yet collected
included. In one transaction the server locks the store's stock rows (`FOR UPDATE`) and stores
`quantity = count − held`, so a recount never re-sells a held unit; a count below `held` stores 0 and flags those
orders for reassignment (DATA.md §3).

## 5. Delivery fee and discounts

- **Delivery fee** = the fee of the first band in `site-settings.shop.delivery.bands` whose `upToKm` ≥ the
  assigned store's distance. It is **free** when `subtotal − discount` ≥ `freeOverIdr` (Rp 500.000, S13). Distance
  is a straight line, not a road route. **The bands are a table the owner keeps in the admin** (Q3): distance bands
  from the assigned store, each with a rupiah fee he updates from the local courier price when it changes, and the
  free-over threshold (CONTENT-OPERATIONS.md §6.3). The fee is quoted from the table at order creation and stored
  on the order (`totals.deliveryFee`); a later edit changes no existing order.
- **Discount codes** (`discounts`): one code per order, case-insensitive. Valid when `active`, inside
  `startsAt`–`endsAt`, `subtotal` ≥ `minSpend`, `usedCount` < `usageLimit`, and — for `oncePerBuyer` — no paid
  order with that code exists for the same normalised WhatsApp number or email. `percent` is §2's one rounding;
  `fixed` is capped at the subtotal. The discount applies to items, never to the delivery fee.
- `usedCount` is incremented atomically in the order's transaction (`… WHERE used_count < usage_limit`); a lost
  race refuses the code, and an expired or cancelled order gives its use back.
- The **welcome code** is the discount `site-settings.shop.welcomeDiscount` names (S13).

## 6. Midtrans

**Snap** (QRIS, virtual accounts, cards with 3-D Secure), as a pop-up on our page, falling back to its redirect
URL. Each Snap transaction is an **attempt** with Midtrans `order_id` = `{order number}-{attempt}`, because Midtrans
refuses a reused `order_id`. Every attempt's expiry is set to end at the order's `expiresAt`, so Midtrans stops
taking money when we stop holding stock. The return from Snap lands on the tracking page, which never trusts the
redirect's query string: status comes only from the webhook or the status API.

**Webhook** — `POST /api/x/webhooks/midtrans`, rate-limited:

```
verify   signature_key = SHA-512(order_id + status_code + gross_amount + server key), on the raw body,
         compared in constant time → mismatch: 401, logged, alerted; nothing written
confirm  GET /v2/{order_id}/status — trust Midtrans's API, not the notification body
apply    ONE transaction (READ COMMITTED):
  1. INSERT payment-events (dedupeKey = hash of order_id | transaction_id | transaction_status
     | fraud_status | status_code) ON CONFLICT DO NOTHING → no row: duplicate → commit no-op → 200
  2. lock the order (FOR UPDATE); no such order → record outcome `unknown-order` → 200
  3. gross_amount ≠ order total → outcome `amount-mismatch`, flag the order, do not mark paid
  4. map the status:  settlement, capture+accept → paid (history: Midtrans)
                      pending, deny, failure      → recorded; the order stays pending_payment
                      capture+challenge           → recorded; flagged for the owner (Midtrans dashboard)
                      expire, cancel              → expired + release, if no time is left (§4)
                      refund, partial_refund      → recorded; history note; no status change
  5. queue the notification jobs (§11) in the same transaction
  lock lost (steps 1–2 wait at most 2 s, under a savepoint) → write nothing, look the dedupe key up:
           recorded → 200 (the winner applied it); not yet → 503 + Retry-After: 5 → Midtrans retries
  any other error → ROLLBACK (the dedupe row with it) → 500 → Midtrans retries
```

Lock contention is never a 500 (10.5): a lock lost later in the transaction (the expiry's stock rows) rolls
everything back and is answered the same way. Checkout is the same: a stock row whose lock is not free within
2 s is `out_of_stock` when the units are gone, else `busy` ("busy, try again"), never a thrown database error.

`pending` and the later `settlement` of one attempt have different dedupe keys, so both apply. The status machine
only moves forward: a late `pending` after `paid` changes nothing.

**Reconcile and sweep** (Payload jobs). Every 10 minutes the reconciler asks the status API about every
`pending_payment` order with an open attempt and applies the answer through the same function (`source:
reconcile`). Every minute the sweep takes orders past `expiresAt` plus a 5-minute grace, asks the status API once
more, and only then expires them and releases their stock. A webhook that never arrived cannot leave an order
pending or sell stock twice.

**Environments.** Secrets `MIDTRANS_SERVER_KEY` and `MIDTRANS_CLIENT_KEY`, host-only (D49). Off production they
are **sandbox** keys (`SB-Mid-server-…`, `SB-Mid-client-…`) — staging runs the simulator until the owner's sandbox
account exists; production runs live keys, with the owner's go-ahead. Outside simulate mode the boot check refuses
a missing key, a sandbox key in production and a live key anywhere else. The client key reaches the browser only
on the pay step, as a server-rendered prop — never a `NEXT_PUBLIC_*` variable, since one artifact serves staging
and production.

**Simulate mode** (`MIDTRANS_MODE=simulate`: workstations, CI and staging; the boot check refuses it in
production): no Midtrans at all. "Pay" opens a page of our own with *Settle*, *Pending*, *Deny* and *Expire*, each
posting a notification signed with a fixed local key to the **same** webhook route, so the real path is exercised
end to end.

## 7. Order statuses

```
 create (stock taken)
        │
        ▼
 pending_payment ──── window passes / Midtrans expire ────────────────────────────►  expired
        │      └───── owner or editor cancels ────────────────────────────────────►  cancelled
        │ Midtrans settlement                                                             ▲
        ▼                                                                                 │
      paid ──► processing ──► waiting_driver ──► on_the_way ──► delivered                 │
        └───────────┴──────────────┴──────────────────┴── owner or editor cancels ───────┘
                                                (stock released unless on_the_way; money returned, §12)
```

| Who | May move |
| --- | --- |
| Midtrans and the sweep | `pending_payment` → `paid` or `expired` |
| `store` (own store's orders only) | one step **forward** at a time, from `paid` to `delivered`; or hand the order back with a reason (`needsAttention`) for reassignment |
| `owner`, `editor` | any forward step, one step back to correct a mistake, reassign (§4), cancel, and create a replacement (§12) |
| the buyer | nothing |

Guards: `on_the_way` needs the driver image (§9); nothing moves out of `delivered`, `cancelled` or `expired` except
an owner's or editor's one step back from `delivered`. Every change is a compare-and-set on the current status.

## 8. The order record

`number` (a database sequence) · `site` · `channel` (`web` · `replacement`, with `replacementOf`) · `lines[] {
product, variantSku, sku, name, variantLabel, unitPrice, qty, lineTotal, image }` · `contact { name, whatsapp,
email, locale }` · `delivery { address, notes, lat, lng }` · `giftNote` · `store` + snapshot `{ code, name, area
}` · `distanceKm` · `totals { subtotal, discount, deliveryFee, total }` · `discount { code, kind, value }` ·
`status` · `history[] { from, to, at, by (a user, or `midtrans` / `system`), note }` · `payment { attempts[] {
midtransOrderId, snapToken, createdAt, state }, method, transactionId, paidAt }` · `driverImage { key,
contentType, width, height, uploadedAt, uploadedBy }` · `trackingTokenHash` · `expiresAt` · `needsAttention {
flag, reason }`. The Snap token and the token hash are never in a public response.

## 9. The driver's details

When the driver accepts the job, store staff (or the owner or an editor) upload from a phone a screenshot or photo
of the driver's details (name, plate, photo, from Gojek or Grab): `POST /api/x/orders/{id}/driver-image`, staff
session.
The server accepts JPEG, PNG or WebP up to 10 MB, checks the type by its bytes (not the name or header), decodes
and re-encodes it (at most 1600 px, metadata stripped), and stores it in the **private** bucket under
`orders/{id}/`. A new upload replaces the shown image; the history records each. It is read only by the owner, an
editor and the order's store in the admin, and by the buyer through the tracking page — always by a short-lived
presigned URL — and deleted 30 days after delivery or cancellation (COMPLIANCE.md §1; SECURITY.md §2.5–2.6).

## 10. The tracking page

`/track/{token}` (and `/id/lacak/{token}`; ARCHITECTURE.md §5). The token is 128 random bits, base64url, made when
the order is created; only its SHA-256 is stored, so a resent link is a new token. The page is `noindex`,
`no-store`, `Referrer-Policy: no-referrer` and rate-limited per address; a wrong token gets the same 404 as a
missing one; the token is scrubbed from logs and never reaches analytics. The link stops working 30 days after
delivery or cancellation (COMPLIANCE.md §1; SECURITY.md §2.5).

**The buyer sees:** the order number and date; a timeline — *payment received → processing → waiting for driver
→ picked up, on the way → delivered* — with the time of each step reached (DR-7); the lines and totals; the
delivery area; their phone and email masked; the sending store's name and area; the driver image once
`on_the_way`; and the shop's WhatsApp (click-to-chat, the order number prefilled). While `pending_payment`, a
**Pay** button reopens Snap with the time left; `expired` and `cancelled` say what happened and how to reach the
shop. Never shown: the pin, store stock, staff names or notes.

## 11. Notifications

| When | Who | How |
| --- | --- | --- |
| order created | buyer | email: what was ordered, pay within N minutes, the tracking link |
| `paid` and each later status, `cancelled`, `expired` | buyer | email in the buyer's language, with the tracking link; `on_the_way` includes the driver image |
| `paid` (assigned) or reassigned | the store's users | Open: the store alert channel; default email to each `store` user of that store, plus the admin's "New orders" list |
| `needsAttention` raised | owner, editor | email |

Emails are Payload jobs queued in the **same transaction** as the change, so a rolled-back change sends nothing
and a crash after commit loses nothing; each job is keyed by order and status, so a retry sends once. Staging sends
everything to **Mailpit** (D13); nothing leaves. **WhatsApp is click-to-chat only** — `wa.me` links with a prepared
message, from the tracking page, the emails, and a button in the admin order view that opens a chat with the buyer
prefilled with the tracking link. No WhatsApp API.

## 12. No refunds, and the damaged item

There are **no refunds and no change-of-mind returns** (S12, DR-5; counsel confirms the wording against Indonesian
consumer law, COMPLIANCE.md). A **damaged item is replaced on a photo**, off the site: the buyer sends the photo on
WhatsApp, and the owner or an editor creates a **replacement order** in the admin (`channel: replacement`,
`replacementOf` the original, total Rp 0 — no fee, no discount, no payment) at the original's store. It takes the
stock atomically (§4; a short store is reassigned), emails the buyer a tracking link and goes through the same
statuses from `processing` (CONTENT-OPERATIONS.md §5.5). It is a staff action, not a buyer flow. When the shop
itself cannot fulfil a paid order (§13), the owner returns the money in the Midtrans dashboard and the order
records it; that is the business correcting its own mistake, not a refund policy.

## 13. Edge cases

| Case | What happens |
| --- | --- |
| The same notification twice | the dedupe key exists → no-op, 200 |
| `pending`, then `settlement` | different keys → both recorded, the order `paid` once |
| Bad signature | 401, alert, nothing written |
| Amount differs from the order total | recorded, order flagged, not marked paid |
| Notification for an unknown order | recorded as `unknown-order`, 200, alert |
| Webhook never arrives | the sweep asks the status API before it expires anything |
| Price changed between review and pay | no order; the page shows the new total and asks again |
| Out of stock at pay time | cannot happen once the order exists (its stock is taken); at creation the decrement fails → one re-assignment → else "X just sold out" |
| Two buyers, the last unit | one `UPDATE` wins; the other is told before paying |
| Payment lands after the order expired | always flagged (`needsAttention`), never silently re-sold: if the units are still at the same store they are re-taken and the order is `paid`; if not, `paid` with "reassign, or cancel and return the money" |
| Two attempts both settle | the second is recorded and flagged; the owner returns it in the Midtrans dashboard |
| Fraud challenge on a card | stays `pending_payment`, flagged; the owner accepts or denies in Midtrans and its notification applies |
| Store set inactive with open orders | no new assignments; open orders flagged for reassignment; its staff can still finish them |
| The shelf is empty despite the count | the store tells the owner; reassign, or cancel and return the money |
| No store holds every line | no order; remove a line or ask on WhatsApp (§4) |
| Buyer outside Indonesia, or beyond the last band | no band applies → no order; WhatsApp offered. A foreign phone or card is fine: the charge is in rupiah |
| Discount limit reached by a concurrent order | the atomic increment fails → the code is refused, nothing else changes |
| Courier prices changed | the owner edits the bands (CONTENT-OPERATIONS.md §6.3) and new quotes use them at once; an order already created keeps the fee it was quoted; a band edited between the quote and Pay is caught like a price change (§3) |
| Product edited or unpublished after the order | the order's snapshot is unchanged |

## 14. The gallery: no transaction

The gallery sells nothing online (DR-3): no cart, no checkout, no price, no reserve. Each antique's **Ask** and the
**Sell to us** page (DR-4) open WhatsApp (`wa.me`, prefilled with the stock number, title and link — or, to sell,
a short prepared message) or email (`mailto:` with the same), with the reply promise beside them (G9). An optional
short form, with its consent line and Turnstile, posts to the lead service (`POST /api/x/leads`, AI.md §4), which
validates it, rate-limits it (SECURITY.md) and creates a `lead` (`ask`, `sell` or `contact`) for the owner's inbox
— then shows the same WhatsApp and email buttons. The shop's partnership enquiries take the same path
(`partnership`). The deal is made by the client, off the site.

## Open

- **`orderExpiryMinutes`** (the payment window) — default 60 minutes. *Owner.*
- **Free-shipping threshold** measured after the discount (default) or before. *Owner.*
- **Store alert channel** — default email to the store's users and the admin list. *Owner.*
- **Order number prefix** — default none. **Email provider for production** — DEPLOYMENT.md. *Owner, DevOps.*
- **Welcome code value and how buyers receive it** (S13). *Owner.*
