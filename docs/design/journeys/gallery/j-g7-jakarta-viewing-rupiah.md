# J-G7 — A Jakarta collector → rupiah prices → book a viewing → buy

**Who:** a collector living in Jakarta who wants to see two prints in person before
deciding. On their phone, in Indonesian. They deliver in Indonesia, so every price must
be in rupiah alone.

**Rests on:** COMPLIANCE.md §1 (#2 the rupiah rule: no foreign amount beside IDR for an
Indonesian delivery; #1 export gating), COMMERCE.md §3 (currency by destination),
EXPERIENCE-GALLERY.md §4 (price presets per market currency, e.g. < Rp 5 juta), §9
(Visit: each location by appointment, slots showing their time zone, confirmation by
email with an `.ics`, a WhatsApp reminder, rescheduling), §10 (the wishlist as the
viewing pull list), D1 (default: an Indonesian seller for Jakarta stock sold
domestically), D29 (Singapore-held stock to an Indonesian address priced in IDR), D14
(reminders by email until a WhatsApp provider is chosen), BRANDS.md §4
(`services.appointments`), Requirement 6.9, 18 (currency and compliance).

**Used by:** 35.1.a e2e, 35.2 usability (the Indonesian-language session).

## Before the session

- On staging: two prints held in Jakarta (one `domestic-only`), one item held in
  Singapore, each priced; a Jakarta `Location` with appointment slots in WIB (UTC+7).
- The Indonesian locale (`/id/…`) with the lexicon (TASKS.md 6.3); a buyer test account.
- The Indonesian seller's Midtrans sandbox (VA for high value); the mail catcher open.

## Say to the participant (in Indonesian if they prefer)

> "You live in Jakarta and want to see two prints before you decide. Find two you like
> and arrange to see them at the gallery. Then imagine the visit went well: buy one."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | shell › ship-to selector; locale | set Indonesia as ship-to and read in Indonesian | every price turns to **IDR alone** — tiles, facets, curations, the bag, sister links — with no "≈ USD"; the locale switch keeps the page; a Dutch or English caption carries its own `lang` |
| 2 | `Browse` | filter prints by price with rupiah presets (< Rp 5 juta · 5–15 juta…) | the presets come from brand config per market; "include price on request" |
| 3 | `Item` | read the purchase panel for each | the Jakarta `domestic-only` print is fully buyable for delivery in Indonesia; the same print viewed with ship-to Singapore reads "Available for delivery within Indonesia · View it in Jakarta" (the contrast the facilitator shows at the end) |
| 4 | `Item` › wishlist → `Account` › wishlist | save the two prints | signing in keeps them; the wishlist becomes the viewing's pull list |
| 5 | `Item` or `Location` (`location`) › Book a viewing → `Form` (`appointment` kind) | choose Jakarta and a slot | slots show **WIB (UTC+7)** explicitly; a slot taken meanwhile → the next free ones offered; JavaScript off → posts and returns |
| 6 | email (+ `.ics`) | receive the confirmation naming the address, the time with its zone, and **the pieces that will be out** (the pull list) | the reminder by email (D14 default); reschedule and cancel from `Account` › viewings |
| 7 | at the gallery (role-played) → `Pay` or `Checkout` | buy one print: staff send a pay link, or the participant checks out on the phone | the seller is the Indonesian seller for Jakarta stock (D1 default); VA for a high amount; QRIS never offered above IDR 10 m (payment caps) |
| 8 | `Order` (payment pending → paid) | see the exact amount, the VA to copy, per-bank steps, the countdown, then *Paid* automatically | as J-S7: failed or expired → another method |

## Channel handoffs

The site → a viewing confirmation **email with an `.ics`** into their calendar → a
reminder (email now; WhatsApp once D14 is answered) → an **in-person** visit → a staff
**pay link** or checkout → the buyer's **bank app** (VA) → back to `Order`.

## The moment that decides trust

**Step 6 — the viewing confirmation.** A collector who crosses Jakarta for a viewing
needs to know the address, the time in their own time zone, and that the pieces they
chose will be out of the drawer. A confirmation that lists them by stock number says
"we are ready for you". Underneath, step 1: a price in rupiah alone tells them the
gallery is set up to sell to them lawfully at home.

## Success criteria

- Unaided: with ship-to Indonesia, no foreign amount appears anywhere in the path (e2e
  asserts it on every surface of the path).
- Unaided: the participant books a slot (step 5) and can say the time zone of the slot.
- The confirmation lists the two saved pieces.
- Unaided: they can say who sells them the print and how they would pay.
- Target (to calibrate): two prints saved and a viewing booked, **under 4 minutes**.

**Observe:** whether the Indonesian copy reads as natural *Anda* register; whether they
expect WhatsApp rather than email for the confirmation.

## Open until the owner answers

G2 (the gallery's cities, addresses and whether viewings are by appointment), G9 (hours
and time zone), G15 (who meets the collector), G3 (how a viewing turns into a sale today).
Adviser: D1 (the Jakarta seller).
