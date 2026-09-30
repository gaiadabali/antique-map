# J-S2 — A tourist buying in Bali, shipped home to the Netherlands

**Who:** a Dutch tourist on holiday in Ubud, on her phone on hotel Wi-Fi. She wants a
large framed print of old Bali but cannot carry it on the plane. She decides between
having it delivered to her villa before she leaves, collecting it at the showroom, or
sending it home to the Netherlands.

**Rests on:** EXPERIENCE-SHOP.md §4 (the delivery promise; the holiday calendar), §5
(glass glazing only for Bali), §7 ("I'm visiting Bali": three paths; export checkout;
"packs flat, under 1 kg"), COMMERCE.md §3 (currency by destination and seller; a
converted estimate names the charged currency), §5 (a "deliver before" date; a bag that
leaves Indonesia re-prices), §8 (DAP duties shown before payment; POD abroad **not at
launch**, D23: export orders ship from Bali), D2 (the Indonesian seller charges IDR by
card or USD by PayPal), PAYMENTS.md §6, Requirement 7.5, 18.

**Used by:** 32.1.a e2e, 32.2 usability (the tourist sessions), phase 32 **Done when** ("a
tourist switches ship-to to the Netherlands and sees euro prices and a duties estimate").

## Before the session

- On staging: a framed print with glass glazing available in Bali and acrylic
  elsewhere; a stocked, flat-packing product under 1 kg; the export market list for the
  Netherlands (euro prices, S2 test values); a DHL Express sandbox rate or the flat table.
- The Bali visitor paths switched on; the ship-to preset to Indonesia (Bali) at the
  start; PayPal and card sandboxes; the mail catcher open.

## Say to the participant

> "You are on holiday in Bali and love this framed print, but it won't fit in your
> suitcase. Work out your options, then have it sent to your home in the Netherlands."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` (`item`) | see "I'm visiting Bali" with three paths: deliver to my hotel or villa **before my departure date**, collect at the showroom, or **send it home** | shown to a visitor, never forcing Indonesian defaults on her; the packaging copy says what fits a suitcase |
| 2 | shell › ship-to selector | switch ship-to to the **Netherlands** | prices re-render in the Netherlands market's currency; the page says the charged currency where it differs ("≈ €… — charged in Rp …", or PayPal in USD — how a euro list price and an IDR charge are shown together is not yet settled in COMMERCE.md; D2); no free currency switcher |
| 3 | `Item` › configurator | see glass glazing now **disabled with its reason**; choose acrylic | "From" prices recomputed for the destination: never a variant that cannot ship there |
| 4 | `Item` › delivery promise | read an honest estimate to the Netherlands, **duties estimated** | a POD route abroad is absent at launch — the order ships from Bali (D23); the holiday calendar (Nyepi closes Bali, its airport and couriers) is read |
| 5 | `Cart` | see the line re-priced with a **visible notice** that the destination changed | a line that became invalid on the ship-to change says why and offers acrylic; the free-shipping bar recomputes after the currency change |
| 6 | `Checkout` (Contact, Delivery, Shipping method, Payment) | give her email and Dutch address; choose a rate | export checkout is guest checkout; a courier-rate outage → the flat table, labelled "estimate"; duties and the DAP rule stated before payment ("the recipient pays import duties on arrival", S3) |
| 7 | Payment | pay by card (charged by the Indonesian seller) or PayPal | the method names what is charged; declined → another method, the bag kept; express wallets only where the seller supports them |
| 8 | `Order` and email | see the order, the seller's identity, the per-shipment estimate, later the tracking link | made-to-order plus shipment shows one estimate per shipment; order updates by email |

**Alternate paths (run one per session, rotating):** *deliver before departure* — the
"deliver before" date and the villa address in Bali, glass glazing allowed; *collect at
the showroom* — pickup, as J-S4 step 6–7.

## Channel handoffs

The site → her **card issuer** (3-D Secure in her Dutch bank app) or **PayPal** → back
to `Order` → confirmation and shipping **email** → **DHL Express** tracking → possibly a
**duties notice** from the carrier at her door (DAP), which the site warned her of.

## The moment that decides trust

**Steps 6–7 — the total before she pays.** A tourist buying abroad fears two things: a
charge in a currency she did not expect and a customs bill at her door. The total must
say in which currency she is charged, what shipping costs, and that import duties are
estimated at €… and paid on arrival — plainly, before she taps Pay. Earlier, step 1:
the three "I'm visiting Bali" paths show that the shop has thought about someone like her.

## Success criteria

- Unaided: she finds the "send it home" path and switches ship-to (steps 1–2).
- Unaided: before paying she can say the currency charged, the shipping cost, and
  whether she will pay duties on arrival.
- Unaided: she understands why glass glazing disappeared (step 3).
- Target (to calibrate): options understood and ship-to switched, **under 60 seconds**;
  product to paid, **under 4 minutes**.

**Observe:** which of the three paths she picks first; whether a euro figure beside a
rupiah charge confuses or reassures her.

## Open until the owner answers

S3 (shipping abroad and duties), S11 (delivery to villas before departure; same day),
S7 (lead time before it ships), S2 (euro prices). Adviser: D2 (the charged currency).
