# shellcheck shell=bash
# Which node and pm2 a site's unit names, and why it may trust them.
#
# The house standard on Helios is the system pm2: /usr/bin/pm2 -> /usr/lib/node_modules/pm2,
# the one the GDA deploy poller drives (`sudo -u <user> /usr/bin/pm2 …`) and KOI runs (7.0.1).
# One pm2 per ~/.pm2 daemon: a second version against the same daemon breaks the poller's
# reloads ("In-memory PM2 is out-of-date"), so this script installs no pm2 of its own. It uses
# /usr/bin's node and pm2 (then /usr/local/bin's), as the site user only, never as root.
#
# Trusted means only root can change what runs: the file, and every directory up to /, are
# root's and writable by nobody else. npm's global tree on Helios is 775 root:root, so a group
# write bit is accepted when the group is gid 0 and gid 0 has no member — none listed in the
# group database, and no account but root with it as its primary group. Anything else refuses.
# pm2's version is read from its package.json, never by running pm2 (that starts a daemon).

PM2_MAJOR=7

# root_group_members — the accounts in gid 0 besides root, comma-separated; empty when none.
root_group_members() {
  {
    getent group 0 | cut -d: -f4 | tr ',' '\n'
    getent passwd | awk -F: '$4 == 0 && $1 != "root" { print $1 }'
  } | sed '/^$/d' | sort -u | paste -sd, -
}

# root_only_why PATH — nothing when only root can write PATH; otherwise why not.
root_only_why() {
  local m
  m=$((8#$(stat -c %a -- "$1")))
  if [ "$(stat -c %u -- "$1")" != 0 ]; then
    printf '%s is owned by %s' "$1" "$(stat -c %U -- "$1")"
  elif [ $((m & 8#002)) != 0 ]; then
    printf '%s is writable by anyone (%s)' "$1" "$(stat -c %a -- "$1")"
  elif [ $((m & 8#020)) != 0 ] && [ "$(stat -c %g -- "$1")" != 0 ]; then
    printf '%s is writable by group %s' "$1" "$(stat -c %G -- "$1")"
  elif [ $((m & 8#020)) != 0 ] && [ -n "$(root_group_members)" ]; then
    printf '%s is writable by group root, whose members are %s' "$1" "$(root_group_members)"
  fi
}

# untrusted_why FILE — nothing when FILE (resolved) and every directory above it, and the
# directory holding the link itself, can be changed by root alone; otherwise the first reason.
untrusted_why() {
  local real p why
  real="$(readlink -f -- "$1")" || {
    printf '%s does not resolve' "$1"
    return 0
  }
  for p in "$real" "$(dirname "$1")"; do
    while :; do
      why="$(root_only_why "$p")"
      if [ -n "$why" ]; then
        printf '%s' "$why"
        return 0
      fi
      [ "$p" = / ] && break
      p="$(dirname "$p")"
    done
  done
}
trusted_bin() { [ -e "$1" ] && [ -z "$(untrusted_why "$1")" ]; }

# resolve_site_path — the system node and pm2, by looking: /usr/bin's, then /usr/local/bin's.
resolve_site_path() {
  SITE_NODE_BIN=''
  SITE_PATH=/usr/local/bin:/usr/bin:/bin
  local d x
  for d in /usr/bin /usr/local/bin; do
    if ! [ -x "$d/node" ] || ! [ -x "$d/pm2" ]; then continue; fi
    if ! trusted_bin "$d/node" || ! trusted_bin "$d/pm2"; then continue; fi
    SITE_NODE_BIN="$d"
    SITE_PATH="$d"
    for x in /usr/local/bin /usr/bin /bin; do [ "$x" = "$d" ] || SITE_PATH="$SITE_PATH:$x"; done
    return 0
  done
}

# why_no_system_pm2 — each system node or pm2 that exists, and why it is refused.
why_no_system_pm2() {
  local p why
  for p in /usr/bin/node /usr/bin/pm2 /usr/local/bin/node /usr/local/bin/pm2; do
    [ -e "$p" ] || continue
    why="$(untrusted_why "$p")"
    [ -z "$why" ] || printf '%s -> %s: %s; ' "$p" "$(readlink -f -- "$p")" "$why"
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

node_version_ok() {
  local node
  node="$(site_run "$1/node" -p process.versions.node 2>/dev/null || true)"
  if [ -z "$node" ]; then
    fail "$1/node does not run as $S_USER"
  elif version_ge "$node" "$MIN_NODE"; then
    ok "node $node from $1, run as $S_USER only"
  else
    fail "node $node at $1/node: the engine needs $MIN_NODE or later (package.json engines)"
  fi
}

# pm2_version_check — the system pm2 is the poller's; a major other than PM2_MAJOR is a warning.
pm2_version_check() {
  local v
  v="$(pm2_version_at "$SITE_NODE_BIN")"
  case "$v" in
    "$PM2_MAJOR".*) ok "pm2 $v at $SITE_NODE_BIN/pm2 (the host's, as the deploy poller and KOI use it)" ;;
    '') warn "pm2 at $SITE_NODE_BIN/pm2 has no readable package.json version (expected $PM2_MAJOR.x)" ;;
    *) warn "pm2 $v at $SITE_NODE_BIN/pm2, not $PM2_MAJOR.x as KOI and the poller run: left as it is (never changed here)" ;;
  esac
}

runtime_preflight() {
  id -u "$S_USER" >/dev/null 2>&1 || return 0
  if [ -n "$S_REPLACE" ]; then
    note "node and pm2: checked on the new site, after --replace-site $S_REPLACE"
    return 0
  fi
  resolve_site_path
  if [ -z "$SITE_NODE_BIN" ]; then
    fail "no trusted system node + pm2 for $S_USER in /usr/bin or /usr/local/bin: $(why_no_system_pm2)(this script installs no pm2; the poller and KOI use /usr/bin/pm2)"
    return 0
  fi
  node_version_ok "$SITE_NODE_BIN"
  pm2_version_check
}
