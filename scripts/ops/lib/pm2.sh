# shellcheck shell=bash
# pm2 for each site user, pinned. The first Helios run (2026-10-01) found none it could trust:
# CloudPanel's nvm for a new site user holds node, npm and corepack but no pm2, and the global
# /usr/bin/pm2 resolves to /usr/lib/node_modules/pm2, root's but group-writable (775), which a
# root-written unit must never name (trusted_bin, home.sh).
#
# So when no trusted pm2 exists, pm2 $PM2_VERSION goes into the site user's OWN nvm tree, put
# there by that user's own npm, run as that user through site_run (no login shell, a clean
# environment, the explicit PATH). Never as root, never `npm i -g` into a system prefix. npm runs
# no install scripts (pm2 has none). Its version is read from its package.json, never by running
# pm2: any pm2 command starts a daemon. Same version, no change.

# The last 6.x on npm (2025-11-26). 7.x exists (7.0.4, 2026-08-24); moving to it is its own change.
PM2_VERSION=6.0.14

# site_nvm_bin — the newest nvm node bin in the home whose node and npm are the user's own.
site_nvm_bin() {
  local d
  for d in $(printf '%s\n' "$S_HOME"/.nvm/versions/node/v*/bin | sort -rV); do
    if ! [ -x "$d/node" ] || ! [ -x "$d/npm" ]; then continue; fi
    if ! trusted_bin "$d/node" || ! trusted_bin "$d/npm"; then continue; fi
    printf '%s' "$d"
    return 0
  done
}

# pm2_version_at BIN_DIR — the version in the package.json of the pm2 that BIN_DIR/pm2 resolves
# to (…/node_modules/pm2/bin/pm2), read as the site user; empty when there is none.
pm2_version_at() {
  local real
  real="$(readlink -f -- "$1/pm2" 2>/dev/null)" || return 0
  user_read "$(dirname "$(dirname "$real")")/package.json" |
    python3 -c 'import json, sys; d = json.load(sys.stdin); print(d["version"] if d.get("name") == "pm2" else "")' \
      2>/dev/null || true
}

# why_no_system_pm2 — name each system pm2 that exists and why trusted_bin refused it.
why_no_system_pm2() {
  local p real
  for p in /usr/local/bin/pm2 /usr/bin/pm2; do
    [ -e "$p" ] || continue
    real="$(readlink -f -- "$p")"
    trusted_bin "$p" && continue
    printf '%s -> %s (%s %s, in a dir %s %s) is not root-only; ' "$p" "$real" \
      "$(stat -c %U -- "$real")" "$(stat -c %a -- "$real")" \
      "$(stat -c %U -- "$(dirname "$real")")" "$(stat -c %a -- "$(dirname "$real")")"
  done
}

node_version_ok() {
  local node
  node="$(site_run "$1/node" -p process.versions.node 2>/dev/null || true)"
  if [ -z "$node" ]; then
    fail "$1/node does not run as $S_USER"
  elif version_ge "$node" "$MIN_NODE"; then
    ok "node $node from $1, run as $S_USER only"
  else
    fail "node $node for $S_USER: the engine needs $MIN_NODE or later (package.json engines)"
  fi
}

runtime_preflight() {
  id -u "$S_USER" >/dev/null 2>&1 || return 0
  if [ -n "$S_REPLACE" ]; then
    note "node and pm2: checked on the new site, after --replace-site $S_REPLACE"
    return 0
  fi
  resolve_site_path
  if [ -n "$SITE_NODE_BIN" ]; then
    node_version_ok "$SITE_NODE_BIN"
    pm2_version_check
    return 0
  fi
  local bin
  bin="$(site_nvm_bin)"
  if [ -z "$bin" ]; then
    fail "no trusted node + pm2 for $S_USER, and no nvm node + npm of its own in $S_HOME/.nvm to install pm2 with (CloudPanel's Node.js site installs nvm): $(why_no_system_pm2)"
    return 0
  fi
  note "no trusted pm2 for $S_USER ($(why_no_system_pm2)none in $bin): pm2 $PM2_VERSION will be installed there, as $S_USER"
  node_version_ok "$bin"
}

# pm2_version_check [after-install] — the pm2 in use against the pin. After an install a
# mismatch is an error; an existing pm2 of another version is left alone (its daemon keeps the
# version it started with), with the command that moves it.
pm2_version_check() {
  local v
  v="$(pm2_version_at "$SITE_NODE_BIN")"
  if [ "$v" = "$PM2_VERSION" ]; then
    ok "pm2 $v at $SITE_NODE_BIN/pm2 (pinned $PM2_VERSION)"
  elif [ "${1:-}" = after-install ]; then
    fail "pm2 at $SITE_NODE_BIN/pm2 reports version '${v}' after installing $PM2_VERSION"
  elif [ -z "$v" ]; then
    warn "pm2 at $SITE_NODE_BIN/pm2 has no readable package.json version; the pin is $PM2_VERSION"
  else
    warn "pm2 $v at $SITE_NODE_BIN/pm2, not the pinned $PM2_VERSION: left as it is (to move it, as $S_USER: npm install -g pm2@$PM2_VERSION, then pm2 update — a restart of its apps)"
  fi
}

# install_pm2 BIN_DIR — as the site user, with its own npm, into its own nvm prefix.
install_pm2() {
  local bin="$1" saved="$SITE_PATH" rc=0
  SITE_PATH="$bin:/usr/local/bin:/usr/bin:/bin"
  site_run "$bin/npm" install --global --prefix "$(dirname "$bin")" --ignore-scripts --no-audit \
    --no-fund --no-update-notifier --loglevel=error "pm2@$PM2_VERSION" >/dev/null || rc=$?
  SITE_PATH="$saved"
  return "$rc"
}

# ensure_pm2 — a trusted pm2 for the site user, installed (pinned) when there is none. Leaves
# SITE_NODE_BIN empty when there is still none (the pm2 steps are then skipped, as errors).
ensure_pm2() {
  resolve_site_path
  if [ -n "$SITE_NODE_BIN" ]; then
    pm2_version_check
    return 0
  fi
  local bin
  bin="$(site_nvm_bin)"
  if [ -z "$bin" ]; then
    fail "no nvm node + npm of $S_USER's own in $S_HOME/.nvm: pm2 cannot be installed for it"
    return 0
  fi
  if ! act "install pm2@$PM2_VERSION into $(dirname "$bin") with $bin/npm, as $S_USER (not root, not system-wide)" \
    install_pm2 "$bin"; then
    fail "npm install pm2@$PM2_VERSION as $S_USER failed (output above)"
    return 0
  fi
  if dry; then
    SITE_NODE_BIN="$bin" SITE_PATH="$bin:/usr/local/bin:/usr/bin:/bin"
    return 0
  fi
  resolve_site_path
  if [ "$SITE_NODE_BIN" != "$bin" ]; then
    fail "pm2 was installed but $bin/pm2 is missing or not trusted (resolved: '${SITE_NODE_BIN}')"
    SITE_NODE_BIN=''
    return 0
  fi
  pm2_version_check after-install
}
