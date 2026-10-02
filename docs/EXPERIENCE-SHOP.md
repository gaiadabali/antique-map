# Experience — Old East Indies

How the shop site behaves, surface by surface. It is a **real online store** (DR-5…DR-8) for the client's
merchandise made from the archive — prints, stationery, homeware, gifts — stocked **per store** across 100+ stores
in Bali. A buyer pays on the site; the nearest store that has every item sends it by Gojek or Grab; the buyer
follows one tracking link. Indonesia only, rupiah only, guests only. The shared look is
[DESIGN-SYSTEM.md](DESIGN-SYSTEM.md); payments are [COMMERCE.md](COMMERCE.md); the staff side is
[CONTENT-OPERATIONS.md](CONTENT-OPERATIONS.md); the AI rules are [AI.md](AI.md).

**Feeling:** warm, sunlit, giftable, a little playful — with the archive's credibility underneath. Every product
says **Reproduction** and, where it has one, which original it comes from. Warmer and louder than the gallery; the
same family. Celebrate the islands and the craft of printmaking, never the VOC (S15).

## 1. Who it serves

| Buyer | Reality | What they need |
| --- | --- | --- |
| **Instagram visitors** | most online traffic, on a phone, inside Instagram's in-app browser | a fast product page, a short checkout, QRIS that works on the same phone |
| **Tourists in Bali** | buying for delivery to a villa or hotel before they leave | delivery to a map pin, a clear fee, a tracking link |
| **Residents and expats** | furnishing a home, buying gifts (oleh-oleh, Lebaran, Imlek, Christmas) | categories, a gift note, free delivery over Rp 500.000 (DR-5) |
| **Store walk-ins** | the main buyers today (S9); a QR label opens the product page | the same product page, quick on weak Wi-Fi |
| **Businesses** | hotels, villas, cafés and shops that want to resell or furnish | a Partnership page that starts a conversation (DR-8) |

## 2. Sitemap

Paths follow the route map in [ARCHITECTURE.md](ARCHITECTURE.md) §5; Indonesian lives under `/id/…`, with
translated segments (`/id/produk/…`, `/id/lacak/…`).

| Surface | Example path | Purpose |
| --- | --- | --- |
| Home | `/` | the hero, categories, new in, gifts, the archive story, stores, partnership |
| Shop all · Category | `/shop`, `/shop/prints` | products by `terms` kind `category`, with filters |
| Collection | `/collections/spice-islands` | a curated `page` with product rails (story-led groupings) |
| Product | `/product/{slug}` | images, options, price, stock, add to bag, Ask on WhatsApp |
| Search | `/search?q=bali` | names, descriptions, SKUs, places |
| Bag | `/bag` | lines, free-delivery progress, voucher, checkout |
| Checkout | `/checkout` | contact → delivery (map pin) → payment, on one page |
| Tracking (payment, confirmation) | `/track/{token}` | while unpaid, the pending payment (VA number or QRIS, the deadline); then the status timeline, the driver's details, contact |
| Find my order | `/track` | order number + email or WhatsApp → the tracking link sent by email |
| Partnership | `/partnership` | for hotels, villas, cafés and shops → a `partnership` lead or WhatsApp |
| About · The making | `/about` | the brand, the archive, how prints are made in the Denpasar showroom (S14) |
| Stores | `/stores` | the stores, by area, with hours and a map link |
| Info pages | `/delivery`, `/payment`, `/damaged-items`, `/faq`, `/contact`, `/privacy`, `/terms` | ordinary `pages`; legal ones in counsel's words |

**Header** — the design team's, the same component as the gallery's: logo · Shop (categories) · Collections (their
"Gallery walls") · How we make them · Partnership · Stores · search · WhatsApp · bag · language; their "Journal"
waits until the shop has articles. **Utility line** (their announcement bar): "Delivery in Bali by Gojek or Grab ·
Free over Rp 500.000" (the threshold from `site-settings`; their "Free shipping in Indonesia" overstates the reach,
DR-6). **Footer** (theirs): shop links · delivery, payment, damaged items, FAQ · about, stores, partnership ·
WhatsApp with its reply hours (S6) · the sister link ("The originals are at Indies Gallery") · privacy, terms ·
language — not their "Gift cards", "Shipping & returns" or "Partner sign in" (S10, S12, DR-8). **On a phone:**
logo, search, bag and a menu; the bag shows its count as text.

## 3. Home

The design team's page is the composition (TASKS.md 4.3.b); its bands are ordered in the CMS, never a carousel:

1. **The hero** — eyebrow, H1, one line, **Shop prints** and **How we make them**, and two plates: the lead print,
   a map of the archipelago (S8), and a print in a room.
2. **By island · By room** — chips with live counts (`places`, `terms`), each a link into the filtered shop.
3. **Best sellers** — four numbered product cards (plate, name, the original's maker and year, "From Rp …", the
   sizes), chosen in the CMS, then **Shop all**.
4. **Sets that hang together** — three collections (their gallery walls), each three plates and a "From" price.
5. **How we make them** — the workshop photograph, three numbered steps, "Watch how it's made" (S14).
6. **Trade & gifting** — the dark band: the home's partnership highlight → the partnership page (§11).
7. **The originals** — "Every print begins with a map we hold" → Indies Gallery (the two-way bridge).

The CMS can also place the bands the drawing lacks: categories with images, new in, gifts by price band and
occasion, and **Stores** ("Find us in {count} stores across Bali"). Prices and counts come from the data; no figure
is typed into copy (DESIGN-SYSTEM.md §11).

## 4. Browse and the product page

**Filters** (a bottom sheet on a phone, a left column at 1280): category · subject · place · price band ·
availability (in stock by default). **Sort:** featured · new · price low–high · price high–low. **Tiles:** image,
name, price ("From Rp 95.000" when variants differ), **Reproduction**, and "Sold out" when no store has any.

**The product page**, top to bottom on a phone:

1. **Images** in the product's order: in a room or in use first where a photograph exists, then flat, details,
   scale, packaging. A digital mockup says so on the image and in its alt text.
2. **Title block** — the name, "Reproduction", the maker and year of the original where known, the SKU, the price.
3. **Options** — each variant dimension is a real radio group (size, frame, colour — whatever the product has).
   The price updates to the chosen variant (display only; the server prices the bag). An option whose every
   variant is sold out stays visible, marked "Sold out", never a silent grey.
4. **Stock** — "In stock" when at least one active store holds the chosen variant; "Sold out" otherwise. No counts
   and no "only 2 left" unless it is true across every store.
5. **Add to bag** with the price, and **Ask on WhatsApp** (product, variant and SKU prefilled) — a sticky bar on a
   phone.
6. **Delivery line** — "Sent from the nearest store by Gojek or Grab. The fee shows at checkout once you drop a
   pin — free over Rp 500.000." No delivery time is promised that the data does not support.
7. **The original** — when the product has a `relatedWork`: "Made from {title}, an original at Indies Gallery" →
   the gallery's item page, **never with a price**; when sold, "Made from our scan of the original, now sold".
8. **Description and story**, then **specifications** (size, material, care) collapsed.
9. **Trust row** — payment methods (QRIS, bank transfer, cards), "A print that arrives damaged is replaced on a
   photo" (S12, in counsel's words once given). No refunds line until counsel words it.

**From a store QR label** (S4) the page opens normally, light on data for weak Wi-Fi; the buyer can buy for
delivery or simply buy at the counter. The scan is a first-party event with the label's source.

## 5. Bag

- Lines: image, name, variant, unit price, a quantity stepper (buttons and a typed number), remove.
- **Free-delivery progress:** "Add Rp 120.000 more for free delivery" → "Free delivery" (threshold from
  `site-settings`), recomputed after every change.
- **Voucher field** — the welcome code (S13; a `discounts` record). Every failure says why and what to do:
  "This code has expired", "This code needs a bag of Rp 300.000 or more", "This code has been used".
- Delivery shows "Calculated at checkout from your pin". Subtotal, discount and total are shown as the server
  computed them.
- Adding to the bag shows a small confirmation ("Added to bag — View bag · Keep shopping"), not a forced drawer.
- **A line that changed** since it was added says so in one sentence: "Sold out since you added it — remove it to
  continue" · "The price changed to Rp 210.000". Nothing changes silently.
- **Bag link:** the bag can be expressed as a URL (SKUs and quantities), used by "Open in your browser" (§9) so the
  bag survives leaving the in-app browser. Prices are never in the link; the server prices it again.

## 6. Checkout

**One page, three sections**, each collapsing to a one-line summary with "Change" once complete. Guest only. A
progress line names the step ("2 of 3 — Delivery").

| Section | Fields | Rules |
| --- | --- | --- |
| **1 · Contact** | Full name (one field — many Indonesians have one name) · WhatsApp number · email | WhatsApp normalised (`08…` → `+62 8…`, a number starting 08 is fine); email for the receipt and the tracking link |
| **2 · Delivery** | **map pin** (required) · address as text · notes for the driver (landmark, gate, "titip ke satpam") · gift note (optional, S10) | the pin decides the store and the fee; the text and notes help the driver |
| **3 · Payment** | summary (lines, voucher, delivery fee, total) · method: QRIS · bank transfer (virtual account) · card | the total is the server's; **Pay {total}** creates the order |

**The map pin** is **Google Maps** (the owner's choice): the Maps JavaScript API, its key handed to the page by the
server (SECURITY.md S4). The map opens on the buyer's last pin or on Bali. The pin stays fixed in the centre and
the map moves under it (the pattern Gojek and Grab users know), with **"Use my location"** (the permission asked
only on tap, with a one-line why) and a **place search** (Places autocomplete). Under the map, the pin's area in
words — "Pin near Jl. Pantai Berawa, Canggu" — from `GET /api/x/geocode`, so the buyer can confirm it. Fallback
when the map cannot load, or without JavaScript: **paste a Google Maps link** (the way people already share
locations on WhatsApp); the server reads its coordinates. The map loads only when the section opens.

**What the pin decides** (on the server, DR-6): the nearest active store that holds **every** item, and the
delivery fee from that store's distance to the pin, by the table of distance bands the owner keeps in the admin
from the local courier price (COMMERCE.md §5) — shown as one line ("Delivery from {store}, {distance}: Rp 25.000",
or "Free") and in the total before Pay; the fee is quoted when the order is created and kept on it. If the pin is
beyond the last band: "We deliver within {area} for now. Message us on WhatsApp and we will find a way." with the
WhatsApp button prefilled.

**Pay.** Pressing Pay creates the order (`pending_payment`), **decrements stock atomically at the chosen store**
and opens the payment (COMMERCE.md decides the Midtrans integration; in an in-app browser it redirects rather than
opening a pop-up). The payment window is [COMMERCE.md](COMMERCE.md) §4's, one for every method; the deadline is
shown as a time, not only a countdown.

## 7. Payment: QRIS, virtual account, card

| Method | On a phone | On a desktop |
| --- | --- | --- |
| **QRIS** | a phone cannot scan its own screen, so: **Open in GoPay / ShopeePay / your bank app** where a deep link exists, **Save QR image** to scan from the gallery in any QRIS app, and the QR shown too (for a second phone) | the QR, large, with "Scan with any QRIS app — GoPay, OVO, DANA, ShopeePay, your bank" |
| **Virtual account** | the bank, the **exact amount** and the **VA number with a Copy button**, steps per bank app (BCA, Mandiri, BRI, BNI…) collapsed, the deadline | same |
| **Card** | the card form or 3-D Secure step | same |

The pending page **switches to "Payment received" by itself** when the webhook lands (polling while visible; a
"Check again" link without JavaScript). "I have paid" only refreshes — it never marks an order paid, and the buyer is
never asked to upload a transfer receipt. The page says "We'll email you when it's paid" and the email carries the
tracking link, so a buyer who leaves to their bank app can always come back.

## 8. Checkout errors and recovery

Every message explains and instructs in one or two sentences; the bag and the typed fields are always kept.

| Situation | What the buyer sees | Recovery |
| --- | --- | --- |
| **Out of stock at pay time** (the decrement fails) | "{item} sold out a moment ago. Nothing was charged." | the line is marked in the summary: remove it or lower the quantity, then Pay again |
| **No one store holds every item** | "We can't send these together from one store yet." with the item(s) to remove named | remove and continue, or WhatsApp prefilled with the bag |
| **Price or delivery fee changed** since it was shown | "The price of {item} is now {price}." or "Delivery is now {fee}." before Pay | the new total is shown; the buyer presses Pay again |
| **Pin out of range** | §6 | WhatsApp |
| **Payment pending** | §7, with the deadline | pay any time before the deadline; the link in the email returns here |
| **Payment failed** (card declined, e-wallet cancelled) | "The payment didn't go through. Nothing was charged." | "Try again" or "Choose another method" — same order, inside the window |
| **Payment window ended** (`expired`) | "The time to pay ran out at {time}. Nothing was charged, and the items went back on the shelf." | **"Put these back in my bag"** — one tap rebuilds the bag, re-checks stock and prices |
| **Confirming** (webhook slow) | "We're confirming your payment with the bank — this usually takes under a minute." | the page updates itself; the email follows |
| **Paid after the window** | handled by staff (COMMERCE.md); the page says "We received a payment after the order expired — we'll contact you on WhatsApp today." | staff reinstate or settle it |
| **Server error** | "Something went wrong on our side. Your bag is safe." with "Reference: {id}" | Try again · WhatsApp prefilled with the reference |

## 9. Instagram, WhatsApp and TikTok in-app browsers

Most buyers arrive inside an app's webview, which has its own storage, blocks pop-ups and handles deep links
unevenly. So:

- **Everything works in the webview** up to and including payment: no pop-ups, a redirect payment, QRIS with
  save-image and deep links, VA with copy. It is tested on the Instagram, WhatsApp and TikTok webviews on Android
  and iOS.
- **No interstitial on arrival.** Only at checkout, and only in a detected in-app browser, one dismissible line:
  "Paying inside Instagram can fail with some banks — Open in your browser". On Android it opens the browser
  directly; on iOS it shows how ("Tap ••• then Open in browser") and offers **Copy bag link**, because the webview's
  bag does not travel to Safari on its own (§5).
- The confirmation email and the tracking link work in any browser, so a payment finished elsewhere still lands.
- Fonts, images and scripts stay inside the budgets (DESIGN-SYSTEM.md §9): webviews run on mid-range phones over
  4G.

## 10. The tracking page

One page at `/track/{token}` is the confirmation, the pending payment and the tracking link in every email
([COMMERCE.md](COMMERCE.md) §10). The token is unguessable; the page is `noindex` and shows no more than the buyer
needs.

**Top:** the order number, the current status as a large line, and **Message us on WhatsApp** (the online shop's
number, S6) prefilled "Hello, I have a question about order {number}." **Then the timeline** — a vertical list,
newest at the bottom, each step with its time in Bali time ("14:32 WITA, Fri 3 Oct"):

| Status | Buyer reads (EN · ID, ID awaiting native review) | Also shown |
| --- | --- | --- |
| `pending_payment` | Waiting for payment · Menunggu pembayaran | the payment block (§7) and the deadline |
| `paid` | Payment received · Pembayaran sudah kami terima | "{store} is getting your order ready"; when the store is closed, when it opens (from its hours) |
| `processing` | Being prepared at {store} · Sedang disiapkan di {store} | — |
| `waiting_driver` | Waiting for a driver · Menunggu driver | "We've booked a {Gojek / Grab} driver" when staff say so |
| `on_the_way` | Picked up, on the way · Sudah diambil, dalam perjalanan | **the driver's details image** — the screenshot staff upload showing the driver's name, photo, plate and contact — with "Use these details to contact your driver" |
| `delivered` | Delivered · Telah sampai | "Something wrong with it? Send us a photo on WhatsApp" (S12) |
| `cancelled` | Cancelled · Dibatalkan | the reason staff gave, and WhatsApp |
| `expired` | The time to pay ran out · Waktu pembayaran habis | "Put these back in my bag" (§8) |

Steps not yet reached are listed below in plain text ("Next: on the way") — never colour alone. **Below the
timeline:** the items, the delivery area (never the pin), the gift note, the totals, and the store's name and area.

- **Updates:** while open and visible the page checks for changes every 30 seconds and announces a new status
  politely to screen readers; without JavaScript a "Refresh" link. Each status change is also emailed
  (COMMERCE.md §11).
- **The driver's image** is personal data: shown only on this token page, never in a public media URL, and deleted
  30 days after delivery or cancellation, when the link stops working ([COMPLIANCE.md](COMPLIANCE.md) §1).
- **A reassigned order** simply shows the new store; the buyer is not told about internal moves.

## 11. Partnership

For hotels, villas, cafés, shops and companies that want to resell the client's goods or use them as gifts and room
art (DR-8). **The design team's page is the composition** (TASKS.md 4.3.c): an opening ("Buying for a shop, a
hotel, or a company."), a strip of facts, then three numbered sections — *01 Resellers*, *02 Company gifting*,
*03 Hotels and villas* — each with four short facts and a photograph. It says what a partner gets (the range,
delivery from the stores, terms agreed with each partner — **no published discount or minimum**, S5) and how it
starts: **a conversation**. Their page ends in a sign-up and sign-in bridge for retailer accounts (an "Apply" form
on a dark band, then "Sign in to your prices"); **we have none (DR-8), so the dark band becomes the enquiry call to
action** and the sign-in section goes. Three ways in: **WhatsApp** prefilled ("Hello, I'm from {business} and I'd
like to talk about a partnership"), **email**, and a short form (business name, kind of business — their "A shop ·
A company · A hotel or villa" chooser, as a real radio group — area, contact person, WhatsApp or email, message)
that creates a `partnership` lead. The thank-you names the reply promise. Gone with the accounts: every "Partner
sign in" (opening, utility line, footer), wholesale tiers, one-click reorder; gone with the owner's answers: the
published minimums (S5) and "worldwide" shipping (S3). The header's
Partnership item and the home's highlight (§3) stay — the two ways in that the design team's notes ask for. There
is no partner login, portal or price list.

## 12. The guide (AI chat)

A launcher on browse, product, bag and home pages (merged into the sticky buy bar on product pages), opening as a
full-height sheet on a phone and a side panel at 1280. It helps find products, answers delivery and payment
questions from the site's own pages, and hands off to the online shop's WhatsApp with the product attached (the same
prefilled message as §4). It **never invents a price, a stock level or a delivery promise** — it reads them from the
catalogue — and never changes an order. It asks before recording a `chat` lead. "Talk to a person" is always
visible. Rules: [AI.md](AI.md); a `site-settings` flag switches it off.

## 13. Phone-first and accessibility rules

- Designed at **390 px first**, checked at 1280 px; the whole buy path (product → bag → checkout → payment →
  tracking) is completed one-handed in an Instagram webview during every design gate.
- The bottom of the screen is one slot: sticky buy bar on the product page, checkout's Pay bar, otherwise the chat
  launcher. No pop-ups, no welcome prompt before the visitor has looked at something.
- WCAG 2.2 AA (DESIGN-SYSTEM.md §10): options are radio groups; price changes announced politely; the map pin has
  non-drag alternatives (search, "Use my location", a pasted link); every form error is named at the field and in a
  summary; status is text; inputs are 16 px; targets ≥ 44 px.
- Money is formatted by the server's formatter in rupiah ("Rp 185.000"); the client never computes a price.

## 14. Deliberately absent

| Not on the shop | Why |
| --- | --- |
| Shopper accounts, sign-in, saved addresses | DR-5: guest checkout; the tracking link is the way back |
| Wishlists, saved searches, back-in-stock alerts | out in PLAN.md |
| Delivery abroad, foreign currencies, PayPal | DR-5, S3 |
| A refunds or returns flow | DR-5, S12: no refunds; a damaged item is replaced on a photo, handled by staff |
| Courier integration, live driver maps, courier rate shopping | DR-6: the store books Gojek/Grab itself; the buyer gets the driver's details image |
| Pickup of online orders | DR-6: every order is delivered at launch; walk-ins buy at the counter |
| Split orders | DR-6: one store sends every line; otherwise the buyer removes one or asks on WhatsApp |
| Partner login, trade prices, quotes online | DR-8 |
| Gift wrap, gift cards | S10: a gift note only |
| Cash on delivery | payment confirms before a store prepares anything |
| A made-to-order configurator, room previews | everything sold is in stock (S7); options are stocked variants |
| Reviews | none to show; an empty band is never shown |

## Open

- **The online WhatsApp number and its reply hours** (S6), **the welcome code's value** (S13) — owner.
- **Which stores are listed publicly** and whether a store's own WhatsApp is shown — default: active stores listed
  with area, hours and map link; contact always through the online number. Owner.
- **A "deliver before" date** (S11) — default: buyers write it in the driver/store notes; no date is promised.
- **The damaged-item and no-refund wording** — counsel (D11). Default: the replacement promise only.
