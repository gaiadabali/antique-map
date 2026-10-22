# J-G5 — An old link to a sold map → the available example, a print, an alert

> **Updated 2026-10-01 — D50, G10, S3.** A sold page shows "Sold" and nothing more about
> the sale — no price realised, no buyer (G4, G10); the available example reads "Price on
> request"; the print at the sister shop delivers within Indonesia only at launch (S3).
>
> **Updated 2026-10-01 — D54 (TASKS.md 6.6.c).** Neither site gives a shopper an account
> (the gallery none at all, D54; the shop guests only, D31), so the sister link no longer
> says "its own account": it says the shop is a separate company with its own checkout.

**Who:** a collector who bookmarked a map on the old site two years ago, or follows an
old link from a forum. The map has since sold. They are on a phone.

**Rests on:** MIGRATION.md §6 (legacy product URLs byte-identical), EXPERIENCE-GALLERY.md
§8 (sold pages stay indexed; the available `sameEdition` example; "Own a print of this
map" in the primary position; the want-list), §10 (the legacy miss → a prefilled search;
the Gone page), DESIGN-SYSTEM.md §2 (`NotFound` · `Gone`; sold items are never gone),
BRANDS.md §5 (the sister link: a separate company, nothing shared between the two), D54
and D31 (no shopper accounts on either site), D39 (email
want-list, double opt-in), D50 and G4 (no price on any original), G10 ("Sold" only), S3
and D47 (the shop delivers within Indonesia only at launch), Requirement 6.3, 6.8, 6.10.

**Used by:** 35.1.a e2e, 35.2 usability, phase 35 **Done when** ("a sold item shows its
available alternative and 'own a print of this map' and takes an alert").

## Before the session

- On staging, three legacy addresses sent to the phone:
  1. a **sold** item with a `sameEdition` example in stock **and** a design at the shop;
  2. a **sold** item with neither;
  3. an old `/product/{id}-{slug}` whose id resolves to nothing (a legacy miss), plus one
     item **removed from inventory** (the Gone case).
- The shop's staging site reachable for the sister link; the mail catcher open.

## Say to the participant

> "Two years ago you saved a link to a map you liked. Open it now and see what you can
> do."

(Then, after link 1: "Here is another one you saved." — links 2 and 3.)

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` (`item`) at the unchanged legacy URL — **sold** | read "Sold" — no price, no price realised, no buyer named, the same for every visitor (G4, G10; no one has an account, D54) | the old URL answers 200 with the item, not a redirect to home; a changed slug with the same id → a 308 to the current address, the old query kept |
| 2 | `Item` › the available example | see "The item below has been sold, but the example shown above is currently available" and open it | the available example is a real `sameEdition` work, with its own status and "Price on request" |
| 3 | `Item` › "Own a print of this map" (the primary position) | follow the sister link to the exact product at the shop | the link says what it is: a sister shop, run by a separate company, with its own checkout — no shopper account on either side (D54, D31; the exact wording is BRANDS.md §5's); the shop's page shows the matching `Design` or `Item`, never its home page; a visitor outside Indonesia is told, once, that the shop delivers within Indonesia only for now (S3, EXPERIENCE-SHOP.md §4) |
| 4 | `Item` › "Tell me when another example arrives" → `WantList` (`want-list`) | leave an email | the want-list page saves what its URL names (this work's maker and place); the courteous answer admits nothing; rate-limited posts come back with their sentence; JavaScript off → works |
| 5 | email (mail catcher) → `WantList` | open the confirmation email; the link opens the want-list page; **the button there** confirms | a mail scanner prefetching the link confirms nothing; the page reads the list from the cookie the link set, and stops it by a plain POST |
| 6 | legacy link 2 (sold, no example, no design) | see similar works and the alert, nothing broken | an empty band is omitted, never shown empty |
| 7 | legacy link 3 (a miss) → `NotFound` | land on a designed not-found page with the old slug turned into a **prefilled search** with similar works | 404, noindex; the brand's shell and a working search form without JavaScript |
| 8 | the removed item → `Gone` | read that the piece is no longer offered, with similar works | a 404 with the Gone design, noindex, out of the sitemap; a sold item is **never** Gone |

## Channel handoffs

An old bookmark or a forum link → the site · the gallery → **the sister shop** (a
separate company, its own checkout) · the want-list's **double opt-in email** → back to
the want-list page · later, an alert email (within 15 minutes or a daily digest, the
subscriber's choice) · RFC 8058 one-click unsubscribe from the mail client.

## The moment that decides trust

**Step 1 — the sold page itself.** A collector landing on a sold map expects a dead end
or a bait-and-switch. An honest "Sold" — saying nothing of who bought it or for how much
— no fake scarcity, and a genuinely useful next step — the same edition in stock, a print of this map, or an alert that asks only for an
email — turns an old link into a relationship. Second: the alert's confirmation page
stating exactly what they will receive and how to stop it.

## Success criteria

- Unaided: the participant understands the map is sold without reading a price (step 1).
- Unaided: they find the available example (step 2) or the print (step 3), whichever
  exists.
- Unaided: they set up the alert and confirm it from the email (steps 4–5), and can say
  what it will send them.
- On the miss and the Gone case, they reach a search or similar works in one tap.
- Target (to calibrate): link opened to alert confirmed, **under 2 minutes**.

**Observe:** whether "Own a print" reads as a cheapening of the gallery or a service;
whether they notice the print is sold by a separate shop; whether a collector abroad
minds that the print cannot be sent to them yet.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): G10 ("Sold" only — the owner's draft's
"Sold · Private collection, Singapore" is not used), G4 (no price, so no price realised
either), G13 (nothing further the sold archive may claim) — folded in above; and S3 for
the sister shop. **Still owed by the owner:** nothing for this journey. **Settled by the
replan (TASKS.md 6.4):** no "price realised" for anyone (EXPERIENCE-GALLERY.md §8, D50,
D54); the shop's product page tells a visitor abroad, once, that it delivers within
Indonesia only for now (EXPERIENCE-SHOP.md §4). **Still open elsewhere:** BRANDS.md §5's
sister-link wording, which still quotes "its own account" (TASKS.md 6.7.c).
