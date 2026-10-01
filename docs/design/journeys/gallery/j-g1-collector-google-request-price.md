# J-G1 — A collector from Google on a phone → item → verso zoom → request price → WhatsApp → payment link

**Who (the part the participant plays):** a collector in Singapore who knows the
region's cartography. On the train, on their own phone, they search Google for a map
by name and land straight on its item page. The map is above the gallery's highest tier
(~USD 25,000), so its price is on request.

**Rests on:** D30 (the gallery sells online), D22 (holds and pay links), D14 (until a
WhatsApp provider is chosen, notifications go by email; click-to-chat works regardless),
COMMERCE.md §7 (tiers, request price in place), PAYMENTS.md (payment links, `/pay/{token}`),
EXPERIENCE-GALLERY.md §5–6, Requirement 6.1, 6.2, 6.7, 6.11.

**Used by:** 13.2 (steps marked **P**), 35.1.a e2e, 35.2 usability, phase 35 **Done when**
("zooms an item's verso, requests the price").

## Before the session

- On staging: one priced-on-request item above the top tier, with a recto, a **verso**
  and a detail image tiled for deep zoom, a stock number, references and a condition
  grade; seller: the export seller (D1 default); export status `cleared` or
  `not-applicable`; **not** marked sensitive. A second item marked **sensitive**, for the
  alternate path.
- A staff member (or the facilitator in the admin) ready to answer on a test WhatsApp
  number, to place a **hold** and to send a payment link.
- The Stripe sandbox answering; the mail catcher open.
- The participant's phone, its default browser; a Google result is simulated by a link
  to the item's legacy address (`/product/{id}-{slug}`) sent to the phone.

## Say to the participant

> "You collect old maps of the East Indies. A friend told you about this map and you
> have just found it on Google. Look at it the way you would before buying, find out
> what it costs, and if you like it, get to the point where you could pay for it."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 **P** | `Item` (`item`), reached at `/product/{id}-{slug}` unchanged | read the hook title (or the designed fallback: the original title as H1, the maker line promoted), maker with certainty, date with precision, stock number | first paint: the primary image is a real `<img>` and the LCP; the purchase panel reserves its height and reads "Checking availability…" — no purchase control until it resolves; `unverified` if availability times out |
| 2 **P** | `Item` › deep-zoom viewer | open the viewer on the image, pinch into the plate mark, **flip to the verso**, go full screen and back out | viewer loads on intent (tap), not before; one-finger pan only once zoomed; full screen is a fixed overlay (not the Fullscreen API); reduced motion → cuts only; tiles fail → the static image stays |
| 3 **P** | `Item` › the record | find condition (the grade, linked to the published scale, plus the cataloguer's notes), dimensions in mm **and** inches, references, provenance | the grade link opens the Condition grades page (`Page`); a missing field is omitted, never "N/A" |
| 4 **P** | `Item` › purchase panel › Request price | give an email or WhatsApp number and see the price **appear on the page** | answered in place, lead logged; the **sensitive** item instead says "A specialist will reply within {hours}" (hours: G9); rate-limited and refused posts each come back with their sentence; JavaScript off → the form posts and the page returns with the price (C13 `FORM_RESULT`) |
| 5 | `Item` › "Ask on WhatsApp" | open WhatsApp with a message prefilled with the **stock number and title** (Req 6.7), in the page's language | WhatsApp not installed → wa.me opens WhatsApp Web; the message is editable |
| 6 | WhatsApp (outside the site) | agree the purchase with staff; staff place a **hold** and send a payment link | the item page now shows "On hold until {date}" to everyone else |
| 7 | `Pay` (`pay/[token]`), opened **inside WhatsApp's in-app browser** | see the piece (image, title, stock number), the agreed figure in the charge currency, the hold's expiry, the seller's legal identity, the methods routing allows | link expired → a designed page with WhatsApp contact, never a bare gateway error; a method the in-app browser cannot complete (3-D Secure pop-up) → "open in your browser", keeping the link; bank transfer offered above ~USD 5–10k (PAYMENTS.md §6) |
| 8 | card via Stripe (sandbox) | pay | declined → retry another method, the hold intact; paid after the hold lapsed → the late-payment path: re-reserved if still free, else refunded automatically and told (PAYMENTS.md §1) |
| 9 | `Order` (`order/[number]`) and the confirmation email | see the order, the seller, what happens next (packing, insured shipping, the certificate) | confirmation from the order-access cookie, never the number alone; email arrives in the mail catcher |

## Channel handoffs

Google → the site (a byte-identical legacy URL) · the site → WhatsApp (prefilled
stock number and title) · WhatsApp → the `Pay` page (the link opens in WhatsApp's
in-app browser) · `Pay` → Stripe (card, 3-D Secure) → back to `Order` · the
confirmation by **email** (D14: no WhatsApp notification until a provider is chosen).

## The moment that decides trust

**Step 7 — the payment link opened from a WhatsApp chat.** A stranger's link in a
chat is where a USD 30,000 buyer hesitates. The `Pay` page must look like the gallery,
show the same piece and the same figure agreed in the chat, name the seller of record
and say until when the piece is held for them. A bare gateway screen here loses the
sale. Second to it: the verso zoom (step 2) — seeing the back of the sheet is what tells
a collector the gallery has nothing to hide.

## Success criteria

- Unaided: the participant finds the verso (step 2) and learns the price (step 4).
- Unaided: from the `Pay` page, the participant can say who they are paying, how much,
  in which currency, and until when the map is held.
- The prefilled WhatsApp message carries the stock number and title.
- No purchase control appears before availability resolves (35.1 e2e asserts it).
- Target (to calibrate in 13.2): Google result to price seen, **under 90 seconds**.

**Observe:** whether they use the loupe or the viewer; whether they read the condition
notes before or after the price; what they say when the `Pay` page opens.

## Open until the owner answers

G3 (does this buyer pay online or only after a talk?), G4 (where "on request" begins),
G9 (the reply time the sensitive path promises), G11 (insured shipping wording).
Defaults: owner-interview.md.
