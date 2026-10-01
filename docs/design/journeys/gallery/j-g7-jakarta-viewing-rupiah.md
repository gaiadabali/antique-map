# J-G7 — A Jakarta collector → book a viewing → an invoice in rupiah

> **Reshaped 2026-10-01 — D50, G2.** No original shows a price, so the rupiah rule is no
> longer tested on tiles and facets but on the one figure this buyer sees: the invoice
> staff issue after the viewing, in rupiah alone. Viewings are by appointment in
> Singapore and Jakarta only (G2). The file name is kept so links resolve.
>
> **Updated 2026-10-01 — D54, D51, D45 (TASKS.md 6.6.b).** No account: the two prints are
> saved on this phone, and that list is the viewing's pull list; the viewing is changed
> through its confirmation's link or on WhatsApp. The invoice opens on the gallery's own
> pay page, due in three days unless staff set another date.

**Who:** a collector living in Jakarta who wants to see two prints in person before
deciding. On their phone, in Indonesian. They take delivery in Indonesia, so any amount
they are shown must be in rupiah alone.

**Rests on:** **D50** (enquiry-only; a staff-issued invoice paid online), **D54** (no
accounts: the wishlist on the device, the viewing changed by its confirmation's link),
D51 (the invoice on the gallery's own pay page), D45 (the invoice holds the piece until
its due date — 3 days unless staff set another, a reminder 24 hours before), G2 (viewings by appointment in Singapore and Jakarta
only), G9 (the reply promise), G11 (shipping and duties the buyer's, paid in full before
sending), COMPLIANCE.md §1 (#2 the rupiah rule: no foreign amount beside IDR for an
Indonesian delivery; #1 export gating), EXPERIENCE-GALLERY.md §9 (Visit: each location by
appointment, slots showing their time zone, confirmation by email with an `.ics`, a
WhatsApp reminder, rescheduling through the confirmation's own link), §10 (the device's
wishlist as the viewing pull list), D1
(default: an Indonesian seller for Jakarta stock sold domestically), D29 (Singapore-held
stock to an Indonesian address priced in IDR), D14 (reminders by email until a WhatsApp
provider is chosen), BRANDS.md §4 (`services.appointments`), Requirement 6.9, 18
(currency and compliance).

**Used by:** 35.1.a e2e, 35.2 usability (the Indonesian-language session).

## Before the session

- On staging: two prints held in Jakarta (one `domestic-only`) and one item held in
  Singapore; a Jakarta `Location` with appointment slots in WIB (UTC+7).
- The Indonesian locale (`/id/…`) with the lexicon (TASKS.md 6.3); the phone's browser
  with an empty wishlist — no account to prepare (D54).
- Staff (or the facilitator in the admin) ready to issue an invoice in rupiah after the
  role-played viewing; the Indonesian seller's Midtrans sandbox (VA for high value); the
  mail catcher open.

## Say to the participant (in Indonesian if they prefer)

> "You live in Jakarta and want to see two prints before you decide. Find two you like
> and arrange to see them at the gallery. Then imagine the visit went well and you agreed
> a price for one: pay for it."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | shell › locale; ship-to | read in Indonesian with Indonesia as ship-to | no original shows a price in any currency (G4); the only amounts on the path — the sister links to the shop's prints — are **IDR alone**, with no "≈ USD"; the locale switch keeps the page; a Dutch or English caption carries its own `lang` |
| 2 | `Browse` | filter prints by place, date and type | no price facet or price sort — they would reveal what the pages hide (G4; COMMERCE.md §7) |
| 3 | `Item` | read the purchase panel for each: "Price on request", the status, **Book a viewing**, WhatsApp, an enquiry | the Jakarta `domestic-only` print reads as available to view and buy in Indonesia; the same print viewed with ship-to Singapore reads "Available for delivery within Indonesia · View it in Jakarta" (the contrast the facilitator shows at the end) |
| 4 | `Item` › the heart → `Wishlist` (`wishlist`) | save the two prints | saved on this phone at once — no account and no email asked for (D54); the page says the list lives on this device; the list becomes the viewing's pull list |
| 5 | `Item` or `Location` (`location`) › Book a viewing → `Form` (`appointment` kind) | choose Jakarta and a slot; the form carries the two prints from the device's list | only Singapore and Jakarta are offered (G2); the pull list is the pieces saved on this phone, editable before sending; slots show **WIB (UTC+7)** explicitly; a slot taken meanwhile → the next free ones offered; JavaScript off → posts and returns |
| 6 | email (+ `.ics`) | receive the confirmation naming the address, the time with its zone, and **the pieces that will be out** (the pull list) | the reminder by email (D14 default); reschedule and cancel through **the confirmation's own link** — or on WhatsApp — never through an account (D54); the link still works from another device |
| 7 | at the gallery (role-played) → staff issue the invoice | agree a price in person; receive the invoice's link by email (or shared into WhatsApp) | the invoice is **in rupiah alone**, from the Indonesian seller for Jakarta stock (D1 default); the piece reads "On hold until {due date}" to everyone (D45) — three days out unless staff set another date; a reminder 24 hours before |
| 8 | `Pay` (`pay/[token]`) → `Order` (payment pending → paid) | on the gallery's own pay page (D51), pay by VA: the exact amount, the VA to copy, per-bank steps, the countdown, then *Paid* automatically | Midtrans inside the page for the IDR invoice, bank transfer beside it — until the Indonesian seller has a Midtrans account (D3), bank transfer alone (PAYMENTS.md §6); QRIS never offered above IDR 10 m (payment caps); failed or expired → another method, the hold intact until the due date; collected or delivered only once paid in full (G11) |

## Channel handoffs

The site → a viewing confirmation **email with an `.ics`** into their calendar → a
reminder (email now; WhatsApp once D14 is answered) → an **in-person** visit and the
negotiation → the staff-issued **invoice** by email or WhatsApp → the `Pay` page → the
buyer's **bank app** (VA) → back to `Order`.

## The moment that decides trust

**Step 6 — the viewing confirmation.** A collector who crosses Jakarta for a viewing
needs to know the address, the time in their own time zone, and that the pieces they
chose will be out of the drawer. A confirmation that lists them by stock number says
"we are ready for you". Underneath, step 7: an invoice in rupiah alone, from the company
that sells Jakarta stock at home, tells them the gallery is set up to sell to them
lawfully in Indonesia.

## Success criteria

- Unaided: with ship-to Indonesia, no foreign amount appears anywhere in the path, and no
  price appears on any original (e2e asserts both on every surface of the path).
- Unaided: the participant books a slot (step 5) and can say the time zone of the slot.
- The confirmation lists the two pieces saved on the phone.
- Unaided: the participant can say how they would move the viewing (the confirmation's
  link, or WhatsApp).
- Unaided: from the invoice they can say who sells them the print and how they would pay.
- Target (to calibrate): two prints saved and a viewing booked, **under 4 minutes**.

**Observe:** whether the Indonesian copy reads as natural *Anda* register; whether they
expect WhatsApp rather than email for the confirmation; whether they look for an account
to manage the viewing; whether they expect to pay at the gallery rather than online.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G2 (Singapore and Jakarta, by
appointment only), G3 and G3b (the sale closes in conversation; staff invoice, paid
online), G4 (no price shown), G9 (same working day, Singapore time), G11 (paid in full
before it leaves), G15 (the admin in both languages — staff work in either) — folded in
above. **Still owed by the owner:** nothing for this journey. Not asked in the interview:
the Jakarta address and the hours viewings are offered (an absence until the owner gives
them). **Settled by the replan (TASKS.md 6.4):** the Indonesian seller's invoice offers
Midtrans (VA for high value, cards in IDR) and bank transfer, inside the gallery's own pay
page (D51; PAYMENTS.md §6); no accounts — the device's wishlist and the confirmation's
link (D54); the 3-day term and the 24-hour reminder (D45). **Still open elsewhere:** D1
(the Jakarta seller), adviser; D3 (the Indonesian seller's Midtrans account); D14
(WhatsApp reminders).
