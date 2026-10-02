# Security — threat model, checklists and tests

**Purpose:** what we protect, from whom, and the controls that do it — each written so a test or a drill can
prove it. Safety is one of the four places the engineering effort goes (PLAN.md). AI-specific controls are in
[AI.md](AI.md) §3; data retention and breach-notice duties in [COMPLIANCE.md](COMPLIANCE.md).

## 1. Threat model

**Assets.** Money (order totals, the Midtrans account); stock integrity (the last unit sells once); personal
data in `orders`, `leads`, `chat-sessions` and driver images; unpublished catalogue and the owner-only
`works.askingPrice`; staff accounts; the owner's word (an AI or a page promising what he did not).

**Actors.** Anonymous visitors and bots (scrapers, credential stuffers, chat abusers); a buyer tampering with a
checkout; a `store` user curious about another store's orders; a phished staff member; a compromised
dependency; an attacker who obtains a backup or a log.

**Entry points.** Public pages; cart and checkout routes; the Midtrans notification webhook; the tracking page;
lead forms; the chat API; `/admin` and Payload's `/api/*`; uploads; cron routes; outbound calls (Google Maps
geocoding, Midtrans, Anthropic, Turnstile, mail); the Google Maps script on the checkout page.

| Threat | Main control | §  |
| --- | --- | --- |
| Paying less than the price | server-side pricing; webhook amount check | 2.3, 2.4 |
| Forged "paid" notification | signature verification + status confirmation by API | 2.4 |
| Overselling the last unit | one atomic decrement at order creation | 2.3 |
| A store user reading another store's orders | query-level scoping in access functions | 2.2 |
| Drafts, costs or notes leaking to the public | `overrideAccess: false`, published-only, projected reads | 2.2 |
| Admin takeover | lockout, rate limits, strong passwords, short sessions | 2.1, 2.15 |
| Tracking link guessing | 128-bit tokens, rate limit, minimal page | 2.5 |
| Malicious upload | sniffing, size limits, re-encoding, private masters | 2.6 |
| XSS, CSRF, clickjacking | React escaping, nonce CSP, SameSite + origin checks, `frame-ancestors` | 2.8 |
| SSRF through the geocode proxy or a URL field | host allowlist, no user-supplied URLs | 2.9 |
| A Google Maps key stolen or abused (a bill run up) | keys restricted by referrer or API, quota caps, a budget alert | 2.9 |
| Talking the AI out of its rules; draining its budget | AI.md §3 | 2.16 |
| Secret leak | host-only `.env`, scanning, rotation | 2.11 |
| Data loss | nightly off-box backups, restore drills | 2.14 |

## 2. Checklists

Test column: **U** unit (Vitest) · **I** integration (Payload Local API and REST against a test database) ·
**E** end to end (Playwright on a production build) · **C** CI static check · **O** ops drill or manual check
on staging. Numbers are defaults; `Open:` marks those an owner or counsel answer may change.

### 2.1 Authentication and sessions

| ID | Requirement | Test |
| --- | --- | --- |
| A1 | Only `users` sign in (roles `owner`, `editor`, `store`, DR-10); no visitor, buyer or partner accounts exist | I |
| A2 | Passwords: at least 12 characters and not in a common-password list, enforced server-side on create, change and reset | U, I |
| A3 | Lockout after 5 failed sign-ins for 15 minutes (`maxLoginAttempts`, `lockTime`); only `owner` unlocks early | I |
| A4 | Sign-in, forgot-password and reset routes rate-limited per IP (2.10); forgot-password answers the same whether or not the email exists | I |
| A5 | Session cookie `HttpOnly`, `Secure` in production, `SameSite=Lax`; `useSessions` on so sign-out and the owner's removal of a user end the session server-side | I, E |
| A6 | Session lifetime 8 hours (`Open:` owner); reset tokens expire after 1 hour and work once | I |
| A7 | The last `owner` can neither lose the role nor be deleted | I |
| A8 | No two-factor sign-in at launch, for any role (answered 2026-10-02, Q8; TASKS.md backlog v2.8): A2–A6 carry the sign-in | — |

### 2.2 Roles and access control

| Collection | `owner` | `editor` | `store` |
| --- | --- | --- | --- |
| `users` | all | self | self |
| `works`, `products`, `media`, `masters`, `makers`, `places`, `terms`, `pages`, `redirects` | all | all except `works.askingPrice` | read `products` and `media` only (to see what they stock and ship) |
| `works.askingPrice` | read, update | none | none |
| `stores` | all | read | read own |
| `stock-levels` | all | read and update: enter the physical count at any store | read own store's rows; update only their counts |
| `orders` | all | read all; move any status, reassign, cancel, upload the driver image | read own store's; move them forward only, upload the driver image, hand one back with a reason |
| `payment-events` | read | none | none (written only by the webhook) |
| `partners`, `leads`, `chat-sessions`, `discounts`, `events` | all | none | none |
| `site-settings` | all | none | none |

| ID | Requirement | Test |
| --- | --- | --- |
| R1 | Access is enforced by collection and field access functions; hiding a field or collection in the admin is never the control | I |
| R2 | A `store` user's reads of `orders` and `stock-levels` return a `Where` on their own `store`, so lists, counts, `find`, `findByID` and relationships are all scoped in the query | I |
| R3 | **Proof tests:** store user A cannot list, read by id, update or count an order or stock level of store B — through REST, the admin, and the Local API with `overrideAccess: false`; cannot change an order's `store` (reassigning is the owner's or an editor's), prices, roles or their own `store` | I, E |
| R4 | Every Local API call made for a request passes `user` and `overrideAccess: false`; the few system calls (webhook, import, jobs) set `overrideAccess: true` explicitly and are listed | C, I |
| R5 | Public reads filter `_status: 'published'` and `select` only the fields their view shows; a draft 404s; `askingPrice` never appears in a page, a tool result, a feed or JSON-LD | I, E |
| R6 | GraphQL is off; public REST reads of `users`, `orders`, `leads`, `chat-sessions`, `payment-events`, `masters` and `media` lists are refused | I |
| R7 | Role and `store` changes on `users` are `owner`-only and recorded | I |

### 2.3 Prices and stock

| ID | Requirement | Test |
| --- | --- | --- |
| P1 | The cart and checkout accept product/variant ids and quantities only; the server loads every price, applies the discount and the delivery fee from `site-settings`, and stores the total in integer minor units | U, I |
| P2 | A price, total, fee or discount sent by the client is ignored; a tampered request produces the server's amount | I |
| P3 | The amount sent to Midtrans equals the stored order total; nothing is rounded twice | U |
| P4 | Discount codes are validated on the server (active, site, limits); the free-shipping threshold is read from `site-settings` | U, I |
| P5 | Stock decrements in one SQL statement that fails when the quantity is short; 50 parallel orders for the last unit create exactly one order | I |
| P6 | Stock is released exactly once, on expiry or cancellation; a failed payment attempt releases nothing (COMMERCE.md §4) | I |
| P7 | A count, from staff or an import, is the physical count: the server stores it less the units held by that store's orders in `pending_payment`, `paid`, `processing` or `waiting_driver`, with the store's rows locked, so a recount never re-sells a held unit (DATA.md §3) | I |

### 2.4 Payment webhooks

| ID | Requirement | Test |
| --- | --- | --- |
| W1 | Midtrans notifications are verified: `signature_key` = SHA-512 of `order_id + status_code + gross_amount + server key`, compared in constant time; a bad signature → 401, recorded and alerted | U, I |
| W2 | Before applying, the server confirms the transaction through Midtrans's status API; the confirmed amount must equal the order total | I |
| W3 | Idempotent: a unique key in `payment-events` (provider, transaction id, status — Midtrans sends no event id); a duplicate delivery is acknowledged and changes nothing | I |
| W4 | Applied in one transaction with the order's status change; only allowed forward transitions apply; a late success on an expired order is flagged for staff, never silently re-sold | I |
| W5 | The webhook logs a hash of the payload, never the payload; card data never reaches our servers (Snap, PCI SAQ-A) | C, I |
| W6 | A reconciliation job queries pending orders every 10 minutes, so a lost notification never leaves an order pending | I |
| W7 | The payment simulator (`MIDTRANS_MODE=simulate`, which signs with a fixed local key) runs on local and staging only; the boot check refuses it in production (DEPLOYMENT.md §7) | U |

### 2.5 Order tracking

| ID | Requirement | Test |
| --- | --- | --- |
| T1 | The tracking token is 128 random bits (base64url); only its SHA-256 hash is stored | U |
| T2 | The tracking route is rate-limited per IP; a wrong token gets the same 404 as a missing one | I |
| T3 | The page shows the order number, items, status history, store name, driver image and the delivery area; the buyer's phone and email are masked; nothing the buyer did not type | E |
| T4 | `noindex`, `Referrer-Policy: no-referrer`; the token is scrubbed from access logs and error reports | E, O |
| T5 | The link stops working 30 days after delivery or cancellation (`Open:` owner) | I |
| T6 | The driver image is served only through a short-lived presigned URL from that page or the admin; deleted 30 days after delivery or cancellation (COMPLIANCE.md §1; `Open:` counsel) | I |

### 2.6 File uploads

| ID | Requirement | Test |
| --- | --- | --- |
| F1 | The type is sniffed from the bytes, never the extension or `Content-Type`; allowed: JPEG, PNG, WebP (and TIFF for `masters`); SVG and anything else refused | U, I |
| F2 | Size limits: `media` 25 MB, driver image 10 MB, `masters` through presigned direct upload with a signed length cap | I |
| F3 | Public derivatives are re-encoded by `sharp` and carry no EXIF, GPS or maker notes | U |
| F4 | `masters` and uploads live in a private bucket; staff get presigned GET URLs that expire in 5 minutes; only derivatives and deep-zoom tiles are public | I, O |
| F5 | Driver images are private, readable only by `owner`, `editor` and the order's store in the admin, and through the tracking page (T6) | I |
| F6 | Payload's paste-from-URL upload is off | I |

### 2.7 Input validation

| ID | Requirement | Test |
| --- | --- | --- |
| V1 | One shared schema per form or route body, used by the client for messages and by the server as the authority | U |
| V2 | Every string has a maximum length; phone numbers normalise to E.164; email addresses are validated and lower-cased | U |
| V3 | The map pin must lie inside the last delivery band (`site-settings`) of one store that holds every line — no split orders; otherwise checkout explains and creates nothing | U, E |
| V4 | Unknown fields are rejected, not ignored | U |

### 2.8 Browser: XSS, CSRF, CORS, CSP and headers

| ID | Requirement | Test |
| --- | --- | --- |
| B1 | No `dangerouslySetInnerHTML` outside the rich-text and chat renderers, which allowlist elements and link targets | C, U |
| B2 | CSP per request with a fresh nonce: `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`; `frame-src` and `connect-src` allow only Midtrans Snap and Turnstile origins besides our own (and Google Maps on the checkout page, B6); the admin has its own policy | E |
| B3 | Headers: HSTS (after cutover), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (geolocation self only, camera and microphone off), `Cross-Origin-Opener-Policy: same-origin` — set by the app, not the vhost | E |
| B4 | CSRF: cookie auth is `SameSite=Lax`; Payload's `csrf` list holds only our origins; our own POST routes and server actions refuse a mismatched `Origin` | I |
| B5 | CORS: Payload's `cors` lists only our origins; the bucket's CORS only the sites and the admin | I, O |
| B6 | **Google Maps on the checkout page alone** (`/checkout`, `/id/checkout`): its policy adds what Google documents for the Maps JavaScript API under a strict CSP — `'unsafe-eval'` and `blob:` in `script-src` (its scripts load through the nonce and `'strict-dynamic'`), `worker-src blob:`, `img-src` and `connect-src` for `*.googleapis.com`, `*.gstatic.com`, `*.google.com` and `*.googleusercontent.com`, `frame-src *.google.com` — and nothing from Google Fonts (the map's labels fall back to our fonts; the e2e CSP check allows that one blocked request and no other); every other page keeps B2's policy | E |

### 2.9 Outbound requests and SSRF

| ID | Requirement | Test |
| --- | --- | --- |
| S1 | Server-side fetches go only to an allowlist of hosts from config: Google's Geocoding API (`maps.googleapis.com`), Midtrans, Anthropic, Turnstile `siteverify`, mail | U |
| S2 | No request URL is built from user input; user text travels only as an encoded query parameter or body field — a pasted Google Maps link is parsed for its coordinates, never fetched | U |
| S3 | Timeouts (5 s default), a response-size cap, and no redirect followed to another host | U |
| S4 | Two Google Maps keys per environment, host-only: `GOOGLE_MAPS_BROWSER_KEY` is restricted by HTTP referrer to the shop's hosts and by API to the Maps JavaScript API and Places, and reaches only the checkout page, as a server-rendered prop; `GOOGLE_MAPS_SERVER_KEY` is restricted by API to Geocoding (and to the host's address where Google allows) and never leaves the server | O, E |
| S5 | A daily quota cap per API and a billing-budget alert at 80 % on the Google Cloud project; `/api/x/geocode` logs no key, coordinates or address text | U, O |

### 2.10 Rate limiting and bot protection

Keyed on the client address that nginx sets in `X-Forwarded-For`; the app binds loopback only, so the header
cannot be forged by a direct hit. In-process while there is one process; Postgres-backed if there are more.

| Route | Limit (per IP unless stated) |
| --- | --- |
| sign-in | 10 per 15 min, plus the account lockout (A3) |
| forgot / reset password | 3 per hour |
| checkout (create order) | 10 per hour |
| lead forms | 5 per hour, Turnstile required |
| chat | AI.md §3.2 |
| tracking page | 30 per minute |
| `/api/x/geocode` | 30 per minute |

Each limit has an integration test that the next request gets 429 with `Retry-After` (I).

### 2.11 Secrets

| ID | Requirement | Test |
| --- | --- | --- |
| K1 | Secrets live only in the host's `.env` (D49, mode 600): `DATABASE_URL`, `PAYLOAD_SECRET`, `MIDTRANS_SERVER_KEY`, `ANTHROPIC_API_KEY`, `TURNSTILE_SECRET`, `GOOGLE_MAPS_SERVER_KEY`, storage keys, SMTP, `CRON_SECRET` | O |
| K2 | Never in the repo, a build argument, a log or a chat. There is no `NEXT_PUBLIC_*` variable: one artifact serves staging and production, so public config (the Turnstile site key, the Midtrans client key, the Google Maps browser key) reaches the browser in server-rendered props or from a runtime-config endpoint | C |
| K3 | Secret scanning on every push; a hit fails CI | C |
| K4 | Separate keys per environment; staging never holds a production key | O |
| K5 | Rotation runbook: on a suspected leak, a staff departure, or yearly — rotate, restart, verify | O |
| K6 | Cron routes require `Authorization: Bearer $CRON_SECRET` and answer 503 when it is unset | I |

### 2.12 Dependencies and supply chain

| ID | Requirement | Test |
| --- | --- | --- |
| D1 | `pnpm-lock.yaml` committed; CI installs with `--frozen-lockfile`; Next and Payload pinned to exact versions | C |
| D2 | `pnpm audit --prod` in CI: high or critical fails (`Open:` warn for a week before blocking) | C |
| D3 | Install scripts allowed only for listed packages (`allowBuilds` in `pnpm-workspace.yaml`, pnpm 11) | C |
| D4 | A weekly update PR; every new dependency named in its PR with why | C, O |

### 2.13 Logging

| ID | Requirement | Test |
| --- | --- | --- |
| L1 | Structured logs; never request bodies of checkout, lead, chat or webhook routes | C, I |
| L2 | Phone numbers, emails, addresses, coordinates, tokens and API keys are redacted by the logger and the error reporter | U |
| L3 | Access logs drop query strings and tracking-token paths | O |
| L4 | Logs are kept 30 days (`Open:` counsel) | O |

### 2.14 Backups and restore

| ID | Requirement | Test |
| --- | --- | --- |
| BK1 | Nightly `pg_dump --format=custom`, encrypted, off-box, 30 days | O |
| BK2 | Object storage versioned; `masters` replicated and kept | O |
| BK3 | A restore drill before launch and quarterly: database and a media sample into a scratch environment, timed and written down | O |
| BK4 | A manual dump before any release that carries a migration | O |

### 2.15 Admin exposure

| ID | Requirement | Test |
| --- | --- | --- |
| X1 | `/admin` is `noindex`, rate-limited (2.10) and locked out (A3) | E |
| X2 | `/admin` and Payload's REST answer on one host only, `ADMIN_HOST` (Payload's `serverURL`: the shop's canonical host, `old-east-indies.gaiada.com` on staging — answered 2026-10-02, Q1), where staff cookies stay; on the other host both are 404 | E |
| X3 | Staff are listed, each with one role; a leaver is removed the same day | O |

### 2.16 AI

The chat and the drafting tool follow AI.md §3: untrusted-data handling of visitor text, catalogue text and
tool results; read-only tools plus one consent-gated write; server-built handoff links; output checks for
prices, links and leaks; Turnstile, rate, token and spend limits with a kill switch; masked contact details;
transcript retention. The mocked evaluation (AI.md §6) runs on every pull request (U, I); the real-model
evaluation on prompt, tool or model changes.

## 3. What we test and where

| Type | Runs | Covers |
| --- | --- | --- |
| Unit (Vitest) | every push | pricing maths, signature check, schemas, token generation, redaction, upload sniffing, output checks, URL allowlist |
| Integration (test database) | every push | access matrix and store scoping (R2, R3), published-only reads, webhook idempotency and ordering, atomic stock, rate limits, lockout |
| End to end (Playwright, production build) | every pull request | headers and CSP without violations, checkout with a tampered price, tracking page contents, admin sign-in as each role |
| CI static | every push | secret scan, `pnpm audit`, frozen lockfile, the `overrideAccess` rule (R4), no `dangerouslySetInnerHTML` (B1) |
| AI evaluation | PR (mocked) · on change (real) | AI.md §6 |
| Ops drills (staging) | before launch, then quarterly | restore, key rotation, bind and firewall check, log scrubbing |

The phase 10 security review (PLAN.md; TASKS.md 10.1) walks this whole document and records each ID as passing,
with its evidence.

## 4. Incident response

1. **Contain** — the switches first: `ai.chatEnabled`, `ai.draftingEnabled`, the shop's checkout flag in
   `site-settings`; revoke sessions; lock the affected users.
2. **Rotate** any secret that may be exposed (K5).
3. **Preserve** logs, the database state and the timeline before changing more.
4. **Assess** what personal data was involved and whose. If personal data was exposed, the owner decides,
   with counsel, on notices to people and the regulator within UU PDP's deadline (COMPLIANCE.md).
5. **Fix and verify**, then a short written review: cause, impact, what changed, which test now covers it.

Contacts (the owner, the developer on call, counsel) are kept in the runbook, not here.

## Open

- Session lifetime (8 hours), tracking-link and driver-image lifetimes (30 days), log retention (30 days).
- When `pnpm audit` starts blocking (default: after a week of warnings).
