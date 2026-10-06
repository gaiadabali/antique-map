# Deployment

**Purpose:** where the platform runs and how a change gets there — environments, the Helios staging host, the one
release artifact, migrations, scheduled jobs, storage, mail, environment variables, backups, monitoring and the
production outline. The design is [ARCHITECTURE.md](ARCHITECTURE.md); the controls are [SECURITY.md](SECURITY.md);
the record and runbook of staging is [ops/helios-staging.md](ops/helios-staging.md).

## 1. Environments

| | Where | Hostnames | Data | Payments | Mail |
| --- | --- | --- | --- | --- | --- |
| **local** | each worktree; `docker-compose.dev.yml` runs Postgres 18, Mailpit and MinIO for the machine | `gallery.localhost`, `shop.localhost` on the worktree's `PORT` (browsers resolve `*.localhost` to loopback) | the seed (DATA.md §2), one database per worktree, `indies_<suffix>` | the simulator | Mailpit |
| **staging** | Helios | `indies-gallery.gaiada.com`, `old-east-indies.gaiada.com` (DR-1) | the seed, then rehearsal imports of the owner's data | the simulator until the owner's Midtrans sandbox keys arrive, then sandbox | Mailpit (D13): nothing is delivered |
| **production** | Open (Q13): the same pull pipeline and host family as staging (Helios) unless the owner names another host | `antiquemapsindonesia.com`, `oldeastindies.com`, with aliases (Open) | the owner's data, imported | Midtrans live, with the owner's go-ahead | Open (D13) |

Staging deploys from a green merge to `production`, the pipeline's only Helios branch, as KOI's staging does;
production joins the same pipeline at cutover (§11). Writes to Helios staging fall under the owner's standing
go-ahead (DR-15); production provisioning, DNS and live credentials each need their own (👤 in TASKS.md).

## 2. Staging on Helios

| | |
| --- | --- |
| Site | one CloudPanel Node.js site; its nginx vhost serves both staging hostnames (`server_name`) and passes `Host` through, which the site choice depends on |
| Site user · pm2 process | `uindies` |
| App port | 4030, on 127.0.0.1 only |
| Database · role | `indies_db` · `indies` (LOGIN only, `CONNECTION LIMIT 20`), Postgres 18.6 |
| Media bucket | `indies-media`: anonymous GET only under `derivatives/` and `iiif/`, no listing; served at `/_media/` (§6) |
| Private bucket | `archive-masters`: masters, `orders/`, `imports/`; no anonymous access; versioned |
| Shared services | RustFS 1.0.0 on 127.0.0.1:4032 (its console off; 4033), data in a plain directory on `/` (no cap; the loop image it had hung Helios's snapshot backups, see scripts/ops/lib/rustfs.sh); Mailpit 1.31.3 on 4034 (SMTP) and 4035 (UI), both behind auth |
| Firewall | ufw, default `INPUT DROP`: 22, 80 and 443 public; 4030–4035 answer on loopback alone |
| Secrets | host-only, in the site user's `shared/.env` (mode 600) and `/etc/indies/*` (D49); never printed |
| First owner | created at provisioning, so the open first-user form is closed; credentials in `/etc/indies/staging-admin/` (600, root) |

Everything above is made by `scripts/ops/helios-provision.sh`: idempotent (a second run plans `changes: 0`), with
`--dry-run`, `--report` (a read-only inventory) and `--verify-restart`. Compare the packed script's sha256 with
the reviewed commit before piping it to the host. *Reshape note:* staging runs two site users (`uig`, `uoei`), two
ports, `ig_db` and `oei_db` and two media buckets today; task 3.1 provisions this shape, drops the old databases
after a `pg_dump` and removes the two users (CARRY-OVER.md §3, step 8).

## 3. The release

```
push to main ──► CI (ci.yml, e2e.yml): static checks · unit · *.db.test.ts · e2e on both hosts · Lighthouse
PR main → production ──► release.yml:
    build engine/apps/web   no PAYLOAD_SECRET; DATABASE_URL and PGHOST at a sentinel that refuses connections
    assemble web/           standalone server + .next/static + public/ + sharp's native binaries
    smoke                   boot the tarball on a migrated database: each host's home 200 with its site's name,
                            /admin/login 200 on the admin host and 404 on the other, sharp loads
    publish                 one tarball + .sha256 as release deploy/production-<UTC stamp>-<sha> (2 kept)
Helios ──► gaiada-poll (60 s): verify the sha256 → unpack under ~/releases/ → point current at web/
           → pm2 reload uindies → check https://<domain>/ (6 tries, 5 s apart, 20 s each) → else roll back
```

The first `/api/health` after a reload initialises Payload and applies pending migrations (§4). After a deploy,
`/api/health` must answer 200 on **both** hostnames; the poller checks only the one it names.

`.gaiadeploy.yml`, the poller's manifest:

```yaml
production:
  - server: helios
    site_user: uindies
    domain: old-east-indies.gaiada.com
    type: node
    subdir: web
```

- **Never commit a placeholder value** in it: one on another repository had Helios's poller failing every 60
  seconds for weeks. CI refuses one.
- **`site_user` must equal the pm2 process name exactly**, or the agent skips the reload silently and the old code
  keeps serving.
- **Rollback** is pointing `current` back and reloading: seconds, no rebuild, three releases kept on the host.
  `gaiada-deploy --rollback --site-user uindies --domain old-east-indies.gaiada.com --type node --subdir web`.

**What pm2 runs**, from the `current` release:

```
script     <current>/engine/apps/web/server.js     Next's standalone server; it sets NODE_ENV=production
node_args  --dns-result-order=ipv4first            so `localhost` binds 127.0.0.1
exec_mode  fork    instances 1                     one process, never cluster
env        HOSTNAME=localhost  PORT=4030           the rest from shared/.env (§8)
```

- **One process, in fork mode.** The jobs run's single-flight, the in-process rate limits and the health check's
  memo are exact only with one process; a template running cluster mode or `-i max` breaks all three silently.
- **Bound behind nginx, on loopback alone.** nginx terminates TLS and sets `X-Forwarded-For`, on which the rate
  limits key; a direct hit could forge it. So a host never binds `0.0.0.0`, and never a loopback IP literal: at
  `127.0.0.1` Next sees every proxy rewrite as external and every page hangs, so the boot check refuses one.
  `localhost` with IPv4 first binds 127.0.0.1 alone; nginx's upstream is `http://127.0.0.1:4030`. CI binds
  `0.0.0.0` on a runner with no nginx. `next start` never runs on a host.

## 4. Migrations

- **The web process applies them**: `RUN_MIGRATIONS=1` hands Payload the bundled set, which it applies on boot
  only in a production build, under a Postgres advisory lock, at the first `/api/health`. A worker never migrates;
  a dev server never migrates on boot (`pnpm db:fresh` migrates a workstation's database).
- **The poller allows about 30 seconds.** A release whose migration may outlast that is migrated before the reload,
  from the new release with `RUN_MIGRATIONS=1`.
- **Additive first** (CONVENTIONS.md §13): a failed migration rolls back its transaction, the process fails its
  health check, and the agent rolls back to a release that knows the old schema — sound only while migrations add.
- **A manual `pg_dump` just before a release that carries a migration**, kept 7 days (SECURITY.md BK4). Nothing
  takes it for you.
- *Reshape note:* phase 2 resets the migrations to one `initial`, with the extensions and the last-owner trigger
  added by hand, and drops every existing database (CARRY-OVER.md §3, step 7).

## 5. Scheduled jobs

The site user's crontab, a managed block the provisioning script writes, calls `~/bin/indies-cron <route>`, which
posts to `http://127.0.0.1:4030/api/x/cron/<route>` with `Authorization: Bearer $CRON_SECRET` (read from
`shared/.env` through stdin, never on a command line). One call per route is in flight at a time, and it logs only
when the outcome changes. With the secret unset the route answers 503 and does nothing.

| Route | Schedule | Counts as success | Runs |
| --- | --- | --- | --- |
| `jobs` | every minute | 200, 409 (a run in flight) | the Payload jobs queue (ARCHITECTURE.md §10) |
| `sweeps` | every minute | 200, 204 | expiring unpaid orders after asking Midtrans |
| `reconcile` | every 10 minutes | 200, 204 | Midtrans status for pending orders |
| `nightly` | 18:00 UTC (02:00 WITA) | 200, 204 | the retention purge and the roll-ups |

CloudPanel's cron screen rewrites a site's crontab: if someone saves jobs there, re-run the script, and `--report`
fails while the block is missing. A route stays commented out until its handler lands.

## 6. Object storage and mail

- **RustFS** (D12), S3-compatible, through `@payloadcms/storage-s3`; MinIO locally (`bitnamilegacy/minio`, since
  the upstream image refuses anonymous pulls). Changing provider is an endpoint change only to one that enforces
  policies by prefix: a provider whose public access is all of a bucket or nothing cannot hold this layout.
- **The media bucket is public only under `derivatives/` and `iiif/`**, the slash included, and lists nothing.
  Its public origin is `MEDIA_PUBLIC_URL`, one for both sites: on staging `https://old-east-indies.gaiada.com/_media`,
  an nginx location passing GET and HEAD to the bucket with authorisation and cookies stripped, added through
  CloudPanel's vhost editor, never a file edit. Its CORS admits both sites' origins, since the viewer fetches
  `info.json`. Whatever sits in front fetches anonymously and holds no key, so the bucket policy is the only gate.
- **The private bucket admits no anonymous request** and is versioned, so no key destroys a master by overwriting
  it. The app's one key reads and writes both buckets, never deletes under `masters/`, and may delete under
  `orders/` and `imports/` for the retention purge. The workstation intake key writes only under
  `masters/intake/` and the media bucket's public prefixes, for bulk tiling (DATA.md §5), and is in no host's
  `.env`. The policies are data, applied by `@engine/media`'s `storage:policies` plan, bucket policies first.
- **Browser uploads straight to storage** (masters, the Import screen's photos) need the storage at an HTTPS
  address the presigned URL is signed for, never through a CDN. Staging's RustFS answers on loopback alone, so
  until it has such a host, large handovers go through the intake CLI (Open).
- **Mail** is Payload's nodemailer adapter over SMTP, one server and a sender per site (`MAIL_FROM_GALLERY`,
  `MAIL_FROM_SHOP`). Staging and local send to **Mailpit**; on Helios its UI is reached by a tunnel
  (`ssh -L 4035:127.0.0.1:4035 helios`, user `indies`, password in `/etc/indies/mailpit/ui-password`).

## 7. Which environment a process is in

The environment is judged, never declared, and never read from `NODE_ENV` (staging runs production builds). The
boot check compares the canonical hosts with the hostnames committed in `SITES`: both production names mean
**production**, both staging names **staging**, and `*.localhost` on a dev server **local**. A production build at
a loopback host is local only with `LOCAL_PRODUCTION_BUILD=1`, which only a worktree's `.env.local` and CI set.
Anything else — a mix, an unknown host, none — is refused and judged production, so the strictest rules apply.

| | Refused at boot |
| --- | --- |
| production | `MIDTRANS_MODE=simulate`, a sandbox Midtrans key, `LOADERS_SOURCE=fixtures`, a development placeholder secret, any missing secret |
| staging | a live Midtrans key, a placeholder secret, a missing secret (the Midtrans keys may be absent while `MIDTRANS_MODE=simulate`) |
| local | a live Midtrans key; a missing secret only warns |

`/api/health` reports the environment it judged, so the deploy's check sees what the process decided.

## 8. Environment variables

Live values reach each process through its own `shared/.env` — never the repository, a build argument, a log or a
chat. **No `NEXT_PUBLIC_*` variable at all**: those are inlined at build, and one artifact serves staging and
production, so public config (Midtrans's client key, Turnstile's site key, the Google Maps browser key) reaches
the page at request time, in server-rendered props or from a runtime-config endpoint (SECURITY.md K2).

| Variable | What |
| --- | --- |
| `GALLERY_HOSTS`, `SHOP_HOSTS` | each site's hostnames, comma-separated, the first canonical (§1) |
| `ADMIN_HOST` | the one host serving `/admin` and Payload's REST (Payload's `serverURL`); default the shop's canonical host, the first of `SHOP_HOSTS` (`old-east-indies.gaiada.com` on staging); both answer 404 on the other host |
| `DATABASE_URL`, `PAYLOAD_SECRET` | the one database; a secret per environment |
| `RUN_MIGRATIONS` · `PAYLOAD_DEV_PUSH` | `1` in the web process on a host · `1` for a schema author's own database only |
| `HOSTNAME`, `PORT` | `localhost` and the app port on a host (§3); `0.0.0.0` in CI; never a loopback IP |
| `LOCAL_PRODUCTION_BUILD` | `1` in a worktree's `.env.local` and CI only (§7) |
| `LOADERS_SOURCE` | `payload` (the default) or `fixtures`; fixtures are refused in production |
| `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | the storage and the app's one key |
| `S3_BUCKET`, `MEDIA_PUBLIC_URL`, `MASTERS_BUCKET` | the media bucket and its public origin; the private bucket |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM_GALLERY`, `MAIL_FROM_SHOP` | mail (§6) |
| `MIDTRANS_MODE` | `simulate` selects the payment simulator, which needs no key: local (CI included) and staging only, refused in production (§7); unset, Midtrans runs on the keys below |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY` | `SB-Mid-…` sandbox keys off production, live keys in production only (COMMERCE.md §6) |
| `ANTHROPIC_API_KEY`, `AI_CHAT_MODEL`, `AI_CLASSIFY_MODEL`, `AI_DRAFT_MODEL`, `AI_CHAT_EFFORT` | one key per environment, each in its own workspace with a spend limit (AI.md §1) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET` | bot protection on lead forms and the chat |
| `GOOGLE_MAPS_BROWSER_KEY`, `GOOGLE_MAPS_SERVER_KEY` | the checkout's map and place search (the browser key, restricted by referrer to the shop's hosts, handed to the checkout page as a server-rendered prop) · `GET /api/x/geocode` (the server key, Geocoding only, never sent to a browser); a pair per environment, host-only (SECURITY.md S4) |
| `CRON_SECRET`, `REVALIDATE_SECRET`, `REVALIDATE_ORIGIN` | §5; the invalidation secret; `http://127.0.0.1:4030` on a host, where jobs and imports post invalidations |
| `LEGACY_DATA_DIR` | workstations only: the crawl and the owner's export, outside git (DATA.md §8) |

*Reshape note:* `BRAND`, `BRAND_ROOT`, `TEST_STOREFRONT`, `SITE_URL`, `SISTER_*`, `LINK_TOKEN_KEYS`, the
per-seller provider variables and the separate masters key go; `.env.example` lists exactly the table above.

## 9. Backups and restore

| What | How | Kept |
| --- | --- | --- |
| The database | nightly `pg_dump --format=custom` at 19:40 UTC (03:40 WITA), checked with `pg_restore --list`, root-only, never half-written; refused under 10% free disk | 7 days on the host; 30 days off-box, encrypted (SECURITY.md BK1) |
| Masters | versioning, plus replication to a second provider | forever |
| `uploads/`, `orders/`, `imports/` | versioning, replicated with the masters | per COMPLIANCE.md §1; 30 days of versions |
| Derivatives and tiles | not backed up | rebuilt from uploads and masters by a job |
| Secrets | host-only `.env` on staging (D49); Infisical from production provisioning | — |

- **The off-box target does not exist yet** (Open). The backup script hands each finished dump to
  `/etc/indies/backup-offbox` when that is present, and fails the run if it fails, so the timer shows it.
- **A backup that has never been restored is not a backup.** Before launch and then quarterly (SECURITY.md BK3):
  restore the latest dump into a scratch database (`pg_restore --clean --if-exists -d indies_restore`), point a
  release at it, compare record counts, open pages and images on both hosts, and write down how long it took.
- **A real restore:** `pm2 stop uindies`; restore into a new database; switch `DATABASE_URL`; start; check
  `/api/health` on both hosts; restore objects from their versions or the replica.

## 10. Health and monitoring

- **`/api/health`** reports the database, storage, queue lag and the environment judged, with no secret in its body
  and one probe per check behind a five-second memo. The lag never gates its status: a failed check rolls a deploy
  back.
- **Alert on:** `/api/health` failing on either host; p95 above 1 s; the 5xx rate; disk above 80% (Helios reached
  93% in September 2026); a pm2 restart loop; queue lag above 10 minutes; any webhook signature failure
  (SECURITY.md W1); a failed backup; the AI's daily budget at 80% (AI.md §3.2); the Google Maps budget at 80%
  (SECURITY.md S5).
- **Next answers an undecodable path itself** (`%C0%AE`, `%FF`) with a bare 500 before any engine code runs. Count
  the 500s whose path holds a `%` as their own series — ticketed, never paging, never dropped — so a scanner cannot
  page anyone and a Next change still shows.
- **The 30 days after the launch** (requirement 15.4): errors, payments (flagged, mismatched, late) and the chat's
  blocked and refused sessions are reviewed daily, and every fix is logged.

## 11. Production outline

1. **Decide** (👤 owner): the host (Q13; by default the same pull pipeline and host family as staging) and its
   storage capacity — the full archive with tiles needs room on `/` (staging's RustFS has no cap of its own); the off-box backup target; the
   mail provider, with SPF, DKIM and DMARC on both domains; any CDN in front; each domain's aliases and canonical
   form.
2. **Accounts** (👤): Midtrans production, live keys only at go-ahead; an Anthropic production workspace with a
   spend limit; Turnstile keys and the two Google Maps keys for the production hosts, with quota caps and a budget
   alert (SECURITY.md S4–S5); one Infisical project with `staging` and `production` environments.
3. **Provision** with `helios-provision.sh --env production` (or its port to another host), the dry run reviewed
   first: site user, pm2 entry, port, database and role, buckets with policies and versioning, the crontab block,
   backups with the off-box hook, an nginx `server_name` for every production host, TLS for each.
4. **Load and verify before DNS**: the owner's data through the import (DATA.md §3), the images, the redirects;
   every legacy URL requested against production with the real `Host` (`curl --resolve`), zero failures.
5. **Cut over both sites together**, on one day (requirement 15.3), after the owner's written go-ahead: the TTLs
   lowered two days before, both domains and the gallery's aliases pointed, health checked on each real hostname,
   both sitemaps submitted. Rollback is pointing DNS back; the old sites are untouched.

## Open

- **Production hosting** (Q13; the launch order is answered: both sites together) — default: the same pull
  pipeline and host family as staging (Helios), with RustFS on a dedicated volume sized for the archive, unless the
  owner names another host; decided before the phase 10 rehearsal. *Owner, DevOps.*
- **Production hostnames** — aliases (`www.`, `indiesgallery.com`) and the canonical form; default: the apex
  canonical, the rest 301 to it. *Owner.*
- **The production media origin** — default `/_media/` on the shop's canonical host, as on staging; a dedicated
  media host behind a CDN if traffic asks for it. *Owner, DevOps.*
- **An HTTPS storage host** for browser uploads straight to the bucket — default: none on staging, large handovers
  by the intake CLI. *DevOps.*
- **The off-box backup target and the second storage provider.** *Owner.*
- **The production mail sender** (D13) — default: SMTP of the owner's mail domain, else a transactional provider.
  *Owner.*
- **Monitoring and error reporting** — default: an external uptime check on both hosts' `/api/health` every minute,
  host alerts by email, structured logs; a hosted error reporter only with the owner's OK, as it is a processor
  (COMPLIANCE.md §1). *Owner, DevOps.*
