# J-S3 — A hotel → Partnership → quote → payment link

**Who:** the manager of a boutique hotel in Sanur furnishing 40 rooms and a lobby with
archive prints. She has a budget, a deadline before the high season, and a finance
officer who pays by bank transfer. She works on a laptop, and on WhatsApp with the shop.

**Rests on:** **D36** (one Partnership programme for every business buyer — hotels
included; no "For Business" path or header item), D31 (partners are the only accounts),
D32 (a trade tier and a minimum order as data; orders as quotes built by staff; bank
transfer or pay link), D34 (an ended partnership deactivates the account), D37, D40
("forgot password" resends the approval link to an approved partner without a password),
EXPERIENCE-SHOP.md §9, DESIGN-SYSTEM.md §2 (`Partnership`, `Account` for partners,
`Quote`, `Pay`), C10 (`quote` form only for a signed-in partner where
`accounts.retailers` is on), TASKS.md 24.5 (the order builder), 28.5.

**Used by:** 32.1.a e2e, 32.2 usability (a business buyer may replace one shopper
session), the Shop stage's done-criteria.

## Before the session

- On staging: the Partnership page with its sections (S5 text or placeholder); the
  application reviewed by staff in the admin (the facilitator approves during the
  session); a trade tier and minimum order configured (D32 default values, test).
- Staff (or the facilitator) ready to build a quote in the order builder from the
  partner's brief; the bank-transfer and Midtrans sandboxes; the mail catcher open.

## Say to the participant

> "You manage a hotel in Sanur and want old Bali prints in all 40 rooms and the lobby,
> framed, before December. Find out whether this shop can supply a business like yours,
> and get to the point where your finance officer could pay."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Home` hero highlight or header › **Partnership** (`partnership`) | find the programme — **no "For Business" item exists** (D36) | the page says what a partner gets **for each kind of business** (shops, hotels, villas, cafés, companies); it **never shows a trade price** |
| 2 | `Partnership` › last section | apply: business, contact, what they need | works without JavaScript; the answer is **one sentence for everyone** ("application received"), whether or not the email is known |
| 3 | email → `Account` › set password (`account/set-password`) | after staff approve, follow the approval link and set a password | declined → a courteous email and the form to apply again; "forgot password" before setting one → the approval link again (D40); an applicant never gets a link |
| 4 | `Account` (partner) › terms (`account/terms`) | see the trade tier and the minimum order | only the owner role changes a tier (D37); terms are data |
| 5 | `Item` › configurator → "Turn this into a quote" | configure a framed print and turn it into a quote | the action exists **only for a signed-in partner**; a guest sees none, and is pointed to Partnership instead |
| 6 | `Form` (`quote` kind) — the brief | add quantities (40 + lobby), sizes, framing, the deadline | the brief is in her own words; below the minimum order → said plainly |
| 7 | `Quote` (`quote/[token]`) | read lines at her tier **beside the list prices**, validity, the tier and minimum it was issued at, the PDF; accept | expired → a designed page to request a new one; a line staff changed says why |
| 8 | accept → `Pay` (`pay/[token]`) or bank transfer | pay by payment link, or forward the PDF for a bank transfer | the pay link shows the seller's identity, amount, expiry; bank-transfer details only on the PDF |
| 9 | `Account` › quotes, orders | see the order and **reorder** a past order in one click | an ended partnership → the account can no longer sign in; its orders stay with the owner (D34) |

## Channel handoffs

The site → **email** (application received, approval link, the quote) → a **PDF** to
the hotel's finance officer → **bank transfer** or the **payment link** → staff deliver
(and, where agreed, install) → WhatsApp with staff throughout, outside the site.

## The moment that decides trust

**Step 7 — the quote page.** A hotel buys on paperwork. The quote must show each line at
her trade price beside the list price (so she sees the benefit), how long the offer
stands, the tier and minimum it assumes, the seller's legal identity, and a PDF finance
can pay from. Earlier, step 1: finding a programme that speaks to hotels by name, not a
generic wholesale form, is what makes her apply at all.

## Success criteria

- Unaided: she finds the Partnership programme from the home page or the header without
  looking for "For Business" (step 1).
- Unaided: she applies (step 2) and, once approved, sets a password (step 3).
- Unaided: she turns a configured product into a quote with her brief (steps 5–6).
- From the quote page she can say her saving over list price, the validity date and how
  finance pays.
- Target (to calibrate): Partnership page to application sent, **under 3 minutes**.

**Observe:** what she expects the Partnership page to promise (installation? custom
sizes? a lobby corner?); whether "partner" reads as meant for hotels.

## Open until the owner answers

S5 (what partners get, per kind of business), S2 (list prices), S7 (lead times for 40
framed pieces), S11 (delivery and installation in Bali).
