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

A step that cannot run yet — its surface or module is not built, or the owner has not
answered — runs on its **default** (the owner interview names each one) and is noted
in the session record, never skipped silently.

## The index

| # | Journey | Surfaces | The moment that decides trust |
| - | ------- | -------- | ----------------------------- |
| [J-G1](gallery/j-g1-collector-google-request-price.md) | A collector from Google on a phone → item → verso zoom → request price → WhatsApp → payment link | Item (viewer, purchase panel), Pay, Order | the Pay page opened from WhatsApp names the seller, the piece and the agreed figure |
| [J-G2](gallery/j-g2-institution-proforma.md) | An institution → cart → proforma → bank transfer | Browse, Item, Cart, Checkout, Quote, Order | the proforma PDF their finance office can pay without a phone call |
| [J-G3](gallery/j-g3-designer-factsheet.md) | A designer → shortlist → factsheet → the client → hold | Browse, Item, Account › wishlist, Form (hold, enquiry) | the factsheet in the client's hands is accurate, dated and links back to the live status |
| [J-G4](gallery/j-g4-diaspora-town-search.md) | A diaspora buyer → a family town under its old name → buy in euros | Search, Place, Item, Cart, Checkout, WantList | the site knows Buitenzorg is Bogor |
| [J-G5](gallery/j-g5-sold-item-old-link.md) | An old link to a sold map → the available example, a print, an alert | Item (sold), sister link, WantList, NotFound / Gone | a sold page that is honest and still useful |
| [J-G6](gallery/j-g6-offer-counter-pay.md) | Make an offer → counter → accept → pay | Item, Form (offer), Account › offers, Pay, Order | the counter states the figure, the deadline and that nothing is owed until paid |
| [J-G7](gallery/j-g7-jakarta-viewing-rupiah.md) | A Jakarta collector → rupiah prices → book a viewing → buy | Browse, Item, Account › wishlist, Form (appointment), Location, Pay | the price in rupiah alone, and a viewing confirmation that names place, time zone and what will be out |
| [J-S1](shop/j-s1-instagram-configurator-qris.md) | The Instagram in-app browser → configurator → QRIS | Ig, Item (configurator), Cart, Checkout, Order (payment pending) | paying inside Instagram: the QR saves to the gallery and the page turns *Paid* by itself |
| [J-S2](shop/j-s2-tourist-bali-to-netherlands.md) | A tourist buying in Bali, shipped home to the Netherlands | Item, shell ship-to selector, Cart, Checkout, Order | the total names the charged currency and the duties before payment |
| [J-S3](shop/j-s3-hotel-partnership-quote.md) | A hotel → Partnership → quote → payment link | Partnership, Account (partner), Item, Form (quote), Quote, Pay | the quote shows trade beside list price, its validity and the seller |
| [J-S4](shop/j-s4-showroom-qr-walk-in.md) | A showroom QR walk-in → buy here and take it | Item (in-showroom mode), Cart, Checkout (pickup), Order, Location | staff see the pickup code as paid and hand the piece over |
| [J-S5](shop/j-s5-gift-recipient-abroad.md) | A gift to a recipient abroad, by a date | Browse (gifts), Item, Cart, Checkout, GiftCard, Order | "will it arrive in time, and will she be charged?" answered before payment |
| [J-S6](shop/j-s6-wishlist-and-alert.md) | Saved on the phone, back a week later, an alert by email | Wishlist, Item, WantList | the page says the list lives on this device, and the alert asks no account |
| [J-S7](shop/j-s7-va-pending-guest-tracking.md) | A virtual-account payment, the pending page, tracking as a guest | Checkout, Order (payment pending), OrderLookup | the exact amount, the VA to copy and the automatic switch to paid |

Surface names are DESIGN-SYSTEM.md §2's; the route keys in brackets are C10's
(`engine/packages/config/src/routes/surfaces.ts`). Public paths are examples in the
brand's current spelling; the route map decides the real ones.

## How to run a session

**Build and data.** Staging, a production build, the brand's seed data — never the
live sites. Before each session the facilitator checks the journey's **Before the
session** list: the items and states it needs (a priced item with a verso, a sold item
with an available example, a domestic-only Jakarta item…) exist on staging, the
sandbox payment methods answer, and the mail catcher (D13, staging) is open to show
emails arriving. Staging mail is caught, not delivered, so the facilitator shows the
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
   that explains and instructs, DESIGN-SYSTEM.md §10).
3. Every handoff out (WhatsApp, email, a bank app, a PDF) comes back to a page that
   knows where the participant was.
4. The participant can say, unprompted, who they are buying from.
5. On a phone, nothing needs a horizontal scroll or a pinch outside the viewer.
