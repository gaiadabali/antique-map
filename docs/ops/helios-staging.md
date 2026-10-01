# Staging on Helios — what is there, how it was proven, how to run it

Written 2026-10-01 for TASKS.md 5.1.c–d, from the first provisioning run and the first
CI-built releases. DEPLOYMENT.md §2–§3 is the design; this is the record and the runbook.

## What is on the host

| | Gallery | Emporium |
| --- | --- | --- |
| Site | `https://indies-gallery.gaiada.com` | `https://old-east-indies.gaiada.com` |
| CloudPanel site user / pm2 process | `uig` | `uoei` |
| App port (127.0.0.1 only) | 4030 | 4031 |
| Database / role | `ig_db` / `ig` (LOGIN only, `CONNECTION LIMIT 20`) | `oei_db` / `oei` |
| Media bucket | `ig-media` (anonymous GET, no listing) | `oei-media` |

Shared, all on loopback:

- **RustFS 1.0.0** (D12) on `127.0.0.1:4032`, console on 4033. Its data is a 50 GiB ext4 loop
  image (`/var/lib/indies-rustfs/data.img`), so it cannot fill `/`. The private `archive-masters`
  bucket is here too.
- **Mailpit 1.31.3** (D13, staging mail is caught, never delivered): SMTP on 4034 and UI on 4035,
  both behind auth. To read the UI:
  1. Open a tunnel: `ssh -L 4035:127.0.0.1:4035 helios`.
  2. Sign in as user `indies` with the password in `/etc/indies/mailpit/ui-password`.
- **Backups**: a nightly `pg_dump` of both databases (`indies-db-backup.timer`), 7 days local.
  No off-box target exists yet; that is DEPLOYMENT.md §6's gap.
- **Admin sign-in**: each site's first admin was created at provisioning, so the open
  first-register form is closed. Its credentials are in
  `/etc/indies/staging-admin/<domain>` (600 root).

Everything above is made by `scripts/ops/helios-provision.sh`, and `--report` lists it as an
inventory.

## Secrets

The app secrets, the database passwords, and the RustFS and Mailpit credentials were generated
on Helios and written straight into each `shared/.env` (600, the site user's). They were never
printed and are not in this repository. **They are not in Infisical yet**: there was no
Infisical access when they were made.

Every payment and courier provider runs as `<PREFIX>_MODE=simulate` until the client hands
over sandbox accounts (D48, DEPLOYMENT.md §8). Each provider's real sandbox keys replace its
`simulate` line.

## How a release reaches staging

1. A merge to `production`, through a PR from `main`. Never push to `production` directly.
2. The Release workflow builds the artifact and publishes `deploy/production-*`.
3. `gaiada-poll` checks every minute and runs `gaiada-deploy` per `.gaiadeploy.yml` target:
   - download and verify the sha256;
   - unpack under `~/releases/deploy_*`;
   - point `current` at the target's `subdir`;
   - `pm2 reload <site user>`.

**Its health check**:

- **The check**: `https://<domain>/` (not `/api/health`), 6 tries 5 s apart, each with a 20 s
  timeout, so about 30 s in total before it rolls back to the previous release.
- **Migrations**: the first `/api/health` runs the migrations, untimed by design (4.6 review #2).
  On the empty staging databases they finished well inside that window. A release whose
  migrations may outlast it is migrated before the reload.
- **Keeps** the last 3 releases.

First deploys, 2026-10-01:

| Release | Result |
| --- | --- |
| `d2c5786` (stale `production`) | failed: its brand configs named the old hosts |
| `79616e7` | failed: the boot check wanted provider keys, before D48 |
| `2c3b37a` | OK on both sites |
| `1eddcaf` | OK on both sites, on the first try |

The two broken releases were removed, so a rollback cannot land on them.

## Proven

- **Idempotent.** A second provision run plans `changes: 0`.
- **Loopback only.**
  - `ss -ltnp` shows 4030–4035 on `127.0.0.1` alone.
  - From outside, `curl http://187.77.116.133:<port>` times out for every one of them.
  - ufw is active with a default `INPUT DROP`.
- **Healthy.**
  - `/api/health` answers `status: ok, environment: staging` on both sites, with the database,
    storage and queue all ok.
  - `/` and `/id` render with `lang="en"` and `lang="id"`.
  - `/admin/login` answers.
  - Each brand's admin signs in on its own site and gets 401 on the other.
- **Survives a restart.** `helios-provision.sh --env staging --verify-restart` passes all 14
  checks:
  - RustFS: unit and loop mount restarted, `/health` 200.
  - pm2: each `pm2-<user>.service` restarted, the app resurrected from `dump.pm2`, a new daemon
    pid, and 200 on its port.
  - Mailpit and cron.
  - Every indies unit is enabled at boot.
  - The image mount is in the boot path before RustFS.

  The host itself was not rebooted, because it serves other clients' sites.
- **Rollback rehearsed** on both sites. `current` was pointed back to `2c3b37a`,
  `pm2 reload <user>` gave health 200, and the sites were then rolled forward to `1eddcaf`,
  also 200.

## A defect in the shared deploy tool

`gaiada-deploy --rollback` is a no-op for a `subdir` target like ours. Its `previous_release`
leaves out `basename(readlink -f current)`, which is the `subdir` name (`indies-gallery`), not
the release directory. So it picks the newest release, which is the current one.

- The rehearsal above did by hand what the tool means to do.
- The tool's own automatic rollback after a failed health check is unaffected: it resolves the
  previous release before switching.
- `gaiada-deploy` is shared by every site on Helios, so it was not patched from here. The fix
  is to compare against the release directory: `$(dirname "$(readlink -f current)")` when a
  `subdir` is set.

## Running it again

```
bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --dry-run'     # review the plan
bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging'               # apply
bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --report'      # inventory, read-only
bash scripts/ops/pack.sh | ssh helios 'bash -s -- --env staging --verify-restart'
```

Before you run it:

- **Compare the hash.** `pack.sh` prints the packed script's sha256; check it against the
  reviewed commit before you pipe it to the host.
- **CloudPanel's cron UI rewrites a site's crontab.** If someone saves cron jobs there, re-run
  the apply to put the managed block back. `--report` fails when the block is missing.
