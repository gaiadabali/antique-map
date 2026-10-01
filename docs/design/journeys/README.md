# Journeys and scenarios

The buyer journeys both storefronts are designed and tested against (TASKS.md 6.1.c).
Each file is a **scenario a test facilitator can run**: who the participant plays,
what to say to them, the path through the surfaces, the states to exercise, the channel
handoffs, the moment that decides trust, and the success criteria.

They are used four times, and each use reads the same file:

| Use | Where | What it takes from a journey |
| --- | ----- | ---------------------------- |
| The Design stage's buyer test | TASKS.md 13.2 (a clickable phone prototype of the item page and the configurator) | the prototype-scoped steps marked **P** in each path table; J-G1 and J-S1 are its core |
| The Gallery stage's done-criteria and e2e | TASKS.md 35.1.a (every gallery journey on a production build, desktop, phone, the WhatsApp in-app browser), phase 35 **Done when** | every step and every state listed |
| The gallery usability runs | TASKS.md 35.2 (collectors, a designer, a diaspora buyer; one session in Indonesian) | the task prompt, success criteria and what to observe |
| The Shop stage's done-criteria, e2e and usability runs | TASKS.md 32.1.a (every shop journey, phone, the Instagram, WhatsApp and TikTok in-app browsers), 32.2, phase 32 **Done when** | as above |

The owner answered the interview on 1 October 2026 ([owner-answers.md](owner-answers.md));
each journey's last section says which answers it folds in, what the architect's replan
settled (TASKS.md 6.4, folded in by 6.6), what the owner still owes it, and what is still
open with an adviser. A step that cannot run yet — its surface or module is not built, or
it waits on an item still owed — runs on the **default** its journey names and is noted
in the session record, never skipped silently. The half of a journey marked **after launch** is not run until what it
waits on opens (export for the shop, S3).

**What the answers changed.** The gallery is **enquiry-only** (D50): no price on any
original, no cart, no reserve button, no online offer; a call or WhatsApp starts a
negotiation and a staff-issued invoice, paid online, closes it — so the gallery's
journeys end on an invoice, J-G6 (online offers) is retired and J-G8 (a call → the
invoice) replaces it. The shop sells **within Indonesia only at launch** (S3), so J-S2's
and J-S5's abroad halves wait for export; its walk-ins are the main buyers (S9), so
**J-S4 is the shop's first journey beside J-S1** and runs in every shop round.

**What the replan settled** (TASKS.md 6.4, folded into the journeys by 6.6). The gallery's
invoice — an institution's proforma too — is **its own pay page**, `/pay/{token}`, in the
gallery's design, the Stripe Payment Element embedded and bank transfer beside it, never a
gateway-hosted page (D51); it is due in **three days** unless staff set another date, and
the buyer is **reminded 24 hours before** it lapses (D45). The gallery has **no accounts**
— nothing to register for and no account area (D54): an invoice, an order, a want-list and a
viewing are each reached by their own link (an order also by the order lookup), and the
wishlist lives on the visitor's device, as the shop's does. The shop's stock is **one
pool** at launch, held at the showroom, with no showroom-stock badge (D52). Analytics are
**first-party only** — no GA4 and no Meta Pixel, even after consent (D55). The owner
intends **no returns of originals** (D56) and **no refunds** at the shop (S12); both are
still for counsel (D11), so no journey promises a return or prints the rule.

## The index

| # | Journey | Surfaces | The moment that decides trust |
| - | ------- | -------- | ----------------------------- |
| [J-G1](gallery/j-g1-collector-google-request-price.md) | A collector from Google on a phone → item → verso zoom → WhatsApp → the agreed price → the invoice, paid online | Item (viewer, purchase panel), Pay, Order | the invoice opened from WhatsApp, on the gallery's own pay page, names the seller, the piece, the agreed figure, shipping and duties, and the due date |
| [J-G2](gallery/j-g2-institution-proforma.md) | An institution → an enquiry → a proforma invoice → bank transfer | Browse, Item, Form (quote), Pay, Order | the proforma PDF their finance office can pay without a phone call, on a pay page holding the maps until its due date |
| [J-G3](gallery/j-g3-designer-factsheet.md) | A designer → shortlist → factsheet → the client → the invoice that holds it | Browse, Item, Wishlist (this device), Form (enquiry), Pay | the factsheet in the client's hands is accurate, dated, carries no price and links back to the live status |
| [J-G4](gallery/j-g4-diaspora-town-search.md) | A diaspora buyer → a family town under its old name → an enquiry → an invoice paid from home | Search, Place, Item, Form (enquiry), Pay, Order, WantList | the site knows Buitenzorg is Bogor |
| [J-G5](gallery/j-g5-sold-item-old-link.md) | An old link to a sold map → the available example, a print, an alert | Item (sold), sister link, WantList, NotFound / Gone | a sold page that is honest — "Sold", nothing more — and still useful |
| [J-G7](gallery/j-g7-jakarta-viewing-rupiah.md) | A Jakarta collector → book a viewing → an invoice in rupiah | Browse, Item, Wishlist (this device), Form (appointment), Location, Pay, Order | a viewing confirmation that names place, time zone and what will be out; then an invoice in rupiah alone |
| [J-G8](gallery/j-g8-call-negotiated-invoice.md) | A call to the gallery → an agreed price → the invoice by email → paid in full, or released at its due date | Item, Pay, Order | the invoice after the call matches the conversation line for line |
| [J-S1](shop/j-s1-instagram-configurator-qris.md) | The Instagram in-app browser → configurator → QRIS | Ig, Item (configurator), Cart, Checkout, Order (payment pending) | paying inside Instagram: the QR saves to the gallery and the page turns *Paid* by itself |
| [J-S2](shop/j-s2-tourist-bali-to-netherlands.md) | A tourist buying in Bali → delivered to her villa before she flies (shipped home to the Netherlands: after launch) | Item, Cart, Checkout, Order | the promise says plainly whether it reaches the villa before her departure date |
| [J-S3](shop/j-s3-hotel-partnership-quote.md) | A hotel → Partnership → quote → payment link | Partnership, Account (partner), Item, Form (quote), Quote, Pay | the quote shows trade beside list price, its validity and the seller |
| [J-S4](shop/j-s4-showroom-qr-walk-in.md) | A showroom QR walk-in → buy here and take it — **the shop's first journey** (S9) | Item (in-showroom mode), Cart, Checkout (pickup), Order, Location | staff see the pickup code as paid and hand the piece over |
| [J-S5](shop/j-s5-gift-recipient-abroad.md) | A gift to a recipient elsewhere in Indonesia, by a date (to a recipient abroad: after launch) | Browse (gifts), Item, Cart, Checkout, Order | "will it arrive in time, and will the price show?" answered before payment |
| [J-S6](shop/j-s6-wishlist-and-alert.md) | Saved on the phone, back a week later, an alert by email | Wishlist, Item, WantList | the page says the list lives on this device, and the alert asks no account |
| [J-S7](shop/j-s7-va-pending-guest-tracking.md) | A virtual-account payment, the pending page, tracking as a guest | Checkout, Order (payment pending), OrderLookup | the exact amount, the VA to copy and the automatic switch to paid |

Live journeys: **seven per brand** (J-G1–J-G5, J-G7, J-G8; J-S1–J-S7).

**Retired** — kept as a record, never run, never counted:

| # | Journey | Retired | Why |
| - | ------- | ------- | --- |
| [J-G6](gallery/j-g6-offer-counter-pay.md) | Make an offer → counter → accept → pay | 2026-10-01 | D50 and D22: no online offers and no shown price on the gallery; the negotiated path is J-G1 and J-G8 |

Surface names are DESIGN-SYSTEM.md §2's; the route keys in brackets are C10's
(`engine/packages/config/src/routes/surfaces.ts`). Public paths are examples in the
brand's current spelling; the route map decides the real ones.

## How to run a session

**Build and data.** Staging, a production build, the brand's seed data — never the
live sites. Before each session the facilitator checks the journey's **Before the
session** list: the items and states it needs (an original with a verso, a sold item
with an available example, a domestic-only Jakarta item, an invoice past its due
date…) exist on staging, the sandbox payment methods answer, and the mail catcher (D13,
staging) is open to show emails arriving. In a gallery session the facilitator also
plays the gallery's staff — on WhatsApp, on the phone, by email — agreeing the figure the
script fixes and issuing the invoice in the admin (D50). Staging mail is caught, not delivered, so the facilitator shows the
participant the email on a second screen.

**Device.** The participant's own phone where possible, at its own settings, on its own
network (4G for at least one session per brand). A shop session opens the first link
inside the Instagram app (32.2.a: at least three of five). A desktop only where the
journey says so.

**Language.** Offer English or Indonesian; at least one gallery session and two shop
sessions run in Indonesian (35.2.a, 32.2.a, 13.2.c).

**Say little.** Read the task prompt as written; do not name buttons or pages. If the
participant is stuck for 60 seconds, note it as a failure of that step, then give the
smallest hint in the journey. Ask them to think aloud.

**Record per step:** time from the prompt, success (unaided / hinted / failed), what
they said (quotes verbatim), and every point of hesitation. A **blocker** is a step
failed unaided by two or more participants, or any moment a participant says they
would stop or would not trust the site; blockers are fixed or filed before the gate
(35.2.c, 32.2.c).

**Times are targets, not facts.** Each journey states a proposed target time; 13.2
calibrates it on the prototype and the stage gates adopt the calibrated figure.

## Common success criteria (every journey)

1. No step needs the facilitator to explain what a label means.
2. No price, availability or delivery promise the participant saw changes without the
   page saying so (`PriceChanged`, a held item, an invalid line — each in one sentence
   that explains and instructs, DESIGN-SYSTEM.md §10). On the gallery, the figure on an
   invoice is the figure agreed with staff, to the minor unit.
3. Every handoff out (WhatsApp, email, a bank app, a PDF) comes back to a page that
   knows where the participant was.
4. The participant can say, unprompted, who they are buying from.
5. On a phone, nothing needs a horizontal scroll or a pinch outside the viewer.
6. On the gallery, no price and no purchase control appears on any original, its tile,
   its factsheet or its structured data (D50, G4).
7. On the gallery, no step asks the participant for an account, and nothing they come
   back to needs one: each has its own link, and the wishlist stays on the device (D54).
   On the shop, only an approved partner has an account (D31, J-S3).
8. No page promises a return of an original or a refund, or prints a rule refusing one,
   until counsel words it (D56, S12, D11); the shop's damaged-print replacement is the
   one after-sale promise besides the gallery's authenticity guarantee.
