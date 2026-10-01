# J-G4 — A diaspora buyer → a family town under its old name → an enquiry → an invoice paid from home

> **Reshaped 2026-10-01 — D50.** The gallery shows no price and has no checkout, so this
> buyer no longer sees a euro price or checks out; she asks, and pays the invoice staff
> send her. The search half — the reason this journey exists — is unchanged. The file
> name is kept so links resolve.

**Who:** a Dutch-Indonesian woman in the Netherlands whose grandmother grew up in
Buitenzorg (today Bogor). She wants one piece with meaning — a photograph or a print of
the town — for her mother's birthday. She reads English well; Dutch is her first
language. She uses her phone.

**Rests on:** EXPERIENCE-GALLERY.md §2 (the place hierarchy: Java › Buitenzorg/Bogor),
§4 (zero results never dead-end, historical names), §7 (place pages), §8 (want-lists),
DESIGN-SYSTEM.md §2 (`Search`: synonyms and historical place names, works without
JavaScript), **D50** (enquiry-only; a staff-issued invoice paid online), D45 (the invoice
holds the piece until its due date), G9 (the reply promise), G11 (shipping and duties the
buyer's, on the invoice), PAYMENTS.md §6 (IG Singapore: Stripe, including iDEAL/SEPA for
EU buyers), D39 (want-list by email, double opt-in). A Dutch locale is v2 and the
dedicated "find your family's town" feature is later (EXPERIENCE-GALLERY.md §12): this
journey runs on launch search, the gazetteer and place pages, in English.

**Used by:** 35.1.a e2e, 35.2 usability (the diaspora session), phase 35 **Done when**.

## Before the session

- On staging: the gazetteer seeded with Buitenzorg ↔ Bogor (and Batavia ↔ Jakarta,
  Celebes ↔ Sulawesi); a place page for Buitenzorg with at least one available
  photograph or print, one sold one, and one with a Dutch caption.
- Staff (or the facilitator in the admin) ready to answer her enquiry with a figure the
  script fixes and to issue the invoice — shipping and insurance to the Netherlands, the
  duties note, a due date.
- The Stripe sandbox with iDEAL enabled; the mail catcher open.

## Say to the participant

> "Your grandmother grew up in the town the Dutch called Buitenzorg. Find something
> from the gallery that shows that town, as a present for your mother. If it feels
> right, get to the point where you could pay for it and have it sent to your home in
> the Netherlands."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Search` (`search`) | type "Buitenzorg" (or "Bogor", or a misspelling such as "Buitensorg") | the historical and modern names resolve to one place; a misspelling offers "Did you mean Buitenzorg (Bogor)?"; an Indonesian query ("peta Bogor lama") is handled; JavaScript off → the search form posts and results render |
| 2 | `Place` (`place`), e.g. `/places/java/buitenzorg` | read the modern and historical names, a short history, the available works, the sold ones, the stories set there | an empty "available" band → the sold works and "Alert me about new works of Buitenzorg"; a Dutch caption carries its own `lang` |
| 3 | `Item` | choose a photograph; read its date with its precision ("c. 1910"), the photographer or studio, the condition; read "Price on request" | the date's precision is shown, never implied certainty; no price in any currency (G4) |
| 4 | `Item` › an enquiry `Form` or "Ask on WhatsApp" | ask the price, say it is to be sent to the Netherlands | the reply promise "the same working day, Singapore time" (G9) — the time zone named, since hers is six or seven hours behind; JavaScript off → the form posts and returns with its result |
| 5 | email → `Pay` (`pay/[token]`) | open the invoice: the piece, the figure, **shipping and insurance to the Netherlands**, the **duties note — paid by her on arrival** (G11), the charge currency named, the due date, the seller | the piece reads "On hold until {due date}" to others (D45); past the due date → released, and a designed page offering to ask again |
| 6 | Payment (Stripe sandbox) | pay by iDEAL or card | iDEAL only where the invoice's currency allows it; failed → retry another method, the hold intact until the due date |
| 7 | `Order` and email | see the order paid in full, the seller, the certificate, the delivery estimate | the confirmation email arrives; the certificate and invoice are downloadable from the order; it ships only now (G11) |

**Alternate path — nothing available:** from the place page's sold works, "Alert me" →
`WantList` (`want-list`) → her email → the **double opt-in** email → its link opens the
want-list page, whose **button** confirms (a mail scanner following the link confirms
nothing) → a courteous answer that admits nothing, whoever asks and however often.

## Channel handoffs

Possibly Google → the site · the site → an **enquiry** (email) or **WhatsApp** · staff's
reply and the invoice by **email** → the `Pay` page → Stripe (iDEAL: her bank app) →
back to `Order` · the confirmation **email** · the courier's tracking · on the alternate
path, the **double opt-in email** and later the alert email, each stoppable from the
want-list page.

## The moment that decides trust

**Steps 1–2 — the site knows Buitenzorg is Bogor.** For a heritage buyer, being met
under the name her family used is the whole promise: it tells her the gallery knows the
place as well as she does. Close behind, step 5: an invoice that names what she is
charged and in which currency, says plainly that duties are hers on arrival, and lets her
pay with iDEAL, the payment she trusts at home.

## Success criteria

- Unaided: she reaches the Buitenzorg place page from a search for the old name (step
  1–2), and from a search for the modern one.
- Unaided: she sends the enquiry (step 4) and can say when to expect a reply.
- Unaided: from the invoice she can say, before paying, the total, the currency charged,
  and whether duties are due on arrival.
- On the alternate path: she understands that the alert starts only after she confirms
  the email.
- Target (to calibrate): search to item chosen, **under 2 minutes**.

**Observe:** whether she expects Dutch; how she reads "c. 1910"; whether "Price on
request" puts her off a modest present; whether the sold works feel like an ending or an
invitation.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G4 (no price), G6 (a lifetime
authenticity guarantee, in counsel's words), G9 (same working day, Singapore time), G11
(shipping and duties the buyer's, on the invoice), G13 (what the gallery says of itself:
since 2001, over 9,500 antiques, the certificate) — folded in above. **Still owed by the
owner:** nothing for this journey. **Still open elsewhere:** the currency staff invoice a
euro buyer in, and so whether iDEAL is offered (TASKS.md 6.4.a; PAYMENTS.md §6); D1 (the
seller), adviser.
