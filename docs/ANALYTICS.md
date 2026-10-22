# Analytics

**Purpose:** what the two sites measure, how, where it is kept and what the owner sees in the admin. Analytics are
**first-party only** (DR-13, the owner's G12: "log all our analytics ourselves and visible in the dashboard"). No
GA4, no Meta Pixel, no third-party analytics or advertising tag, for anyone, consent or not (the map on the checkout page is the one third-party script, COMPLIANCE.md).

## 1. Two sources, one rule

| Source | What | Written by |
| --- | --- | --- |
| **The beacon** | behaviour on the page: views, searches, zooms, clicks to WhatsApp or email | the page, through `POST /api/x/collect` |
| **The server** | facts: a lead stored, a chat handed off, an item added to the cart, an order created, paid or moved | the server code that made the change, in the **same transaction**, into the same `events` table |

**Business numbers are counted from business records** — revenue and orders from `orders`, leads and reply times
from `leads`, chats from `chat-sessions` — never from the beacon, which a blocked script or a closed tab can miss.
The beacon explains *how people got there*; the records say *what happened*. A WhatsApp or email tap leaves no
record on the site, so its beacon event is counted as a tap, never as a lead or a sale.

## 2. Cookieless by design

- **No cookie, no localStorage id, no fingerprint kept.** The browser sends no identifier at all.
- `/api/x/collect` derives a **`sessionId`** at request time: a hash of a secret salt, the site, the client's
  address and its user agent. The salt rotates daily and the old one is discarded, so a session cannot be
  followed across days and nothing stored can be reversed to an address.
- The address and user agent are used for that hash, for bot filtering and for `deviceClass` (`mobile` ·
  `tablet` · `desktop`), then dropped: **neither is stored**.
- With nothing stored on the device and nothing personal in the table, the sites show no analytics consent
  banner. *Open: counsel confirms under UU PDP and PDPA.*

## 3. The beacon

- The page sends only what it knows from its own view model: the event name and its props, plus `at`, `locale`
  and `surface`. **Collect stamps the rest**: `site` (from the hostname), `sessionId`, `deviceClass`, `path`
  (normalised: query string dropped except `utm_*` and the search page's `q`, which is redacted; the tracking
  token removed from `/track/…` and `/id/lacak/…`), `referrerHost` (the host only, never the full URL) and
  `utm { source, medium, campaign }` from the landing URL.
- Events are batched, sent with `navigator.sendBeacon`, at most one request per 5 seconds per tab, flushed on
  `visibilitychange`; fire-and-forget — a failed post never breaks a page.
- Collect validates every event against the catalogue (§4): an unknown name or a prop outside its schema drops
  the event; a batch is at most 20 events and 8 KB.

## 4. Event catalogue

Names are `object.verb`, past tense. Add to the list; **never rename** — the dashboard depends on the string.
`B` = beacon, `S` = server.

| Event | Src | Site | Props |
| --- | --- | --- | --- |
| `page.viewed` | B | both | `pageType` (home · listing · item · product · search · page · track · cart · checkout) |
| `search.submitted` | B | both | `query` (redacted, ≤ 100 chars), `resultCount`, `zeroResults` |
| `listing.viewed` | B | both | `listing` (type · maker · place · subject · category · all; `type` is the gallery's `objectType`, `category` the shop's), `facets[]` (keys and values), `resultCount` |
| `item.viewed` | B | gallery | `workId`, `objectType`, `status` — **no price, no price band**, ever |
| `item.zoomed` | B | gallery | `workId`, `imageRole`, `maxZoom` |
| `product.viewed` | B | shop | `productId`, `categorySlug`, `inStock` |
| `ask.clicked` | B | both | `channel` (whatsapp · email · form), `context` (item · product · page · footer · chat), `workId` or `productId` |
| `sell.clicked` | B | gallery | `channel` (whatsapp · email · form) |
| `partnership.clicked` | B | shop | `channel` |
| `lead.created` | S | both | `kind` (ask · sell · partnership · contact · chat), `source` (form · chat), `leadId` |
| `chat.started` | S | both | `chatSessionId`, `context` (item · product · page) |
| `chat.handedOff` | S | both | `chatSessionId`, `channel` (whatsapp · email), `hasItem` |
| `chat.leadCreated` | S | both | `chatSessionId`, `leadId` |
| `cart.added` | S | shop | `productId`, `variantSku`, `qty`, `value` (the server's unit price × qty) |
| `cart.removed` | S | shop | `productId`, `variantSku`, `qty` |
| `checkout.started` | S | shop | `lines`, `subtotal` |
| `checkout.stepCompleted` | S | shop | `step` (contact · delivery · review) |
| `checkout.blocked` | S | shop | `reason` (no-single-store · out-of-area · out-of-stock · price-changed · code-refused) |
| `payment.opened` | B | shop | `orderId`, `attempt` |
| `order.created` | S | shop | `orderId`, `lines`, `total`, `storeCode`, `distanceBand`, `hasDiscount` |
| `order.paid` | S | shop | `orderId`, `total`, `method` (Midtrans `payment_type`) |
| `order.statusChanged` | S | shop | `orderId`, `from`, `to`, `byRole` (owner · editor · store · system), `minutesSincePaid` |
| `tracking.viewed` | B | shop | `status` |
| `vitals.reported` | B | both | `pageType`, `lcp`, `inp`, `cls` |

`order.paid` is written inside the webhook's transaction (COMMERCE.md §6), so a payment that rolls back is never
counted. `value` and `total` are integer rupiah, as on the order.

## 5. Privacy: no personal data in events

- **Never in an event:** a name, email, phone or WhatsApp number, address, map pin, free text (but the redacted
  search query), an IP address, a user agent, a full referrer URL, a tracking token, a chat transcript or an
  asking price.
- **Search queries are redacted** before storage: anything shaped like an email address, a phone number or a run
  of 6 or more digits is replaced with `[removed]`, then the query is cut to 100 characters.
- **Ids only:** events may carry record ids (`workId`, `orderId`, `leadId`, `chatSessionId`), which mean nothing
  without staff access to the records, and the store code and a distance **band** — never the distance or the pin.
- Staff are not visitors: a request carrying an admin session (sent only on `ADMIN_HOST`) is not counted.

## 6. Bot filtering

At collect, before anything is written:

1. **Origin check** — `Origin` must be one of the two site hostnames (or their staging names on staging); the
   request must be `POST` with a JSON body.
2. **User agent** — a maintained list of crawlers, monitors, headless browsers and HTTP libraries is dropped; an
   empty user agent is dropped.
3. **Rate** — more than 120 events a minute from one `sessionId`, or a burst from one address, is dropped for that
   session.
4. **Shape** — unknown names, bad props, impossible values (negative counts, LCP over 60 s) are dropped.

Server events are not filtered by user agent (a bot cannot pay), but a lead flagged as spam is excluded from the
dashboard's lead counts. Dropped beacon events are counted per reason, so a filter that eats real traffic shows.

## 7. Storage and retention

- **`events`** — a Payload collection, hidden from editing, read by the dashboard: `at`, `site`, `name`,
  `source` (`beacon` · `server`), `sessionId`, `path`, `locale`, `deviceClass`, `referrerHost`, `utm { source,
  medium, campaign }`, `props` (JSON, ≤ 2 KB). Collect inserts with one SQL statement per batch; indexes on
  `(site, name, at)` and `(sessionId)`.
- **Retention:** raw events are kept **14 months** (COMPLIANCE.md §1), enough to compare a month with the same
  month a year before, and then deleted by a nightly job, in batches. If dashboard queries outgrow the raw table,
  daily totals move to a SQL materialised view refreshed nightly — a database view, not a new collection.
- Orders, payment events, leads and chat transcripts follow their own retention (COMPLIANCE.md §1; the accountant
  for orders). Deleting events never touches a business record.

## 8. The dashboard

A custom view at the top of `/admin`, one tab per site, each labelled with its site. The owner sees it; editors
and store users do not (`events` is owner-only, DR-10; SECURITY.md §2.2). Periods: 7, 30 and 90 days, or a range,
compared with the period before. **Days are counted in UTC+8** — Bali's WITA and Singapore time are the same offset.

**Gallery**

| Panel | Shows |
| --- | --- |
| Visitors | sessions and page views a day; top pages; referrers and `utm` sources; phone vs desktop; English vs Indonesian |
| Search | top queries; **zero-result queries** — the buying list: what collectors want that is not in the drawers |
| Antiques | most viewed and most zoomed; views → ask rate per antique; by object type, maker and place |
| Asks and sells | taps by channel (WhatsApp · email · form) and context; leads by kind from `leads`; time to first reply (`firstReplyAt`) against the same-working-day promise (G9) |
| Chat | sessions, hand-offs by channel, leads captured, hand-off rate, refusals and blocks, AI cost a day (from `chat-sessions` and `leads`; AI.md §6) |

**Shop**

| Panel | Shows |
| --- | --- |
| Visitors | as the gallery's |
| Funnel | product viewed → added to cart → checkout started → delivery step → paid, with the drop at each step, by device; `checkout.blocked` by reason |
| Sales | from `orders`: paid orders, revenue, average order, by category and product, by store, by distance band; discount use; the share with free delivery |
| Fulfilment | from `orders.history`: time from paid to processing, to on the way, to delivered, per store; orders waiting now; expired and cancelled share |
| Payments | method mix; expired-unpaid rate; flagged payments (amount mismatch, challenge, late) |
| Chat and leads | as the gallery's, plus partnership leads |
| Web vitals | LCP, INP and CLS at the 75th percentile by page type and device |

**Done means visible:** a panel is done when it renders for a real session on staging, not when rows exist in the
table.

## Open

- **No consent banner** — counsel confirms that cookieless, non-personal measurement needs none (UU PDP, PDPA).
  *Counsel.*
- **Country of visitors** — not measured at launch (no IP geolocation database); add one if the owner wants it.
  *Owner.*
