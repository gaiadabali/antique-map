# J-G3 — A designer → shortlist → factsheet → the client → the invoice that holds it

> **Reshaped 2026-10-01 — D50, G14.** The factsheet carries no price; there is no Reserve
> form. When the client chooses, the designer agrees the price with staff and the
> staff-issued invoice is what holds the piece (D45). The file name is kept so links
> resolve.

**Who:** an interior designer furnishing a villa in Bali. They shop by place, size and
colour, not by cartographer. On a laptop in the studio they shortlist three pieces,
send the client a factsheet for each on WhatsApp, and, when the client picks one, have
the gallery invoice and hold it while the framing is arranged.

**Rests on:** **D50** (enquiry-only), **D45** (the invoice holds the piece until its due
date), G14 (no price on the item sheet), G9 (the reply promise), BRANDS.md §4
(`retention.wishlist` needs a buyer account on the gallery; `purchase.holds`),
EXPERIENCE-GALLERY.md §4 (facets: size in cm and inches, colour, place), §5 (utilities:
factsheet PDF, share), §9 (framing & conservation), §10 (wishlist → viewing pull list),
TASKS.md 23.6.a (the factsheet's design), ANALYTICS.md (`item.factsheetDownloaded`). A
trade/designer programme is v2 (EXPERIENCE-GALLERY.md §12) — this journey uses only
launch features.

**Used by:** 35.1.a e2e, 35.2 usability (the designer session), phase 35 **Done when**.

## Before the session

- On staging: at least six available items of Bali or Java with image sizes above
  50 cm on the long edge, some hand-coloured; one that staff will invoice to someone
  else mid-session, so it goes on hold.
- A buyer test account (the participant signs up or signs in during the session).
- The factsheet PDF generated for the items (TASKS.md 24.2.d); a phone beside the laptop
  playing "the client", receiving the factsheet on WhatsApp.

## Say to the participant

> "You are decorating a villa in Bali. The client wants an old map or print of Bali or
> Java, at least 50 centimetres wide, with some colour. Find two or three candidates,
> send the client something they can look at on their phone, and when they choose one,
> make sure nobody else buys it while you arrange the framing."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Browse` (`browse`), e.g. `/antique-maps/java` | filter by place, **size** (presets and min/max, cm and inches), **colour**, availability; sort | on a phone: facets in a bottom sheet, applied chips, live count on Apply, number inputs beside each slider; zero results → never a dead end: historical names, "ask us" with the query prefilled, a want-list alert |
| 2 | `Item` › wishlist | save three candidates | the heart sits **outside** the card's link with its own focus stop; saving signed out → sign in or sign up (the gallery's wishlist lives in the account), then back to the same card, saved |
| 3 | `Account` › wishlist (`account/[section]`) | see the shortlist together with status and size | an item that went on hold meanwhile shows "On hold until {date}"; an item sold meanwhile shows "Sold" and similar works |
| 4 | `Item` › utilities › **factsheet PDF** | download the sheet for each candidate | the sheet carries image, hook and original title, maker, date with precision, dimensions in mm and inches, condition, stock number, the status, **"Price on request" — never a figure — the gallery's contact and the date it was printed** (G14), and a link or QR back to the live item |
| 5 | share (WhatsApp first) | send the factsheet or the item link to "the client" | the shared link opens the item with its current status; the client's in-app browser (WhatsApp) renders it |
| 6 | `Item` › "Ask on WhatsApp" or an enquiry `Form` | ask the price of the chosen piece and say the client wants it | no Reserve button and no hold request (D50); the reply promise "the same working day, Singapore time" (G9); JavaScript off → the form posts and returns with its result; the piece already on hold for someone else → "On hold until {date}" and the want-list |
| 7 | framing & conservation (`Page`) → an enquiry `Form` | ask for a conservation framing quote (UV glazing, rag mat, reversible hinges) | the enquiry carries the stock number; a "what happens next" line |
| 8 | WhatsApp or email → `Pay` | agree the price; staff issue the invoice with its due date; pay it (as J-G1 steps 7–9) | from the invoice on, the item page shows "held for me" when signed in, "On hold until {due date}" to others (D45); unpaid by the due date → released |

## Channel handoffs

The site → a **PDF** → **WhatsApp** to the client → the client opens the live link in
WhatsApp's in-app browser → the designer returns to the site → **WhatsApp** or an
enquiry to agree the price → staff issue the invoice → its link (`Pay`), as J-G1.

## The moment that decides trust

**Step 4–5 — the factsheet in the client's hands.** The designer's reputation rides on
it. If the sheet shows a wrong size or a piece that sold the day before, the designer
looks careless in front of the client — and will not use the gallery again. The sheet
must be exact, dated, carry both units and no price (so the designer's own figure is
theirs to give), name the gallery's contact, and lead back to a page that shows the same
status live.

## Success criteria

- Unaided: the participant filters by size and colour (step 1) and gets a shortlist of
  at least two.
- Unaided: they find and download the factsheet (step 4) and send it (step 5).
- Unaided: they start the conversation for the chosen piece (step 6) and, once it is
  invoiced, can say until when it is held.
- The factsheet's dimensions, status and date match the item page at download time.
- Target (to calibrate): brief to factsheet sent, **under 6 minutes**.

**Observe:** whether they expect a trade account or a trade price (v2); whether a
factsheet without a price helps or hinders them with the client; whether they expect a
hold before the price is agreed; how they read a size given in both units.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G14 (no price on the sheet — the
piece, "Price on request", the contact, the print date), G5 (the invoice holds until its
due date), G9 (same working day, Singapore time), G11 (shipping the buyer's, on the
invoice) — folded in above. **Still owed by the owner:** nothing for this journey. Not
asked: how a framed piece is shipped. **Still open elsewhere:** the factsheet's layout
without a price (TASKS.md 23.6.a); the invoice's surface (6.4.a).
