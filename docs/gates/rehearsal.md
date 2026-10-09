# Gate — the staging rehearsal and the restore drill (10.3)

**Task:** TASKS.md 10.3 · **Environment:** Helios staging (`indies-gallery.gaiada.com`,
`old-east-indies.gaiada.com`) · **Status:** run 2026-10-08/09 on release `e8597fd7`; the Check is met (§10.3.e), with the open items below.

**The Check (10.3.e):** this file records the run, the restore timing and verification, and the runbook has been
followed by someone other than its author.

Sources: [DEPLOYMENT.md](../DEPLOYMENT.md) §3, §9 · [ops/runbook.md](../ops/runbook.md) ·
[staging-release.md](staging-release.md) · [SECURITY.md](../SECURITY.md) BK3 ·
the drill script `scripts/ops/restore-drill.sh`.

## 10.3.a The data on staging

Counted read-only on Helios, `indies_db`, 2026-10-08 (as `postgres`, `select count(*)`). Re-count at the time of
the run and overwrite the cells that moved.

| What                        | Table                            |      Total | Published or active | Note                                                                                  |
| --------------------------- | -------------------------------- | ---------: | ------------------: | ------------------------------------------------------------------------------------- |
| Gallery works (antiques)    | `works`                          |      1,813 |               1,709 | 104 drafts. **The brief and TASKS.md 10.3.a say 1,823 records: 10 short, to explain** |
| Shop designs                | `products`                       |        236 |                 156 | 80 not published                                                                      |
| Stores                      | `stores`                         |        120 |          117 active | 98 listed on the site                                                                 |
| Stock rows                  | `stock_levels`                   |     29,859 |        81,355 units | 232 products in stock in 120 stores                                                   |
| Images                      | `media`                          |      2,521 |                     | `uploads/` objects in the bucket: 2,521                                               |
| Bucket objects              | `indies-media`                   |     79,476 |                     | before the first drill, 2026-10-08                                                    |
| Orders · users · discounts  | `orders` · `users` · `discounts` | 18 · 3 · 0 |                     |                                                                                       |
| Tables · migrations applied |                                  |    107 · 6 |                     |                                                                                       |

| Check                                                              | Result                                                                                                            |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| Both sites run against this data (`/api/health` 200 on each host)  | 200 and `ok` on both, before and after the drill (health.spec, runs 1–5)                                          |
| A gallery item page and a shop product page open with their images | `/product/200` and `/product/746` (gallery), `sugar-apple-1863` and the Lighthouse product (shop), AVIF rungs 200 |
| Release in service                                                 | `deploy_production-20261008T143718Z-e8597fd7`                                                                     |

## 10.3.b The launch rehearsal

The journeys, step by step, with evidence per step: [rehearsal/journeys.md](rehearsal/journeys.md) (written by qa).

| Part                                                                  | Where          | Result                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A release through the pull pipeline (staging-release.md steps 1 to 6) | the runbook §2 | `e8597fd7` built on Helios and deployed, `DEPLOY-DONE` healthy, smoke passed (staging-release.md)                                                                                                           |
| Health on both hosts after the release                                | runbook §1     | 200 / 200                                                                                                                                                                                                   |
| Gallery: search, ask, lead                                            | journeys.md    | pass at 390 and 1280; the owner reads the leads in the admin (run 5: leads 58, 59)                                                                                                                          |
| Shop: buy, fulfil, track                                              | journeys.md    | **8/8 at 390 and 1280** (run 6, orders 100032, 100033): placed, the owner prices delivery, paid in the simulator, DPS-004's store user moves it to delivered, tracking shows each step and the driver image |
| The AI chat on each site                                              | journeys.md    | pass at 390 (runs 1–2; 6 sessions/IP/hour keeps it to one per site per run)                                                                                                                                 |

Run 5 (all journeys with the staging accounts from `/etc/indies/staging-admin/e2e-users.env`, never printed): 18/20 —
the store step failed because the order routed to **DPS-005**, the nearest store stocking that design under the
real catalogue's stock (10.6), while the rehearsal store account is DPS-004's. Correct routing, wrong test
assumption: the spec now pins the buyer on DPS-004 and buys a design DPS-004 stocks (`support.ts`), and run 6
passed 8/8.

## 10.3.c The restore drill

Run by `scripts/ops/restore-drill.sh` on Helios (runbook §4.1), as root, detached. Its log is
`/var/backups/indies/drill-<stamp>/drill.log`; the last line is `RESULT: PASS` or `RESULT: FAIL`.

|               |                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Run           | `drill-20261008T161047Z`, 16:10:48 to 16:26:41 UTC, 2026-10-08 · script sha256 `8b8297a6e087fc2c…` · commit `61a93a4c` |
| Dry run first | `[15:52:58] dry run: all checks pass, nothing was changed`                                                             |
| Result line   | `RESULT: PASS. indies_db_predrill_20261008t161047z stays until dropped by hand.`                                       |

**Timings** (the log's `TIMINGS`, seconds since start; the app is down from `app_stopped` to `up`):

| Step                                      | Mark              |                                   Seconds |
| ----------------------------------------- | ----------------- | ----------------------------------------: |
| Bucket copied (app running, 7.6 GiB)      | `bucket_copied`   |                                       135 |
| App stopped                               | `app_stopped`     |                                       136 |
| Backed up (dump 3.3 MB, 1,375 entries)    | `backed_up`       |                                       254 |
| Wiped (79,476 objects by key, 80 batches) | `wiped`           |                                       698 |
| Database restored                         | `db_restored`     |                                       699 |
| Bucket restored                           | `bucket_restored` |                                       830 |
| Evidence taken                            | `verified`        |                                       946 |
| App up and healthy (try 2)                | `up`              |                                       952 |
| **Downtime** (`app_stopped` to `up`)      |                   |                     **816** (13 min 36 s) |
| **Recovery time** (`wiped` to `up`)       |                   | **254** (4 min 14 s; restore alone 132 s) |

**Verification** (each diff is `before` against `after`, taken with the app stopped):

| Evidence                                                             | Before                                                            | After                                  | Same?          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------- | -------------- |
| Rows in each of the public tables                                    | 107 tables, 127,956 rows                                          | 107 tables, 127,956 rows               | yes, per table |
| Objects, keys and sizes                                              | 79,476                                                            | 79,476                                 | yes            |
| A derivative (`1024.avif`, `1024.webp`): sha256, type, Cache-Control | `7851efaf…` / `5127c7d5…`, `image/avif` / `image/webp`, immutable | same                                   | yes            |
| An `iiif` `info.json` and tile, an upload (`uploads/10-169.jpg`)     | `3bddb830…`, `54b91b68…`, `3788e0c2…`                             | same                                   | yes            |
| Database owner and ACL                                               | `indies`, `{indies=CTc/indies}`                                   | `indies`, `{indies=CTc/indies}`        | yes            |
| `/api/health` on both hosts                                          |                                                                   | 200 on both (try 2)                    |                |
| An item page and a product page, with images, in a browser           |                                                                   | the 10.3.b run after the drill (below) |                |

**The first run, 2026-10-08 12:17 UTC (failed; finished by hand by an earlier session).** RustFS was killed for
memory twice by a recursive list and delete over ~79,000 objects (cap 2 GB), and `pg_restore` as `postgres` could
not read the root-only dump. The database came back whole (counts identical but for 18 new `events`), but **the
hand-finish never put `iiif/` back: 25,146 zoom tiles were missing** until the orchestrator found them by comparing
the object list with the first run's before-list and mirrored them back from its copy (15:46 UTC; 55,503 tiles, 0
differences across all 79,476 objects after). Fixed since: RustFS `MemoryMax` 6 GB (Helios drop-in
`50-memory.conf` and `scripts/ops/lib/rustfs.sh`; a listing peaks at ~2.2 GB anon); the script deletes by key, reads
the dump on stdin, compares every object before passing, and guards with a lock (`pgrep` matched the script's own
subshell). This is what a drill is for: the half-done first run would have passed a "the site is up" check.

## 10.3.d The runbook

[ops/runbook.md](../ops/runbook.md): deploy, roll back, restore, rotate a secret, kill the chat, handle a late
payment. **Written by** devops agent, 2026-10-08.

| Job                  | Followed by  | Date       | Worked?                               | Steps that were wrong or unclear                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | ------------ | ---------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deploy (§2)          | orchestrator | 2026-10-08 | yes                                   | none (it points at staging-release.md, which was followed step by step)                                                                                                                                                                                                                                                                                                                                                                             |
| Roll back (§3)       | orchestrator | 2026-10-09 | yes                                   | none: back to `7733d424` healthy in 6 s (no AVIF on `/shop`: the old code served), forward to `e8597fd7` healthy in 6 s                                                                                                                                                                                                                                                                                                                             |
| Restore (§4.1)       | orchestrator | 2026-10-08 | yes                                   | the drill's `pgrep` guard failed every run from a file; replaced with a lock before the run                                                                                                                                                                                                                                                                                                                                                         |
| Kill the chat (§6)   | orchestrator | 2026-10-09 | yes                                   | the click path: it is one **Site settings** page with an **Indies Gallery** and an **Old East Indies** section, not "Settings → Gallery / Shop" (fixed). Off: the gallery's chat answered `503 disabled` at once; back on                                                                                                                                                                                                                           |
| Rotate a secret (§5) | orchestrator | 2026-10-09 | yes                                   | `PAYLOAD_SECRET` by the pattern (backup, `openssl rand -hex 32` written by the site user without printing, `pm2 restart --update-env`): health 200/200; an owner session from before answers `user: null`; a new sign-in works; the backup deleted. The steps are right; `nano` is interactive, a `perl -pi` with the value in an env var is the scriptable form                                                                                    |
| Late payment (§7)    | orchestrator | 2026-10-09 | step 1 yes; step 3 **cannot be done** | `tests/e2e/rehearsal/late-payment.spec.ts`: order 100036 priced, the simulator opened, the deadline moved 10 min back (one SQL update; the sweep allows 5 min grace), the real sweep expired it, the buyer settled: the order stays `expired`, flagged, and the owner sees **Needs you** with the reason. But the order page has no action at all, and **Replace damaged item does not exist** (finding R-2): the only path is a refund in Midtrans |

**Followed by:** the orchestrator, not the devops agent that wrote it, for deploy, rollback, restore and the chat
switch, and the Payload secret rotation. Before launch a person of the owner's team should follow §1–§3 and §6 once (11.4.b's handover).

## 10.3.e Verdict

| Clause                                                             | Met?                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| The run is recorded (a, b)                                         | yes                                                                               |
| The restore timing and verification are recorded (c)               | yes: PASS, 816 s down, every row, object and sample identical                     |
| The runbook has been followed by someone other than its author (d) | yes for every section; §7 stops at step 3 until 10.7 builds the replacement order |

## Open

- **R-2, replacement orders were never built (for 11.1, before launch).** COMMERCE.md §12, CONTENT-OPERATIONS.md
  §5.5, Q10 (answered 2026-10-02) and 10.4.a's recipe all need the owner's **Replace damaged item** action; only the
  fields exist (`channel: replacement`, `replacementOf`). No task ever owned it (7.1 and 7.2 cite §Replacement but
  built statuses, reassign and cancel). With R-1 it leaves a late payer and a damaged delivery with no in-app path.
- **R-1, late payment (for 11.1).** COMMERCE.md §13: a payment after expiry re-takes the units if the same store
  still has them and the order becomes `paid`. The code (`shop/payments/decide.ts`, `late-payment`) only flags the
  order and leaves it `expired`; staff have no control to clear the flag. A money and stock core: fix with an Opus
  review before live payments.
- **Staging contact details are placeholders** (`wa.me/6281100000000`, `gallery@example.com`): OA2, 11.2.b.
- **Rehearsal data on staging**, all marked REHEARSAL 10.3: leads 58, 59 and nine earlier (by email
  `rehearsal-10-3.*@example.test`), orders 100019–100033 (100032 and 100033 delivered, the rest priced or awaiting a
  price; 100030–100031 paid at DPS-005). Remove before the client review or leave as examples.
- The off-box backup target does not exist (DEPLOYMENT.md §9): the drill proves the on-host restore only.
- The drill leaves `indies_db_predrill_<stamp>` and the `drill-<stamp>` folder (8.4 GiB) on the host until someone
  drops them by hand: two of each now (12:17 and 16:10 UTC, 2026-10-08).
