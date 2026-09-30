#!/usr/bin/env bash
# Starts one production server from an assembled release subdir (assemble-artifact.sh) the way a
# host runs it — `node engine/apps/<app>/server.js` with only the environment DEPLOYMENT.md §8
# lists — in the background, and waits until it answers. e2e.yml, ci.yml's Lighthouse job and the
# release smoke (smoke-artifact.sh) all start their servers here, so each tests the tree a host
# runs, not `next start` from the workspace.
#
#   start-server.sh <name> <release-dir> <app> <port> <database> <brand> <brand-root> [KEY=VALUE ...]
#
#   release-dir  an assembled subdir (…/indies-gallery); copied to $SERVERS_DIR/<name> first, so two
#                servers never share a `.next` cache
#   brand-root   BRAND_ROOT: the folder holding site/ — the release's own `<release-dir>/brand`, or
#                a repo brand folder (`test`) for a brand the artifact does not ship
#   KEY=VALUE    extra environment: TEST_STOREFRONT=gallery, SPIKE_ROUTES=1 …
#
# The database URL is built from PGHOST/PGPORT/POSTGRES_USER/PGPASSWORD (the job's Postgres).
# PAYLOAD_SECRET and a `ci:` LINK_TOKEN_KEYS ring are generated here per server and per run,
# masked in the Actions log, and never written anywhere but the server's own environment.
#
# HOSTNAME is pinned to 0.0.0.0 (TASKS.md 4.4.g, qa F1): at a loopback IP (127.0.0.1) Next's
# router sees its own origin as 127.0.0.1 while the proxy's request URL says `localhost`, so every
# proxy rewrite looks external and the page hangs. The runner's own HOSTNAME never leaks in: the
# server starts from an empty environment.
set -euo pipefail

if [ "$#" -lt 7 ]; then
  echo "usage: start-server.sh <name> <release-dir> <app> <port> <database> <brand> <brand-root> [KEY=VALUE ...]" >&2
  exit 2
fi
name="$1" release="$2" app="$3" port="$4" database="$5" brand="$6" brand_root="$7"
shift 7

SERVERS_DIR="${SERVERS_DIR:-${RUNNER_TEMP:-/tmp}/servers}"
mkdir -p "$SERVERS_DIR"
tree="$SERVERS_DIR/$name"
log="$SERVERS_DIR/$name.log"

test -f "$release/engine/apps/$app/server.js" || {
  echo "::error::$release/engine/apps/$app/server.js missing — run assemble-artifact.sh first"
  exit 1
}
brand_root="$(cd "$brand_root" && pwd)"
rm -rf "$tree"
cp -r "$release" "$tree"
# The release's own brand folder moves with the copy.
case "$brand_root" in "$(cd "$release" && pwd)"/*) brand_root="$tree${brand_root#"$(cd "$release" && pwd)"}" ;; esac

secret() { node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"; }
payload_secret="$(secret)"
link_key="$(secret)"
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  echo "::add-mask::$payload_secret"
  echo "::add-mask::$link_key"
fi

: "${PGHOST:?PGHOST names the Postgres to use}" "${POSTGRES_USER:?}" "${PGPASSWORD:?}"
database_url="postgres://${POSTGRES_USER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${database}"

(
  cd "$tree/engine/apps/$app"
  exec env -i \
    PATH="$PATH" HOME="${HOME:-/tmp}" TMPDIR="${TMPDIR:-/tmp}" \
    NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    PORT="$port" HOSTNAME=0.0.0.0 \
    BRAND="$brand" BRAND_ROOT="$brand_root" \
    DATABASE_URL="$database_url" PAYLOAD_SECRET="$payload_secret" \
    LINK_TOKEN_KEYS="ci:$link_key" \
    SITE_URL="http://localhost:$port" LOCAL_PRODUCTION_BUILD=1 \
    "$@" \
    node server.js
) > "$log" 2>&1 &
pid=$!
echo "$pid" > "$SERVERS_DIR/$name.pid"

# Up when it answers at all (any status: the boot check has run by then). A process that exits
# first — a refused boot — fails the step with its log.
for _ in $(seq 1 120); do
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "::error::$name exited before answering on :$port"
    cat "$log"
    exit 1
  fi
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://localhost:$port/" || true)"
  if [ "$code" != "000" ] && [ -n "$code" ]; then
    echo "$name up on :$port (pid $pid, BRAND=$brand, $* ) — / answered $code"
    sed -n '1,3p' "$log"
    exit 0
  fi
  sleep 1
done
echo "::error::$name did not answer on :$port within 120 s"
cat "$log"
exit 1
