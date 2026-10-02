# Compliance — personal data, notices and legal pages

**Purpose:** what personal data the platform holds, how long, what each site must publish, and which legal
questions are counsel's. This is engineering input, not legal advice: the software must be able to do whatever
counsel decides, and this file names what it must never do. Sources for the legal points are in
[archive/2026-10-replan/RESEARCH.md](archive/2026-10-replan/RESEARCH.md) §5; every legal reading below is
**for counsel to confirm**.

## 1. Data inventory

| Data | Personal data in it | Where | Who sees it | Kept (default) |
| --- | --- | --- | --- | --- |
| Orders (shop) | buyer name, phone/WhatsApp, email, delivery address and map pin, gift note, items, payment state | `orders` | `owner`, `editor`; the assigned store | `Open:` the accounting/tax period — counsel and accountant |
| Payment events | provider references and statuses; no card numbers (Midtrans Snap holds card data) | `payment-events` | `owner` | with its order |
| Driver details | a third party's name, plate, phone or photo, as an image | `orders` (private file) | `owner`, `editor`, the store, the buyer's tracking page | 30 days after delivery or cancellation (`Open:` counsel) |
| Tracking link | none in the token; it opens the order's tracking page, contact details masked (SECURITY.md T3) | `orders` (the token's hash only) | the buyer | stops working 30 days after delivery or cancellation (`Open:` owner) |
| Leads | name, WhatsApp and/or email, message, items, consent text and time | `leads` | `owner` | 24 months after the lead closes, then purged (`Open:` counsel) |
| Chat transcripts | the visitor's messages with contact details masked, a daily-salted IP hash | `chat-sessions` | `owner` | 30 days after the last message (AI.md §3.4; `Open:` counsel) |
| Analytics | none by design: cookieless events, a daily-rotating salted session hash, no persistent id | `events` | `owner` (dashboard) | raw events 14 months, aggregates kept (ANALYTICS.md §7; `Open:` owner) |
| Partners | contact people's names, phones and emails | `partners` | `owner` | while the partnership lasts + 12 months (`Open:` counsel) |
| Import files and reports | what the sheets hold: store contacts and addresses; the owner's sheet also asking prices | private bucket, `imports/<job>/` | `owner`; the editor who ran it | 90 days, then purged (DATA.md; `Open:` owner) |
| Staff | name, email, role, sessions | `users` | `owner`; each user sees self | until removed |
| Server logs | IP addresses, user agents | host | developer | 30 days (SECURITY.md §2.13) |
| Backups | all of the above | off-box | developer | 30 days rolling — an erasure reaches the backups when they expire |

**Processors and transfers** (each named in the privacy notice): Midtrans (payments); Anthropic (chat text and
drafting images, processed in the US); Cloudflare (Turnstile, CDN); the mail provider (D13, `Open:`
production sender); the host and object storage (D12); **Google** (Maps Platform, at the shop's checkout only: the
map and place search receive the buyer's IP address and the address text they type, and our server's geocoding
receives the pin). The order keeps the buyer's own pin and typed address; Google's place names are shown, not
stored. Whether these transfers need contracts or safeguards under UU PDP is counsel's question.

**Google Maps is not an analytics tag.** The rule of no third-party trackers (DR-13, ANALYTICS.md) is about
analytics and advertising, and no such tag loads anywhere; the Google Maps script loads only on the checkout
page, once its delivery section opens (SECURITY.md B6).

## 2. Cookies and consent

| Storage | Purpose | Set when |
| --- | --- | --- |
| Cart (shop) | holds the cart before checkout | the visitor adds an item |
| Language preference | remembers a chosen language | the visitor switches language |
| `chat_sid` | ties chat turns to one conversation | the visitor opens the chat |
| Payload session cookie | staff sign-in | a staff member signs in |
| Midtrans Snap, Turnstile | payment and bot protection, set by those services in their own frames | at payment / on a protected form or the chat |
| Google Maps (shop checkout) | the delivery map and place search; what Google's script stores is measured in phase 6 and listed here (`Open:`) | the checkout's delivery section opens |

All are strictly necessary for something the visitor asked for, and the analytics are cookieless (DR-13).
**So no consent banner is planned**; the privacy notice lists every item above. `Open:` counsel confirms this
for UU PDP and for EU visitors to the gallery. Marketing email, if ever added, needs its own unticked checkbox.

## 3. Privacy notice — contents

One per site, in English and Indonesian (UU 24/2009), linked from the footer, every form and the chat:

- who the controller is and how to contact them;
- what data is collected (§1), why, and from where (forms, checkout, chat, the stores);
- the AI assistant: that it is an AI, what it receives (masked text), its provider, transcript retention;
- the processors and cross-border transfers (§1), including Google Maps at the shop's checkout;
- retention periods (§1);
- the rights a person has and how to use them (§4);
- the cookie list (§2);
- the notice's version and date.

## 4. Data-subject requests

Handled by the owner in the CMS; there are no accounts to self-serve.

1. A request arrives by email or WhatsApp. The owner checks it comes from the contact on record (a reply to
   that email address or number).
2. **Find** the person's records: search `orders`, `leads`, `chat-sessions` and `partners` by email and
   phone.
3. **Export** — the matching records as CSV or JSON from the admin, sent to the verified contact.
4. **Correct** — edit the record.
5. **Delete** — delete leads and chat sessions; on orders that must be kept for accounting, replace name,
   phone, email, address and pin with a placeholder (`Open:` counsel on what an order must keep); delete the
   driver image.
6. Reply in writing and record the request, the date and what was done (`Open:` where — default a note on a
   `contact` lead).

`Open:` counsel sets the response deadlines.

## 5. Legal pages per site

| Page | Gallery | Shop | Notes |
| --- | --- | --- | --- |
| Privacy notice | yes | yes | §3 |
| Terms of use | yes | yes | site use, the AI assistant's limits |
| Terms of sale | — | yes | guest checkout, payment, rupiah only, delivery within Indonesia (S3, DR-5) |
| Delivery | — | yes | the fee bands, free delivery over Rp 500.000, how the nearest store sends by Gojek/Grab (DR-6) |
| Damaged items | — | yes | the owner's rule — no refunds, a damaged item replaced on a photo (S12) — see below |
| Authenticity | yes | — | the lifetime authenticity guarantee (G6) and the certificate (G7) |
| Seller identity | yes | yes | legal name, address and registration, in the footer and on order emails (PP 80/2019) |

**The returns tension, for counsel (D11, D56).** UU 8/1999 art. 18 restricts standard clauses that refuse
returns or refunds. The shop's "no refunds" (S12) may be such a clause. Until counsel answers, the shop page
states the damaged-item replacement and prints **no** "no refunds" line; the gallery sells nothing online,
so it publishes the guarantee and no returns line. Counsel words both pages.

**Other rules the software keeps:** prices in rupiah only, with no foreign amount beside them (the shop
delivers within Indonesia only); WhatsApp and the AI chat never take payment — they link to the site's
checkout; the gallery's site never states that an item can be exported or shipped to a country (the client
handles any export question offline). `Open:` counsel on PSE registration for the shop.

## 6. Indonesia's personal data law (UU PDP)

UU PDP (Law 27/2022), with its implementing regulation as researched (PP 33/2026, full effect reported for
16 January 2027), points to: a privacy notice with required elements; consent kept separate from terms; breach
notice to people and the regulator within a short deadline (researched as 3 × 24 hours); a record of
processing; safeguards for cross-border transfers; and possibly a data protection officer. The platform
supports each: §3's notice, §1's inventory as the start of the record of processing, consent recorded on
leads, SECURITY.md §4's incident steps. **None of this is a legal conclusion** — counsel decides what applies,
including Singapore's PDPA for the gallery if its entity is in Singapore.

## Open

- Retention periods in §1 — counsel (and the accountant for orders).
- No consent banner (§2) — counsel, for UU PDP and EU visitors.
- Wording of every legal page; the shop's damaged-item notice and the gallery's guarantee (D11, D56).
- Data-subject request deadlines and where requests are recorded.
- Cross-border transfer safeguards (Anthropic, Cloudflare, Google, mail provider); DPO; PSE registration.
- The production mail sender.
- What Google Maps stores in the browser at checkout (§2), once phase 6 measures it.
