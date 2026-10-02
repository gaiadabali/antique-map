#!/usr/bin/env bash
# The release smoke (TASKS.md 4.4.f, 2.1.b, 2.2): the packed tarball, extracted as a host extracts
# it, holds the one subdir `web/` — its server.js, .next/static, each site's public files and a
# sharp that loads — and boots from it, on one port, answering both sites' hostnames, each with
# its own site: its home in English and Indonesian 200 with its site's name, and /api/health 200.
# The admin answers on the admin host alone (SECURITY.md X2): /admin/login is 200 on the shop's
# host and 404 on the gallery's, and a host on no list is a plain 404. release.yml runs it before
# anything is published.
#
#   smoke-artifact.sh <tarball>
#
# Needs the job's Postgres (PGHOST, PGPORT, POSTGRES_USER, PGPASSWORD) with a migrated database
# named indies_<DB_SUFFIX> (`pnpm db:fresh --suffix $DB_SUFFIX`). Each hostname is pinned to
# loopback with curl's `--resolve`, so no resolver or /etc/hosts decides.
set -euo pipefail

tarball="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
here="$(cd "$(dirname "$0")" && pwd)"
root="${RUNNER_TEMP:-/tmp}/smoke"
: "${DB_SUFFIX:?DB_SUFFIX names the smoke database}"
rm -rf "$root"
mkdir -p "$root"
tar -xzf "$tarball" -C "$root"
export SERVERS_DIR="$root/servers"

release="$root/web"
app=engine/apps/web
for path in "$app/server.js" "$app/.next/static" "$app/public/gallery/logo.svg" "$app/public/shop/logo.svg"; do
  test -e "$release/$path" || {
    echo "::error::web/$path missing from the tarball"
    exit 1
  }
done
echo "web: sharp from the server's folder: $(cd "$release/$app" && node -e "import('sharp').then((s) => console.log(s.default.versions.sharp, 'libvips', s.default.versions.vips))")"

port=4300
bash "$here/start-server.sh" smoke-web "$release" "$port" "indies_${DB_SUFFIX}"
failed=0
fail() {
  echo "::error::$1"
  failed=1
}
code() { # code <host> <path> — the status, the host pinned to loopback
  curl -s -o /dev/null -m 60 -w '%{http_code}' --resolve "$1:$port:127.0.0.1" "http://$1:$port$2"
}

# Each host, its own site (`SITES.<site>.name`, engine/packages/config/src/sites/table.ts), and
# where the admin answers.
for row in "gallery.localhost|Indies Gallery|404" "shop.localhost|Old East Indies|200"; do
  IFS='|' read -r host name admin <<< "$row"
  for home in / /id; do
    page="$(curl -s --resolve "$host:$port:127.0.0.1" -m 30 -w '\n%{http_code}' "http://$host:$port$home")"
    status="${page##*$'\n'}"
    if grep -qF "$name" <<< "$page"; then has_name=yes; else has_name=no; fi
    echo "$host: $home $status (\"$name\" in the page: $has_name)"
    [ "$status" = 200 ] && [ "$has_name" = yes ] || fail "$host$home did not answer its own site"
  done
  admin_code="$(code "$host" /admin/login)"
  health_code="$(code "$host" /api/health)"
  echo "$host: /admin/login $admin_code (want $admin), /api/health $health_code"
  [ "$admin_code" = "$admin" ] || fail "$host: /admin/login answered $admin_code, not $admin"
  [ "$health_code" = 200 ] || fail "$host: /api/health answered $health_code"
done
for path in /api/users /admin; do
  status="$(code gallery.localhost "$path")"
  echo "gallery.localhost: $path $status (want 404: the admin and its REST are the shop host's)"
  [ "$status" = 404 ] || fail "gallery.localhost: $path answered $status"
done
unknown="$(code unknown.localhost /)"
echo "unknown.localhost: / $unknown (want 404: a host on no list picks no site)"
[ "$unknown" = 404 ] || fail "unknown.localhost answered $unknown"

[ "$failed" = 0 ] || cat "$SERVERS_DIR/smoke-web.log"
kill "$(cat "$SERVERS_DIR/smoke-web.pid")" 2>/dev/null || true
exit "$failed"
