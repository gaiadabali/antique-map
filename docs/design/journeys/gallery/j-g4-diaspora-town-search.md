# J-G4 — A diaspora buyer → a family town under its old name → buy in euros

**Who:** a Dutch-Indonesian woman in the Netherlands whose grandmother grew up in
Buitenzorg (today Bogor). She wants one piece with meaning — a photograph or a print of
the town — for her mother's birthday. She reads English well; Dutch is her first
language. She uses her phone.

**Rests on:** EXPERIENCE-GALLERY.md §2 (the place hierarchy: Java › Buitenzorg/Bogor),
§4 (zero results never dead-end, historical names), §7 (place pages), §8 (want-lists),
DESIGN-SYSTEM.md §2 (`Search`: synonyms and historical place names, works without
JavaScript), COMMERCE.md §3 (currency by destination; a converted estimate says which
currency is charged), PAYMENTS.md §6 (IG Singapore: Stripe, including iDEAL/SEPA for EU
buyers), D39 (want-list by email, double opt-in). A Dutch locale is v2 and the
dedicated "find your family's town" feature is later (EXPERIENCE-GALLERY.md §12): this
journey runs on launch search, the gazetteer and place pages, in English.

**Used by:** 35.1.a e2e, 35.2 usability (the diaspora session), phase 35 **Done when**.

## Before the session

- On staging: the gazetteer seeded with Buitenzorg ↔ Bogor (and Batavia ↔ Jakarta,
  Celebes ↔ Sulawesi); a place page for Buitenzorg with at least one available
  photograph or print under the first tier, one sold one, and one with a Dutch caption.
- Ship-to preset by the participant, not by IP: she chooses the Netherlands.
- The Stripe sandbox with iDEAL enabled; the mail catcher open.

## Say to the participant

> "Your grandmother grew up in the town the Dutch called Buitenzorg. Find something
> from the gallery that shows that town, as a present for your mother. If it feels
> right, buy it and have it sent to your home in the Netherlands."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Search` (`search`) | type "Buitenzorg" (or "Bogor", or a misspelling such as "Buitensorg") | the historical and modern names resolve to one place; a misspelling offers "Did you mean Buitenzorg (Bogor)?"; an Indonesian query ("peta Bogor lama") is handled; JavaScript off → the search form posts and results render |
| 2 | `Place` (`place`), e.g. `/places/java/buitenzorg` | read the modern and historical names, a short history, the available works, the sold ones, the stories set there | an empty "available" band → the sold works and "Alert me about new works of Buitenzorg"; a Dutch caption carries its own `lang` |
| 3 | `Item` | choose a photograph; read its date with its precision ("c. 1910"), the photographer or studio, the condition | the date's precision is shown, never implied certainty; the price in the **market currency for the Netherlands** with the charged currency named where the seller charges another ("≈ €… — charged in USD …", COMMERCE.md §3) |
| 4 | shell › ship-to selector | confirm the Netherlands as ship-to | the currency follows the destination, not the IP or the language; there is no free currency switcher |
| 5 | `Cart` → `Checkout` (Contact, Delivery, Shipping method, Payment) | give her address in Dutch address shape; see insured shipping and duties before paying | duties estimated and shown before payment (DAP default); a carrier-rate outage → the flat-table rate labelled "estimate"; `PriceChanged` → the new total shown |
| 6 | Payment (Stripe sandbox) | pay by iDEAL or card | failed → retry another method, the checkout lock intact; the lock's countdown visible |
| 7 | `Order` and email | see the order, the seller, the certificate, the delivery estimate | the confirmation email arrives; the certificate and invoice are downloadable from the order |

**Alternate path — nothing available:** from the place page's sold works, "Alert me" →
`WantList` (`want-list`) → her email → the **double opt-in** email → its link opens the
want-list page, whose **button** confirms (a mail scanner following the link confirms
nothing) → a courteous answer that admits nothing, whoever asks and however often.

## Channel handoffs

Possibly Google → the site · the site → Stripe (iDEAL: her bank app) → back to `Order` ·
the confirmation **email** · the courier's tracking · on the alternate path, the
**double opt-in email** and later the alert email, each stoppable from the want-list page.

## The moment that decides trust

**Steps 1–2 — the site knows Buitenzorg is Bogor.** For a heritage buyer, being met
under the name her family used is the whole promise: it tells her the gallery knows the
place as well as she does. Close behind: the price in euros that names what is actually
charged, and iDEAL, the payment she trusts at home.

## Success criteria

- Unaided: she reaches the Buitenzorg place page from a search for the old name (step 1–2),
  and from a search for the modern one.
- Unaided: she can say, before paying, the total in euros, the currency charged, and
  whether duties are due on arrival.
- On the alternate path: she understands that the alert starts only after she confirms
  the email.
- Target (to calibrate): search to item chosen, **under 2 minutes**.

**Observe:** whether she expects Dutch; how she reads "c. 1910"; whether the sold works
feel like an ending or an invitation.

## Open until the owner answers

G11 (shipping and duties for an original sent to Europe), G6 (returns she can rely on),
G13 (what the gallery may say about itself on the place page). Adviser: D1 (the seller
and currency charged).
