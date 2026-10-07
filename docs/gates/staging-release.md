# Staging release — cut `main` and deploy it to Helios

The procedure staging releases have used since 2026-10-06. The first runs were by the orchestrator session that
ran the 7.4 gate; this note was written on 2026-10-07 after a release that followed it exactly. The design is
[DEPLOYMENT.md](../DEPLOYMENT.md) §3–§4 and the host record is [ops/helios-staging.md](../ops/helios-staging.md)
(runbook step 7). This note replaces step 7's laptop build: **the build runs on Helios**, in a capped
`node:22-bookworm` container, because the workstation is short of memory and its network is too slow for
`pnpm install`.

Scope: **staging only** (`indies-gallery.gaiada.com`, `old-east-indies.gaiada.com`), under the owner's standing
Helios go-ahead. Not for production, DNS or the live sites. Never print a secret: no `cat` of `shared/.env` or
`/etc/indies/*`.

## What is where

|                          |                                                                                                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build dir (root, Helios) | `/root/indies-build/` — `bd.sh` (build and deploy), `deploy.sh`, `in/` (700: `b.sh`, `main.bundle`), `out/` (700: the last tarball and its `.sha256`), `bd.log` (the last run) |
| Release name             | `production-<UTC %Y%m%dT%H%M%SZ>-<short sha>`, stamped inside the build                                                                                                        |
| Releases                 | `/home/uindies/releases/deploy_<name>/web`; `~/current` points at the live one's `web/`; `deploy.sh` keeps 3 plus `bootstrap-holding`                                          |
| Process                  | pm2 `uindies` (fork, one instance), cwd `/home/uindies/current`                                                                                                                |

The three host scripts are not in the repository; their text is in [§Host scripts](#host-scripts) so they can be
restored if `/root/indies-build` is lost. Before a run, compare `sha256sum /root/indies-build/{in/b.sh,deploy.sh,bd.sh}`
with the last known-good values below. If they differ, stop and find out why.

```
21e13eb6bf6b8236f8be94cd22559400f9be59749bba79121054a0dd8784578d  in/b.sh
08e5aa25372c0d80cd8cbc50b34835123889f5a947e89a334da0ab4cd61cfed7  deploy.sh
```

## The procedure

1. **Local `main` is the release.** It must be clean and hold what was reviewed and merged:
   `git status --short` is empty; note `git rev-parse --short main`.
2. **Migrations.** Compare the repository's set with the set staging has applied:

   ```
   git ls-files 'engine/packages/cms/src/migrations/*.ts' | grep -v index.ts
   ssh helios "sudo -u postgres psql -d indies_db -Atc 'select name from payload_migrations order by id'"
   ```

   - The same list: nothing to do.
   - A new migration on `main`: take the manual dump first (DEPLOYMENT.md §4, kept 7 days):
     `ssh helios 'install -d -m 700 /var/backups/indies/pre-release && sudo -u postgres pg_dump -Fc indies_db >/var/backups/indies/pre-release/indies_db-$(date -u +%Y%m%dT%H%M%SZ).dump'`,
     then check it with `pg_restore --list <file> | wc -l`. The web process (`RUN_MIGRATIONS=1`) applies the new
     migration under the advisory lock at the first `/api/health` after the reload. If the migration may take
     longer than about 30 s, stop and plan it with the lead (DEPLOYMENT.md §4). **Never generate a migration
     here.**

3. **Bundle and ship.** From the repo root, with `$S` your scratchpad:

   ```
   git bundle create "$S/main.bundle" main
   git bundle list-heads "$S/main.bundle"            # must name the sha from step 1
   scp "$S/main.bundle" helios:/root/indies-build/in/main.bundle
   ```

4. **Build and deploy on Helios**, detached so an ssh drop cannot kill it:

   ```
   ssh helios 'nohup bash /root/indies-build/bd.sh >/root/indies-build/bd.log 2>&1 </dev/null & echo started'
   ```

   The script works in this order:
   1. It runs `b.sh` in `node:22-bookworm` with `nice 15 --cpus=3 --memory=6g`: a fresh clone of the bundle,
      `pnpm install --frozen-lockfile`, and `pnpm build` with no `DATABASE_URL` or `PAYLOAD_SECRET` and
      `PGPORT=1`, so the build cannot touch a database. Then `assemble-artifact.sh`, then the tarball and its
      `.sha256`.
   2. It runs `deploy.sh`: `sha256sum -c`, unpack as `uindies`, `ln -sfn … ~/current`, `pm2 reload uindies`, then
      `/api/health` on both hosts, 6 tries 5 s apart. When a check fails, it points `current` back at the previous
      release, reloads and prints the last 30 log lines. After a healthy deploy it prunes to 3 releases.

   It takes about 25–35 min, mostly `pnpm install` and `next build`. Poll with
   `ssh helios 'tail -3 /root/indies-build/bd.log'`. Done is `DEPLOY-DONE <name>` after `try n: gallery 200,
shop 200`. A 502 while it runs is the reload, not a failure. `BUILD FAILED` deployed nothing: read the log tail
   above it. `HEALTH FAILED` means the script already rolled back.

5. **Confirm it is live:** `ssh helios 'readlink -f /home/uindies/current'` names the release.
6. **Smoke test** (anonymous, from the workstation). Write down each code:

   ```
   G=https://indies-gallery.gaiada.com; S=https://old-east-indies.gaiada.com; M=$S/_media
   curl -s -o /dev/null -w '%{http_code}\n' $G/                     # 200
   curl -s -o /dev/null -w '%{http_code}\n' $S/                     # 200
   curl -s -o /dev/null -w '%{http_code}\n' $G/sell-to-us           # 200
   curl -s -o /dev/null -w '%{http_code}\n' $G/contact              # 200
   curl -sL -o /dev/null -w '%{http_code} %{url_effective}\n' $G/product/<public_id>   # 308 to /product/<id>-<slug>, then 200
   curl -s -D - -o /dev/null -H "Origin: $G" $M/derivatives/v1/<asset>/640.webp       # 200, access-control-allow-origin: $G
   curl -s -D - -o /dev/null -H "Origin: $G" $M/iiif/<asset>/info.json                # 200, access-control-allow-origin: $G
   curl -s -o /dev/null -w '%{http_code}\n' $M/uploads/x            # 403 (private prefix)
   ```

   - **Item:** a published work's `public_id`:
     `select public_id from works where _status='published' limit 1` (as `postgres` on `indies_db`). On the gallery
     host an item's URL is `/product/<public_id>-<slug>`, and `/product/<public_id>` redirects to it.
   - **Derivative:** take one from the item page's HTML (`/_media/derivatives/v1/<asset>/<width>.webp`).
   - **IIIF:** only assets with a pyramid have an `info.json` (`media.iiif_status` is `none` for most of the seed).
     List one, printing object names only:
     `ssh helios 'export MC_HOST_rustfs="http://$(cat /etc/indies/rustfs/access-key):$(cat /etc/indies/rustfs/secret-key)@127.0.0.1:4032"; mc ls --recursive rustfs/indies-media/iiif/ | grep info.json | head -3'`.
   - `/sell-to-us` and `/contact` are gallery pages; on the shop host they answer 404 by design.

7. **Rollback**, whenever needed: `ssh helios` as root,
   `sudo -u uindies ln -sfn /home/uindies/releases/deploy_<previous>/web /home/uindies/current && sudo -u uindies bash -lc 'pm2 reload uindies --update-env'`,
   then health on both hosts. This takes seconds, with no rebuild. A release that applied a migration can be rolled
   back only while migrations are additive (CONVENTIONS.md §13).

## Releases cut this way

| Release                               | Commit                             | Migrations                       | Result                      |
| ------------------------------------- | ---------------------------------- | -------------------------------- | --------------------------- |
| `production-20261006T152204Z-188996d` | 188996d                            | none new                         | healthy; 7.4 gate           |
| `production-20261007T022819Z-ce91e51` | ce91e51 (5.3sold)                  | none new (5 applied = 5 in repo) | healthy, try 1              |
| `production-20261007T030310Z-61b3b26` | 61b3b26 (5.3sold + `/browse` perf) | none new                         | healthy, try 1; smoke below |

Smoke on `61b3b26`, 2026-10-07: gallery `/` 200; shop `/` 200; gallery `/product/100000` 308 →
`/product/100000-<slug>` 200; `/sell-to-us` 200; `/contact` 200; derivative
`…/f18497448af3aea71bde65b6262af14d/640.webp` 200 with `access-control-allow-origin: https://indies-gallery.gaiada.com`;
`…/iiif/3793869e6a1b432f1959c48bc1c3cb15/info.json` 200 with the gallery origin echoed (and the shop origin for the
shop); `/_media/uploads/x` 403; `/_media/` 403. pm2 `uindies` online, fork mode.

## Seeding the gallery sample

The committed sample (`engine/packages/cms/src/seed/gallery/data/`: 50 rows, 65 images at 640 px) published on
staging, so the gallery's gate has a catalogue. On 2026-10-05 the vocabulary and the shop were seeded over an ssh
tunnel as a temporary role. That ran from the workstation, and the tunnel dropped mid-import. Seed on the host
instead, as the 5.2 backfill did.

1. **Check for collisions first (read-only).** The import upserts by `stock_number`, and images become `media`
   rows keyed by filename. If any sample stock number or image filename is already on staging, stop: a run would
   update those rows. Check with `select count(*) from works where stock_number in (<the CSV's stock numbers>)`
   and the same for `media.filename` against the `images/` folder. **Do not use `--dry-run` on staging**: it rolls
   back the rows but still uploads the images, leaving orphan objects in the bucket.
2. The layer seeds the vocabulary first. That step is create-only (a present place, term or maker is never edited,
   and site settings are left alone when present). It never touches products, stock, stores or users.
3. Main must be on the host as `/root/indies-build/in/main.bundle` (release step 3). Then run the script below,
   detached:

   ```
   ssh helios 'nohup nice -n 15 docker run --rm --name indies-seed-gallery --network host --cpus=3 --memory=6g \
     -v /root/indies-build/in:/in:ro -v /home/uindies/shared/.env:/site.env:ro node:22-bookworm \
     bash /in/seed-gallery.sh >/root/indies-build/seed-gallery.log 2>&1 </dev/null &'
   ```

   `/root/indies-build/in/seed-gallery.sh` works in this order:
   1. It clones the bundle and runs `pnpm install --frozen-lockfile`.
   2. It sources the site's env read-only and unsets `RUN_MIGRATIONS` and `PAYLOAD_DEV_PUSH`, so the run writes
      rows only.
   3. It runs `pnpm data:seed --layer gallery-sample --publish`, then
      `pnpm --filter @engine/cms media:derivatives` (no `--force`) until it exits 0, up to 3 attempts.

   Both CLIs post their cache tags to the running site (`REVALIDATE_ORIGIN`), so the pages refresh with no reload.
   Install, seed and backfill take about 15 min.

4. **Verify anonymously.** Check that `/browse` counts the works, that `/search?q=Batavia` returns hits, and that
   two item pages and their `/_media/derivatives/…` images return 200.

Run on 2026-10-07 (main 61b3b26):

- **Collision check:** 0 of 50 stock numbers and 0 of 65 filenames were present. Staging held 2 works, both E2E
  fixtures.
- **Vocabulary:** 0 created (66 places, 110 terms, 127 makers present); site settings present.
- **Antiques:** 48 created, 0 updated, 1 rejected, 1 held. P.0326 was rejected because the sample row has no date
  precision. P.1180 (Batavia) was held because the place "Batavia" matched two places: Jakarta, which carries
  Batavia as a historical name, and a QA fixture place that has since been deleted.
- **Review marks:** carried on 48 works.
- **Backfill:** attempt 1 exited 0, with 62 media made ready and 80 already up to date.
- **Anonymous checks:**
  - `/browse` 200, "44 works" (24 cards on page 1).
  - `/search?q=Batavia` 200, "3 works": `/product/200` (the Governor-General's palace, Batavia), `/product/2013`
    (Batavia city view) and the E2E fixture 100000.
  - `/product/200` and `/product/2013` both 200; their 320 and 640 derivatives all 200.
  - No seeded work is catalogued under Jakarta until P.1180 is imported.

## Media origin headers

**Status: not yet applied on staging.** The change below was written on 2026-10-07, and the host change is waiting
for an explicit go-ahead. Production's media origin needs the same change.

**The defect.** `/_media/` is an nginx location in the shop's CloudPanel vhost that proxies to RustFS. The CORS
headers come from the bucket's CORS rule, and RustFS sends `Access-Control-Allow-Origin` and `Vary: Origin` only
when the request carries an `Origin`. The item page's lead `<img>` makes a request with no Origin and gets a
cacheable response with no `Vary`. Chromium then reuses that response for OpenSeadragon's
`crossOrigin="anonymous"` request, the CORS check fails, and the viewer shows "This image cannot be opened in the
viewer just now". Observed on 2026-10-07:

```
no Origin:      HTTP 200 · cache-control: public, max-age=31536000, immutable   (no Vary, no ACAO)
Origin gallery: HTTP 200 · cache-control: … immutable · access-control-allow-origin: https://indies-gallery.gaiada.com · vary: Origin
uploads/x:      403
```

**The change.** In `location ^~ /_media/`, after `proxy_hide_header Set-Cookie;`:

```nginx
    proxy_hide_header Vary;               # one Vary, never two
    add_header Vary Origin always;        # on every answer, with or without Origin
    include /etc/nginx/global_settings;   # a location's add_header drops the server's; keep them
```

- ACAO stays with the bucket's CORS rule, which echoes the two staging origins.
- `Cache-Control` comes from the object, unchanged.
- `uploads/` and everything outside `derivatives/` and `iiif/` stay 403, from the bucket policy.
- Make the edit in **both** CloudPanel's stored template (`site.vhost_template` in
  `/home/clp/htdocs/app/data/db.sq3`) and the live `/etc/nginx/sites-enabled/old-east-indies.gaiada.com.conf`, so a
  regeneration keeps it. Copy both to `/var/backups/indies/config/media-vary-<stamp>/` first. Run `nginx -t`; reload
  nginx only if it passes, and restore both if it fails. The 3.1 `/_media/` patch was made the same way.

**Verify:** `curl -sI <derivative>` with no Origin shows `vary: Origin`. With
`-H 'Origin: https://indies-gallery.gaiada.com'` it also shows that origin in ACAO. `…/_media/uploads/x` is still 403.

## Host scripts

`/root/indies-build/bd.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
cd /root/indies-build
rm -f out/*
nice -n 15 docker run --rm --name indies-release-build --cpus=3 --memory=6g -v /root/indies-build/in:/in:ro -v /root/indies-build/out:/out node:22-bookworm bash /in/b.sh 2>&1 | tail -6
N="$(ls out/*.tar.gz 2>/dev/null | head -1 | xargs -r basename | sed 's/\.tar\.gz$//')"
[ -n "$N" ] || { echo "BUILD FAILED"; exit 1; }
cp "out/$N.tar.gz" "out/$N.tar.gz.sha256" /tmp/
bash /root/indies-build/deploy.sh "$N"
echo "DEPLOY-DONE $N"
```

`/root/indies-build/in/b.sh` (runs inside the container):

```bash
#!/usr/bin/env bash
set -euo pipefail
apt-get update -qq >/dev/null && apt-get install -y -qq git >/dev/null
corepack enable >/dev/null 2>&1
git config --global --add safe.directory '*'
git clone -q --branch main /in/main.bundle /build
cd /build
SHA="$(git rev-parse --short HEAD)"; STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
pnpm install --frozen-lockfile >/tmp/install.log 2>&1 || { tail -30 /tmp/install.log; exit 1; }
env -u DATABASE_URL -u PAYLOAD_SECRET PGHOST=127.0.0.1 PGPORT=1 pnpm build >/tmp/build.log 2>&1 || { tail -40 /tmp/build.log; exit 1; }
tail -3 /tmp/build.log
bash .github/scripts/assemble-artifact.sh /tmp/stage
NAME="production-$STAMP-$SHA"
tar -czf "/out/$NAME.tar.gz" -C /tmp/stage web
( cd /out && sha256sum "$NAME.tar.gz" > "$NAME.tar.gz.sha256" )
echo "ARTIFACT $NAME ($(du -h /out/$NAME.tar.gz | cut -f1))"
```

`/root/indies-build/deploy.sh <name>`:

```bash
set -euo pipefail
NAME="$1"; T="/tmp/$NAME.tar.gz"
cd /tmp && sha256sum -c "$NAME.tar.gz.sha256"
R="/home/uindies/releases/deploy_$NAME"
PREV="$(readlink /home/uindies/current || true)"
sudo -u uindies mkdir -p "$R"
sudo -u uindies tar -xzf "$T" -C "$R"
sudo -u uindies ln -sfn "$R/web" /home/uindies/current
sudo -u uindies bash -lc 'pm2 reload uindies --update-env >/dev/null 2>&1 || pm2 restart uindies --update-env >/dev/null'
ok=0
for i in 1 2 3 4 5 6; do
  sleep 5
  g="$(curl -s -m 20 -o /tmp/hg.json -w '%{http_code}' https://indies-gallery.gaiada.com/api/health || true)"
  s="$(curl -s -m 20 -o /tmp/hs.json -w '%{http_code}' https://old-east-indies.gaiada.com/api/health || true)"
  echo "try $i: gallery $g, shop $s"
  if [ "$g" = 200 ] && [ "$s" = 200 ]; then ok=1; break; fi
done
if [ "$ok" != 1 ]; then
  echo "HEALTH FAILED: rolling back to $PREV"
  sudo -u uindies ln -sfn "$PREV" /home/uindies/current
  sudo -u uindies bash -lc 'pm2 reload uindies --update-env >/dev/null 2>&1 || true'
  sudo -u uindies bash -lc 'pm2 logs uindies --lines 30 --nostream 2>&1 | tail -30'
  exit 1
fi
echo "gallery: $(head -c 300 /tmp/hg.json)"; echo; echo "shop: $(head -c 300 /tmp/hs.json)"; echo
rm -f "$T" "/tmp/$NAME.tar.gz.sha256"
LIVE="$(dirname "$(readlink -f /home/uindies/current)")"; i=0
for d in $(ls -1dt /home/uindies/releases/deploy_production-* 2>/dev/null); do
  i=$((i+1)); [ "$i" -le 3 ] && continue; [ "$(readlink -f "$d")" = "$LIVE" ] && continue
  rm -rf -- "$d" && echo "pruned $(basename "$d")"
done
```

(The comment headers of the host copies are left out here, so `bd.sh`'s hash differs from this text; the two hashes
above are of the files as they are on the host.)
