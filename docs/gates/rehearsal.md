# Gate — the staging rehearsal and the restore drill (10.3)

**Task:** TASKS.md 10.3 · **Environment:** Helios staging (`indies-gallery.gaiada.com`,
`old-east-indies.gaiada.com`) · **Status:** skeleton; the orchestrator fills the `TODO` cells as each part is run.

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

| Check                                                              | Result                                     |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Both sites run against this data (`/api/health` 200 on each host)  | TODO                                       |
| A gallery item page and a shop product page open with their images | TODO                                       |
| Release in service                                                 | TODO (`readlink -f /home/uindies/current`) |

## 10.3.b The launch rehearsal

The journeys, step by step, with evidence per step: [rehearsal/journeys.md](rehearsal/journeys.md) (written by qa).

| Part                                                                  | Where          | Result |
| --------------------------------------------------------------------- | -------------- | ------ |
| A release through the pull pipeline (staging-release.md steps 1 to 6) | the runbook §2 | TODO   |
| Health on both hosts after the release                                | runbook §1     | TODO   |
| Gallery: search, ask, lead                                            | journeys.md    | TODO   |
| Shop: buy, fulfil, track                                              | journeys.md    | TODO   |
| The AI chat on each site                                              | journeys.md    | TODO   |

## 10.3.c The restore drill

Run by `scripts/ops/restore-drill.sh` on Helios (runbook §4.1), as root, detached. Its log is
`/var/backups/indies/drill-<stamp>/drill.log`; the last line is `RESULT: PASS` or `RESULT: FAIL`.

|               |                                                                           |
| ------------- | ------------------------------------------------------------------------- |
| Run           | TODO stamp, start and end (UTC) · script sha256 · the commit it came from |
| Dry run first | TODO paste its `all checks pass` line                                     |
| Result line   | TODO `RESULT: PASS`                                                       |

**Timings** (the log's `TIMINGS`, seconds since start; the app is down from `app_stopped` to `up`):

| Step                                               | Mark              | Seconds |
| -------------------------------------------------- | ----------------- | ------: |
| Bucket copied (app running)                        | `bucket_copied`   |    TODO |
| App stopped                                        | `app_stopped`     |    TODO |
| Backed up (dump and the objects written meanwhile) | `backed_up`       |    TODO |
| Wiped                                              | `wiped`           |    TODO |
| Database restored                                  | `db_restored`     |    TODO |
| Bucket restored                                    | `bucket_restored` |    TODO |
| Evidence taken                                     | `verified`        |    TODO |
| App up and healthy                                 | `up`              |    TODO |
| **Downtime** (`app_stopped` to `up`)               |                   |    TODO |
| **Recovery time** (`wiped` to `up`)                |                   |    TODO |

**Verification** (each diff is `before` against `after`, taken with the app stopped):

| Evidence                                                   | Before                                                  | After | Same? |
| ---------------------------------------------------------- | ------------------------------------------------------- | ----- | ----- |
| Rows in each of the public tables                          | TODO tables, rows (first run: 107 tables, 127,795 rows) | TODO  | TODO  |
| Objects, keys and sizes                                    | TODO (first run: 79,476)                                | TODO  | TODO  |
| One derivative image: sha256, content type, Cache-Control  | TODO                                                    | TODO  | TODO  |
| An `iiif` tile and an upload (sample.keys)                 | TODO                                                    | TODO  | TODO  |
| Database owner and ACL                                     | TODO                                                    | TODO  | TODO  |
| `/api/health` on both hosts                                |                                                         | TODO  |       |
| An item page and a product page, with images, in a browser |                                                         | TODO  |       |

**First run, 2026-10-08 (not a pass, and why it matters).** RustFS was killed for memory twice by the recursive
list and delete over about 79,000 objects (its cap was 2 GB), and `pg_restore` could not read the root-only dump.
The drill was finished by hand. The script now deletes by key, retries and waits for RustFS, reads the dump on stdin,
and takes the after-evidence before the app starts. TODO: the clean run replaces this paragraph.

## 10.3.d The runbook

[ops/runbook.md](../ops/runbook.md): deploy, roll back, restore, rotate a secret, kill the chat, handle a late
payment. **Written by** devops agent, 2026-10-08.

| Job                  | Followed by | Date | Worked? | Steps that were wrong or unclear |
| -------------------- | ----------- | ---- | ------- | -------------------------------- |
| Deploy (§2)          | TODO        | TODO | TODO    | TODO                             |
| Roll back (§3)       | TODO        | TODO | TODO    | TODO                             |
| Restore (§4.1, §4.2) | TODO        | TODO | TODO    | TODO                             |
| Rotate a secret (§5) | TODO        | TODO | TODO    | TODO                             |
| Kill the chat (§6)   | TODO        | TODO | TODO    | TODO                             |
| Late payment (§7)    | TODO        | TODO | TODO    | TODO                             |

**Followed by:** TODO a person other than the author, not the agent that wrote it. Fix every wrong step in the
runbook, then re-run that step.

## 10.3.e Verdict

| Clause                                                             | Met? |
| ------------------------------------------------------------------ | ---- |
| The run is recorded (a, b)                                         | TODO |
| The restore timing and verification are recorded (c)               | TODO |
| The runbook has been followed by someone other than its author (d) | TODO |

## Open

- The off-box backup target does not exist (DEPLOYMENT.md §9): the drill proves the on-host restore only.
- The drill leaves `indies_db_predrill_<stamp>` and the `drill-<stamp>` folder (about 8 GiB) on the host until
  someone drops them by hand.
