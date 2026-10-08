# Runbook — run staging (and, later, production)

**Purpose:** the six jobs an operator does by hand: deploy, roll back, restore, rotate a secret, kill the chat, and
handle a late payment. Each step is a command to paste or an exact click path, and says how to tell it worked.
The design is [DEPLOYMENT.md](../DEPLOYMENT.md); the host record is [helios-staging.md](helios-staging.md).

**Scope.** Staging on Helios, under the owner's standing go-ahead. Production uses the same steps after its own
go-ahead (DEPLOYMENT.md §11). `ssh helios` lands as root; `U` below means `sudo -u uindies bash -lc`.
**Never print a secret.** Do not `cat` `shared/.env` or `/etc/indies/*`. Say "confirmed", never the value.

```
G=https://indies-gallery.gaiada.com   S=https://old-east-indies.gaiada.com
```

## 1. Is it healthy? (run this after every job below)

```
for h in $G $S; do curl -s -o /dev/null -w "$h %{http_code}\n" $h/api/health; done
ssh helios "sudo -u uindies bash -lc 'pm2 jlist'" | python3 -c 'import json,sys; [print(p["name"], p["pm2_env"]["status"], "restarts", p["pm2_env"]["restart_time"]) for p in json.load(sys.stdin)]'
```

- **Worked:** both hosts print `200`; pm2 prints `uindies online` and a restart count that does not climb.
- **Not worked:** `502` for a few seconds during a reload is normal. A `502` after a minute: §3.

## 2. Deploy a staging release

Follow [../gates/staging-release.md](../gates/staging-release.md), steps 1 to 6. It is the one procedure: do not copy
it here. In short: cut `main`, check migrations, bundle and ship, run `bd.sh` on Helios, confirm, smoke test.

- **Before a release that carries a migration:** take the dump in its step 2 (DEPLOYMENT.md §4, BK4).
- **Worked:** `bd.sh` ends `DEPLOY-DONE <name>` after `gallery 200, shop 200`, and
  `ssh helios 'readlink -f /home/uindies/current'` names that release.
- **Failed:** `BUILD FAILED` deployed nothing. `HEALTH FAILED` means the script already rolled back: confirm with §1.

## 3. Roll back

A release that did not apply a migration rolls back in seconds, with no rebuild. Releases kept: the last three.

1. Find the previous release and the live one:
   `ssh helios 'ls -1t /home/uindies/releases | head -4; readlink -f /home/uindies/current'`
2. Point `current` at the previous one and restart:
   ```
   ssh helios "sudo -u uindies ln -sfn /home/uindies/releases/deploy_<previous>/web /home/uindies/current && sudo -u uindies bash -lc 'pm2 reload uindies --update-env'"
   ```
   (`gaiada-deploy --rollback --site-user uindies --domain old-east-indies.gaiada.com --type node --subdir web`
   does the same.)
3. Run §1. **Worked:** both `200`, and `readlink -f /home/uindies/current` names the previous release.

- **If the bad release applied a migration**, the old code may still run (migrations only add, CONVENTIONS.md §13).
  If it does not (health stays `502` or `500`), restore the pre-release dump: §4, manual path.
- **Never** roll back by pushing to `production`: the poller would redeploy the newest commit.

## 4. Restore from backup

What is backed up: the database nightly at 19:40 UTC (`/var/backups/indies/indies_db/`, 7 days) and the media
bucket by the drill's copy. Derivatives and tiles are rebuilt by a job. The off-box copy is not set up yet (Open).

### 4.1 The drill (a full back up, wipe and restore of staging; about 40 minutes)

Copy the script, read the plan, then run it. It stops the app, so tell people first.

```
scp scripts/ops/restore-drill.sh helios:/root/restore-drill.sh
ssh helios 'bash /root/restore-drill.sh --dry-run'      # checks and the plan; changes nothing
ssh helios 'bash /root/restore-drill.sh'                # detaches, prints the log path
ssh helios 'tail -f /var/backups/indies/drill-*/drill.log'   # follow it (Ctrl-C stops only the tail)
```

- **Worked:** the last log line is `RESULT: PASS`, with `counts`, `objects` and `sample` all `identical`, and
  `health 200 on both hosts`. Run §1 as well. The timings are printed under `TIMINGS`.
- **Failed:** the last line is `RESULT: FAIL` and the line above it says how to back out. Do not start a second
  drill until the first is backed out. The original database is never dropped: it is `indies_db_predrill_<stamp>`.
- **After a pass:** drop the old database when nobody needs it:
  `ssh helios "sudo -u postgres psql -c 'drop database indies_db_predrill_<stamp>'"`. This is irreversible: ask the
  owner or the lead first. Remove old `drill-*` folders the same way once the gate has recorded them.

### 4.2 By hand: restore the database from a dump

Use this when the data is damaged and the media is fine.

1. Pick the dump and prove it lists:
   `ssh helios 'ls -lt /var/backups/indies/indies_db/ | head -3'`, then
   `pg_restore --list /var/backups/indies/indies_db/<file> | wc -l` (about 1,375 lines).
2. Stop the app and its cron jobs, so nothing writes:
   `crontab -u uindies -l > /root/crontab.uindies.save; crontab -u uindies -r; sudo -u uindies bash -lc 'pm2 stop uindies'`
3. Keep the damaged database, restore beside it, as `postgres`:
   ```
   sudo -u postgres psql -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='indies_db'"
   sudo -u postgres psql -c "alter database indies_db rename to indies_db_damaged"
   sudo -u postgres pg_restore --create --exit-on-error -d postgres < /var/backups/indies/indies_db/<file>
   ```
   The dump is root-only, so it goes in on stdin: `postgres` cannot open the file. `--create` keeps the owner and ACL.
4. Start: `crontab -u uindies /root/crontab.uindies.save; sudo -u uindies bash -lc 'pm2 start uindies'`, then §1.
5. **Worked:** health `200` on both hosts; a record count you know, e.g.
   `sudo -u postgres psql -d indies_db -Atc "select count(*) from works"` (1,813 on staging in October 2026).
6. **Back out:** stop the app, `drop database indies_db`, `alter database indies_db_damaged rename to indies_db`, start.

### 4.3 By hand: restore the media

The drill's copy is `/var/backups/indies/drill-<stamp>/indies-media/`. As root:
`export MC_HOST_rustfs="http://$(cat /etc/indies/rustfs/access-key):$(cat /etc/indies/rustfs/secret-key)@127.0.0.1:4032"`
then, per prefix: `mc mirror --quiet <copy>/uploads rustfs/indies-media/uploads`, and for `derivatives` and `iiif`
add `--attr "Cache-Control=public, max-age=31536000, immutable"`. Never `mc rm --recursive` the whole bucket: over
about 79,000 objects it ran RustFS out of memory (2026-10-08). Derivatives alone can be rebuilt by the jobs queue.
**Worked:** `mc ls --recursive rustfs/indies-media | wc -l` equals the copy's file count, and an item page shows
its image.

## 5. Rotate a secret

All app secrets live in `/home/uindies/shared/.env` (600, owner `uindies`). Edit it as the site user, never print it.
Rotate on a suspected leak, a staff departure, or yearly (SECURITY.md K5). Keep one old copy: `cp -p` the file to
`/root/env.bak-<date>` (root-only) before the edit, and delete it when the check passes.

**The pattern.** Make the new value on the host: `openssl rand -hex 32` (app secrets), or `-hex 20` (the DB
password). Put it in the file with `ssh -t helios "sudo -u uindies nano /home/uindies/shared/.env"`. Restart:
`ssh helios "sudo -u uindies bash -lc 'pm2 restart uindies --update-env'"`. Run §1.

| Secret              | Variable · where it also lives                                                                      | Extra step                                                                                                     | What breaks until done                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Payload secret      | `PAYLOAD_SECRET`                                                                                    | none                                                                                                           | every signed-in user is signed out and signs in again; a Payload API key stops working                  |
| Database password   | `DATABASE_URL` (between `:` and `@`; 32+ letters and digits) · the role's stored verifier           | after the edit, apply the provisioning script (below): it stores the new verifier                              | the app cannot log in to the database until the verifier matches: do both inside one minute             |
| RustFS app key      | `S3_SECRET_ACCESS_KEY` and `MASTERS_SECRET_ACCESS_KEY` (the same value) · the RustFS user `uindies` | apply the provisioning script: it sets the key in RustFS                                                       | uploads and every image read through the app fail until both match                                      |
| RustFS root key     | `/etc/indies/rustfs/{access-key,secret-key}` (root and group `indies-rustfs`)                       | write both files, `systemctl restart indies-rustfs`, apply the provisioning script                             | storage is down about 10 seconds; the app's key is unchanged; the backup and the drill use the root key |
| OpenRouter key      | `ANTHROPIC_API_KEY` (staging also sets `ANTHROPIC_BASE_URL` to OpenRouter)                          | rotate it in the OpenRouter dashboard first, then edit                                                         | the chat answers `unavailable` and shows the WhatsApp and email buttons; the sites stay up              |
| Midtrans server key | `MIDTRANS_SERVER_KEY` (and `MIDTRANS_CLIENT_KEY`, the pair)                                         | none on staging: it runs `MIDTRANS_MODE=simulate` and holds no key. Production only, with the owner's go-ahead | new payments fail; set both keys together; check the notification URL in the Midtrans dashboard         |

**The provisioning script** (the three rows that say "apply"). Its dry run first, its sha256 compared with the
reviewed commit ([helios-staging.md](helios-staging.md) §Running the script):

```
bash scripts/ops/pack.sh >/tmp/provision.sh
ssh helios 'bash -s -- --env staging --dry-run' </tmp/provision.sh      # read the plan: only the secret rows change
ssh helios 'bash -s -- --env staging' </tmp/provision.sh
ssh helios 'bash -s -- --env staging' </tmp/provision.sh                # again: "changes: 0"
```

**Worked:** §1 passes; for the database, the script says the stored verifier matches; for the RustFS key, a page
with an image loads. For a leaked secret, also search for its old value: it should now appear nowhere.
`CRON_SECRET`, `REVALIDATE_SECRET`, `ORDER_LINK_KEY` and `BAG_COOKIE_KEY` use the pattern alone. Rotating
`ORDER_LINK_KEY` or `BAG_COOKIE_KEY` invalidates tracking links and open bags: tell the owner first.

## 6. Kill the chat

The kill switch is `ai.chatEnabled` per site (AI.md §1). It takes effect at the next request, with no restart. The
launcher becomes plain WhatsApp and email buttons.

1. Sign in at `https://old-east-indies.gaiada.com/admin` (the admin host; the gallery host answers 404 there).
2. **Settings → Gallery**: open the **AI** group, untick **Chat enabled**, **Save**. Repeat under **Settings → Shop**.
3. **Worked:** open `$G/` and `$S/` in a private window: no chat launcher, only the contact buttons. A request to
   the chat answers `disabled`.
4. **Turn it back on:** tick **Chat enabled** and Save. Do this only after the cause is understood.

If the admin is unreachable, remove the key: `ssh -t helios "sudo -u uindies nano /home/uindies/shared/.env"`, blank
`ANTHROPIC_API_KEY`, then `pm2 restart uindies --update-env`. The chat answers `unavailable` and shows the buttons.
Put the key back to re-enable. Other limits are in the same group: `dailyBudgetUsd` (the chat stops at 100%) and
`sessionTokenCap`.

## 7. Handle a late payment

A late payment is a Midtrans "settlement" that arrives after the order **expired** (the 60 minute window passed, or
staff held 2 hours) or was cancelled. Money has moved and the stock may be sold again, so the system will not
decide: it **records the payment, leaves the order `expired`, and flags it for staff** (`needsAttention`;
`decide.ts` outcome `late-payment`). Nothing is re-sold and nothing is shipped by itself. On staging, with
`MIDTRANS_MODE=simulate`, no real money moves; the steps are the same.

1. **See it.** Sign in at the admin host. The dashboard's payments panel counts **Paid after expiry or
   cancellation** (counts only, no buyer data). **Orders**: open the one marked **Needs you**; its history names
   the attempt, the amount and the time.
2. **Check the shelf.** Open the order's store and its line items: **Stock levels** for that store and product.
3. **Choose, within the buyer's business day:**
   - **The units are still there:** open the expired order, **Replace damaged item**, tick every line, note "Late
     payment, paid after expiry" and **Confirm** (CONTENT-OPERATIONS.md �5.5). It makes a Rp 0 replacement order at
     the same store and takes the stock. This is the only fulfilment path for an expired order; ask the lead if the
     owner would rather refund. Tell the buyer on WhatsApp.
   - **They are gone:** return the money in the **Midtrans dashboard** (find the transaction by order number,
     then Refund) and tell the buyer on WhatsApp. An expired order cannot be cancelled or moved forward.
4. **Record it** in the order's note (who decided, and what).
5. **Worked:** the replacement order is in the store's _Being prepared_ list, or the refund shows in Midtrans; the
   buyer has been answered. I found no control that clears the flag; if the screen has one, use it, else say so in the note.

- **A second settled payment on a paid order** is a different flag (**Paid twice**): refund the extra one the same way.
- **A payment of the wrong amount** is not applied at all (**Amount mismatch**): look in the Midtrans dashboard.
- **Check:** COMMERCE.md §13 says the units are re-taken automatically when the store still holds them; the code
  does not do that today (it flags and waits for staff). Treat the code as true until the two agree.
