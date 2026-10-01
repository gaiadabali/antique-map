# J-G2 — An institution → an enquiry → a proforma invoice → bank transfer

> **Reshaped 2026-10-01 — D50.** The gallery has no cart and shows no price, so an
> institution can no longer turn a cart into a proforma at checkout. It asks; staff agree
> the terms and issue a proforma invoice, which holds its pieces until the due date (D45)
> and is paid in full before anything ships (G11). The file name is kept so links resolve.
>
> **Updated 2026-10-01 — D51, D45 (TASKS.md 6.6.a).** The proforma is not a separate quote
> page: it is the invoice on the gallery's own pay page, `/pay/{token}` — the same `Pay`
> surface as J-G1, carrying the PO number and the PDF finance pays from, with bank transfer
> beside the embedded card element. The order builder proposes a three-day term (D45);
> staff set the longer date an institution's payment run needs.

**Who:** an acquisitions librarian at a national library abroad, on a desktop at work.
Their library cannot pay by card and needs a proforma invoice with a PO number before
finance will pay by bank transfer. They want three maps; one of them is held in Jakarta
and not cleared for export.

**Rests on:** **D50** (enquiry-only; staff issue the invoice), **D51** (the invoice is the
gallery's own `/pay/{token}` page in its design, never a gateway-hosted page), **D45**
(the invoice holds its pieces from issue until the due date staff set — staff-approved by
construction; the order builder proposes 3 days, staff change it per invoice; a reminder
24 hours before it lapses), D54 (no account: the invoice and the order are reached by
their links and the order lookup), G9 (the reply promise), G10 (no institution named),
G11 (shipping and duties the buyer's, on the invoice; paid in full before sending), D1
(default sellers), D5 (Jakarta items `domestic-only` until a written determination),
COMMERCE.md §7 (the `quote` form, the invoice and its pay page, `invoice` holds, export
gating at issue), §8 (insured shipping for originals), COMPLIANCE.md §1 (export gating),
PAYMENTS.md §5–§6 (the pay page is ours; bank transfer for the Singapore seller's
proformas), TASKS.md 24.5 (the order builder), Requirement 6.11, 9 (reservations), 10.5
(the proforma document).

**Used by:** 35.1.a e2e, 35.2 usability, phase 35 **Done when** ("an institution's
proforma request becomes an invoice paid by bank transfer").

## Before the session

- On staging: two available originals held in Singapore (`cleared` or `not-applicable`)
  and one held in Jakarta marked `domestic-only`.
- The bank-transfer method configured for the export seller, with sandbox account
  details that appear **only** on the proforma's PDF, never on a public page.
- Staff (or the facilitator in the admin) ready to answer the enquiry, agree the figures
  the script fixes, issue the proforma in the order builder (24.5) with the PO number, the
  shipping and insurance quote and a due date — the script fixes **14 days**, changed from
  the builder's proposed three (D45), since a finance office pays in a two-week run — and
  later mark the transfer received.
- A desktop browser; the mail catcher open.

## Say to the participant

> "Your library has budget for three maps from this gallery. You cannot pay by card:
> your finance office needs a proforma invoice with your purchase-order number, and
> then pays by bank transfer. Get the paperwork you need."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Browse` / `Item` | find the three maps; read "Price on request" on each | no price, cart or Buy anywhere (D50); the Jakarta item seen with ship-to outside Indonesia carries its export note — "Available for delivery within Indonesia · View it in Jakarta" (COMPLIANCE.md §1) |
| 2 | `Item` › purchase panel › **Proforma for institutions** → `Form` (`quote` kind) | ask for a proforma: organisation, tax id, **PO number**, the stock numbers of all three maps, the delivery address | institution fields appear only when asked for; the form promises a reply **the same working day, Singapore time** (G9) — never a PDF at once; JavaScript off → posts and returns with its result; no account asked for (D54) |
| 3 | email (and, if they choose, a call) with staff | agree the figures; learn that the Jakarta map cannot be exported and what they could do instead (view it in Jakarta) | staff's reply carries the stock numbers; the site promises nothing staff have not confirmed |
| 4 | `Pay` (`pay/[token]`), from staff's email | read the proforma on the gallery's own page: its number, the lines with stock numbers and the agreed figures, **shipping and insurance quoted**, the duties note (the buyer's, G11), the PO number, the **due date**, the seller's legal identity; **download the PDF**; forward the link or the PDF to finance | the page is in the gallery's design, never a gateway's (D51); the two pieces read "**On hold until {due date}**" to other visitors from the moment staff issue it (D45); the export-blocked map is not on it — issuing refuses a `domestic-only` piece for an address abroad (COMMERCE.md §7); the two ways to pay are the card element in the page and **bank transfer**, its instructions on the page and the SWIFT details on the PDF only; past its due date → expired, the pieces released, and a designed page with the ways to reach the gallery; voided by staff → the same, saying so |
| 5 | bank transfer (outside the site) | finance pays by transfer using the details on the PDF | amount and reference on the PDF match; wire details never on a public page (RESEARCH.md §2); the reminder email 24 hours before the due date (D45) names the invoice, the date and the ways to reach the gallery |
| 6 | `Pay` (bank transfer pending) → `Order` and email | see "payment must be received and confirmed", then the order with certificates and the commercial invoice | until staff confirm receipt, the pay page reads bank transfer pending; **nothing ships until it is paid in full** (G11); a partial payment → staff contact, the hold's due date stated; the order is reached again by its email's link or the order lookup (its number and email) — no account (D54) |

## Channel handoffs

The site's proforma request → staff **email** (or a call) to agree terms → staff issue
the proforma in the admin → its pay-page link and **PDF** by email → forwarded inside the
institution → the institution's finance office → a **bank transfer** (SWIFT) → staff
confirm receipt in the admin → the confirmation **email** with the certificates and the
commercial invoice → the insured courier, arranged by staff once paid in full.

## The moment that decides trust

**Step 4 — the proforma PDF on the finance officer's desk.** Finance has never heard
of the gallery. The PDF must carry the seller's legal name, address and registration,
the PO number, the lines with stock numbers, shipping and insurance, the due date, the
bank details and the payment reference, so it is paid without a phone call. The pay
page it came from must look like the gallery and make clear the maps are held for the
library until the due date — an institution will not start a two-week payment process
for a map that might sell meanwhile, so a three-day term is one staff lengthen for it.

## Success criteria

- Unaided: the participant finds "Proforma for institutions" (step 2) without being
  told it exists, and can say when they expect the reply.
- Unaided: they can say why the Jakarta map cannot be bought for delivery abroad and
  what they could do instead (view it in Jakarta).
- The PDF carries the PO number, the seller's legal identity, shipping and the due date.
- Unaided: from the pay page they can say until when the maps are held and how finance
  pays.
- Target (to calibrate): proforma request sent, **under 4 minutes**; the reply's arrival
  is staff time, measured separately against G9's promise.

**Observe:** whether they look for a cart first; whether "Price on request" on every map
worries a buyer with a fixed budget; whether "On hold until" reassures them; whether they
forward the link or only the PDF; what they would need before sending the PDF to finance.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G4 (no price), G5 (held from the invoice
until its due date — D45), G9 (same working day, Singapore time), G10 (no institution
named, so the participant sees none), G11 (shipping and duties on the invoice, paid in
full before sending) — folded in above. **Settled by the replan (TASKS.md 6.4):** the
proforma is the invoice on the gallery's own pay page (D51), with bank transfer beside
the card element (PAYMENTS.md §6); export gating holds when staff issue an invoice
(COMMERCE.md §7); the 3-day term and the 24-hour reminder (D45). **Still owed by the
owner:** nothing for this journey. **Still open elsewhere:** D1 (the seller on the PDF)
and D5 (export clearance), advisers.
