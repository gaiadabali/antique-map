# J-S5 — A gift to a recipient abroad, by a date

**Who:** an Australian expat living in Canggu who wants to send her mother in Perth a
framed Bali map for her birthday in three weeks. She pays; her mother receives. The
parcel must not show prices, must arrive in time, and ideally must not cost her mother
anything at the door.

**Rests on:** EXPERIENCE-SHOP.md §2 (Gifts: by price, recipient, occasion), §5 (the Gift
step: wrapping, gift note, hide prices — each a priced line), §7 (gifts: a recipient
address separate from the buyer's, a note preview, a packing slip with prices hidden, a
target delivery date; digital gift cards sent to the recipient by email or WhatsApp on a
chosen date, and a balance-check page), COMMERCE.md §8 (DAP duties shown before payment;
at launch export ships from Bali, D23; the holiday calendar), DESIGN-SYSTEM.md §2
(`GiftCard`), D31 (guest), D2 and D47 (the charged currency — D47's default for a
buyer abroad: one rupiah price list, a card charged the exact rupiah, the market's
currency only an "≈" estimate beside it, PayPal charged one USD conversion shown before
the choice; COMMERCE.md §3).

**Used by:** 32.1.a e2e, 32.2 usability (the gift-buyer session), phase 32 **Done when**
(gift wrap).

## Before the session

- On staging: a framed product; the one rupiah price list (test prices, S2) with
  Australia as an estimate-only market (the day's AUD rate for the "≈" figure; the USD
  rate and buffer for PayPal — D47's default); gift note
  and hide-prices on; gift wrap only if S10 confirms it; the digital gift card product
  (`commerce.giftCards`); the holiday calendar holding one date inside the three weeks.
- DHL Express sandbox or the flat table for Australia; the mail catcher open (the
  gift-card email to "the recipient" lands there).

## Say to the participant

> "Your mother lives in Perth and her birthday is in three weeks. Send her something
> from this shop that will arrive in time, without the price showing — and without her
> having to pay anything when it arrives, if you can manage that."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Browse` › Gifts (by recipient, occasion, price) | find gift ideas; "under A$50"-style presets, which read the "≈" estimate (display only) | ship-to set to Australia changes the presets and adds the "≈ A$" estimate beside each rupiah price; "From" prices only for variants that can ship there |
| 2 | `Item` › configurator › Gift | add a gift note, **hide prices**, optionally wrapping | each gift option is a priced line and says so; wrap per line or per order, and says which |
| 3 | `Item` › delivery promise | read whether it can arrive **by the date** | made to order + international transit + the holiday calendar; a date that cannot be met is said plainly, with a faster option or a **digital gift card** suggested |
| 4 | `Cart` | see the gift options on the line | the totals stay in rupiah with the "≈ A$" beside them; the free-shipping bar recomputes for the destination |
| 5 | `Checkout` › Delivery | enter **her mother's address separately** from her own; a target delivery date; **preview the gift note** | the recipient's address in Australian shape; the packing slip with prices hidden |
| 6 | `Checkout` › Shipping method, Payment | see shipping and **duties estimated, paid by the recipient on arrival (DAP)**, before paying | the duty line is explicit because the recipient is not the buyer; the currency charged is named — the card the exact rupiah, PayPal its USD charge, shown before she picks it (D47's default) |
| 7 | `Order` and email | see the order; tracking goes to **the buyer**, not the recipient | the surprise is kept: no email to the recipient unless chosen |

**Alternate path — a digital gift card:** `GiftCard` (`gift-card`) → choose an amount →
schedule it for the birthday → the recipient's email (or WhatsApp once D14 is answered) →
the recipient opens it on the date (mail catcher) → the balance-check page.

## Channel handoffs

The site → the buyer's **card** or **PayPal** → **DHL Express** to Perth, tracking to the
buyer → possibly a **duties notice** to the recipient (DAP) · on the alternate path, a
**scheduled email** to the recipient, and the balance-check page.

## The moment that decides trust

**Steps 3 and 6 — "will it arrive in time, and will she be charged?"** A gift that
arrives late or with a customs bill embarrasses the giver. The page must commit to a
delivery date only when the data supports it, say plainly when it cannot, and show
before payment that duties may be due on arrival and who pays them — offering the gift
card when the physical gift cannot be made safe.

## Success criteria

- Unaided: she enters a separate recipient address and previews the note (step 5).
- Unaided: before paying she can say whether it will arrive by the date and whether her
  mother may be charged on arrival.
- Unaided: she finds the hide-prices option (step 2).
- On the alternate path: she schedules a gift card for the birthday.
- Target (to calibrate): gift chosen to paid, **under 5 minutes**.

**Observe:** whether she looks for "send as a gift" before or after choosing the
product; whether the duty warning makes her switch to the gift card.

## Open until the owner answers

S10 (wrapping, notes, gift cards), S3 (shipping abroad; who pays duties — a gift makes
DDP worth asking about), S7 (lead time), S12 (a damaged gift replaced).
