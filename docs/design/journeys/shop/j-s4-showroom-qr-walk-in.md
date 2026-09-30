# J-S4 — A showroom QR walk-in → buy here and take it

**Who:** a visitor browsing the showroom at Jl. Gambuh 17, Denpasar. The shop is quiet,
the Wi-Fi weak, her phone on 4G. She likes a print on the wall, scans the QR label
beside it, and wants to leave with it — or, for a larger framed piece, have it sent.

**Rests on:** EXPERIENCE-SHOP.md §4 ("You're in the showroom": a light,
weak-Wi-Fi-friendly mode — pick it up now, buy it here and take it, or buy it here and
have it sent home), §7 (pickup: a code or QR, a "ready" notice, hours, a map, who may
collect), §8 (the showroom is a stock location; QR codes on the walls open each product
page), PAYMENTS.md §6 (the showroom's QRIS on the same Midtrans account),
DESIGN-SYSTEM.md §2 (`Location`: "in the showroom now" stock), TASKS.md 23.6.c (the
showroom QR placard), 30.3.d (the in-showroom mode from a showroom QR), D31 (guest),
Requirement 7.8, 7.10.

**Used by:** 32.1.a e2e, 32.2 usability (run **in the showroom** where possible),
phase 32 **Done when** ("a showroom QR opens the in-showroom mode").

## Before the session

- On staging: a stocked product with stock at the showroom location; a second one with
  **one** unit left at the showroom (to sell out mid-session); a framed piece made to
  order.
- Printed test QR placards (23.6.c) carrying the showroom marker the product link needs;
  a phone on 4G, Wi-Fi off, or throttled.
- A staff member (or the facilitator) with the admin open to see the order and the
  pickup code; the Midtrans sandbox.

## Say to the participant

> "You're in the shop in Denpasar and like this print on the wall. Scan the label and
> buy it so you can take it with you today."

(Then: "And that big framed one — you'd like it too, but you're flying home.")

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | the QR placard → `Item` (`item`) in the **in-showroom mode** | land on the exact product, in a light page that loads on 4G | the mode comes from the QR's link, not from location; images lighter; without JavaScript it still works; opened again later at home, the page offers the ordinary paths too |
| 2 | `Item` › three choices | choose **"Buy it here and take it"** | "Pick it up now" and "Buy here and send it home" also offered; "In the showroom now" badge from live stock |
| 3 | `Cart` (`cart`) | see the line as a showroom pickup | the last unit sold while in the bag → said in one sentence, with made to order and send-home offered |
| 4 | `Checkout` (Contact, Delivery = **pickup** at the showroom, Payment) | give a WhatsApp number and one Full name; pickup needs no address | guest only; pickup is free |
| 5 | Payment → QRIS | pay: scan the showroom's QRIS on the counter, or use the e-wallet deep link from her own screen | a phone cannot scan its own screen → deep links or "save QR to gallery"; failed → another method, the bag kept |
| 6 | `Order` (`order/[number]`) | see *Paid* and a **pickup code or QR** | the code is what staff check; "who may collect" stated |
| 7 | at the counter (role-played) | show the code; staff see it as paid and hand over the print | the staff's order screen marks the pickup collected (TASKS.md 24.2) |
| 8 | the framed piece: `Item` › "Buy here and send it home" | order it for delivery abroad or to her villa | as J-S2 from step 2 (ship-to, glazing, duties) |

## Channel handoffs

A printed **QR placard** → the site on **4G** → **QRIS** (the counter's code, or an
e-wallet app from her own phone) → back to `Order` → **in person**: staff check the
pickup code → confirmation **email**.

## The moment that decides trust

**Step 7 — at the counter.** The site and the showroom are one shop only if the person
behind the counter sees the order she just paid for, by its code, at once, and hands her
the print. If staff have to ask for a screenshot or a transfer receipt, the online flow
was theatre. Before that, step 1: a page that opens fast on a weak signal and knows she
is standing in the shop.

## Success criteria

- Unaided: she scans and lands on the exact product in the in-showroom mode (step 1).
- Unaided: she pays and shows a pickup code (steps 4–6); staff confirm it without asking
  for proof of payment.
- The page loads on throttled 4G within the item page's budget (DESIGN-SYSTEM.md §7).
- Target (to calibrate): scan to pickup code, **under 2 minutes**.

**Observe:** whether she would rather pay staff directly; whether the three choices are
clear standing up, one-handed.

## Open until the owner answers

S4 (showroom hours, stock kept there, QRIS at the counter, pickup, QR labels on the
walls), S6 (who answers WhatsApp in the showroom), S3 and S11 (sending it home or to a
villa).
