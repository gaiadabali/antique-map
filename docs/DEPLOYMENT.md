# Deployment

One repository, one CI run, **one release artifact holding both brands' builds**,
deployed as two processes with two databases. The release mechanics are KOI's
(pull-based GDA pipeline on Helios); the topology is NOW!'s (one engine, an
instance per tenant).

---

## 1. Environments

| | Where | Data | Deploys from |
| - | ----- | ---- | ------------ |
| **local** | each worktree, `docker-compose.dev.yml` — Postgres 18, Mailpit, MinIO | per-lane databases (`ig_dev_<lane>`) seeded from fixtures | — |
| **staging** | Helios — `indies-gallery.gaiada.com`, `old-east-indies.gaiada.com` | seeded + rehearsal migration imports; payment **sandboxes** | a green push to `production` (the GDA pipeline's only Helios branch) |
| **production** | Helios — the brands' real domains, added at cutover (MIGRATION.md §8) | live | the same, once cutover moves the targets |

Two of `docker-compose.dev.yml`'s pins are load-bearing, not arbitrary
(`docker-compose.dev.yml` on `main`): MinIO runs `bitnamilegacy/minio`, Bitnami's
frozen "legacy" line, because the upstream `minio/minio` image now requires a
registered pull and would fail an anonymous one in CI; and Postgres's data
volume mounts at `/var/lib/postgresql` — one level above where earlier majors
put it — because 18+ nests its version number beneath that path and refuses to
start if the volume is mounted at the old, more specific location.

Staging on Helios mirrors what KOI does today (`koi.gaiada.com` is staging on
the production pipeline, by decision). At cutover the production domains become
new targets with their own site users and databases; staging can move to Delphi
on the `staging` branch if a permanent staging tier is wanted (open decision).

## 2. Topology — per brand

| | Indies Gallery | Old East Indies |
| - | -------------- | --------------- |
| Site user / pm2 process | `uig` | `uoei` |
| App port | 4030 (verify free with `ss -ltn` at provisioning) | 4031 |
| Database / role | `ig_db` / `ig` | `oei_db` / `oei` |
| Public media bucket | `ig-media` → `media.<domain>` via Cloudflare (CORS for the viewer's origins) | `oei-media` → `media.<domain>` |
| Private masters bucket | `archive-masters`: IG's key reads and writes; OEI's key reads masters and writes **only** under `print-files/` | ← |
| `shared/.env` | `BRAND=indies-gallery`, `BRAND_ROOT`, `DATABASE_URL`, `RUN_MIGRATIONS=1`, per-seller provider secrets | `BRAND=old-east-indies`, … |

**Everything a brand serves is its one Next.js process** — public site, `/admin`,
API routes, webhooks and the analytics beacon (KOI's owner decision: one process,
one thing to supervise). **Jobs do not run inside page renders**: the queue is run
by a cron-called route with a per-run limit and `sharp.concurrency` capped, and
bulk work — tiling the migration's archive — runs **off-box** as a CLI that writes
straight to the bucket (ARCHITECTURE.md §10). If measurements say the cron route
still competes with renders, a second pm2 app running `payload jobs:run` from the
same artifact is the escape hatch — it never runs migrations.

### Why media is not on the Helios disk

KOI keeps uploads in `shared/uploads`. That does not scale to this catalogue:
~9,500 works × several images × derivatives × IIIF tiles is tens to hundreds of
GB, and Helios's disk hit **93%** in September 2026. Media goes to **S3-compatible
object storage** — **RustFS**, self-hosted (D12, 2026-09-30; staging runs it on
Helios bound to loopback, and where it lives for the full archive is to be
confirmed before 37.2 — this disk is why) — through
`@payloadcms/storage-s3`; local dev uses MinIO (the `bitnamilegacy/minio` image,
since `minio/minio` no longer allows an anonymous pull, §1); switching provider
is an endpoint change.

## 3. Release flow

```
push to main
  → CI: static checks · unit · contract · e2e (both brands + test brand) · Lighthouse
  → merge to production → `artifact` job builds each storefront app with NO database:
        engine/apps/gallery   next build → standalone + indies-gallery/site  → indies-gallery/
        engine/apps/emporium  next build → standalone + old-east-indies/site → old-east-indies/
    and packs both into ONE tarball + .sha256
    (the brand is runtime config — BRAND in shared/.env — so nothing brand-specific is baked in)
  → `publish` creates a deploy/production-* release
  → gaiada-poll on Helios (60 s) picks it up, verifies the checksum
  → per .gaiadeploy.yml target: unpack its `subdir`, symlink `current`, pm2 reload <site user>
  → the new process boots and reads shared/.env
  → health check https://<domain>/api/health — it calls getPayload(), which initialises
    Payload and applies pending migrations (web process only: RUN_MIGRATIONS=1 in a
    production build — Payload migrates on boot only when NODE_ENV=production, which
    the standalone server.js sets — under a Postgres advisory lock); on failure, roll back
    and reload
```

**What pm2 runs** (TASKS.md 4.4, 4.3). The release is Next's standalone output, which nests
the server under the app's workspace path (`outputFileTracingRoot` is the repository root),
with the brand folder beside it (`assemble-artifact.sh`). So each target's pm2 process — `uig`
for the gallery app, `uoei` for the emporium — runs, from its `current` release:

```
script     <current>/engine/apps/<app>/server.js       <app>: gallery for uig, emporium for uoei
node_args  --dns-result-order=ipv4first                so `localhost` binds 127.0.0.1 (below)
exec_mode  fork                                        one process per brand, never cluster
instances  1

HOSTNAME=localhost             the address server.js binds (§8): set, never left to the shell
PORT=<the site's port>         §2's app port; server.js falls back to 3000 without it
BRAND_ROOT=<current>/brand     the folder holding site/: brand.config.json, copy/, assets/
```

and `shared/.env` supplies the rest (§2, §8). That `server.js` sets `NODE_ENV=production`
itself; `next start` never runs on a host.

**One process, in fork mode.** 4.6's single-flight jobs run, §7's in-process rate limits
and the health check's ~5 s memo are exact only with one process per brand; a pm2 or
CloudPanel template running `-i max` or cluster mode would break all three without a word,
so the entry pins `exec_mode: 'fork'` and `instances: 1`.

**Bound behind nginx, on loopback alone.** The app port is reached only through nginx,
which terminates TLS and sets `X-Forwarded-For`, on which the rate limits key — a direct
hit could forge it. So a host never binds `0.0.0.0`, which would put 4030 and 4031 on the
public interface (4.3's senior-be review #8), and never a loopback IP literal
(`127.0.0.1`, `::1`): at one of those, Next renames the host to `localhost` when it re-reads
the proxy's rewrite but builds its own URL from the raw address, so every rewrite looks
external, is proxied to itself, and every storefront page hangs with nothing logged — which
no choice of origin in the proxy fixes (4.4.g), so the boot check refuses one (TASKS.md
5.3.d, C13 `PROXY_MATCHER`). The host binds **`localhost`, pinned to IPv4**: measured in
4.3 on Next 16.3.6, `localhost` alone listened on `[::1]` only, where an nginx upstream at
`127.0.0.1` is refused (a 502); with `--dns-result-order=ipv4first` it listened on
`127.0.0.1` alone, answered through `127.0.0.1` and `localhost`, and did not hang, since
both of Next's URLs then say `localhost`. nginx's upstream is `http://127.0.0.1:<port>`,
which 5.1 confirms in the site's CloudPanel vhost. 5.1 verifies the bind on Helios:
`ss -ltnp` shows the port on `127.0.0.1` only, a page answers
through nginx, and `curl http://<public-ip>:4030` from outside is refused — the host
firewall (CloudPanel's allows 22, 80 and 443) is 5.1's to confirm, with the owner's
go-ahead (👤). CI's servers, on an ephemeral runner with no nginx, bind `0.0.0.0`
(`start-server.sh`).

`.gaiadeploy.yml`, using the pipeline's monorepo support (`subdir`, added
2026-08-19 for exactly this):

```yaml
production:
  - server: helios
    site_user: uig
    domain: indies-gallery.gaiada.com
    type: node
    subdir: indies-gallery
  - server: helios
    site_user: uoei
    domain: old-east-indies.gaiada.com
    type: node
    subdir: old-east-indies
```

**Never commit `TBD`** in this file — a committed placeholder had Helios's
poller failing every 60 seconds for weeks on another repo (GDA STAGES-AND-TYPES).
`site_user` must equal the pm2 process name exactly, or the agent skips the
reload silently and the old code keeps serving.

Rollback is repointing `current` and reloading — seconds, no rebuild. Two
releases are kept per target.

## 4. Migrations

The same rules as KOI, applied to two databases:

0. **One migration set, two databases.** Each brand's web process applies the
   same pending migrations when its first health check initialises Payload —
   one process per database, under an advisory lock, never a worker.
   `RUN_MIGRATIONS=1` hands Payload the bundled set, and Payload applies it on
   boot only in a production build (`NODE_ENV=production`, which `next start`
   sets): a dev server never migrates on boot, whatever it is given, so a
   workstation's database is migrated by `pnpm --filter @engine/cms migrate`,
   which `db:fresh` runs, and the boot check warns of `RUN_MIGRATIONS=1` on a dev
   server. `pnpm db:schema-hash --all` in CI and after every deploy proves the
   schemas are identical.
1. **Additive first.** Add, backfill, switch reads, and drop only in a later
   release. A failed migration rolls back its transaction, the process fails to
   boot, the health check fails, and the agent rolls back to a release that
   knows the old schema — which only holds while migrations are additive.
2. **Local Postgres matches production (18).** Anything version-sensitive is
   checked against 18.
3. A release carrying a migration gets a manual `pg_dump` of **both** databases
   just before it merges, kept 7 days. Deploys are automatic; nothing takes
   this dump for you.
4. `payload migrate:create` against a migrated database must report "No schema
   changes detected" before and after — or the snapshot chain has drifted.
5. **Payload dev "push" is off** (`push: false`). Schema reaches every database
   anyone shares through migrations only. The one exception is a schema author's
   own suffixed database, pushed with `PAYLOAD_DEV_PUSH=1` (PARALLEL-TRACKS.md
   §3.2) — never a production build. No table declares a composite primary key,
   which drizzle-kit 0.31.7 cannot introspect. KOI lost time to a dev server
   generating a migration that carried another session's schema change.

## 5. Scheduled jobs

HTTP routes inside the app (so they use its pool and config — a cron script with
its own connection is a second place for credentials to be wrong), called by the
site user's crontab with `Authorization: Bearer $CRON_SECRET`. With the secret
unset the route answers 503 and does nothing.

| Job | Every | Why it cannot be skipped |
| --- | ----- | ------------------------ |
| run the Payload jobs queue (derivatives, tiles, PDFs, sister sync, emails, outbox dispatch) | 1 min | nothing else runs the queue — `autoRun` inside renders is off by design |
| sweep expired checkout locks and holds | 1 min | housekeeping — `reserve()` already expires stale rows for its own target, so correctness never waits on this |
| payment status reconciliation | 10 min | a webhook that never arrived must not leave an order "pending" forever |
| FX rates refresh | daily 06:00 WIB | display prices in other currencies |
| want-list / saved-search alerts | matched on publish through the outbox and the queue (≤ 15 min end to end); digest daily | "tell me when a Valentijn of Bali arrives" — the first collector to hear gets the map |
| an address's want-list confirmation | sent from the outbox on `wantList.requested`, the moment it is asked for | the double opt-in link, so an unowned inbox is never subscribed on someone else's say-so (D39) |
| idempotency-key sweep | daily | a stored answer can hold a buyer's contact or a tax id, so none outlives `IDEMPOTENCY_KEY_RETENTION` (7 days) — longer than any retry |
| unconfirmed want-list purge | daily | an address's list never confirmed within `WANT_LIST_PENDING_DAYS` (7) is erased whole — address, query and consent — so a stale invitation can never be revived |
| abandoned-cart email (consented only) | hourly | |
| events partition + retention roll-up | nightly | KOI analytics pattern |
| sitemap + merchant feed regeneration | nightly | also on publish via tag revalidation |

## 6. Backups

| What | How | Where | Retention |
| ---- | --- | ----- | --------- |
| Postgres (each brand) | nightly `pg_dump --format=custom` | off-box | 30 days |
| Object storage | bucket versioning + weekly replication to a second provider | off-box | 30 days of versions |
| Master scans | write-once, replicated | two providers | forever |
| `shared/.env` | Infisical | — | — |

**A backup that has never been restored is not a backup.** A restore drill of one
brand database and a sample of media is in the calendar quarterly, and the
runbook records how long it actually took.

## 7. Health, monitoring, security

- `/api/health` returns app, database, storage, job-queue lag and payment
  provider reachability; the lag and the providers are reported and never gate
  its status, because a failed health check rolls a deploy back (§3). Alloy on
  the box watches it; alert on p95 > 1 s, 5xx rate, disk > 80%, pm2 restart
  loop, job-queue lag > 10 min, **any webhook signature failure**.
- **The 5xx rate sets one series apart** (TASKS.md 4.3, 41.2.c): a `500` whose
  path is under `^/(brand-assets|api/x)/` and contains `%` is Next's own answer to
  a path it cannot decode, before any engine code runs (ARCHITECTURE.md §13) — no
  brand asset or engine API path carries a `%` of its own, since brand-asset
  segments are checked and legacy URLs are logged under their public path. The
  rule is evaluable as written (a status, a prefix and a character, no decoding),
  and those 500s are counted as their own series — ticketed past a rate, never
  paging and never dropped, so a Next change that 500s every `%` path still shows —
  while every other 500 still counts toward the paging rate. nginx may answer a
  malformed escape (`%A.`) with its own 400 first, leaving only well-formed escapes
  of invalid UTF-8 (`%C0%AE`, `%FF`) to reach Next; 41.2.c measures that through
  CloudPanel's nginx.
- Security headers and the CSP are sent by the app
  (`engine/packages/http/src/security/`), never by the CloudPanel vhost, which
  regenerates its nginx config (KOI). The CSP is **built per request** from brand
  config — payment-provider and analytics origins are runtime values — so adding a
  provider is a config change and a restart, not a rebuild.
- Rate limits on sign-in, forms, offers and checkout endpoints — in-process while
  there is one process per brand, Postgres-backed the day there are two.
- Card data never touches our servers: hosted fields / redirect only (PCI
  SAQ-A). Webhooks are signature-verified and idempotent (PAYMENTS.md §4).

## 8. Environment variables

```
BRAND                       indies-gallery | old-east-indies | test
BRAND_ROOT                  the brand folder, the one holding site/: <current>/brand on a host — the release
                            ships brand/site/ beside engine/apps/<app>/server.js (assemble-artifact.sh)
HOSTNAME                    localhost on a host, where pm2 runs node with --dns-result-order=ipv4first so it
                            binds 127.0.0.1 alone, behind nginx (§3); 0.0.0.0 in CI. The address
                            `node server.js` binds, never an origin. Never a loopback IP — at 127.0.0.1 every
                            proxy rewrite looks external to Next and the page hangs (TASKS.md 4.4.g, 5.3.d) —
                            and never left to the shell, which exports the machine's name as HOSTNAME
TEST_STOREFRONT             CI only: gallery | emporium — which test config to load
DATABASE_URL                PAYLOAD_SECRET
SITE_URL                    the origin this process serves: https://<its domain> on a host; the boot
                            check reads the environment from it (below)
LOCAL_PRODUCTION_BUILD      1 in a worktree's .env.local and in CI only: a production build at a
                            loopback SITE_URL runs as local; never in a host's shared/.env
RUN_MIGRATIONS              1 in the web process only
S3_ENDPOINT  S3_BUCKET  S3_ACCESS_KEY_ID  S3_SECRET_ACCESS_KEY  MEDIA_PUBLIC_URL
MASTERS_BUCKET  MASTERS_ACCESS_KEY_ID  MASTERS_SECRET_ACCESS_KEY   (OEI's key: print-files/ write only)
SMTP_HOST/PORT/USER/PASS    SMTP_FROM_ADDRESS  SMTP_FROM_NAME
PAYMENT_<SELLER>_<PROVIDER>_*   per seller, per enabled provider, per environment (PAYMENTS.md §8)
SHIPPING_<SELLER>_<PROVIDER>_*  per seller, for each of its own couriers (sellers[].shipping, all of the
                                brand's when it names none) — a shipping webhook is per seller too
FULFILMENT_<PROVIDER>_*     no seller: fulfilment providers are brand-level, not per seller
<PREFIX>_MODE               sandbox | live, for a provider whose keys cannot say which (below)
WHATSAPP_*                  SISTER_API_KEY  SISTER_WEBHOOK_SECRET
SISTER_BASE_URL             the sister's origin this process syncs with: required in production (the
                            sister's production site, never sisters[0].baseUrl, which is its staging
                            site); staging may leave it unset; a workstation may name a local sister
                            at http://localhost:<port>; ignored, with a warning, by a brand with none
REVALIDATE_SECRET  CRON_SECRET
REVALIDATE_ORIGIN           http://127.0.0.1:<PORT> on a host (§2's app port): where a worker, a seed or an import posts
                            cache invalidations (/api/x/revalidate), the web process on loopback; the IP literal, never
                            localhost. Unset on a workstation (a loopback SITE_URL serves); https only off loopback
LINK_TOKEN_KEYS             the capability links' key ring (C6 links), one per brand and per environment,
                            never shared: comma-separated kid:secret (the one current key),
                            kid:secret:YYYY-MM-DD (retired that UTC day; verifies LINK_TOKEN.keyOverlapDays
                            more) and kid:revoked (refuses at once: a leak); secrets base64url — never
                            standard base64's "+" or "/" — of ≥ 32 random bytes, made with
                            node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
                            and never a pattern: a counter, a stride, zeros padding a short key, a block
                            repeated; a kid is never reused; a restart applies a change
LEGACY_DATA_DIR             workstations only: where the old site's raw extracts live
```

**Which environment a process is in** is read from `SITE_URL` against the
brand's `domains` (C1), never from `NODE_ENV` alone, because staging runs
production builds (§1). The brand's production domain or an alias is
**production**, its staging domain **staging**, and a dev server **local**. A
production build is local only where it says so: at a loopback origin
(`localhost`, `*.localhost`, `127.0.0.1`, `[::1]`) **and** with
`LOCAL_PRODUCTION_BUILD=1` — how a worktree and CI open a production build on
their own port, with draft configs and sandbox keys, the boot report warning all
the same. A worktree's `.env.local` and CI's jobs set it; a host's `shared/.env`
never does, and on a brand's own domain it is ignored. Every other production
build — a loopback one without it, any other host, no usable `SITE_URL` — is
refused and judged production, so the strictest rules apply to whatever it is:
a staging host provisioned from `.env.example`, whose `SITE_URL` is loopback and
whose secrets are development defaults, cannot start as a workstation would
(TASKS.md 3.4, senior-be #1). `0.0.0.0` is a bind address, never an origin, and
always production. Every host's `shared/.env` sets `SITE_URL=https://<its
domain>`, and `/api/health` should report the environment judged, so the release
flow's check at the brand's domain (§3) sees what the process decided (a
follow-up for TASKS.md 4.1.b).

**Provider secrets**, by the names the adapters read — declared in
`@engine/config`'s `boot-check/provider-secrets.ts`, the seller and provider ids
upper-cased with `-` as `_` (`SHIPPING_SG_DHL_EXPRESS_API_KEY`):

| Provider | Variables | Sandbox or live |
| --- | --- | --- |
| payments (per seller) | PAYMENTS.md §8: `stripe`, `midtrans`, `xendit`, `paypal`, `doku` | the keys, or `PAYMENT_<SELLER>_<PROVIDER>_MODE` |
| `biteship` (per seller) | `SHIPPING_<SELLER>_BITESHIP_API_KEY`, `_WEBHOOK_SECRET` | `SHIPPING_<SELLER>_BITESHIP_MODE` |
| `dhl-express` (per seller) | `SHIPPING_<SELLER>_DHL_EXPRESS_API_KEY`, `_API_SECRET`, `_ACCOUNT_NUMBER` | `SHIPPING_<SELLER>_DHL_EXPRESS_MODE` |
| `prodigi`, `gelato` (per brand, v2) | `FULFILMENT_PRODIGI_API_KEY`, `FULFILMENT_GELATO_API_KEY` | `FULFILMENT_<PROVIDER>_MODE` |
| `bank-transfer`, `manual`, `flat`, `quote`, `collect`, `own-stock`, `local-production` | none | — |

A seller needs its own payment providers' secrets and its own couriers' — the
brand's couriers when it names none (C1 `sellers[].shipping`) — and no other: a
Singapore seller shipping its own stock by DHL Express needs no Biteship key. A
`*_MODE` is `sandbox` or `live` and nothing else. A missing secret refuses a
deployed process and only warns a workstation; a key of the wrong kind refuses
anywhere — production runs on live keys, staging and local on sandbox keys — and
so does a seller whose keys for one provider mix the two.

**No `NEXT_PUBLIC_*` per brand.** Those are inlined at `next build`, and one
gallery build serves several brands (and the artifact is built with none), so GA4
and Meta ids are **runtime** brand config, handed to the page through `ShellVM`,
and the CSP that allows them is built per request.

Live values go in Infisical and reach each process through its own
`shared/.env`. **Never** in the repo, never in a build argument, never in chat.
A sandbox key in production — or a live key in staging — fails the boot check.

## 9. What needs the owner before it can happen

Helios writes need the owner's explicit go-ahead **each time** (KOI memory);
provisioning is an idempotent script, `scripts/ops/helios-provision.sh`, reviewed
and then run with permission. Also needed: DNS for the staging and production
hostnames, the object-storage account, SMTP credentials for each brand's domain
(with SPF, DKIM and DMARC — `gaiada.com` publishes no DKIM, NOW! F140), and
every payment/shipping merchant account.
