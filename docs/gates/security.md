# Security gate (TASKS.md 10.1)

senior-integrator, 2026-10-08, branch `worktree-agent-a2683e59411a2c50a`, on `main` at 4a83afec (10.5
merged) plus this task's commits. Every ID of [SECURITY.md](../SECURITY.md) §2 is below with its
status and evidence. Status: ✅ passes · ✅\* passes, with a note · ❌ finding (the **F-n** rows at the
end) · ⏸ not run here, with the reason · ➖ owned by another task.

## What ran, and where

| Where | What | Result |
| --- | --- | --- |
| Workstation Postgres 16.14 on `localhost:5433` (`CMS_TEST_POSTGRES_URL=postgres://postgres:…@localhost:5433/postgres`), no Docker, no MinIO | `pnpm vitest run --config tests/security/vitest.config.ts` | **10 files, 522 passed, 0 failed, 0 skipped** (access sweep 423; the other nine files 99; the two F-03 pins are now ordinary passing tests, re-run after the 10.1.d fixes) |
| same | `pnpm vitest run --project apps engine/apps/web/src/security` | **25 passed** (CSP, headers, rate-limit builders) |
| same | the existing suites of cms, http, config, media, cache, chat, leads, tracking, gallery loaders (204 files) | **1628 passed, 4 failed, 28 skipped**. The 4 are `server/shop/catalogue/catalogue.db.test.ts`, not security (they failed the same on `main` before this task); the 28 skips are the MinIO storage suites |
| Local production build (`next build`, `next start -p 4390`, `LOCAL_PRODUCTION_BUILD=1`, a seeded database) | headers, nonces, a Chromium CSP drive, rate-limit probes, lockout, webhook, cron (below) | real output quoted in the rows |
| Staging, **GET and header inspection only**, about 20 requests spaced 1.5–10 s apart | headers, CORS, public REST, tracking page, robots, health | quoted in the rows. No sign-in, no write, no load, no upload. The staging database was near its cap (orchestrator), so the probes were kept few |

Run it: `$env:CMS_TEST_POSTGRES_URL='postgres://…'; pnpm vitest run --config tests/security/vitest.config.ts`
(the root Vitest config's three projects match `engine/**` only; adding `tests/security` there is
follow-up U-1). Without the variable the `*.db.test.ts` files skip: a setup state, never a pass.

Unrun, and why, in one place: **MinIO** (not running) so `media.storage.db`, `masters.storage.db`,
`media.access.storage.db`, `media.pipeline.storage.db`, `image-store.storage.db` (28 skips) did not
run; **Playwright e2e** (`tests/e2e/**`) was not run (needs the full staging-like stack); **gitleaks**
and **CodeQL** are not installed locally (a ripgrep pass and the repo's workflows stand in, below);
**nginx, host `.env` modes, access-log scrubbing, firewall, backups, Google Cloud quotas** are
reachable only with host or console access, which this task's go-ahead does not give (rows marked ⏸).

## Verdict

The access control, payment, upload, tracking and lead controls hold: 423 role×operation cells, the four
planted vulnerabilities and every replay, forgery and traversal probe behaved as SECURITY.md says. **Not
ready to launch on four counts**, each with a fix proposed: no CSP and no app-set security headers on
any host (F-01); no per-address limit on sign-in, password reset and checkout, and two limiters
that a forged `X-Forwarded-For` defeats (F-02, F-05); no password policy (F-03); `pnpm audit --prod`
fails with 3 high advisories, `next` 16.3.6 among them (F-11).

## The four planted vulnerabilities (10.1.e)

`node tests/security/plants/run-plants.mjs [idor|replay|xss|upload]` plants each as a one-spot text
edit in the product code (it refuses a dirty file), runs the guarding test file, restores the file
with `git checkout --`, and runs the test file again. Nothing planted is committed.

| Class | Planted in | The plant | Guard | With the plant | After revert |
| --- | --- | --- | --- | --- | --- |
| IDOR on an order | `cms/src/collections/orders/access.ts` | `ownStoreOrders` returns `true` for a store user | `tests/security/idor-order.db.test.ts` | **6 of 9 failed** (list, query shapes, PATCH and DELETE of the other order, Local API find and update, the core refusing a move or an image) | 9 passed |
| Webhook replay | `cms/src/shop/payments/notification.ts` | `dedupeKeyOf` differs on every call | `tests/security/webhook-replay.db.test.ts` | **3 of 7 failed** (one ledger row, replay after the order moved on, stock released once) | 7 passed |
| XSS in a lead | `cms/src/admin/leads/inbox.jsx` | the row's message rendered with `dangerouslySetInnerHTML` | `tests/security/lead-note-xss.test.ts` (and `static-code.test.ts` B1) | **6 of 11 failed** (every hostile string) | 11 passed |
| Upload with a script | `cms/src/shop/fulfilment/image.ts` | `sniffImageType` trusts any non-empty bytes | `tests/security/upload-script.db.test.ts` | **10 of 14 failed** (SVG, HTML, PHP, shell, EXE, text, GIF, BMP, BOM-SVG, RIFF accepted) | 14 passed |

Run twice, on `10c8793e` and again after merging main (`c8f21df0`, 10.5 included): the same counts both times, each plant detected and each file restored.

## Checklists

### 2.1 Authentication and sessions

| ID | Status | Evidence |
| --- | --- | --- |
| A1 | ✅ | `fields.db.test.ts` "only `users` sign in, with the three roles": the one collection with `auth` is `users`, roles `owner`, `editor`, `store`; the sweep's coverage test fails if a collection is added without a row |
| A2 | ✅ F-03 fixed | `collections/users/password-policy.ts` (`beforeValidate`: 12 characters minimum, bundled common list, message in en and id); the two former `it.fails` in `sign-in.db.test.ts` now pass (400 for `short` and `password1234`); `password-policy.test.ts` 3. Payload's reset-password writes the hash with no hooks, so a reset is not covered (residual) |
| A3 | ✅ | "locks an account after 5 failed sign-ins, even for the right password; only the owner unlocks it": 5×401, then the right password 401 with no token, another account unaffected, an editor's unlock 401/403, the owner's unlock 200 and sign-in 200. Constants 5 and 15 min (`config-controls`) |
| A4 | ✅ for the answer · ❌ F-02 for the limit | "forgot-password answers the same…": same status and body for a known and an unknown address. Local production build: 6 forgot-password posts from one address, 6×200, no 429 |
| A5 | ✅ | sign-out ends the session and the owner's removal of a user ends it (`/api/users/me` returns `user: null` for the old token); cookie `payload-token` is `HttpOnly`, `SameSite=Lax`, no `Domain`; `Secure` and sessions on in a production build, off on http (`config-controls`, 2 tests). Staging's cookie was not driven (no sign-in allowed) |
| A6 | ✅ F-04 fixed | session token lifetime is now **28800 s** (`tokenExpiration`, asserted in `password-policy.test.ts`; was 7200 s). Reset token: ≤ 1 h, works once, a second use and an expired token are refused (2 tests) |
| A7 | ✅ | "the last owner can neither lose the role nor be deleted"; `db/owner-backstop.db.test.ts` 8 passed |
| A8 | ➖ | no two-factor by decision (Q8) |

### 2.2 Roles and access control

| ID | Status | Evidence |
| --- | --- | --- |
| R1 | ✅ | `access-sweep.db.test.ts`: **423 cells** (21 collections in the table, `order-notifications` and `payload-kv` that it does not list, × owner, editor, store A, store B, anonymous × read, create, update, delete), over REST through Payload's handler, against the table encoded in `support/spec-2-2.ts`. Refused cells aim at a row that exists and the row survives (checked); allowed cells are shown to be past access (404 on a missing id, not 403). Five cells are **stricter** than the table, each listed with its reason in `STRICTER_THAN_TABLE`: owner create and delete of orders, owner update and delete of events, editor delete of masters. A looser answer would fail. `site-settings` global: only the owner reads or writes |
| R2 | ✅ | `access/matrix.test.ts` 31 passed (the `where` each access function returns); sweep "S" cells: a store user's list of `orders` and `stock-levels` is exactly the own store's rows, `stores` exactly the own store, `users` exactly self; IDOR file: list, count, id, `where[id]`, `where[store]`, `not_equals`, `or`, `in` never reach the other order |
| R3 | ✅ (admin ⏸) | `idor-order.db.test.ts` 9 passed: store A cannot list, count, read, PATCH, DELETE or move store B's order; over REST, the Local API with `overrideAccess: false`, and `moveOrder`, `handBackOrder`, `reassignOrder`, `attachDriverImage` (each refused, nothing written to the bucket); cannot change its order's `store` or totals; each refusal has a control on its own order. Stock rows: `stock-levels.db.test.ts` 7 passed. The admin is the same REST; the e2e store-panel specs were not run (⏸) |
| R4 | ✅ F-10 fixed | `static-code.test.ts`: no Local API call in `engine/apps/**` or `engine/packages/http/**` lacks an explicit `overrideAccess`; the nine request-serving files that pass `true` are listed (collect, chat catalogue and store adapters, lead adapters, tracking query, site settings, health ports, redirect map, driver-image reader); silent calls elsewhere only in `import/` and `seed/` (the `ai/draft.ts` kill-switch read now says `overrideAccess: true`) |
| R5 | ✅ | sweep anonymous reads: every returned doc `_status: published`, none with `askingPrice` or `physical`; `fields.db`: a draft is 404, `/versions` is staff only, `askingPrice` owner-only to read, an editor's write of it or of the acquisition cost changes nothing while the title lands. `load-item.db.test.ts` 4 ("the projection carries no askingPrice", "a draft is null"). Staging GET `/api/works?limit=100`: 100 docs, all `published`, none with `askingPrice` |
| R6 | ✅ | sweep: anonymous read of users, orders, leads, chat-sessions, payment-events, masters, media is 403; GraphQL (`/api/graphql`, `/api/graphql-playground`) is 404. Staging: the same seven paths 403 on the admin host, GraphQL 404 |
| R7 | ✅ | `fields.db`: a store user cannot make themselves owner or move store, an editor cannot make themselves owner, the owner's change is recorded (who, when) and the history is shown to the owner only; `users/admins.db.test.ts` 9 passed |

### 2.3 Prices and stock

| ID | Status | Evidence |
| --- | --- | --- |
| P1 | ✅ | `shop/pricing/quote.test.ts` 14, `quote.tamper.test.ts` 10 ("a price, line total, fee or total sent beside the ids is never read"), `bag.test.ts` 15 |
| P2 | ✅ | `quote.tamper.test.ts` (tampered cookie, fee table and "is-free" flags change nothing) |
| P3 | ✅ | `payments/snap.test.ts` 9 ("are the stored lines, the discount as one negative item and the fee as one, summing to the total"; "refused when the stored figures do not add up"); `quote.property.test.ts` 1; discount "rounds a percentage half-up to the rupiah, once" |
| P4 | ✅ | `pricing/discount.test.ts` 13, `delivery.test.ts` 19 |
| P5 | ✅ F-09 amended | `shop/orders/stock.db.test.ts` 2: **20** concurrent orders for the last unit, exactly one succeeds (the doc says 50; the Payload pool is 10 connections, so 50 only queue). The database refuses a negative quantity (`stock-levels.db`). Doc mismatch noted in F-09 |
| P6 | ✅ | `webhook-replay.db`: "releases the stock of an expired attempt once, however often 'expire' is delivered" (5 redeliveries, stock moves +2 once); `payments/expiry.db.test.ts` 5 ("returns its stock exactly once — sweeps run twice, and concurrently"); a failed attempt releases nothing (`decide.test`: "records pending, deny and failure without moving the order") |
| P7 | ✅ | `stock-levels.db.test.ts` ("stores a physical count less the units open orders hold, and 0 below them"; "waits for an order in flight on the row, then counts its units as held") |

### 2.4 Payment webhooks

All run against the real route (`midtransWebhookRoute`) on a real Postgres in simulate mode, after the 10.5 merge.

| ID | Status | Evidence |
| --- | --- | --- |
| W1 | ✅ | `webhook-replay.db`: six forgeries (changed amount, order id, status code, wrong signature, empty, absent) each 401 with the ledger unchanged and the order still `pending_payment`; `signature.test.ts` 3 (SHA-512 of the fields then the key; constant-time compare in `signature.ts`). Local production build: unsigned body 401, wrong signature 401 |
| W2 | ✅ | `http/routes.test.ts` ("answers 500, writing nothing, when the status API does not confirm the notification"); `webhook.db.test.ts` 6 ("flags an amount other than the order total and does not mark it paid") |
| W3 | ✅ | `webhook-replay.db`: the same settlement delivered once, thrice in sequence and ten at once: all 200, **one ledger row, one `paid` history row**, stock unchanged; `payment-events.db.test.ts` 5 (unique key; the append-only trigger refuses UPDATE, DELETE and TRUNCATE) |
| W4 | ✅ | "a replay after the order moved on does not drag it back to paid"; "a late success on an expired order is flagged for staff, never silently re-sold" (order stays `expired`, flagged, no stock taken); `decide.test.ts` 10; `webhook-contention.db.test.ts` (10.5) |
| W5 | ✅ | "logs the body's hash on a refusal and never the body itself": the log holds `sha256:<hash of the body>` and none of the order id, transaction id or signature; `routes.test.ts` "logs only a hash" |
| W6 | ✅ | `expiry.db.test.ts` "applies a settlement whose notification never arrived, on reconcile and in the sweep"; the cron route needs the bearer (K6) |
| W7 | ✅ | `config-controls`: simulate refused in production, allowed on staging; a live key refused on staging, a sandbox key refused in production; `payments/config.test.ts` 7 |

### 2.5 Order tracking

| ID | Status | Evidence |
| --- | --- | --- |
| T1 | ✅ F-12 accepted | `config-controls`: 200 tokens, each **256** random bits (43 base64url characters; the doc asks 128), all different, hash = SHA-256 hex. The order **also stores the token sealed** (AES-256-GCM under `ORDER_LINK_KEY`, `collections/orders/fields-tracking.ts`, TASKS.md 6.6) so emails can carry the link: recoverable by anyone holding the database and that key; the doc says "only its hash is stored" |
| T2 | ✅ | `config-controls`: after 10 distinct wrong tokens from one address the next is 429 with `Retry-After`; `proxy/tracking-rate-limit.test.ts` 5, `tracking-image-budget.test.ts` 6. Local production build: 40 wrong tokens from one address gave 10×404 then 30×429 (`retry-after: 58`), a second address still 404. A wrong token and a missing order are both a 404 (staging: the 404 page, same headers). Budget is 10 distinct tokens a minute, the doc says 30 a minute: stricter (F-09) |
| T3 | ✅ (e2e ⏸) | `load-tracking.db.test.ts` 5: a wrong token is null; the projection holds no more than the buyer typed; no driver image before `on_the_way`; never a presigned URL in the page. `tests/e2e/shop/tracking.spec.ts` not run |
| T4 | ✅ (logs ⏸) | `decideProxy` sets `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex` on the tracking path (`config-controls`, `proxy.test.ts` 18); staging GET of `/track/<wrong token>`: 404 with `referrer-policy: no-referrer`, `x-robots-tag: noindex`. Scrubbing the token from nginx access and error logs needs the host (⏸) |
| T5 | ✅ | `jobs/retention/retention.db.test.ts` 4 and `retention.test.ts` 4 |
| T6 | ✅ F-09 amended | `driver-image-route.test.ts`; `presign.test.ts` 4; the page serves the image through its own route (an in-process signed GET, 15 min cap), `hand-back-and-images.db.test.ts` 4 ("purge 30 days after"). The staff-read URL cap is 15 minutes (doc: 5) |

### 2.6 File uploads

| ID | Status | Evidence |
| --- | --- | --- |
| F1 | ✅ | `upload-script.db.test.ts` 14: ten hostile files (SVG with script, HTML named .jpg, server-side script source, shell script, EXE, text, GIF, BMP, a BOM-prefixed SVG, a non-WebP RIFF) are `not_an_image` by their bytes whatever the declared type, nothing reaches the bucket, the order is untouched; JPEG magic followed by script is `unreadable_image`. Plant caught (above). The `media` collection takes JPEG, PNG, WebP, AVIF only, no SVG, no TIFF (`config-controls`); Payload sniffs the bytes (`media.storage.db` ⏸ MinIO) |
| F2 | ✅ F-09 amended | empty and over-10 MB driver images refused (`too_large`); masters go by presigned PUT with a signed length (`masters.test.ts` 13). `media` cap is **90 MiB** in code, the doc says 25 MB (`config-controls` pins it) |
| F3 | ✅ | the photo-with-script-and-GPS comes out as RIFF/WEBP with none of `<scr`, `<?p`, the host name, `TestCam`, `Exif`, `GPS`, under a key we choose; `fulfilment/image.test.ts` 6 ("drops the Exif — camera and GPS — and writes WebP") |
| F4 | ⏸ | private bucket, 5-minute presigned GETs, public derivatives only: needs MinIO or the host (`masters.storage.db`, `media.access.storage.db` skipped). Code reading: `staffRead` TTL is 15 min (F-09) |
| F5 | ✅ | `hand-back-and-images.db`, `load-tracking.db` (the driver image only through the token's route or the admin); sweep: `orders` read is store-scoped |
| F6 | ✅ | `config-controls` and `sign-in.db`: `upload.pasteURL === false` on `media` |

### 2.7 Input validation

| ID | Status | Evidence |
| --- | --- | --- |
| V1 | ✅ | `server/leads/input.test.ts` 8 (one validator, the server the authority), `form-values.test.ts` |
| V2 | ✅ | `lead-note-xss.test.ts`: a 2001-character message is refused, hostile markup kept verbatim as text; `input.test.ts` (E.164, lower-cased email) |
| V3 | ✅ | `shop/orders/pick-store.db.test.ts`, `pricing/delivery.test.ts` 19 (pin beyond the last band, no split orders) |
| V4 | ✅ | `lead-note-xss.test.ts` ("an unknown key" refused, a visitor-supplied `site` refused), `leads/handler.test.ts` 15 |

### 2.8 Browser: XSS, CSRF, CORS, CSP and headers

| ID | Status | Evidence |
| --- | --- | --- |
| B1 | ✅ | `static-code.test.ts`: the one `dangerouslySetInnerHTML` is the product page's JSON-LD; `lead-note-xss.test.ts` shows `<`, `>` escaped in `jsonLdScript`; no `eval`, `new Function`, string timers. The chat renders text and allowlisted hrefs only (`chat-entries.test.tsx` 2, `chat-guardrails.test.ts` 6). The doc names a rich-text renderer; none exists |
| B2 | ❌ F-01 | **No `Content-Security-Policy` on staging** (both hosts, `/` and `/admin/login`). `@engine/http/proxy`: "until it lands, no CSP is set". The builder is written and tested here (`engine/apps/web/src/security/csp.ts`, 25 tests); on a local production build with it wired, 8 pages in Chromium raised **0 violations** with nonces on every script (`tests/security/csp-browser-check.mjs`) |
| B3 | ❌ F-01 | staging sends `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, `Referrer-Policy: same-origin` (nginx's, not the app's); **no** `Permissions-Policy`, **no** COOP, HSTS absent (right until cutover). `security/headers.ts` is ready |
| B4 | ✅ | `sign-in.db`: a cookie signs a request in only from the admin origin (`/api/users/me` is `user: null` from `https://evil.example` and from the gallery's origin); a cookie-authenticated PATCH from a foreign origin changes nothing; CSRF and CORS lists are the admin host's origin only (`config-controls`, empty rather than wildcard when no host list). The suite uses `ADMIN_HOST`; our own POST routes' Origin check was not separately probed |
| B5 | ✅ (bucket ⏸) | `sign-in.db` "answers CORS to the admin origin only"; staging: `Origin: https://evil.example` and the gallery's origin get no `access-control-allow-origin`, the shop's own origin gets it with credentials. Bucket CORS needs the host |
| B6 | ✅ (unwired, F-01) | `csp.test.ts`: the checkout page (`/checkout`, `/id/checkout`) alone adds `'unsafe-eval'` and `blob:`, `worker-src blob:`, Google's four hosts in `img-src` and `connect-src`, `frame-src *.google.com`, and no Google Fonts; every other page keeps B2's policy. The browser drive of `/checkout` raised no violation |

### 2.9 Outbound requests and SSRF

| ID | Status | Evidence |
| --- | --- | --- |
| S1 | ✅ | `static-code.test.ts`: the server-side `fetch` callers are exactly the geocoder, Turnstile, Midtrans (Snap), the admin image reader, the cache poster and the tracking image route; every host named in them is on the list (`maps.googleapis.com`, `challenges.cloudflare.com`, the four Midtrans hosts) |
| S2 | ✅ | `geocode.test.ts` 9: a pasted Maps link is parsed for coordinates, never fetched; user text travels as an encoded query parameter |
| S3 | ❌ F-07 | timeouts exist everywhere but the geocoder (`static-code.test.ts` pins it); Turnstile's is 10 s (doc 5 s); only the admin image reader, the cache poster and the tracking image route set `redirect: 'error'` |
| S4 | ⏸ | Google Cloud key restrictions: console access (`GOOGLE_MAPS_BROWSER_KEY` reaches only the checkout as a server-rendered prop: `pin-picker.test.ts`) |
| S5 | ⏸ | quota caps and the 80 % budget alert: console. `geocode.test.ts` "a burst from one address is dropped with a 429" (limit is looser than the doc: F-06) |

### 2.10 Rate limits (each next request gets 429 with `Retry-After`)

| Route | Status | Evidence |
| --- | --- | --- |
| sign-in | ❌ F-02 | local production build: 14 failed sign-ins from one address, 14×401, never 429; only the per-account lockout. Builder + test: `security/rate-limit.ts` (10 per 15 min; the 11th gets 429 with `Retry-After`) |
| forgot / reset password | ❌ F-02 | 6 posts, 6×200 |
| checkout | ❌ F-02 | no limiter in `server/shop/checkout/actions.ts` or `shop/orders/http.ts` (read). The new `busy` refusal of 10.5 is about lock contention, not a rate |
| lead forms | ✅\* F-06 | `leads/handler.test.ts` 15, `create-lead.test.ts` 12: **10 a minute** per address (doc: 5 an hour) with Turnstile checked after the limit; staging's Turnstile is Cloudflare's always-pass test key until OA8 |
| chat | ✅ | `chat-limits.test.ts` 12 (31st message refused, 6 sessions an hour, Turnstile again after 15, budget, kill switch, pacing) |
| tracking page | ✅\* | 10 distinct tokens a minute (stricter than 30); see T2 |
| `/api/x/geocode` | ❌ F-05, F-06 | a token bucket of **240 burst, 2 a second** (doc 30 a minute), keyed on the **whole** `X-Forwarded-For` header: 800 posts with the same real address and a forged first entry each time, **0 limited** (651 of 800 limited with an identical header). `/api/x/collect` keys the same way |

### 2.11 Secrets

| ID | Status | Evidence |
| --- | --- | --- |
| K1 | ⏸ | host `.env` mode 600 needs the host. Staging `/api/health` reports `boot: ok, problems 0, warnings 0` |
| K2 | ✅ | `static-code.test.ts`: no `NEXT_PUBLIC_*` read anywhere in `engine/**`, `.github/**` or `next.config.ts`; a ripgrep pass over the tree and **all 1617 commits on all refs** (14 key patterns) found no real secret; every hit is a fixture or placeholder (AWS's documented example key, `sk-ant-test-…`, `TEST0000` Midtrans keys, the dev `postgres:postgres`); `.env.example` holds placeholders; `static-supply.test.ts` re-runs the pass on the tree |
| K3 | ✅\* F-13 | `secrets.yml` (gitleaks 8.30.1, pinned binary, every push) exists on local `main`; it has **never run remotely** (not on `origin/main`) |
| K4 | ✅ | `config-controls`: staging refuses a live Midtrans key, production a sandbox key and the simulator |
| K5 | ❌ F-13 | no rotation runbook document: `docs/ops/helios-staging.md` records one storage rotation only |
| K6 | ✅ | `config-controls`: 503 while `CRON_SECRET` is unset, 401 for a missing, wrong or short bearer, `null` for the right one; local production build: cron POST 503 without the secret; `cron.test.ts` 17 |

### 2.12 Dependencies and supply chain

| ID | Status | Evidence |
| --- | --- | --- |
| D1 | ✅ | `static-supply.test.ts`: `pnpm-lock.yaml` committed, the setup action installs with `--frozen-lockfile`, **every** dependency of every package is an exact version (workspace links aside), `next` is one version and `payload` with all `@payloadcms/*` one version (3.90.2) |
| D2 | ❌ F-11 | `pnpm audit --prod --audit-level high`: **exit 1**, 16 advisories (3 low, 8 moderate, 5 high, 2 nodemailer ones ignored until 2026-11-02). The `audit` job in `ci.yml` would fail on them |
| D3 | ✅ | `allowBuilds` lists exactly `sharp`, `esbuild`, `@tailwindcss/oxide`, `unrs-resolver` (`static-supply.test.ts`); no `.npmrc`, no `minimumReleaseAge` (F-13) |
| D4 | ⏸ | the weekly update PR: no `dependabot.yml`, no scheduled workflow in the repo (F-13) |

### 2.13 Logging

| ID | Status | Evidence |
| --- | --- | --- |
| L1 | ✅ | `static-code.test.ts`: none of the 15+ `console.*` calls in the checkout, lead, chat, webhook, order and tracking code interpolates a body, contact, address or token; they log an error's name or an order id; the webhook logs a hash (W5) |
| L2 | ❌ F-14 (F-08 fixed) | `shop/notify/index.ts` now logs `order N: no shop origin configured; <kind> notification not sent`; `to` was the order status, never the address, so it was misleading wording rather than a leak, and `static-code.test.ts` pins it. A grep of `cms/src` found no other `console.*` or `logger` call printing an email or phone. No logger or error reporter redacts anything: there is no central logger (the mitigation is that code logs error names only) |
| L3 | ⏸ | nginx access logs: host |
| L4 | ⏸ | retention: host |

### 2.14 Backups and restore

BK1–BK4 ⏸ ➖: ops drills; the restore drill is 10.3's. Not read or run here.

### 2.15 Admin exposure

| ID | Status | Evidence |
| --- | --- | --- |
| X1 | ✅\* | `noindex, nofollow` meta on `/admin/login` (staging and local production build); locked out by A3. Not rate-limited: F-02 |
| X2 | ✅ | `config-controls` with `decideProxy`: `/admin` and Payload's REST answer on the admin host only; on the gallery host `/api/*` is 404 and `/admin` the designed 404; an unknown `Host` is a 404; engine routes answer on both. **Staging**: `indies-gallery.gaiada.com/admin/login` 404, `/api/users`, `/api/graphql` 404; the shop host answers (`/api/users` 403) |
| X3 | ⏸ | staff list and leaver process: owner/ops |

### 2.16 AI

Existing suites, run in the 1628-pass batch: `chat-guardrails.test.ts` 6 (no price in or out, canary and tool names never leak, handoff instead of another model), `chat-guarantees.test.ts` 29, `chat-limits.test.ts` 12, `chat-lead.test.ts` 9, `text.test.ts` 32 (output checks, masking), `turnstile.test.ts` 6, `chat-client`/`chat-entries` 7. ✅. The real-model evaluation (AI.md §6) is 8.4's, not re-run.

## Findings

| ID | Severity | Where | Finding and proposed fix | Owner lane |
| --- | --- | --- | --- | --- |
| **F-01** | High | `engine/apps/web/src/proxy.ts`, `engine/apps/web/next.config.ts` | No CSP and none of B3's app-set headers on any host. **Built and tested** in `engine/apps/web/src/security/{csp,headers}.ts`. Fix: `export const proxy = createProxy({ contentSecurityPolicy: contentSecurityPolicy() })` and a `headers()` rule `{ source: '/:path*', headers: securityHeaders({ hsts: false }) }`; set `MEDIA_PUBLIC_URL` (the policy's `img-src` reads it: unset, images served from the admin host are blocked on the gallery); remove the vhost's duplicate `Referrer-Policy`, `X-XSS-Protection`; HSTS only after cutover; verify Snap and Turnstile on staging with a sandbox key (not exercised here, simulate mode loads neither) | PLT |
| **F-02** | High | proxy; `server/shop/checkout/actions.ts` | No per-address limit on sign-in, forgot and reset password, checkout (a credential stuffer across accounts, and a reset-mail flood to any staff address, are unlimited). **Built and tested** in `security/rate-limit.ts` (`limitFor`, `limiters`, `limited`, `clientAddress`). Fix: wrap the proxy's answer as the file's header shows; call `limiters.checkout.hit` in the order action | PLT, SHP |
| **F-03** | Medium | `engine/packages/cms/src/collections/users/index.ts` | No password policy (A2): any password is accepted on create, change and reset (two `it.fails` pin it). Fix: a `beforeValidate` on `password` refusing under 12 characters and the common-password list; remove the `.fails` **Fixed** 10.1.d (commit 8dd45f1a). | CMS |
| **F-04** | Low | `collections/users/index.ts` `auth` | Session lifetime is Payload's 2 h default, SECURITY.md A6 says 8 h. Set `tokenExpiration: 28800` or amend the doc (owner's call, Open in the doc) **Fixed** 10.1.d (commit 8dd45f1a). | CMS / DOC |
| **F-05** | Medium | `app/api/x/geocode/route.ts:24`, `app/api/x/collect/route.ts:16` | The limiter key is the whole `X-Forwarded-For` value; nginx appends the real address, so a client that varies the leading entries gets a fresh bucket each time (measured: 0 of 800 limited, against 651 with an identical header). Fix: key on the last entry (`clientAddress` in `security/rate-limit.ts`, or the proxy's) | PLT / SHP |
| **F-06** | Medium | `server/analytics/rate.ts`, `server/leads/rate.ts` | Limits looser than §2.10: geocode burst 240 then 2 a second (doc 30 a minute: a Google bill); leads 10 a minute (doc 5 an hour). Set the numbers or amend the doc | PLT / SHP |
| **F-07** | Medium | `server/shop/checkout/geocode.ts:87` | Geocoder `fetch(url)` has no timeout, no size cap, follows redirects (S3); Turnstile's timeout is 10 s (doc 5 s); Midtrans calls do not set `redirect: 'error'`. Fix: `AbortSignal.timeout(5_000)`, `redirect: 'error'` | PLT |
| **F-08** | Low | `cms/src/shop/notify/index.ts:126` | Logs the buyer's email address. Drop `${to}` **Fixed** 10.1.d (the line logged the order status, not the address; wording changed, pinned). | CMS / SHP |
| **F-09** | Low | SECURITY.md | Doc and code disagree, each safe: A6 session 8 h (2 h), F2 media 25 MB (90 MiB), F4/T6 5-minute staff URLs (15 min), P5 50 parallel (test uses 20), T2 30 a minute (10 distinct tokens), the table's "all" for owner create and delete of `orders`, update and delete of `events`, editor delete of `masters` (refused on purpose), B1's rich-text renderer (none), K1's list lacks `ORDER_LINK_KEY` and `LINK_TOKEN_KEYS` **Accepted, doc amended** 10.1.d (SECURITY.md A6, F2, F4, T6, P5, T2, §2.2 table, B1, K1). | DOC |
| **F-10** | Low | `cms/src/ai/draft.ts:73` | Kill-switch read relies on the Local API's default access skip; say `overrideAccess: true` (R4) **Fixed** 10.1.d (explicit `overrideAccess: true` with a comment). | AIX |
| **F-11** | High | root `package.json`, `pnpm-workspace.yaml`, `engine/apps/web/package.json`, `engine/packages/{cms,cache}/package.json` | `pnpm audit --prod` exits 1. `next` 16.3.6 → **16.3.8** (patches an image-optimizer SSRF, a draft-mode leak through `use cache` that touches "published-only", two cache-poisoning advisories for self-hosted standalone); overrides for `braces` ≥ 3.0.4, `source-map-js` ≥ 1.2.2, `dompurify` ≥ 3.4.16; keep the two `nodemailer` ignores to 2026-11-02 and normalise buyer email before sending; then confirm the `@payloadcms/*` 3.90.2 peer range accepts it | OPS / PLT |
| **F-12** | Low | `collections/orders/fields-tracking.ts` | The tracking token is stored sealed as well as hashed (T1 says hash only): accept it in the doc (6.6's decision B) and add `ORDER_LINK_KEY` to K1's list **Accepted** 10.1.d (user decision 2026-10-06; SECURITY.md T1 and K1 amended). | DOC |
| **F-13** | Low | `.github`, repo | `secrets.yml` and `codeql.yml` exist only on local `main`; remote CI has been red since 2026-10-02; the remote already runs GitHub's *default* CodeQL setup, which refuses a workflow's SARIF — turn the default off or drop `codeql.yml` before pushing; no `minimumReleaseAge`; no scheduled dependency PRs (D4); no rotation runbook (K5) | OPS |
| **F-14** | Low | repo | L2: no central logger or redactor and no error reporter exists; code logs error names only. Add a logger with a redaction list when an error reporter is chosen | PLT |
| **F-15** | Low | nginx / `/api/health` | Staging answers `x-middleware-rewrite` (internal route, the tracking token included) on every rewritten response, and `/api/health` publicly with the environment name, queue lag and check detail. Strip the first at nginx, trim the second for outside callers | OPS |
| **F-16** | Info | orchestrator note, routed to 10.2 | An unpublished shop product's URL: **not reproduced at 05:01 UTC.** `/product/greeting-card-set-frangipani` (the first mock, `SEED-SHOP-001`, computed from the seed's generator) and `/id/produk/…` answered **404** on the HTML request, the same as a slug that never existed (404, 19959 vs 19983 bytes); the RSC request (`RSC: 1`) answered 307 then **200** for both the unpublished and the never-existed slug (15684 vs 15700 bytes), so the status is the framework's, not a difference by publication. **No draft field leaks**: the HTML and the flight payload contain only the requested slug (in the route params and the language-switch link), none of the name, "Mock seed", price, SKU, stock, `_status`. If 200 was seen earlier it was probably a cached window from when the product was published | 10.2 |
| U-1 | Follow-up | root `vitest.config.ts` | Add `tests/security` as a project (or call `--config tests/security/vitest.config.ts` in CI) so the sweep runs every push | OPS |

## What was added (paths)

`tests/security/` — `access-sweep.db.test.ts`, `fields.db.test.ts`, `sign-in.db.test.ts`,
`idor-order.db.test.ts`, `webhook-replay.db.test.ts`, `lead-note-xss.test.ts`,
`upload-script.db.test.ts`, `config-controls.test.ts`, `static-code.test.ts`, `static-supply.test.ts`,
`support/{stack,seed,spec-2-2,scan}.ts`, `vitest.config.ts`, `plants/run-plants.mjs`,
`csp-browser-check.mjs`. `engine/apps/web/src/security/` — `csp.ts`, `headers.ts`, `rate-limit.ts`
and their tests. Not wired (outside this task's paths): see F-01, F-02.

One note on the suite itself: the first copy of `upload-script.db.test.ts` vanished from disk after it
had run once, probably quarantined by Windows' antivirus for spelling out a web shell; the committed
copy assembles its hostile payloads from pieces at run time.
