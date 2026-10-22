# J-S2 — A tourist buying in Bali → delivered to her villa before she flies (shipped home to the Netherlands: after launch)

> **Reshaped 2026-10-01 — S3, D47.** The shop sells within Indonesia only at launch: no
> checkout to an address abroad, so no "≈ €" estimate and no PayPal charge. This
> journey's launch path is the tourist who cannot carry a framed print home and has it
> **delivered to her villa before her departure date** (S11), or collects it at the
> showroom (S4). The original "send it home to the Netherlands" path is kept below as
> **after launch** — it runs when export opens, on D47's rupiah-first design. The file
> name is kept so links resolve.

**Who:** a Dutch tourist on holiday in Ubud, on her phone on hotel Wi-Fi. She wants a
large framed print of old Bali but cannot carry it on the plane. She decides between
having it delivered to her villa before she leaves and collecting it at the showroom;
she would rather have sent it home to the Netherlands, which the shop does not do yet.

**Rests on:** **S3 and D47** (delivery within Indonesia only at launch), **S11** (a Bali
courier with a "deliver before" date; same-day where the courier offers it), S4 (pickup
at the showroom), S7 (everything in stock), S13 (free shipping over Rp 500.000),
EXPERIENCE-SHOP.md §4 (the delivery promise; the holiday calendar), §5 (glass glazing only
for Bali; sizes up to the design's print ceiling, D26, C9 `printCeilingOf()`), §7 ("I'm
visiting Bali"; "packs flat, under 1 kg"), COMMERCE.md §3 (IDR only for an Indonesian
delivery), §5 (a "deliver before" date), D2 (the Indonesian seller), PAYMENTS.md §6,
Requirement 7.5, 18.

**Used by:** 32.1.a e2e (the launch half only), 32.2 usability (the tourist session:
this half and J-S6, 32.2.b), phase 32 **Done when** ("a tourist in Bali has a print
delivered to her villa before a date, or picks it up at the showroom; a visitor whose
ship-to is abroad is told, once, that the shop delivers within Indonesia only and reaches
no checkout abroad (S3)").

## Before the session

- On staging: a framed print in stock with glass glazing (Bali delivery allows it); a
  stocked, flat-packing product under 1 kg; the one rupiah price list (S2 test values —
  the price list is still owed); the Bali visitor paths switched on; the ship-to preset
  to Indonesia (Bali).
- A Bali courier rate with a "deliver before" date (Biteship sandbox or a seeded table),
  and a date inside the session's three days that the holiday calendar closes (Nyepi), so
  the promise has to move round it.
- The Midtrans sandbox with a foreign test card, QRIS and e-wallets; the mail catcher
  open.

## Say to the participant

> "You are on holiday in Bali and love this framed print, but it won't fit in your
> suitcase. You fly home in three days. Work out your options, then buy it so that you
> have it before you leave."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` (`item`) | see "I'm visiting Bali" with its paths: deliver to my hotel or villa **before my departure date**, or collect at the showroom | shown to a visitor, never forcing Indonesian defaults on her; "send it home" is not offered at launch — the page says plainly, once, that the shop delivers within Indonesia only for now — "We deliver within Indonesia only for now" (S3; EXPERIENCE-SHOP.md §2, §4); there is no ship-to selector to switch; the packaging copy says what fits a suitcase |
| 2 | `Item` › configurator | choose a frame with **glass glazing**, allowed for a Bali delivery | sizes stop at the design's print ceiling (its crop at 240 ppi, C9 `printCeilingOf()`); only variants in stock are offered (S7) |
| 3 | `Item` › delivery promise | read whether it can reach her villa **before her departure date** | the Bali courier's estimate, same-day where the courier offers it (S11); the holiday calendar is read (Nyepi closes Bali, its airport and couriers); a date that cannot be met is said plainly, with pickup at the showroom offered |
| 4 | `Cart` | see the line, the **free-shipping bar toward Rp 500.000** (S13) and the voucher field | totals in rupiah alone; the bag re-prices on the server — `PriceChanged` if it moved |
| 5 | `Checkout` (Contact, Delivery, Shipping method, Payment) | give her email and WhatsApp number, the **villa's address** in Bali and the **"deliver before" date** — her departure; choose the courier | a foreign WhatsApp number is accepted with its country code; the address pickers find a villa in Ubud; guest only (D31) |
| 6 | Payment | pay by her foreign card, or by QRIS or an e-wallet if she has one | the card is charged the exact rupiah total, and the step says her bank may convert it again (D47's note); declined → another method, the bag kept |
| 7 | `Order` and email | see the order, the seller's identity, the "deliver before" date, later the courier's tracking | order updates by email (D14 default) |

**Alternate path (run one per session, rotating):** *collect at the showroom* — pickup,
as J-S4 steps 4–7, the showroom's hours shown once the owner gives them (S4).

## Channel handoffs

The site → her **card issuer** (3-D Secure in her Dutch bank app) or an e-wallet → back to
`Order` → confirmation **email** → the **Bali courier**'s tracking → the villa's front
desk.

## The moment that decides trust

**Step 3 — "will it reach my villa before I fly?"** A tourist buying something she cannot
carry fears paying for a print that arrives the day after she has left. The promise must
say plainly whether the courier can deliver before her departure date — reading Nyepi and
the courier's real estimate — and offer the showroom pickup when it cannot. Earlier,
step 1: visiting-Bali paths that show the shop has thought about someone like her, and an
honest line that it cannot send things abroad yet, rather than a checkout that fails at
the address.

## Success criteria

- Unaided: she finds the visiting-Bali paths (step 1) and can say why "send it home" is
  not one of them.
- Unaided: before paying she can say whether it will arrive before she flies, what it
  costs in rupiah, and that her card is charged in rupiah.
- Unaided: she gives the villa address and the "deliver before" date (step 5).
- Target (to calibrate): options understood, **under 60 seconds**; product to paid,
  **under 4 minutes**.

**Observe:** which path she picks first; whether she still asks for delivery home;
whether a rupiah-only price confuses her.

## After launch — sent home to the Netherlands (not run at launch)

When export opens (S3 changes; D47's rupiah-first design, COMMERCE.md §3 and PAYMENTS.md
§6), this half runs again with the participant told to "have it sent to your home in the
Netherlands". It needs the Netherlands as an estimate-only market (the day's EUR rate for
the "≈" figure, the USD rate and buffer for PayPal's charge), PayPal and card sandboxes,
and a DHL Express rate or the flat table. Its trust moment is the total before payment: a
card charged the exact rupiah (the euro an estimate), PayPal's dollar charge shown before
she picks it, shipping, and import duties estimated and paid on arrival (DAP). The path,
as designed before S3:

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` (`item`) | see "I'm visiting Bali" with three paths: deliver to my hotel or villa **before my departure date**, collect at the showroom, or **send it home** | shown to a visitor, never forcing Indonesian defaults on her; the packaging copy says what fits a suitcase |
| 2 | shell › ship-to selector | switch ship-to to the **Netherlands** | every price stays the exact rupiah and gains its euro estimate beside it — "≈ €46 — charged in Rp 812.000" (D47's default: the day's rate, no buffer, whole euros, display only); no euro list price and no free currency switcher |
| 3 | `Item` › configurator | see glass glazing now **disabled with its reason**; choose acrylic | "From" prices recomputed for the destination, in rupiah with the "≈ €" beside them: never a variant that cannot ship there; sizes still stop at the design's print ceiling (its crop at 240 ppi, C9 `printCeilingOf()`) — ship-to never changes it |
| 4 | `Item` › delivery promise | read an honest estimate to the Netherlands, **duties estimated** | a POD route abroad is absent at launch — the order ships from Bali (D23); the holiday calendar (Nyepi closes Bali, its airport and couriers) is read |
| 5 | `Cart` | see the line re-priced with a **visible notice** that the destination changed | a line that became invalid on the ship-to change says why and offers acrylic; the totals stay in rupiah with the "≈ €" beside them; the free-shipping bar recomputes for the destination |
| 6 | `Checkout` (Contact, Delivery, Shipping method, Payment) | give her email and Dutch address; choose a rate | export checkout is guest checkout; a courier-rate outage → the flat table, labelled "estimate"; duties and the DAP rule stated before payment ("the recipient pays import duties on arrival", S3) |
| 7 | Payment | pay by card or PayPal (both charged by the Indonesian seller) | D47's default: the card option says it is charged the exact rupiah total (her bank may convert it again); the PayPal option shows its **USD charge** — the rupiah total converted once at the day's rate plus the USD buffer — **before she chooses it**, and that is what PayPal takes; declined → another method, the bag kept; express wallets only where the seller supports them |
| 8 | `Order` and email | see the order, the seller's identity, the per-shipment estimate, later the tracking link | made-to-order plus shipment shows one estimate per shipment; order updates by email |

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S3 (Indonesia only at launch), S11 (a
Bali courier with a "deliver before" date; same-day where offered), S4 (pickup at the
showroom), S7 (everything in stock), S13 (free shipping over Rp 500.000) — folded in
above. **Still owed by the owner:** the price list (S2); the showroom's opening hours, for
the pickup path (S4). **Settled by the replan (TASKS.md 6.4):** a visitor who wants
delivery abroad at launch finds **no ship-to selector** — the shop's one market is
Indonesia — and reads, once, that it delivers within Indonesia only for now (S3;
EXPERIENCE-SHOP.md §2, §4; COMMERCE.md §2); phase 32's Done when now names this launch
half and that sentence. **Still open elsewhere:** when export opens, D2 and D47's adviser
questions (a rupiah charge abroad by card, USD by PayPal) — the after-launch half above.
