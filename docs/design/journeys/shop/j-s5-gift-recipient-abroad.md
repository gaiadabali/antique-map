# J-S5 — A gift to a recipient elsewhere in Indonesia, by a date (to a recipient abroad: after launch)

> **Reshaped 2026-10-01 — S3, S10, D47.** The shop sells within Indonesia only at launch
> (S3), and its gift options are **a gift note only**, with prices hidden on the packing
> slip (S10) — no gift wrap and no gift card. The launch path is a gift sent to someone
> elsewhere in Indonesia by a date. The original path — a gift to a recipient in Perth,
> with duties and an "≈ A$" estimate, and the digital gift card — is kept below as
> **after launch**. The file name is kept so links resolve.

**Who:** an Australian expat living in Canggu who wants to send her sister in Jakarta a
framed Bali map for a housewarming in three weeks. She pays; her sister receives. The
parcel must not show prices and must arrive in time. (Her first thought was her mother in
Perth — which the shop cannot do yet.)

**Rests on:** **S3 and D47** (delivery within Indonesia only at launch), **S10** (a gift
note only, prices hidden on the packing slip), S7 (everything in stock), S13 (free
shipping over Rp 500.000), S12 (a damaged print replaced on a photo), EXPERIENCE-SHOP.md
§2 (Gifts: by price, recipient, occasion), §7 (gifts: a recipient address separate from
the buyer's, a note preview, a packing slip with prices hidden, a target delivery date),
COMMERCE.md §5, §8 (the holiday calendar), §10 (gift notes free; "hide prices"), D31
(guest).

**Used by:** 32.1.a e2e (the launch half only), 32.2 usability (the gift-buyer session:
this half and J-S7, 32.2.b), phase 32 **Done when** ("adds a gift note and a voucher" —
a gift note, with no gift wrap, S10).

## Before the session

- On staging: a framed product in stock; the one rupiah price list (test prices — the
  price list is still owed, S2); gift note and hide-prices on; no gift wrap and no gift
  card (S10); the holiday calendar holding one date inside the three weeks.
- A courier rate to Jakarta (Biteship sandbox or the flat table); the mail catcher open.

## Say to the participant

> "Your sister in Jakarta is moving into a new flat in three weeks. Send her something
> from this shop that will arrive in time, without the price showing."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Browse` › Gifts (by recipient, occasion, price) | find gift ideas; rupiah price presets (under Rp 150k / 500k / 1.5m) | "From" prices only for variants in stock (S7); prices in rupiah alone |
| 2 | `Item` › configurator › Gift | add a **gift note** and **hide prices** on the packing slip | no wrapping option (S10); the gift note is free and says so |
| 3 | `Item` › delivery promise | read whether it can arrive in Jakarta **by the date** | in stock + the courier's estimate + the holiday calendar; a date that cannot be met is said plainly, with a faster courier suggested where one exists |
| 4 | `Cart` | see the gift options on the line; the **free-shipping bar toward Rp 500.000** (S13) | totals in rupiah alone; the bag re-prices on the server — `PriceChanged` if it moved |
| 5 | `Checkout` › Delivery | enter **her sister's address separately** from her own; a target delivery date; **preview the gift note** | the recipient's address by the province → sub-district pickers; the packing slip with prices hidden |
| 6 | `Checkout` › Shipping method, Payment | choose a courier with its ETA; pay by QRIS, an e-wallet, a VA or a card | IDR only; methods filtered by amount |
| 7 | `Order` and email | see the order; tracking goes to **the buyer**, not the recipient | the surprise is kept: no email to the recipient unless chosen; a print that arrives damaged is replaced on a photo (S12) |

## Channel handoffs

The site → her **e-wallet**, **bank app** or **card** → back to `Order` → the courier to
Jakarta, tracking to the buyer → the recipient's door, with no price in the parcel.

## The moment that decides trust

**Steps 3 and 5 — "will it arrive in time, and will the price show?"** A gift that
arrives late, or with its price on the slip, embarrasses the giver. The page must commit
to a delivery date only when the data supports it, say plainly when it cannot, and show
before payment that the packing slip will carry the note and no prices.

## Success criteria

- Unaided: she enters a separate recipient address and previews the note (step 5).
- Unaided: before paying she can say whether it will arrive by the date and that no
  price will show.
- Unaided: she finds the hide-prices option (step 2).
- Target (to calibrate): gift chosen to paid, **under 5 minutes**.

**Observe:** whether she looks for "send as a gift" before or after choosing the product;
whether she looks for gift wrap; whether she asks to send to someone abroad.

## After launch — a gift to a recipient abroad (not run at launch)

When export opens (S3 changes; D47's rupiah-first design, COMMERCE.md §3) this half runs
again with the original prompt — her mother in Perth, three weeks, "without her having to
pay anything when it arrives, if you can manage that". It needs Australia as an
estimate-only market (the day's AUD rate for the "≈" figure, the USD rate and buffer for
PayPal), DHL Express or the flat table, and duties estimated and shown before payment
(DAP), the duty line explicit because the recipient is not the buyer. Its trust moment is
"will it arrive in time, and will she be charged?" The path, as designed before S3 and
S10 (its gift wrap, step 2, is not offered — S10):

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
the recipient opens it on the date (mail catcher) → the balance-check page. Gift cards
are not offered at launch (S10); this path returns only if the owner adds them.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S3 (Indonesia only at launch), S10 (a
gift note only, prices hidden), S7 (everything in stock), S12 (a damaged print replaced on
a photo), S13 (free shipping over Rp 500.000) — folded in above. **Still owed by the
owner:** the price list (S2). **Settled by the replan (TASKS.md 6.4):** no gift wrap and
no gift card at launch — a gift note only, prices hidden on the packing slip; the gift
card stays in the engine (`commerce.giftCards`) for when the owner offers one (S10;
EXPERIENCE-SHOP.md §7, §10, §11); phase 32's Done when names the gift note. **Still open
elsewhere:** when export opens, D2 and D47's adviser questions, and whether DDP is worth
offering for a gift abroad — the after-launch half.
