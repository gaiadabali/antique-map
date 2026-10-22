# Staging on Helios — one site for both hostnames

DEPLOYMENT.md §2–§3 is the design; this is the record and the runbook. Rewritten 2026-10-03 for TASKS.md
3.1. The first provisioning (5.1, 2026-10-01) and 8.5's storage work made a two-app host. Task 3.1 replaces it
with one site, `uindies`, serving both hostnames.

## The target (DEPLOYMENT.md §2)

|                         |                                                                                                                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CloudPanel site         | `old-east-indies.gaiada.com`, the shop's canonical host and `ADMIN_HOST`; its vhost names both hostnames in `server_name` and passes `Host` through                                                                |
| Site user · pm2 process | `uindies`, one process in fork mode, `localhost:4030` with `--dns-result-order=ipv4first`                                                                                                                          |
| Database · role         | `indies_db` · `indies` (LOGIN only, `CONNECTION LIMIT 20`, PUBLIC revoked), Postgres 18.6                                                                                                                          |
| Media bucket            | `indies-media`: anonymous GET only under `derivatives/` and `iiif/`, no listing; served at `https://old-east-indies.gaiada.com/_media/`                                                                            |
| Masters bucket          | `archive-masters`: no anonymous access, versioned; CORS admits the presigned PUT from `https://old-east-indies.gaiada.com` alone                                                                                   |
| The app's key           | access key `uindies`, policy `indies-app`: `@engine/media`'s `media-writer` and `masters-writer` statements in one policy (reads and writes both buckets; writes masters only under `masters/`; deletes no master) |
| Shared services         | RustFS 1.0.0 on `127.0.0.1:4032` (console off), its data a plain directory on `/` (no cap: the 50 GiB loop image hung Helios's snapshot backups 2026-10-02..04 and was retired 2026-10-06, kept in `/root/indies-loop-retired-20261006/`); Mailpit 1.31.3 on 4034/4035 behind auth                                                                                           |
| Backups                 | `indies-db-backup.timer`, 19:40 UTC: `indies_db` alone, `pg_restore --list` checked, 7 days, the off-box hook `/etc/indies/backup-offbox` (no target yet: the owner's open decision, DEPLOYMENT.md §9)             |

`scripts/ops/helios-provision.sh` makes all of it except three things: the retirement of the two-app shape (below,
by hand), the vhost's second hostname and `/_media/` location (CloudPanel's vhost editor; the report prints both),
and the TLS certificate covering both names.

## What was on the host before 3.1

|                     | Gallery                                    | Emporium                                     |
| ------------------- | ------------------------------------------ | -------------------------------------------- |
| Site · user · port  | `indies-gallery.gaiada.com` · `uig` · 4030 | `old-east-indies.gaiada.com` · `uoei` · 4031 |
| Database · role     | `ig_db` · `ig`                             | `oei_db` · `oei`                             |
| Media bucket · keys | `ig-media` · `uig-media`, `uig-masters`    | `oei-media` · `uoei-media`, `uoei-masters`   |

8.5 (2026-10-01, never merged) scoped those buckets to `derivatives/` and `iiif/`, wrote per-brand policies
(`media-writer-ig-media`, `masters-origin-indies-gallery`, `media-writer-oei-media`,
`masters-outlet-old-east-indies`), set `archive-masters`' CORS for both origins, added an S3 location to both
vhosts, and **rotated all four storage secrets** after one inventory read printed two of them into an agent
transcript. Its backups, taken before the rotation, are in `/var/backups/indies/config/8.5-20261001T131439Z/`.
Its findings that 3.1 keeps: RustFS 1.0.0 answers every admin and S3 call the script makes; it may echo a policy
without its Sids, so policies are compared normalised; it verifies `x-amz-checksum-sha256` on a presigned PUT;
`mc admin user add` puts a secret in the process list, which every local user can read here, so the provision
script, never `apply.mjs`, sets real secrets.

## Secrets

Generated on Helios, written straight into `/home/uindies/shared/.env` (600) or root-only files under
`/etc/indies/`, never printed, never in this repository (D49). Fill a secret with `openssl rand -hex 32` (app
secrets) or `-hex 20` (the database password; the storage secret, the same value in `S3_SECRET_ACCESS_KEY` and
`MASTERS_SECRET_ACCESS_KEY`), edited as `uindies`, then re-run the apply: it stores the role's SCRAM verifier and
sets the RustFS key. Report a secret as "confirmed", never its value.

## The 3.1 sequence

Each step's output goes into the report. Stop at anything the step does not name.

1. **Pack and compare.** `bash scripts/ops/pack.sh >/tmp/provision.sh` prints the sha256 of the packed script;
   it must say the reviewed commit, with no `-dirty`. Every host run below pipes that one file:
   `ssh helios 'bash -s -- --env staging --dry-run' </tmp/provision.sh`.
2. **Dry run.** Expect errors while the two-app shape stands: port 4030 is `uig`'s, the vhost
   `old-east-indies.gaiada.com.conf` proxies to 4031, and `indies-gallery.gaiada.com.conf` holds the gallery host.
   Every other line is the plan: review it.
3. **The rotated secrets.** As root on Helios, each pre-rotation key in 8.5's backup must be refused for its
   signature or its key, never for want of a grant (`AccessDenied` would mean the secret still signs). Only access
   key names are printed:

   ```
   export MC_HOST_rustfs="http://$(cat /etc/indies/rustfs/access-key):$(cat /etc/indies/rustfs/secret-key)@127.0.0.1:4032"
   for f in /var/backups/indies/config/8.5-20261001T131439Z/u{ig,oei}.env; do
     for p in S3_ACCESS_KEY_ID:S3_SECRET_ACCESS_KEY MASTERS_ACCESS_KEY_ID:MASTERS_SECRET_ACCESS_KEY; do
       ak="$(sed -n "s/^${p%%:*}=//p" "$f")"
       out="$(MC_HOST_old="http://$ak:$(sed -n "s/^${p#*:}=//p" "$f")@127.0.0.1:4032" mc ls old/archive-masters 2>&1)"
       case "$out" in *SignatureDoesNotMatch* | *"signature we calculated"* | *InvalidAccessKeyId* | *"does not exist"*) echo "closed $ak" ;; *) echo "OPEN $ak" ;; esac
     done
   done
   ```

   After step 4 the four access keys no longer exist, so neither their old nor their current secrets authorise
   anything; step 6 proves the new key's secret sits only in `uindies`' `.env`.

4. **Retire the two-app shape — one pass, in this order.**
   1. `mc ls --recursive rustfs/archive-masters/masters/intake/` — pilot captures may sit there
      (CARRY-OVER.md §6.6). Write down what is there. **Touch nothing under it**, now or later.
   2. Stop the apps for good: as each user `pm2 stop <user> && pm2 save`, then
      `systemctl disable --now pm2-uig.service pm2-uoei.service`.
   3. Dump both, root-only, kept on the host:
      `install -d -m 700 /var/backups/indies/retired-3.1`, then for `ig_db` and `oei_db`:
      `sudo -u postgres pg_dump -Fc <db> >/var/backups/indies/retired-3.1/<db>-<UTC stamp>.dump` and
      `pg_restore --list <file> | wc -l` (and `| grep -c 'TABLE DATA'`). Paste both counts. A dump that does not
      list stops the sequence here.
   4. Only after both dumps list: `DROP DATABASE ig_db; DROP DATABASE oei_db; DROP ROLE ig; DROP ROLE oei;` as
      `postgres`. The provision script makes `indies_db` and `indies` in step 5.
   5. Copy both vhosts and crontabs to `/var/backups/indies/config/retire-3.1/` (700 root), remove both crontabs,
      then `clpctl site:delete --domainName=indies-gallery.gaiada.com --force` and the same for
      `old-east-indies.gaiada.com`: CloudPanel deletes each site's vhost, certificate, site user and home (its
      releases and `.env` with them). Remove `/etc/systemd/system/pm2-u{ig,oei}.service` and
      `/etc/logrotate.d/pm2-u{ig,oei}`, then `systemctl daemon-reload`.
   6. The old storage: list `ig-media` and `oei-media` first (`mc ls --recursive`). Both held nothing after 8.5's
      clean-up; **if either holds objects now, stop and report** rather than delete them. Empty, remove each with
      `mc rb`, then the four users (`mc admin user remove rustfs uig-media` …) and the four 8.5 policies
      (`mc admin policy remove rustfs media-writer-ig-media` …).
5. **Apply.** `--env staging --create-sites`: CloudPanel makes `old-east-indies.gaiada.com` under `uindies` on
   port 4030; the script makes everything listed above. Then, in CloudPanel's vhost editor for that site: the
   `server_name` line and the `/_media/` location the report prints. Then the certificate for both names
   (CloudPanel → SSL/TLS → Let's Encrypt, with `indies-gallery.gaiada.com` as an additional domain). DNS does not
   change: both names already point at Helios.
6. **Secrets, then converge.** Fill `uindies`' `.env` as above; apply again (it sets the role's verifier and the
   key), then once more: `changes: 0`. Confirm where the storage secret lives, printing paths only:
   `grep -rlF -f <(sed -n 's/^S3_SECRET_ACCESS_KEY=//p' /home/uindies/shared/.env) /etc /home /root /var/backups /opt`
   must list `/home/uindies/shared/.env` alone.
7. **The release, by hand — never a push.** Build on **Linux** (WSL or a Linux container: a Windows build packs
   win32 sharp binaries that cannot load on Helios), on the reviewed commit:
   `env -u DATABASE_URL -u PAYLOAD_SECRET PGHOST=127.0.0.1 PGPORT=1 pnpm build`, then
   `bash .github/scripts/assemble-artifact.sh <dir>`, `tar -czf production-<stamp>-<sha>.tar.gz -C <dir> web`,
   `sha256sum … >….sha256`, `pnpm db:fresh --suffix release` and
   `bash .github/scripts/smoke-artifact.sh <tarball>` (both hosts' homes, `/admin/login` 200 on the shop and 404 on
   the gallery, sharp). `scp` the tarball and its `.sha256` to Helios, `sha256sum -c` there, unpack as `uindies`
   under `~/releases/deploy_production-<stamp>-<sha>/`, `ln -sfn <that>/web ~/current`, `pm2 reload uindies`.
   The first `/api/health` applies the migrations (`20261002_073156_initial` and the additive set since) under the
   advisory lock. Check `https://<host>/api/health` on **both** hostnames, 6 tries 5 s apart, 20 s each. Failing:
   point `current` back at `releases/bootstrap-holding` and `pm2 reload uindies`.
8. **Evidence for 3.1.e.** Both health bodies (each names its own site); `/admin` on the shop host only;
   `curl -s -o /dev/null -w '%{http_code}' https://old-east-indies.gaiada.com/_media/uploads/<key>` 403 and
   `…/_media/derivatives/<key>` 200; `systemctl start indies-db-backup.service`, then the file under
   `/var/backups/indies/indies_db/`; `--verify-restart`; `--report`. The off-box clause stays open until the owner
   names the target.

## Running the script

```
bash scripts/ops/pack.sh >/tmp/provision.sh                               # note the sha256
ssh helios 'bash -s -- --env staging --dry-run' </tmp/provision.sh        # review the plan
ssh helios 'bash -s -- --env staging' </tmp/provision.sh                  # apply
ssh helios 'bash -s -- --env staging --report' </tmp/provision.sh         # inventory, read-only
ssh helios 'bash -s -- --env staging --verify-restart' </tmp/provision.sh
```

- **Compare the hash** with the reviewed commit before the first run.
- **CloudPanel's cron UI rewrites a site's crontab.** If someone saves cron jobs there, re-run the apply to put the
  managed block back; `--report` fails while it is missing.
- **The local stand-in**: `bash scripts/ops/test/container-test.sh` runs the whole script against a throwaway
  Debian container with Postgres 18, RustFS and Mailpit, and ends `ALL PASS`. Run it before any host run.

## The shared deploy tool

`gaiada-deploy --rollback` was a no-op for a `subdir` target until it was patched with the owner's go-ahead on
2026-10-01 (backup `/usr/local/bin/gaiada-deploy.bak-20261001T050150Z`): it now resolves `current` to its release
directory. Rollback for this site: `gaiada-deploy --rollback --site-user uindies --domain old-east-indies.gaiada.com
--type node --subdir web`. The poller deploys only on a push to `production`, from `.gaiadeploy.yml` at that commit;
until 3.1 lands nothing goes there, so a hand release is never overwritten behind your back.
