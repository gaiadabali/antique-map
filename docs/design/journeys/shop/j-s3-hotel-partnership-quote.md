# J-S3 — A hotel → Partnership → quote → payment link

> **Updated 2026-10-01 — S5 (D32), S7, S11.** Partner terms are case by case: the
> Partnership page publishes no fixed discount or minimum, and staff set each partner's
> tier and minimum (D32). Everything is in stock (S7); delivery in Bali is by courier
> with a "deliver before" date (S11).

**Who:** the manager of a boutique hotel in Sanur furnishing 40 rooms and a lobby with
archive prints. She has a budget, a deadline before the high season, and a finance
officer who pays by bank transfer. She works on a laptop, and on WhatsApp with the shop.

**Rests on:** **D36** (one Partnership programme for every business buyer — hotels
included; no "For Business" path or header item), D31 (partners are the only accounts),
**D32** (answered 2026-10-01, S5: terms case by case — no published discount or
minimum; each partner's trade tier and minimum are data staff set; orders as quotes built
by staff; bank transfer or pay link), D34 (an ended partnership deactivates the account), D37, D40
("forgot password" resends the approval link to an approved partner without a password),
EXPERIENCE-SHOP.md §9, DESIGN-SYSTEM.md §2 (`Partnership`, `Account` for partners,
`Quote`, `Pay`), C10 (`quote` form only for a signed-in partner where
`accounts.retailers` is on), TASKS.md 24.5 (the order builder), 28.5.

**Used by:** 32.1.a e2e, 32.2 usability (a business buyer may replace one shopper
session), the Shop stage's done-criteria.

## Before the session

- On staging: the Partnership page with its sections — how the programme works, with no
  fixed discount or minimum (S5); the application reviewed by staff in the admin (the
  facilitator approves during the session and sets this partner's trade tier and
  minimum, test values, as staff would after talking to her — D32).
- Staff (or the facilitator) ready to build a quote in the order builder from the
  partner's brief; the bank-transfer and Midtrans sandboxes; the mail catcher open.

## Say to the participant

> "You manage a hotel in Sanur and want old Bali prints in all 40 rooms and the lobby,
> framed, before December. Find out whether this shop can supply a business like yours,
> and get to the point where your finance officer could pay."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Home` hero highlight or header › **Partnership** (`partnership`) | find the programme — **no "For Business" item exists** (D36) | the page speaks to **each kind of business** (shops, hotels, villas, cafés, companies) and says terms are **agreed with each partner** — it publishes **no discount, no minimum and no trade price** (S5, D32) |
| 2 | `Partnership` › last section | apply: business, contact, what they need | works without JavaScript; the answer is **one sentence for everyone** ("application received"), whether or not the email is known |
| 3 | email → `Account` › set password (`account/set-password`) | after staff approve, follow the approval link and set a password | declined → a courteous email and the form to apply again; "forgot password" before setting one → the approval link again (D40); an applicant never gets a link |
| 4 | `Account` (partner) › terms (`account/terms`) | see **her own** trade tier and minimum order, as staff set them | only the owner role changes a tier (D37); terms are data per partner, never a published table (S5) |
| 5 | `Item` › configurator → "Turn this into a quote" | configure a framed print and turn it into a quote | the action exists **only for a signed-in partner**; a guest sees none, and is pointed to Partnership instead |
| 6 | `Form` (`quote` kind) — the brief | add quantities (40 + lobby), sizes, framing, the deadline | the brief is in her own words; below her minimum order → said plainly; a quantity beyond what is in stock is for staff to answer on the quote, never promised by the form (S7) |
| 7 | `Quote` (`quote/[token]`) | read lines at her tier **beside the list prices**, validity, the tier and minimum it was issued at, the PDF; accept | expired → a designed page to request a new one; a line staff changed says why |
| 8 | accept → `Pay` (`pay/[token]`) or bank transfer | pay by payment link, or forward the PDF for a bank transfer | the pay link shows the seller's identity, amount, expiry; bank-transfer details only on the PDF |
| 9 | `Account` › quotes, orders | see the order and **reorder** a past order in one click | an ended partnership → the account can no longer sign in; its orders stay with the owner (D34) |

## Channel handoffs

The site → **email** (application received, approval link, the quote) → a **PDF** to
the hotel's finance officer → **bank transfer** or the **payment link** → staff deliver
by Bali courier before the date agreed (S11) → WhatsApp with staff throughout, outside
the site.

## The moment that decides trust

**Step 7 — the quote page.** A hotel buys on paperwork. The quote must show each line at
her trade price beside the list price (so she sees the benefit), how long the offer
stands, the tier and minimum it assumes, the seller's legal identity, and a PDF finance
can pay from. With no terms published (S5), the quote is the first place she sees what
the partnership is worth — so it has to show it plainly. Earlier, step 1: finding a
programme that speaks to hotels by name, not a generic wholesale form, is what makes her
apply at all.

## Success criteria

- Unaided: she finds the Partnership programme from the home page or the header without
  looking for "For Business" (step 1).
- Unaided: she applies (step 2) and, once approved, sets a password (step 3).
- Unaided: she turns a configured product into a quote with her brief (steps 5–6).
- From the quote page she can say her saving over list price, the validity date and how
  finance pays.
- Target (to calibrate): Partnership page to application sent, **under 3 minutes**.

**Observe:** what she expects the Partnership page to promise (installation? custom
sizes? a lobby corner?); whether "terms agreed with each partner" makes her apply or
makes her hesitate; whether "partner" reads as meant for hotels.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S5 (case by case — no published terms;
D32), S7 (everything in stock), S11 (a Bali courier with a "deliver before" date) —
folded in above. **Still owed by the owner:** the list prices (S2, the price list). Not
asked: whether the shop installs. **Settled by the replan (TASKS.md 6.4):** the
Partnership page publishes no discount and no minimum order; each partner's tier and
minimum are data staff set, changed only by the owner role (S5, D32, D33, D37;
EXPERIENCE-SHOP.md §9). **Still open elsewhere:** that page's words in the shop's
lexicon, which are 6.3's and not yet written.
