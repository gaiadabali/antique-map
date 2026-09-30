#!/usr/bin/env bash
# The release smoke (TASKS.md 4.4.f): the packed tarball, extracted as a host extracts it, holds
# both brands' subdirs — each with brand/site/brand.config.json, its server.js, .next/static and a
# sharp that loads — and each boots from it: the home page 200 with the brand's name, and
# /admin/login 200. release.yml runs it before anything is published.
#
#   smoke-artifact.sh <tarball>
#
# Needs the job's Postgres (PGHOST, PGPORT, POSTGRES_USER, PGPASSWORD) with a migrated database
# per brand, named <brand>_<DB_SUFFIX> with `-` as `_` (`pnpm db:fresh --suffix $DB_SUFFIX`).
set -euo pipefail

tarball="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
here="$(cd "$(dirname "$0")" && pwd)"
root="${RUNNER_TEMP:-/tmp}/smoke"
: "${DB_SUFFIX:?DB_SUFFIX names the smoke databases}"
rm -rf "$root"
mkdir -p "$root"
tar -xzf "$tarball" -C "$root"
export SERVERS_DIR="$root/servers"

port=4300
failed=0
for pair in indies-gallery:gallery old-east-indies:emporium; do
  brand="${pair%%:*}" app="${pair#*:}"
  release="$root/$brand"
  server_dir="$release/engine/apps/$app"
  for path in brand/site/brand.config.json "engine/apps/$app/server.js" "engine/apps/$app/.next/static"; do
    test -e "$release/$path" || {
      echo "::error::$brand/$path missing from the tarball"
      exit 1
    }
  done
  echo "$brand: brand/site holds $(cd "$release/brand/site" && printf '%s ' *)"
  echo "$brand: sharp from the server's folder: $(cd "$server_dir" && node -e "import('sharp').then((s) => console.log(s.default.versions.sharp, 'libvips', s.default.versions.vips))")"
  name="$(node -e "process.stdout.write(require(process.argv[1]).name)" "$release/brand/site/brand.config.json")"

  bash "$here/start-server.sh" "smoke-$brand" "$release" "$app" "$port" \
    "${brand//-/_}_${DB_SUFFIX}" "$brand" "$release/brand"
  home="$(curl -s -m 30 -w '\n%{http_code}' "http://localhost:$port/")"
  home_code="${home##*$'\n'}"
  admin_code="$(curl -s -m 60 -o /dev/null -w '%{http_code}' "http://localhost:$port/admin/login")"
  if grep -qF "$name" <<< "$home"; then has_name=yes; else has_name=no; fi
  echo "$brand: / $home_code (brand name \"$name\" in the page: $has_name), /admin/login $admin_code"
  if [ "$home_code" != 200 ] || [ "$has_name" != yes ] || [ "$admin_code" != 200 ]; then
    echo "::error::$brand did not boot from the tarball as a host would run it"
    cat "$SERVERS_DIR/smoke-$brand.log"
    failed=1
  fi
  kill "$(cat "$SERVERS_DIR/smoke-$brand.pid")" 2>/dev/null || true
  port=$((port + 1))
done
exit "$failed"
