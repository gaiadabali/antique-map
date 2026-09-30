# J-G2 — An institution → cart → proforma → bank transfer

**Who:** an acquisitions librarian at a national library abroad, on a desktop at work.
Their library cannot pay by card and needs a proforma invoice with a PO number before
finance will pay by bank transfer. They want three maps; one of them is held in Jakarta
and not cleared for export.

**Rests on:** D30, D1 (default sellers), D5 (Jakarta items `domestic-only` until a
written determination), COMMERCE.md §5 (checkout steps; institution fields), §7
("Proforma instead", `invoice` holds, the open decision F13), §8 (quote-required
shipping), COMPLIANCE.md §1 (export gating), PAYMENTS.md §6 (bank transfer, IG Singapore),
Requirement 6.2, 6.11, 9 (reservations), 10.5 (the proforma document).

**Used by:** 35.1.a e2e, 35.2 usability, phase 35 **Done when** ("an institution turns a
cart into a proforma").

## Before the session

- On staging: two priced items held in Singapore (`cleared` or `not-applicable`), one
  priced item held in Jakarta marked `domestic-only`; one item priced on request.
- The bank-transfer method configured for the export seller, with sandbox account
  details that appear **only** on the proforma, never on a public page.
- Staff (or the facilitator in the admin) ready to approve the proforma's holds if G5's
  default (staff approve first) is in force, and to mark the transfer received.
- A desktop browser; the mail catcher open.

## Say to the participant

> "Your library has budget for three maps from this gallery. You cannot pay by card:
> your finance office needs a proforma invoice with your purchase-order number, and
> then pays by bank transfer. Get the paperwork you need."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Browse` / `Item` | add the three maps to the cart | the Jakarta item seen with ship-to outside Indonesia reads "Available for delivery within Indonesia · View it in Jakarta" — **no disabled Buy button**, no add-to-cart (DESIGN-SYSTEM.md §3); a unique item in someone else's checkout reads "On hold — check back in 15 minutes" with the want-list |
| 2 | `Cart` (`cart`) | see two lines and why the third could not join | the cart never reserves; a line that became unavailable says so in one sentence |
| 3 | `Checkout` › Contact | say they buy for an institution and give organisation, tax id and **PO number** | institution fields appear only when asked for |
| 4 | `Checkout` › Delivery, Shipping method | give the library's address; see shipping **"quote required"** for insured originals | quote-required is a stated step, never a guessed rate; the carrier's art-cover limits are never implied (COMPLIANCE.md §1 #5) |
| 5 | `Checkout` › Payment › **Proforma instead** | choose a proforma instead of paying now (C6 `quote.proforma`) | `PriceChanged` since the cart → the new total shown, never charged silently; the proforma's holds start at once **or** wait for staff approval (F13 / G5 — the page says which) |
| 6 | `Quote` (`quote/[token]`) | read the lines, validity, the PO number, the seller's legal identity; **download the PDF**; forward it to finance | the lines show "On hold until {due date}" to other visitors once held; the quote expired → a designed page offering a new one; a line removed by staff says why |
| 7 | bank transfer (outside the site) | finance pays by transfer using the details on the PDF | amount and reference on the PDF match; wire details never on a public page (RESEARCH.md §2) |
| 8 | `Quote` → `Order` and email | see "payment received and confirmed", then the order with certificates and the commercial invoice | until staff confirm receipt, the page says "payment must be received and confirmed before an order is complete"; partial or late payment → staff contact, the holds' expiry stated |

**Alternate path (a single item on request):** from the item's purchase panel,
"Proforma for institutions" → `Form` (`quote` kind) → a staff-issued proforma within
the stated reply time (G9) — the panel promises that, never a PDF at once.

## Channel handoffs

The site → a **PDF** forwarded by email inside the institution → the institution's
finance office → a **bank transfer** (SWIFT) → staff confirm receipt in the admin → the
confirmation **email** with the certificates and the commercial invoice → the insured
courier, arranged by staff (quote-required shipping).

## The moment that decides trust

**Step 6 — the proforma PDF on the finance officer's desk.** Finance has never heard
of the gallery. The PDF must carry the seller's legal name, address and registration,
the PO number, the lines with stock numbers, the validity, the bank details and the
payment reference, so it is paid without a phone call. The quote page must also make
clear the maps are held for the library until the due date — an institution will not
start a two-week payment process for a map that might sell meanwhile.

## Success criteria

- Unaided: the participant turns the cart into a proforma (step 5) — they find
  "Proforma instead" without being told it exists.
- Unaided: they can say why the Jakarta map cannot be bought for delivery abroad and
  what they could do instead (view it in Jakarta, or enquire).
- The PDF carries the PO number, the seller's legal identity and the due date.
- Target (to calibrate): cart to downloaded proforma, **under 5 minutes**.

**Observe:** whether they look for a proforma on the item page first; whether "On hold
until" reassures them; what they would need before sending the PDF to finance.

## Open until the owner answers

G5 (proforma holds: at once or after approval; how long), G10 (institutions named),
G11 (how originals are shipped and insured), G9 (reply time for a single-item proforma).
Adviser decisions: D1 (the seller on the PDF), D5 (export clearance).
