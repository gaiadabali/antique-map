# J-G6 — Make an offer → counter → accept → pay

**Who:** a collector on a desktop at home, interested in a map priced around
USD 12,000 — in the middle tier, where offers are allowed. They would buy at a lower
figure and want to negotiate without a phone call.

**Rests on:** D22 (non-binding offers in v1: accept, counter, decline in the admin; an
accepted offer becomes a hold and a private pay link), D30, COMMERCE.md §7 (the private
floor auto-declines politely below it; a counter valid 72 hours), design.md "Offer →
accepted → paid", PAYMENTS.md §6 (above ~USD 5–10k steer to bank transfer),
DESIGN-SYSTEM.md §2 (`Account` › my offers, with the counter's countdown), Requirement
6.2, 6.11.

**Used by:** 35.1.a e2e (offer → accept → pay, CONVENTIONS.md §8), 35.2 usability.

## Before the session

- On staging: one available item in the ~USD 5,000–25,000 tier; seller the export
  seller; a private floor set **only if** the owner set one (G8; the default is none,
  every offer reaches staff).
- Staff (or the facilitator in the admin's offers inbox) ready to **counter** within the
  session; a buyer test account; the mail catcher open; Stripe and bank-transfer
  sandboxes answering.

## Say to the participant

> "You like this map, but you think the price is high. Try to buy it for less, the way
> you would with a dealer. See it through until you have agreed a price and could pay."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` › purchase panel | see Buy now, Reserve for 48 h, **Make an offer**, Enquire as the tier allows | only the modes the tier, status and modules allow (Req 6.2); "Checking availability…" until resolved |
| 2 | `Item` › Make an offer → `Form` (`offer` kind) | enter an amount, currency and message and send | the form says the offer is **not binding** in v1 and when staff answer (G9); below a set floor → a courteous automatic decline, the item still available; JavaScript off → posts and returns (`FORM_RESULT`) |
| 3 | email + `Account` › offers (`account/[section]`) | read "Your offer was received" and see it pending | signed out → the email is enough; signed in → *my offer is pending* on the item's panel too |
| 4 | email (counter) → `Account` › offers | read the counter: the figure, the currency, **valid 72 hours**, with a countdown | the counter expired → the offer closes courteously and the item stays available; a second counter; a decline, the item stays available |
| 5 | `Account` › offers › Accept | accept the counter | acceptance places an `offer` hold (48–72 h); the item reads "On hold until {date}" to others and *held for me* to them |
| 6 | email → `Pay` (`pay/[token]`) | open the private pay link: the piece, the **agreed figure** in the charge currency (stored at acceptance with its FX snapshot), the expiry, the seller | the link's session expires before the hold does; a figure from the request is never used |
| 7 | bank transfer or card | pay — steered to bank transfer at this value | bank transfer → instructions, then "payment must be received and confirmed"; card declined → another method, the hold intact; paid after the hold lapsed → re-reserved if free, else refunded automatically |
| 8 | `Order` and email | see the paid order, the certificate | one transaction marks payment, reservation and order together (design.md) |

## Channel handoffs

The site → staff's offers inbox (the admin desk) → **email** for received, countered,
accepted (with the pay link) → the `Pay` page → a **bank transfer** or Stripe → back to
`Order` · the confirmation **email** with the certificate.

## The moment that decides trust

**Step 4 — reading the counter.** A negotiation by web form feels risky: "Am I now
obliged? Will they sell it under me?" The counter must state the exact figure and
currency, until when it stands, that nothing is owed until the buyer pays (v1 offers are
non-binding), and what happens to the map meanwhile. A countdown without that context
reads as pressure; with it, as courtesy.

## Success criteria

- Unaided: the participant makes an offer (step 2) and can say whether it binds them.
- Unaided: they find the counter and its deadline (step 4) and accept it (step 5).
- Unaided: from the `Pay` page they can say the agreed figure, the currency and until
  when the map is held.
- The pay link charges the stored agreed figure (e2e asserts it; money is priced on the
  server).
- Target (to calibrate): the offer sent **under 90 seconds** from opening the panel.

**Observe:** what figure they offer and why; whether the word "offer" or "make an
offer" invites them; how they react to an automatic decline if a floor is set.

## Open until the owner answers

G8 (offers on which pieces; the floor), G9 (how fast staff answer an offer), G5 (how long
an accepted offer holds the piece).
