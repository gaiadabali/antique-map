# J-G8 — A call to the gallery → an agreed price → the invoice by email → paid in full, or released at its due date

> **New 2026-10-01 — D50.** Replaces the offer journey ([J-G6](j-g6-offer-counter-pay.md),
> retired): with no online offers, the negotiation happens on the phone, and what the site
> must get right is the invoice that follows — its figure, its due date, its hold, and what
> happens when it is paid or is not.
>
> **Updated 2026-10-01 — D51, D45, D54 (TASKS.md 6.6).** The invoice opens on the gallery's
> own pay page (D51); it is due in three days unless staff set another date, and the buyer
> is reminded 24 hours before it lapses (D45); a visitor who asked on the held page to
> hear is alerted at the release; no one has an account (D54).

**Who:** a collector abroad, on a desktop at home, interested in a map they have seen on
the site. Like every original it reads "Price on request". They would rather talk to a
dealer than type to one: they call the gallery in Singapore, agree a price, and then
want the paperwork to match the conversation.

**Rests on:** **D50** (enquiry-only; a call or WhatsApp to negotiate; a staff-issued
invoice paid online through the site's gateway), **D51** (the invoice is the gallery's
own `/pay/{token}` page, the Payment Element embedded, bank transfer beside it), **D45**
(the invoice holds the piece from issue until the due date staff set — 3 days unless
staff set another — with a reminder 24 hours before; released automatically if unpaid),
D54 (no accounts), D39 (the want-list alert, by email), D22 (no online offers), G3 ("call and negotiate directly — the one in Singapore"), G9 (the reply
promise), G11 (shipping and duties the buyer's, quoted on the invoice; nothing ships
before full payment), COMMERCE.md §4 (`invoice` holds through `reserve()`), PAYMENTS.md §1
(the late-payment path), §5–6 (`/pay/{token}`; above ~USD 5–10k steer to bank transfer),
COMMERCE.md §7 (the invoice, its pay page, the hold and its lapse), TASKS.md 24.5 (the
order builder staff issue the invoice from), Requirement 6.4, 6.11, 9.

**Used by:** 35.1.a e2e (the invoice → paid, and the invoice → released at its due date),
35.2 usability, phase 35 **Done when** ("… and is paid in the sandbox — or lapses at its
due date, releasing the piece and alerting whoever asked").

## Before the session

- On staging: one available original in the export seller's stock, with its images,
  record and stock number.
- The facilitator plays the gallery on the phone, with a figure the script fixes, and
  issues the invoice in the admin (24.5) during the session: the agreed figure, shipping
  and insurance to the participant's country, the duties note, the due date the builder
  proposes (three days, D45).
- For the alternate path: a second original already invoiced to "someone else", its
  reminder already sent and its due date passed, so its automatic release can be shown;
  "another visitor" has asked on its held page to hear if it becomes available (a
  confirmed want-list entry, D39).
- A second browser playing "another visitor" — the gallery has no accounts (D54); the
  Stripe and bank-transfer sandboxes answering; the mail catcher open.

## Say to the participant

> "You like this map and you prefer to talk to the dealer before buying anything this
> expensive. Get in touch with them, agree a price — the facilitator will play the
> gallery — and take it as far as paying for it."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` (`item`) › purchase panel | read "Price on request" and find **how to call** the gallery, beside WhatsApp and an enquiry | no price or purchase control (D50); on a desktop the number is shown as text as well as a `tel:` link; the reply promise "the same working day, Singapore time" (G9) beside each way to ask |
| 2 | the call (outside the site, role-played) | agree a price; give a name, an email and a delivery address so staff can quote shipping and duties | the piece stays **Available** during the call — nothing holds it before the invoice (D45) |
| 3 | email (mail catcher) | open the invoice: the piece with its stock number, **the agreed figure**, shipping and insurance, the duties note (the buyer's, G11), the total and its currency, the **due date**, the seller, a link to pay | the email and the page carry the same figures; the email names the due date — three days out unless staff set another (D45) — and what happens then |
| 4 | `Item` in the second browser ("another visitor") | see the piece read "**On hold until {due date}**" and "Tell me if it becomes available" | the hold starts the moment staff issue the invoice (D45); every visitor reads the same panel, the buyer included (D54); no purchase control for anyone |
| 5 | `Pay` (`pay/[token]`) | read the invoice again on the gallery's own page; pay — steered to bank transfer at this value, or by card in the Payment Element | in the gallery's design, never a gateway-hosted page (D51); bank transfer → instructions, then "payment must be received and confirmed"; a transfer that falls short → staff contact, **nothing ships**, the due date restated (G11); card declined → another method, the hold intact |
| 6 | `Order` and email | see the order paid in full, the certificate, and that shipping is arranged now | one transaction marks payment, reservation and order together (design.md); the courier is booked only after full payment (G11) |

**Alternate path — unpaid by the due date:** the second original's buyer was reminded by
email 24 hours before its due date (`invoiceHold.expiring`, D45) → the date passes → the
piece is **released automatically** and reads Available again (D45) → "another visitor",
who asked on the held page, receives the alert by email the moment it is available (D39)
→ the old pay link opens the invoice's **expired** state, with the ways to contact the
gallery, never a bare gateway error → a payment that arrives after the release takes the
late-payment path: sold to that buyer if the piece is still free, else
refunded automatically and told (PAYMENTS.md §1).

## Channel handoffs

The site → a **phone call** to the gallery in Singapore → staff issue the invoice in the
admin → the invoice by **email** with its pay link → the `Pay` page → the buyer's **bank**
(transfer) or the Payment Element (card) → staff confirm receipt → `Order` and the
confirmation **email** → the insured courier, once paid in full · unpaid: the reminder
**email** 24 hours before the due date, then the release alert to whoever asked.

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
- On the alternate path, the reminder goes out 24 hours before the due date and the
  piece is released at it with no staff action, alerting whoever asked (e2e asserts all
  three).
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
owner). **Settled by the replan (TASKS.md 6.4):** the invoice's surface is the gallery's
own pay page, the Payment Element embedded and bank transfer beside it (D51; PAYMENTS.md
§5–§6); the reminder 24 hours before the 3-day default due date (D45); the alert to a
visitor who asked on the held page, at the release (COMMERCE.md §7). **Still open
elsewhere:** D1 (the seller), adviser.
