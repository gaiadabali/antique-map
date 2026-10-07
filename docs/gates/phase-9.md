# Phase 9 gate — partners, leads, analytics and SEO (staging)

Evidence for the Checks of TASKS.md phase 9, run against staging (`indies-gallery.gaiada.com`,
`old-east-indies.gaiada.com`) on release **`production-20261007T091257Z-0fc3942a`** (main `0fc3942a`).

## 9.3.d — metadata, structured data and sitemaps

The first crawl, on release `188996d` (2026-10-07 morning), **failed**: each sitemap was the phase-2 stub (3 English
URLs), both home pages had no meta description, and the shop sitemap listed `/contact` (404). Fixed by `w/9.3fix`
(merged `dda63752`): sitemaps from published records, one `<url>` per locale with translated segments and
en/id/x-default alternates; a description on every page type; Indonesian alternates from the translated segment.

Rerun on `0fc3942a` with the read-only tool (`engine/tooling/phase9-checks/seo-crawl.mjs`, ≤ 4 requests/s):

```
seo-crawl (gallery) against https://indies-gallery.gaiada.com
  1 sitemap file(s), 496 URLs (en 248, id 248)
  checked 496, skipped 0 sensitive
  0 page(s) with a problem                                  exit 0
seo-crawl (shop) against https://old-east-indies.gaiada.com
  1 sitemap file(s), 178 URLs (en 89, id 89)
  checked 178, skipped 0 sensitive
  0 page(s) with a problem                                  exit 0
```

Every listed page answered 200 with an absolute canonical, `hreflang` en, id and x-default, and a non-empty
description; no gallery JSON-LD block contains `price` or `offers` (the tool walks every block).

Sitemap counts against the database (`_status = 'published'`):

| | published | sitemap item/product URLs | per locale |
| --- | --- | --- | --- |
| gallery works (sold ones included) | 49 | 98 | 49 + 49 |
| shop products | 80 | 160 | 80 + 80 |

The gallery sitemap contains no `price`. **9.3.d passes.**

## 9.1.e — a partnership lead, the owner's Closed, the editor's refusal, retention

Run 2026-10-07 on staging, release `production-20261007T091257Z-0fc3942a`, by QA. Staff credentials were sourced
inside commands on Helios (never printed). Cookie auth over REST needs an `Origin: https://old-east-indies.gaiada.com`
header (Payload's CSRF check), as the admin's own requests carry. Test data carries `E2E-9QA`.

### 1. A partnership form creates a `partnership` lead — PASS

The form is a Next server action. It was posted the way a browser without JavaScript posts it: multipart to
`/partnership` with the hidden `$ACTION_*` inputs copied from the live page, the form fields and Cloudflare's test
Turnstile token.

```
curl -s -o r1.html -w "%{http_code}\n" -A "Mozilla/5.0 ... Chrome/126 ..." https://old-east-indies.gaiada.com/partnership \
  -F '$ACTION_REF_1=' -F '$ACTION_1:0={"id":"60a1...","bound":"$@1"}' -F '$ACTION_1:1=[{"status":"idle",...}]' \
  -F '$ACTION_KEY=<from page>' -F locale=en -F 'name=E2E-9QA Partner Hotel' -F email=e2e-9qa@example.com \
  -F whatsapp= -F 'message=E2E-9QA partnership enquiry test' -F consent=on -F 'cf-turnstile-response=XXXX.DUMMY.TOKEN.XXXX'
200
```

```
select id,kind,site,source,status,closed_at,created_at from leads order by id desc limit 5
 id |    kind     | site | source | status | closed_at |         created_at
 48 | partnership | shop | form   | new    |           | 2026-10-07 09:23:26.723+00
```

### 2. The owner moves it to Closed and `closed_at` is set — PASS

Owner login (`POST /api/users/login`, 200), then `PATCH /api/leads/48` three times, as the admin does:

```
== PATCH status=contacted    {"message":"Updated successfully.","status":"contacted","closedAt":null}
== PATCH status=in_progress  {"message":"Updated successfully.","status":"in_progress","closedAt":null}
== PATCH status=closed       {"message":"Updated successfully.","status":"closed","closedAt":"2026-10-07T09:25:08.896Z"}
history: new 09:23:26.721 -> contacted 09:25:08.694 -> in_progress 09:25:08.784 -> closed 09:25:08.896
select id,kind,site,source,status,closed_at from leads where id=48
 48 | partnership | shop | form   | closed | 2026-10-07 09:25:08.896+00
```

### 3. An editor cannot open the inbox — PASS

An editor user (`editor.9qa.staging@gaiada.com`, role `editor`, random password in a mode-700 temp dir on the host)
was created through `POST /api/users` as the owner and deleted at the end.

```
editor login                  200
editor GET /api/leads         {"errors":[{"message":"You are not allowed to perform this action."}]}   HTTP 403
editor GET /api/leads/48      {"errors":[{"message":"You are not allowed to perform this action."}]}   HTTP 403
editor GET /admin/leads       HTTP 200 (Payload streams the view)
   "Only the owner opens the leads inbox" in the editor's HTML: 1  (the view's refusal text, admin/leads/inbox.jsx)
   the same string in the owner's HTML:                         0
```

The positive control is the owner: `/admin/leads` answers without the refusal, and the owner's PATCHes above passed.

### 4. Retention deletes only what is past its date and logs counts only — PASS

At merge (report `docs/reports/workers/9.1core.md`, run with `CMS_TEST_POSTGRES_URL` set; the local database is
down, so they were not rerun now), these `engine/packages/cms/src/jobs/retention/retention.db.test.ts` tests
passed, with a fixed clock:

- `retention deletes only what is past its date`: one row an hour inside and one an hour past, for chat sessions, closed leads, spam leads and driver images;
- `an open lead is never deleted however old` (new, contacted, in_progress from 2019, and a closed lead with no `closedAt`);
- `a second retention run deletes nothing`;
- `the retention log holds counts only` (exact lines `retention: chatSessions=1 leads=2 driverImages=1`, then all zeros);
- `retention-route.test.ts`: `the cron route refuses without CRON_SECRET`. The same report: 13 files, 68 tests passed; full `pnpm verify` 1980 passed.

On staging:

```
crontab -l -u uindies:   15 19 * * * /home/uindies/bin/indies-cron retention 200,204 900     (daily 19:15 UTC = 03:15 WITA)
indies-cron discards the response body (curl -o /dev/null); the job logs through the app logger, i.e. pm2:
/home/uindies/.pm2/logs/uindies-out-0.log.1:
  2026-10-06T19:15:02: [19:15:02] INFO: retention: chatSessions=0 leads=0 driverImages=0
/home/uindies/.indies/cron-retention.state: ok          (last run 2026-10-06 19:15)
```

The line is three integers: no id, name, address or message. The run had nothing past its date (staging holds no
expired data), so it deleted 0 and the fixed-clock database tests carry the "deletes only expired" proof. The next
run (2026-10-07 19:15 UTC) falls after this QA run.

**9.1.e: PASS on all four clauses.**
Cleanup: lead 48 deleted through `DELETE /api/leads/48`, the editor user deleted through `DELETE /api/users/<id>`
(`totalDocs` 0 afterwards), temp files removed, owner session logged out.

## 9.2.d — events, bots, dashboard equals database, no trackers

Run 2026-10-07 09:26 UTC (17:26 WITA) on the same release. A beacon post is exactly what `shared/beacon` sends:
`POST /api/x/collect`, `Content-Type: application/json`, `Origin: <the site>`, body
`{"events":[{name, at, locale, url, referrer, props}]}`. The workstation drove it with curl (no browser; memory).
Pages were also fetched with a normal browser user agent (all `200`), but fetching a page does not itself write an
event: the beacon is client-side script, so the events were posted by curl.

### 1. Driving the sites produces events — PASS

`select site,name,source,count(*) from events group by 1,2,3`, before and after. Driven with
`Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/126.0.0.0 Safari/537.36`:
gallery 3 `page.viewed` (home, search, listing), 1 `listing.viewed`, 2 `search.submitted` (one with `zeroResults`),
1 `ask.clicked` (whatsapp); shop 2 `page.viewed`, 1 `search.submitted`, 1 `ask.clicked` (email, footer),
1 `partnership.clicked`.

| site | name | before | driven | after |
| --- | --- | --- | --- | --- |
| gallery | page.viewed | 97 | +3 | 100 |
| gallery | search.submitted | 81 | +2 | 83 |
| gallery | listing.viewed | 16 | +1 | 17 |
| gallery | ask.clicked | 0 | +1 | 1 |
| shop | page.viewed | 0 | +2 | 2 |
| shop | search.submitted | 0 | +1 | 1 |
| shop | ask.clicked | 0 | +1 | 1 |
| shop | partnership.clicked | 0 | +1 | 1 |
| total | | 194 | +12 | 206 |

Every post answered `204`. The first `listing.viewed` post was dropped because its props omitted the required
`facets` array (the catalogue drops a prop set outside its schema, as ANALYTICS.md §3 says); resent with
`"facets":[]` it landed, so the table above is by exactly what was driven.

### 2. A bot user agent adds none — PASS, with one finding

The same drive (4 page fetches + 4 posts, 12 events) with
`Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)`: all four posts `204`, and the counts were
**identical** to the "after" column above (206 total, no row added). Single events for other agents: `undici`,
`Python-urllib/3.11` and `Googlebot/2.1` each added 0; curl's default `curl/` UA added 0.

**Finding (low, not a clause failure):** a request with **no `User-Agent` header at all** is counted
(`curl -A ""`, via nginx and straight to `127.0.0.1:4030`), and so is the bare UA `node`; the rows are stored as
`deviceClass = desktop`. `bots.ts` returns "bot" for an empty UA and ANALYTICS.md §6 step 2 says an empty UA is
dropped, so the server evidently receives a non-empty UA (the Node runtime's `node`) and `node` is not in
`BOT_FRAGMENTS`. A real browser always sends a UA, so no visitor is affected; a script that omits the header
is counted. Suggested owner: senior-be (add `node` to the bot list, or read the raw header). Those 5 extra
`page.viewed` rows (gallery) are in the counts below.

### 3. The dashboard counts equal the database — PASS

Owner session (`/api/users/login`, cookie kept on the host), `GET /admin/dashboard?site=gallery` and `?site=shop`,
both `200`. Default period: **Last 30 days, 2026-09-08 to 2026-10-07** (Bali days, UTC+8). The comparison query
used the panel's own definitions: events by their stamped `day` in the period; leads and orders by instants
`[2026-09-07 16:00Z, 2026-10-07 16:00Z)`, spam leads excluded, paid orders = `payment.paidAt` in the period and status
not in (`awaiting_quote`, `pending_payment`, `cancelled`, `expired`). At that moment the table held the 12 driven
events plus the 5 no-UA/`node` rows from the finding (gallery `page.viewed` 106).

| Panel figure | Dashboard gallery | SQL gallery | Dashboard shop | SQL shop |
| --- | --- | --- | --- | --- |
| Page views | 106 | 106 | 2 | 2 |
| Sessions | 12 | 12 (distinct sessions with a `page.viewed`) | 1 | 1 |
| Searches | 83 | 83 | 1 | 1 |
| Found nothing (zero-result searches) | 6 | 6 | none | 0 |
| Taps (ask, sell, partnership clicks) | 1 | 1 | 2 | 2 |
| Leads (not spam) | 0 | 0 | 1, kind Partnership | 1 (`partnership`, `closed`) |
| Paid orders | n/a | n/a | 16 | 16 |
| Revenue / average order | n/a | n/a | Rp 78,500,000 / Rp 4,906,250 | 78500000 / 4906250 |
| Orders waiting now: Paid | n/a | n/a | 8 | 8 (`paid`; the rest are `delivered` 8, `expired` 2) |
| Expired or cancelled / expired-unpaid (%) | n/a | n/a | 11.1 / 11.1 | 2 of 18 placed = 11.1 / 11.1 |

Differences, all explained by the panel's definitions:

- All distinct `session_id`s on gallery events number **13**, the panel says 12: Visitors counts sessions from
  `page.viewed` events only (`loaders/visitors.ts`); one session has only a non-page event.
- "Paid orders 16" is the 8 `paid` plus the 8 `delivered` orders: a paid order is one with a `paidAt` in the period
  that never ended cancelled or expired. "Waiting now" counts only the 8 still `paid`.
- Order counts come from `orders`, never from `order.paid` events (there are none, and the Funnel and Web vitals
  panels correctly say "No events yet"); leads come from `leads`.
- The period bounds match: events by `day` 2026-09-08..2026-10-07 and leads and orders by the same instants.

### 4. The built HTML has no third-party tracker — PASS

```
no-trackers (engine/tooling/no-trackers/cli.mjs, copied to the host, run on the release):
  no-trackers: /home/uindies/current/engine/apps/web/.next is clean — first-party only (ANALYTICS.md)    exit 0
  (.next holds 697 js/html/css/mjs files, 44 MB; release dir .../releases/deploy_production-20261007T091257Z-0fc3942a/web)
grep -rIlF over /home/uindies/current/engine (without node_modules) and over all of /home/uindies/current:
  google-analytics 0 | googletagmanager 0 | gtag( 0 | connect.facebook.net 0 | fbq( 0      (files with a hit)
live pages (7 x 200, plus the 20 JS bundles of the two home pages, fetched with a browser user agent):
  gallery /, /browse, /search?q=Batavia, /id/jelajah; shop /, /partnership, /search?q=bag
  google-analytics 0 | googletagmanager 0 | gtag( 0 | connect.facebook.net 0 | fbq( 0      (files with a hit)
```

(`/cart` answered 404 and `/checkout` 307 at those guessed paths and were not counted.)

**9.2.d: PASS on all four clauses.** One low finding: no-User-Agent and `node` requests are counted.

### Data left on staging

- Deleted: lead 48 (`E2E-9QA Partner Hotel`), the editor user and its temp files.
- **Not deletable:** the 18 test `events` rows (ids 195 to 212; gallery 13, shop 5). `DELETE /api/events/<id>` as owner
  answers `403` for every row (events are append-only) and the brief forbids SQL writes. Only 3 carry `E2E-9QA`
  (the search queries); the rest are plain `page.viewed`/`ask.clicked` rows. They age out in the 14-month retention.
  Staging now holds gallery 207 and shop 5 events.
