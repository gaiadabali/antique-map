# J-G8 — A call to the gallery → an agreed price → the invoice by email → paid in full, or released at its due date

> **New 2026-10-01 — D50.** Replaces the offer journey ([J-G6](j-g6-offer-counter-pay.md),
> retired): with no online offers, the negotiation happens on the phone, and what the site
> must get right is the invoice that follows — its figure, its due date, its hold, and what
> happens when it is paid or is not.

**Who:** a collector abroad, on a desktop at home, interested in a map they have seen on
the site. Like every original it reads "Price on request". They would rather talk to a
dealer than type to one: they call the gallery in Singapore, agree a price, and then
want the paperwork to match the conversation.

**Rests on:** **D50** (enquiry-only; a call or WhatsApp to negotiate; a staff-issued
invoice paid online through the site's gateway), **D45** (the invoice holds the piece
from issue until the due date staff set; released automatically if unpaid), D22 (no
online offers), G3 ("call and negotiate directly — the one in Singapore"), G9 (the reply
promise), G11 (shipping and duties the buyer's, quoted on the invoice; nothing ships
before full payment), COMMERCE.md §4 (`invoice` holds through `reserve()`), PAYMENTS.md §1
(the late-payment path), §5–6 (`/pay/{token}`; above ~USD 5–10k steer to bank transfer),
TASKS.md 24.5 (the order builder staff issue the invoice from), Requirement 6.4, 6.11, 9.

**Used by:** 35.1.a e2e (the invoice → paid, and the invoice → released at its due date),
35.2 usability, phase 35 **Done when** (6.4.e proposes the wording).

## Before the session

- On staging: one available original in the export seller's stock, with its images,
  record and stock number.
- The facilitator plays the gallery on the phone, with a figure the script fixes, and
  issues the invoice in the admin (24.5) during the session: the agreed figure, shipping
  and insurance to the participant's country, the duties note, a due date.
- For the alternate path: a second original already invoiced to "someone else", whose
  due date has passed, so its automatic release can be shown.
- A second browser, signed out, playing "another visitor"; the Stripe and bank-transfer
  sandboxes answering; the mail catcher open.

## Say to the participant

> "You like this map and you prefer to talk to the dealer before buying anything this
> expensive. Get in touch with them, agree a price — the facilitator will play the
> gallery — and take it as far as paying for it."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` (`item`) › purchase panel | read "Price on request" and find **how to call** the gallery, beside WhatsApp and an enquiry | no price or purchase control (D50); on a desktop the number is shown as text as well as a `tel:` link; the reply promise "the same working day, Singapore time" (G9) beside each way to ask |
| 2 | the call (outside the site, role-played) | agree a price; give a name, an email and a delivery address so staff can quote shipping and duties | the piece stays **Available** during the call — nothing holds it before the invoice (D45) |
| 3 | email (mail catcher) | open the invoice: the piece with its stock number, **the agreed figure**, shipping and insurance, the duties note (the buyer's, G11), the total and its currency, the **due date**, the seller, a link to pay | the email and the page carry the same figures; the email names what happens at the due date |
| 4 | `Item` in the second browser ("another visitor") | see the piece read "**On hold until {due date}**" | the hold starts the moment staff issue the invoice (D45); no purchase control for anyone |
| 5 | `Pay` (`pay/[token]`) | read the invoice again; pay — steered to bank transfer at this value, or by card | bank transfer → instructions, then "payment must be received and confirmed"; a transfer that falls short → staff contact, **nothing ships**, the due date restated (G11); card declined → another method, the hold intact |
| 6 | `Order` and email | see the order paid in full, the certificate, and that shipping is arranged now | one transaction marks payment, reservation and order together (design.md); the courier is booked only after full payment (G11) |

**Alternate path — unpaid by the due date:** the second original's invoice has passed its
due date → the piece is **released automatically** and reads Available again (D45) → its
pay link opens a designed page saying the invoice has passed its due date, with the ways
to contact the gallery, never a bare gateway error → a payment that arrives after the
release takes the late-payment path: sold to that buyer if the piece is still free, else
refunded automatically and told (PAYMENTS.md §1).

## Channel handoffs

The site → a **phone call** to the gallery in Singapore → staff issue the invoice in the
admin → the invoice by **email** with its pay link → the `Pay` page → the buyer's **bank**
(transfer) or Stripe (card) → staff confirm receipt → `Order` and the confirmation
**email** → the insured courier, once paid in full.

## The moment that decides trust

**Step 3 — the invoice in the inbox after the call.** What was said on the phone comes
back in writing: the same figure, in the currency discussed, with shipping and duties
named rather than added later, a due date, and the piece held for them until then. An
invoice that differs from the conversation by a single line ends the relationship; one
that matches it exactly is why a collector buys from this dealer again.

## Success criteria

- Unaided: the participant finds how to call the gallery (step 1).
- Unaided: from the invoice email, they can say the figure, what it includes, the due
  date and what happens if it is not paid by then.
- Unaided: they pay it (step 5) and can say when the map will ship.
- The pay link charges the figure stored on the invoice (e2e asserts it; money is priced
  on the server, never taken from the request).
- On the alternate path, the piece is released at its due date with no staff action
  (e2e asserts it).
- Target (to calibrate): item page to the call started, **under 60 seconds**; invoice
  opened to paid by card, **under 3 minutes**.

**Observe:** whether they would rather email or WhatsApp than call; whether the due date
reads as courtesy or pressure; whether they understand that nothing ships until it is
paid in full.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G3 and G3b (call to negotiate, then a
staff invoice paid online), G5 (held until the invoice is due, released if unpaid), G8
(no offers), G9 (same working day, Singapore time), G11 (shipping and duties on the
invoice, paid in full before sending). **Still owed by the owner:** nothing. Not asked in
the interview: the number buyers call and the hours it is answered (to confirm with the
owner). **Still open elsewhere:** the invoice's surface, the methods it offers, whether a
reminder goes out before the due date, and what a visitor who asked to be alerted on the
held page receives at the release (TASKS.md 6.4.a); D1 (the seller), adviser.
