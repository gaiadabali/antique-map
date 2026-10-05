#!/usr/bin/env bash
# Runs helios-provision.sh end to end in a throwaway local container that stands in for Helios
# (test/Dockerfile): dry run changes nothing, apply, apply again = "changes: 0", secrets filled
# then converged, refusals change nothing. It contacts no server of ours: the only downloads are
# the two pinned release files from GitHub (checked against their SHA-256) and the base image.
#
#   bash scripts/ops/test/container-test.sh
# shellcheck source-path=SCRIPTDIR
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPS="$(dirname "$HERE")"
CACHE="${INDIES_OPS_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/indies-ops-test}"
mkdir -p "$CACHE"

# shellcheck source=../lib/rustfs.sh
. "$OPS/lib/rustfs.sh"
# shellcheck source=../lib/mailpit.sh
. "$OPS/lib/mailpit.sh"

fetch() {
  local url="$1" sum="$2" dest="$CACHE/$3"
  if [ ! -f "$dest" ] || [ "$(sha256sum "$dest" | cut -d' ' -f1)" != "$sum" ]; then
    curl -fsSL -o "$dest" "$url"
  fi
  [ "$(sha256sum "$dest" | cut -d' ' -f1)" = "$sum" ] || {
    echo "checksum mismatch: $url" >&2
    exit 1
  }
}
fetch "$RUSTFS_URL" "$RUSTFS_ZIP_SHA256" "$RUSTFS_ZIP"
fetch "$MAILPIT_URL" "$MAILPIT_TGZ_SHA256" "mailpit-$MAILPIT_VERSION-linux-amd64.tar.gz"

docker build -q -t indies-ops-test "$HERE" >/dev/null
to_docker() { if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi; }
# pack.sh inlines the repo's committed storage policy documents (lib/storage.sh's source of truth:
# engine/packages/media/src/storage/policies), and the container sees only scripts/ops — so the
# policies ride in on their own read-only mount and INDIES_POLICIES_DIR points pack.sh at them.
REPO="$(dirname "$OPS")"  # scripts/ops → scripts → the repo root, where engine/ lives
REPO="$(dirname "$REPO")"
MSYS_NO_PATHCONV=1 docker run --rm --privileged \
  -e INDIES_POLICIES_DIR=/policies \
  -v "$(to_docker "$OPS"):/ops:ro" -v "$(to_docker "$CACHE"):/seed:ro" \
  -v "$(to_docker "$REPO/engine/packages/media/src/storage/policies"):/policies:ro" \
  indies-ops-test bash /ops/test/in-container.sh
