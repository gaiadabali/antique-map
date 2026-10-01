# J-S7 — A virtual-account payment, the pending page, tracking as a guest

**Who:** an office worker in Jakarta buying a set of postcards and a notebook as
oleh-oleh for colleagues. She pays by bank virtual account from her mobile-banking app,
comes back to the site, and a few days later wants to know where the parcel is. She has
no account and never will (D31).

**Rests on:** D31 (guests; order tracking by number), D14 (updates by email until a
WhatsApp provider is chosen), DESIGN-SYSTEM.md §2 (`Order` payment pending: the exact
amount, the VA number with a copy button, per-bank steps — m-BCA, Livin', BRImo, ATM —
the expiry countdown, the bank daily-cap warning, the automatic switch to *Paid*;
`OrderLookup`), EXPERIENCE-SHOP.md §7 (after the order: guests track by order number plus
email or WhatsApp number; the courier timeline; a damaged print replaced on a photo
claim), PAYMENTS.md §1 (the late-payment path), COMMERCE.md §5, S12 (no refunds; a
damaged print replaced on a photo), S6 (a separate WhatsApp number for online shoppers),
Requirement 7.10, 7.11.

**Used by:** 32.1.a e2e, 32.2 usability, phase 32 **Done when** ("pays by QRIS (or VA,
following the payment-pending page) … and tracks the order as a guest").

## Before the session

- On staging: two stocked products; the Midtrans sandbox with BCA and Mandiri VAs and its
  payment simulator; a Biteship sandbox or a seeded shipment timeline for tracking.
- The participant's own phone; a second tab or device playing "the bank app" (the
  sandbox simulator); the mail catcher open.

## Say to the participant

> "Buy these postcards and this notebook for your colleagues and pay by bank transfer
> from your banking app. Then, a few days later, find out where your parcel is."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Cart` → `Checkout` (Contact, Delivery, Shipping method) | WhatsApp number first, one Full name, address pickers, a courier with price and ETA | guest only; IDR only; same-day GoSend/GrabExpress offered in Jakarta where the courier offers it |
| 2 | Payment → **virtual account** (BCA) | choose her bank's VA | methods filtered by amount and seller; "confirmed automatically" — never "upload your transfer receipt" |
| 3 | `Order` (`order/[number]`) › **payment pending** | read the exact amount, **copy the VA number**, follow the steps for her bank app, see the countdown and the bank's daily-cap warning | leaving and returning → the page again, from the order-access cookie; the page promises updates by email (WhatsApp once D14 is answered) |
| 4 | her bank app (sandbox simulator) | pay the VA | paid → the pending page switches to **Paid by itself**, no reload needed; expired → "pay another way" keeps the bag; paid after expiry → the late-payment path: re-reserved if free, else refunded automatically and told |
| 5 | email | receive the confirmation with the order number | the email holds the number and the tracking link once shipped |
| 6 | (days later) `OrderLookup` (`order-lookup`) | enter the order number and her email or WhatsApp number | a wrong pair → one answer that reveals nothing; rate-limited; works without JavaScript |
| 7 | `Order` › tracking | see the courier timeline and the tracking link; the buyer's status is the derived one (never a raw payment state) | shipped · in transit · delivered; a delay on Lebaran explained by the holiday calendar |
| 8 | `Order` › a problem | report a damaged item with a photo, and see that it will be **replaced** | the claim per line, with reason and photos (COMMERCE.md §11); the outcome offered is a replacement, never a refund or a change-of-mind return (S12 — counsel words the policy, D11); help on WhatsApp goes to the online shoppers' number (S6) |

## Channel handoffs

The site → her **bank app** (m-BCA) with the VA number copied → back to the pending page
→ **email** confirmation → the **courier's** tracking link → back to `OrderLookup` /
`Order` for the timeline.

## The moment that decides trust

**Steps 3–4 — the payment-pending page.** For an Indonesian buyer this is the most
important page in the checkout (DESIGN-SYSTEM.md §2). She is about to send money to a
number on a screen: the page must show the exact amount, a VA number she can copy with
one tap, the steps for *her* bank, how long she has — and then turn to *Paid* by itself
the moment her bank confirms. A page that asks for a receipt, or stays "pending" after
she paid, loses her trust and floods WhatsApp.

## Success criteria

- Unaided: she copies the VA number and completes the payment in the simulator (steps 3–4).
- The page switches to *Paid* without her doing anything (e2e asserts it).
- Unaided: days later she finds her order with number + email or WhatsApp number (step 6)
  and can say where the parcel is.
- No account is asked for at any step.
- Target (to calibrate): checkout to VA number copied, **under 2 minutes**.

**Observe:** whether she screenshots the VA page "just in case"; whether she expects a
WhatsApp message; where she looks first for her order later (email or the site).

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S12 (no refunds; a damaged print
replaced on a photo), S6 (a separate WhatsApp number for online shoppers), S3 (delivery
within Indonesia only) — folded in above. S9 answered where buyers come from (the showroom
first), not how they pay; VA stays the method this journey tests. **Still owed by the
owner:** the online WhatsApp number and its reply hours (S6). **Still open elsewhere:** a
replacement claim in place of COMMERCE.md §11's return-and-refund request (TASKS.md
6.4.c); counsel's wording against Indonesian consumer law (D11).
