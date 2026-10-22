# J-G1 — A collector from Google on a phone → item → verso zoom → WhatsApp → the agreed price → the invoice, paid online

> **Reshaped 2026-10-01 — D50.** The gallery is enquiry-only: no price is shown, there is
> no cart, no reserve button and no online offer; a price is agreed on WhatsApp or by
> phone and paid through a staff-issued invoice. This journey used to reveal the price in
> place and end on a payment link for a hold; it now ends on the invoice. The file name is
> kept so links resolve.
>
> **Updated 2026-10-01 — D51, D45, D54, D56 (TASKS.md 6.6).** The invoice opens on the
> gallery's own pay page with the payment element inside it, never a gateway's page (D51);
> it is due in three days unless staff set another date, with a reminder 24 hours before
> (D45); the buyer reaches it and the order by their links, never an account (D54); and the
> panel promises no return of an original (D56, for counsel).

**Who (the part the participant plays):** a collector in Singapore who knows the
region's cartography. On the train, on their own phone, they search Google for a map
by name and land straight on its item page. Like every original, it reads "Price on
request".

**Rests on:** **D50** (enquiry-only; a staff-issued invoice paid online through the site's
gateway), **D51** (the invoice is the gallery's own `/pay/{token}` page, the Stripe Payment
Element embedded, bank transfer beside it — no Stripe-hosted page), **D45** (the invoice
holds the piece until its due date — 3 days unless staff set another — with a reminder 24
hours before, released if unpaid), D54 (no accounts), D56 (no returns of originals — the
owner's intention, still for counsel, D11), D22 (no online offers), G9 (the reply promise), G11 (shipping and duties on the invoice;
nothing ships before full payment), D14 (until a WhatsApp provider is chosen,
notifications go by email; click-to-chat works regardless), PAYMENTS.md §5–6 (`/pay/{token}`,
the methods the gallery's seller routes), TASKS.md 24.5 (the order builder staff issue the
invoice from), EXPERIENCE-GALLERY.md §5–6 (the purchase panel and the invoice), COMMERCE.md
§7, Requirement 6.1, 6.7, 6.11.

**Used by:** 13.2 (steps marked **P**), 35.1.a e2e, 35.2 usability, phase 35 **Done when**
("zooms an item's verso, sees no price and no purchase control … staff issue the agreed
invoice from a phone and it opens on the gallery's own pay page and is paid in the
sandbox").

## Before the session

- On staging: one available original with a recto, a **verso** and a detail image tiled
  for deep zoom, a stock number, references and a condition grade; seller: the export
  seller (D1 default); export status `cleared` or `not-applicable`.
- A staff member (or the facilitator in the admin) ready to answer on a test WhatsApp
  number, to agree a figure the script fixes in advance, and to **issue the invoice** —
  the agreed figure, shipping and insurance to the participant's address, the duties
  note, the due date the builder proposes (three days, D45) — and to share its pay link
  into the chat from the admin on a phone (a `wa.me` share, D51).
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
| 1 **P** | `Item` (`item`), reached at `/product/{id}-{slug}` unchanged | read the hook title (or the designed fallback: the original title as H1, the maker line promoted), maker with certainty, date with precision, stock number | first paint: the primary image is a real `<img>` and the LCP; the purchase panel reserves its height and reads "Checking availability…" until the status resolves; `unverified` if availability times out |
| 2 **P** | `Item` › deep-zoom viewer | open the viewer on the image, pinch into the plate mark, **flip to the verso**, go full screen and back out | viewer loads on intent (tap), not before; one-finger pan only once zoomed; full screen is a fixed overlay (not the Fullscreen API); reduced motion → cuts only; tiles fail → the static image stays |
| 3 **P** | `Item` › the record | find condition (the grade, linked to the published scale, plus the cataloguer's notes), dimensions in mm **and** inches, references, provenance | the grade link opens the Condition grades page (`Page`); a missing field is omitted, never "N/A" |
| 4 **P** | `Item` › purchase panel | read **"Price on request"**, the status, and the ways to ask — WhatsApp, a call, an enquiry — each with the promise "**we reply the same working day, Singapore time**" (G9) | no price, Buy, Reserve or Make an offer anywhere on the page, the tiles or the structured data (G4, D50); the reassurance row shows the Parry certificate and the lifetime authenticity guarantee, and **no returns line** — neither a return promised nor a "final sale" printed until counsel words it (D56, D11); no account asked for anywhere (D54); the enquiry form posts without JavaScript and returns with its result (C13 `FORM_RESULT`); rate-limited and refused posts each come back with their sentence |
| 5 | `Item` › "Ask on WhatsApp" | open WhatsApp with a message prefilled with the **stock number and title** (Req 6.7), in the page's language | WhatsApp not installed → wa.me opens WhatsApp Web; the message is editable |
| 6 | WhatsApp (outside the site) | ask the price, negotiate, agree a figure; give a delivery address so staff can quote shipping and duties | while they talk the piece stays **Available** to everyone — no hold before the invoice (D45); once staff issue the invoice the item page shows "**On hold until {due date}**" to everyone, the buyer included (no one has an account, D54) — three days out unless staff set another date (D45) |
| 7 | `Pay` (`pay/[token]`), opened **inside WhatsApp's in-app browser** | read the invoice on the gallery's own page: its number, the piece (image, title, stock number), **the agreed figure**, shipping and insurance, the duties note (the buyer's, G11), the total in the charge currency, the **due date** ("On hold until {due date}"), the seller's legal identity, "ships once paid in full", the PDF, and the two ways to pay — the Payment Element in the page and bank transfer | in the gallery's design, never a gateway-hosted page (D51); expired (past the due date, released) or voided → a designed page with WhatsApp contact, never a bare gateway error; a method the in-app browser cannot complete (3-D Secure pop-up) → "open in your browser", keeping the link; bank transfer steered to above the card ceiling (~USD 5–10k, PAYMENTS.md §6); left unpaid, the reminder email arrives 24 hours before the due date (D45) |
| 8 | card via Stripe (sandbox) | pay the invoice in full | declined → another method, the hold intact until the due date; paid after the due date → the late-payment path: re-reserved if still free, else refunded automatically and told (PAYMENTS.md §1) |
| 9 | `Order` (`order/[number]`) and the confirmation email | see the order paid in full, the seller, what happens next (packing, insured shipping — only now, G11 — and the certificate) | confirmation from the order-access cookie, never the number alone; email arrives in the mail catcher; later the order is reached by its email's link or the order lookup (its number and email) — no account (D54) |

## Channel handoffs

Google → the site (a byte-identical legacy URL) · the site → WhatsApp (prefilled
stock number and title) · the negotiation **in WhatsApp**, with staff in Singapore ·
staff issue the invoice in the admin on a phone → its link shared into the chat → the
gallery's own `Pay` page (in WhatsApp's in-app browser) · `Pay` → the Payment Element in
the page (card, 3-D Secure) → `Order` · the reminder 24 hours before the due date and the
confirmation, by **email** (D14: no WhatsApp notification until a provider is chosen).

## The moment that decides trust

**Step 7 — the invoice opened from a WhatsApp chat.** A stranger's link in a chat is
where a USD 30,000 buyer hesitates. The `Pay` page must look like the gallery, show the
same piece and **exactly the figure agreed in the chat**, name the seller of record, list
shipping and duties so nothing is added later, and say until when the piece is held for
them — and that it ships once paid in full. A bare gateway screen, or a total that differs
from the chat, loses the sale. Second to it: the verso zoom (step 2) — seeing the back of
the sheet is what tells a collector the gallery has nothing to hide.

## Success criteria

- Unaided: the participant finds the verso (step 2).
- Unaided: they understand the price is not online and start the conversation (steps
  4–5), and can say when they expect a reply.
- Unaided: from the `Pay` page, the participant can say who they are paying, how much,
  in which currency, what shipping and duties come to, and until when the map is held.
- The prefilled WhatsApp message carries the stock number and title.
- No price or purchase control appears on the item page at any point (35.1 e2e asserts
  it).
- Target (to calibrate in 13.2): Google result to WhatsApp opened, **under 90 seconds**.

**Observe:** whether "Price on request" reads as an invitation or a wall; whether they
would rather call than message; whether they worry the piece could sell while they
negotiate (it holds only once the invoice is issued); whether three days to pay reads as
courtesy or pressure; whether they ask about returns (the page promises none, D56); what
they say when the `Pay` page opens.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G3 and G3b (a conversation, then a
staff invoice paid online), G4 (no price shown), G5 (held until the invoice is due), G8
(no offers), G9 (same working day, Singapore time), G11 (shipping and duties the
buyer's, on the invoice, paid in full before sending) — folded in above.
**Still owed by the owner:** nothing for this journey. Not asked in the interview: the
number buyers call (to confirm with the owner). **Settled by the replan (TASKS.md 6.4):**
the invoice is the gallery's own pay page, the Payment Element embedded and bank transfer
beside it (D51; PAYMENTS.md §5–§6); the 3-day term and the 24-hour reminder (D45).
**Still open elsewhere:** the seller on the invoice (D1, adviser); WhatsApp notifications
(D14); whether "no returns of an original" stands under UU 8/1999 art. 18 (D56, counsel,
D11).
