#!/usr/bin/env bash
# The release smoke (TASKS.md 4.4.f, 2.1.b): the packed tarball, extracted as a host extracts it,
# holds the one subdir `web/` — its server.js, .next/static, a sharp that loads and the brand
# folders it ships — and boots from it, on one port, answering both sites' hostnames: each host's
# home page 200 with the brand's name, /admin/login 200 and /api/health 200. release.yml runs it
# before anything is published.
#
#   smoke-artifact.sh <tarball>
#
# Until the host picks the site (TASKS.md 2.2) one process serves one brand, `SMOKE_BRAND`
# (default `indies-gallery`), on every hostname — so both hosts show its name for now; 2.2 gives
# each host its own site, and the admin to the admin host alone.
#
# Needs the job's Postgres (PGHOST, PGPORT, POSTGRES_USER, PGPASSWORD) with a migrated database
# named <brand>_<DB_SUFFIX>, `-` as `_` (`pnpm db:fresh --brand <brand> --suffix $DB_SUFFIX`).
# Each hostname is pinned to loopback with curl's `--resolve`, so no resolver or /etc/hosts decides.
set -euo pipefail

tarball="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
here="$(cd "$(dirname "$0")" && pwd)"
root="${RUNNER_TEMP:-/tmp}/smoke"
: "${DB_SUFFIX:?DB_SUFFIX names the smoke database}"
brand="${SMOKE_BRAND:-indies-gallery}"
rm -rf "$root"
mkdir -p "$root"
tar -xzf "$tarball" -C "$root"
export SERVERS_DIR="$root/servers"

release="$root/web"
app=engine/apps/web
for path in "$app/server.js" "$app/.next/static" "$brand/site/brand.config.json"; do
  test -e "$release/$path" || {
    echo "::error::web/$path missing from the tarball"
    exit 1
  }
done
echo "web: brand folders $(cd "$release" && printf '%s ' */site/brand.config.json)"
echo "web: sharp from the server's folder: $(cd "$release/$app" && node -e "import('sharp').then((s) => console.log(s.default.versions.sharp, 'libvips', s.default.versions.vips))")"
name="$(node -e "process.stdout.write(require(process.argv[1]).name)" "$release/$brand/site/brand.config.json")"

port=4300
bash "$here/start-server.sh" smoke-web "$release" "$port" "${brand//-/_}_${DB_SUFFIX}" "$brand"
failed=0
for host in gallery.localhost shop.localhost; do
  base="http://$host:$port"
  at=(--resolve "$host:$port:127.0.0.1")
  home="$(curl -s "${at[@]}" -m 30 -w '\n%{http_code}' "$base/")"
  home_code="${home##*$'\n'}"
  admin_code="$(curl -s "${at[@]}" -m 60 -o /dev/null -w '%{http_code}' "$base/admin/login")"
  health_code="$(curl -s "${at[@]}" -m 120 -o /dev/null -w '%{http_code}' "$base/api/health")"
  if grep -qF "$name" <<< "$home"; then has_name=yes; else has_name=no; fi
  echo "$host: / $home_code (brand name \"$name\" in the page: $has_name), /admin/login $admin_code, /api/health $health_code"
  if [ "$home_code" != 200 ] || [ "$has_name" != yes ] || [ "$admin_code" != 200 ] || [ "$health_code" != 200 ]; then
    echo "::error::$host did not answer from the tarball as a host would run it"
    failed=1
  fi
done
[ "$failed" = 0 ] || cat "$SERVERS_DIR/smoke-web.log"
kill "$(cat "$SERVERS_DIR/smoke-web.pid")" 2>/dev/null || true
exit "$failed"
