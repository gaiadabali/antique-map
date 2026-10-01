# J-S4 — A showroom QR walk-in → buy here and take it

> **Raised 2026-10-01 — S9, S4.** Showroom walk-ins are the shop's main buyers today (S9),
> so this is the shop's **first** journey beside J-S1: it runs in every shop usability
> round, in the showroom itself wherever possible. Everything it needs is on (S4):
> published hours, QRIS at the counter, pickup of online orders and QR labels on the
> walls. Everything is in stock (S7); a piece sent on goes within Indonesia only at launch
> (S3).
>
> **Updated 2026-10-01 — D52 (TASKS.md 6.6.c).** The shop's stock is one pool at launch,
> held at the showroom, so the page shows no showroom-stock badge — "in stock" already
> means on the showroom's shelves — and the in-showroom mode offers two choices, not three:
> take it now, or have it sent.

**Who:** a visitor browsing the showroom at Jl. Gambuh 17, Denpasar. The shop is quiet,
the Wi-Fi weak, her phone on 4G. She likes a print on the wall, scans the QR label
beside it, and wants to leave with it — or, for a larger framed piece, have it delivered
to her villa before she flies.

**Rests on:** **S4** (published hours, QRIS at the counter, pickup of online orders, QR
labels), **S9** (walk-ins are the main buyers), S7 (everything in stock), S3 and D47
(delivery within Indonesia only at launch), S11 (a Bali courier with a "deliver before"
date), **D52** (one stock pool at launch, held at the showroom: no split by location, no
showroom-stock badge), COMMERCE.md §4 (inventory and the one pool), EXPERIENCE-SHOP.md §4
("You're in the showroom": a light, weak-Wi-Fi-friendly mode — buy it here and take it
now, a pickup from the pool, or buy it here and have it delivered), §7 (pickup: a code or
QR, a "ready" notice, hours, a map, who may collect), §8 (the showroom is the shop's one
stock location; QR codes on the walls open each product page; the counter sale against
the pool), PAYMENTS.md §6 (the showroom's QRIS on the same Midtrans account),
DESIGN-SYSTEM.md §2 (`Location`: hours, map — its stock line drops with D52, TASKS.md
6.7.d), TASKS.md 23.6.c (the showroom
QR placard), 24.4.c (the showroom sale against the pool), 30.3.d (the in-showroom mode
from a showroom QR), D31 (guest), Requirement 7.8, 7.10.

**Used by:** 32.1.a e2e, 32.2 usability (run **in the showroom** where possible, and in
every round), phase 32 **Done when** ("a showroom QR opens the in-showroom mode").

## Before the session

- On staging: a stocked product in the shop's one stock pool (D52 — the showroom's); a
  second one with **one** unit left in the pool (to sell out mid-session); a framed piece
  in stock.
- The showroom `Location` with its opening hours — test values on staging until the
  owner gives the real ones (S4).
- Printed test QR placards (23.6.c) carrying the showroom marker the product link needs;
  a phone on 4G, Wi-Fi off, or throttled.
- A staff member (or the facilitator) with the admin open to see the order and the
  pickup code; the Midtrans sandbox, and the counter's QRIS.

## Say to the participant

> "You're in the shop in Denpasar and like this print on the wall. Scan the label and
> buy it so you can take it with you today."

(Then: "And that big framed one — you'd like it too, but it won't fit in your suitcase,
and you fly home on Saturday.")

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | the QR placard → `Item` (`item`) in the **in-showroom mode** | land on the exact product, in a light page that loads on 4G | the mode comes from the QR's link, not from location; images lighter; without JavaScript it still works; opened again later at home, the page offers the ordinary paths too |
| 2 | `Item` › two choices | choose **"Buy it here and take it"** | "Buy here and have it sent" also offered; availability reads "In stock" from the one pool, and no badge claims which shelf a unit is on (D52, EXPERIENCE-SHOP.md §4); out of stock → said plainly, with the back-in-stock alert |
| 3 | `Cart` (`cart`) | see the line as a showroom pickup | the last unit sold while in the bag — online or at the counter, from the same pool (D52) → said in one sentence, with the back-in-stock alert offered — never a "made to order" promise (S7) |
| 4 | `Checkout` (Contact, Delivery = **pickup** at the showroom, Payment) | give a WhatsApp number and one Full name; pickup needs no address | guest only; pickup is free; the showroom's hours shown (S4) |
| 5 | Payment → QRIS | pay: scan the showroom's QRIS on the counter, or use the e-wallet deep link from her own screen | a phone cannot scan its own screen → deep links or "save QR to gallery"; failed → another method, the bag kept |
| 6 | `Order` (`order/[number]`) | see *Paid* and a **pickup code or QR** | the code is what staff check; "who may collect" stated |
| 7 | at the counter (role-played) | show the code; staff see it as paid and hand over the print | the staff's order screen marks the pickup collected (TASKS.md 24.2) |
| 8 | the framed piece: `Item` › "Buy here and have it sent" | have it delivered to her villa before Saturday | as J-S2 steps 3–7 (glass allowed in Bali, the "deliver before" date, S11); an address abroad is not offered at launch and the page says so (S3) |

## Channel handoffs

A printed **QR placard** → the site on **4G** → **QRIS** (the counter's code, or an
e-wallet app from her own phone) → back to `Order` → **in person**: staff check the
pickup code → confirmation **email** · for the framed piece, the **Bali courier** to her
villa.

## The moment that decides trust

**Step 7 — at the counter.** The site and the showroom are one shop only if the person
behind the counter sees the order she just paid for, by its code, at once, and hands her
the print. If staff have to ask for a screenshot or a transfer receipt, the online flow
was theatre. With walk-ins the shop's main buyers (S9), this is the moment most of its
customers will judge the site by. Before that, step 1: a page that opens fast on a weak
signal and knows she is standing in the shop.

## Success criteria

- Unaided: she scans and lands on the exact product in the in-showroom mode (step 1).
- Unaided: she pays and shows a pickup code (steps 4–6); staff confirm it without asking
  for proof of payment.
- The page loads on throttled 4G within the item page's budget (DESIGN-SYSTEM.md §7).
- Target (to calibrate): scan to pickup code, **under 2 minutes**.

**Observe:** whether she would rather pay staff directly (staff can ring it up as a
counter sale against the same pool, TASKS.md 24.4.c); whether the two choices are clear
standing up, one-handed; whether she expects the counter's QRIS or her own phone to do
the paying.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S4 (hours published, QRIS at the
counter, pickup, QR labels — all on), S9 (walk-ins the main buyers — this journey's
priority), S7 (everything in stock), S3 (sending it on within Indonesia only at launch),
S11 (a Bali courier with a "deliver before" date) — folded in above. **Still owed by the
owner:** the showroom's opening hours (S4); the online WhatsApp number and its reply hours
(S6), shown for help — the showroom keeps its own number. **Settled by the replan
(TASKS.md 6.4):** one stock pool at launch, with no showroom-stock badge or filter (D52;
COMMERCE.md §4, EXPERIENCE-SHOP.md §4, §8). **Still open elsewhere:** 32.2's session plan
putting this journey in every round (a board change, routed through 6.4.e); splitting
stock by shop, which waits for the point-of-sale phase (D52, backlog v2.19).
