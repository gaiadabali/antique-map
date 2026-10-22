#!/usr/bin/env bash
# Starts the one production server from the assembled release subdir (assemble-artifact.sh) the
# way a host runs it — `node engine/apps/web/server.js` with only the environment DEPLOYMENT.md §8
# lists — in the background, and waits until it answers. e2e.yml, ci.yml's Lighthouse job and the
# release smoke (smoke-artifact.sh) all start their server here, so each tests the tree a host
# runs, not `next start` from the workspace.
#
#   start-server.sh <name> <release-dir> <port> <database> [KEY=VALUE ...]
#
#   release-dir  the assembled subdir (…/artifact/web); copied to $SERVERS_DIR/<name> first, so two
#                servers never share a `.next` cache
#   KEY=VALUE    extra environment
#
# The one process serves both sites, picked by each request's Host (TASKS.md 2.2): GALLERY_HOSTS is
# gallery.localhost and SHOP_HOSTS shop.localhost — the shop's host the admin's (ADMIN_HOST) — on
# <port>; a KEY=VALUE overrides them.
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

if [ "$#" -lt 4 ]; then
  echo "usage: start-server.sh <name> <release-dir> <port> <database> [KEY=VALUE ...]" >&2
  exit 2
fi
name="$1" release="$2" port="$3" database="$4"
shift 4
app=engine/apps/web

SERVERS_DIR="${SERVERS_DIR:-${RUNNER_TEMP:-/tmp}/servers}"
mkdir -p "$SERVERS_DIR"
tree="$SERVERS_DIR/$name"
log="$SERVERS_DIR/$name.log"

test -f "$release/$app/server.js" || {
  echo "::error::$release/$app/server.js missing — run assemble-artifact.sh first"
  exit 1
}
rm -rf "$tree"
cp -r "$release" "$tree"

secret() { node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"; }
payload_secret="$(secret)"
link_key="$(secret)"
order_link_key="$(secret)" # ORDER_LINK_KEY (6.6): a boot-check requirement, 32 random bytes
if [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  echo "::add-mask::$payload_secret"
  echo "::add-mask::$link_key"
  echo "::add-mask::$order_link_key"
fi

: "${PGHOST:?PGHOST names the Postgres to use}" "${POSTGRES_USER:?}" "${PGPASSWORD:?}"
database_url="postgres://${POSTGRES_USER}:${PGPASSWORD}@${PGHOST}:${PGPORT:-5432}/${database}"

(
  cd "$tree/$app"
  exec env -i \
    PATH="$PATH" HOME="${HOME:-/tmp}" TMPDIR="${TMPDIR:-/tmp}" \
    NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 \
    PORT="$port" HOSTNAME=0.0.0.0 \
    GALLERY_HOSTS=gallery.localhost SHOP_HOSTS=shop.localhost \
    DATABASE_URL="$database_url" PAYLOAD_SECRET="$payload_secret" \
    LINK_TOKEN_KEYS="ci:$link_key" ORDER_LINK_KEY="$order_link_key" \
    LOCAL_PRODUCTION_BUILD=1 \
    "$@" \
    node server.js
) > "$log" 2>&1 &
pid=$!
echo "$pid" > "$SERVERS_DIR/$name.pid"

# Up when it answers at all (any status: the boot check has run by then — `/api/health` answers on
# any host, a plain `localhost` included). A process that exits first — a refused boot — fails the
# step with its log.
for _ in $(seq 1 120); do
  if ! kill -0 "$pid" 2>/dev/null; then
    echo "::error::$name exited before answering on :$port"
    cat "$log"
    exit 1
  fi
  code="$(curl -s -o /dev/null -m 5 -w '%{http_code}' "http://localhost:$port/" || true)"
  if [ "$code" != "000" ] && [ -n "$code" ]; then
    echo "$name up on :$port (pid $pid${*:+, $*}) — / answered $code"
    sed -n '1,3p' "$log"
    exit 0
  fi
  sleep 1
done
echo "::error::$name did not answer on :$port within 120 s"
cat "$log"
exit 1
