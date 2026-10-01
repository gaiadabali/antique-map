# J-S6 — Saved on the phone, back a week later, an alert by email

**Who:** a Jakarta shopper browsing the shop late at night on her phone. She saves three
things she likes without buying. A week later, on the same phone, she comes back: one is
still there, one has sold out at the showroom, and she wants to hear when new prints of
old Batavia arrive. She will not create an account.

**Rests on:** **D35** (the wishlist lives on the guest's device, no account; every
wishlist action tracked within the consent rules), **D38** (the cookieless beacon counts
before consent; GA4 and Meta only after), **D39** (the want-list is an email alert, no
account: double opt-in, alerts by email with an unsubscribe), D31 (guests only),
EXPERIENCE-SHOP.md §2 (saved items: the heart; every "alert me" link leads to the one
want-list page), §10 (retention), DESIGN-SYSTEM.md §2 (`Wishlist`, `WantList`),
BRANDS.md §4 (`retention.deviceWishlist`, `retention.emailWantList`,
`retention.backInStock`).

**Used by:** 32.1.a e2e, 32.2 usability (the local shopper session).

## Before the session

- On staging: three products — two available, one stocked **only** at the showroom and
  set to sell out between the two halves of the session (everything is stocked; nothing
  is made to order, S7); a "Batavia/Jakarta" collection with a saved-search subject.
- The consent banner in its default state; the mail catcher open.
- The session runs in **two halves** on the same phone and browser: save, then (after
  the facilitator changes the stock) return.

## Say to the participant

> "It's late and you're just looking. Keep the things you like so you can find them
> again." … (later) "It's a week later. Go back to the things you kept. If something
> isn't available, make sure you hear about it — and about any new prints of old
> Batavia."

## The path

| # | Surface (route) | The participant can | States to exercise |
| - | --------------- | ------------------- | ------------------ |
| 1 | `Item` / tiles › the heart | save three products | the heart sits outside the tile's link with its own focus stop; no sign-in prompt anywhere; before consent only the cookieless beacon counts the save (D38) |
| 2 | `Wishlist` (`wishlist`) | see the three saved items | the page **says where the list lives** ("saved on this phone, in this browser"); the list streams in; empty state explains how to save |
| 3 | (a week later) shell › the heart → `Wishlist` | find the three again | a removed product drops out with a line saying so; the sold-out showroom item reads unavailable with "Alert me"; a different browser or cleared data → an empty list whose copy explains why, never an error |
| 4 | `Wishlist` › remove | remove one item with its heart | the removal is immediate and announced |
| 5 | "Alert me" (back in stock) → `WantList` (`want-list`) | leave an email for the sold-out item | the one want-list page every alert leads to; it asks an email, **no account**; the same courteous answer whoever asks |
| 6 | `Browse` › the Batavia collection › "Alert me about new prints" → `WantList` | save the search with the same email | one address may hold several lists; each is stoppable on its own |
| 7 | email (mail catcher) → `WantList` | open the confirmation; its link opens the page; **the button** confirms | a mail scanner following the link confirms nothing; unconfirmed lists never send |
| 8 | a later alert email → `Item` | open the alert and buy (as J-S1) | the alert's unsubscribe stops only that list (RFC 8058 one-click from the mail client) |

## Channel handoffs

The site (the device's own storage for the wishlist) → **email**: the double opt-in, then
the alerts → back to the want-list page (confirm, stop) or the product. No account, no
password, no WhatsApp at any point unless she chooses "Ask on WhatsApp".

## The moment that decides trust

**Steps 2–3 and 5 — a list with no account.** She has to trust that the shop kept her
list without asking who she is, and that an email alert will not turn into a stream of
marketing. The wishlist page must say plainly that the list lives on this phone (so a
missing list on her laptop is no surprise), and the want-list page must ask only for an
email, say exactly what it will send and how to stop it — and send nothing until she
confirms.

## Success criteria

- Unaided: she saves three items without being asked to sign in (step 1).
- Unaided: she finds them again a week later (step 3) and can say where they are kept.
- Unaided: she sets an alert for the sold-out item and for the collection, and confirms
  from the email (steps 5–7).
- No account, sign-up or password appears anywhere in the path.
- Target (to calibrate): return to the list and alert confirmed, **under 2 minutes**.

**Observe:** whether she expects the list on her laptop too; whether "alert me" is
understood as email; whether the consent banner interrupts saving.

## Open until the owner answers

**Answered 2026-10-01** ([owner-answers.md](../owner-answers.md)): S7 (everything in stock), S13 (the only
offers are free shipping over Rp 500.000 and a welcome code — an alert carries no offer of
its own), S15 (the alert copy in the *Anda* register, TASKS.md 6.3.g) — folded in above.
S9 answered where buyers come from (the showroom first), not how often they come back;
the shop's own analytics will show it. **Still owed by the owner:** nothing for this
journey.
