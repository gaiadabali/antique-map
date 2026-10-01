# shellcheck shell=bash
# Shared helpers for helios-provision.sh: output, the one door every change goes through
# (`act`), dry-run, and root-owned file writes that change nothing when nothing differs.
#
# The contract every module keeps: a read-only probe runs in every mode; anything that changes
# the host is `act "what" cmd args…`, which prints "WOULD …" under --dry-run and runs nothing.
# CHANGES counts them, so a second run that prints "changes: 0" is the idempotency proof.
#
# Root writes only root-owned paths, and refuses a symlink at any of them (review B1). Anything
# inside a site user's home is written by that user (home.sh). A replaced file's old copy goes to
# BACKUP_ROOT/config/<its path>.<stamp>, root-only — never beside it, where a .bak in
# /etc/systemd/system or /etc/logrotate.d would itself be read as configuration.

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CHANGES=0
ERRORS=0
WARNINGS=0
DRY_RUN=0
QUIET_PREVIEW=0
BACKUP_ROOT=/var/backups/indies
ROOT_TMP=''

say() { printf '\n== %s\n' "$*"; }
ok() { printf '   ok     %s\n' "$*"; }
note() { printf '   note   %s\n' "$*"; }
warn() {
  WARNINGS=$((WARNINGS + 1))
  printf '   WARN   %s\n' "$*"
}
fail() {
  ERRORS=$((ERRORS + 1))
  printf '   ERROR  %s\n' "$*"
}
die() {
  printf 'helios-provision: %s\n' "$*" >&2
  exit 2
}
dry() { [ "$DRY_RUN" = 1 ]; }

# act DESCRIPTION CMD [ARG…] — count the change; print it; run it unless this is a dry run.
act() {
  local what="$1"
  shift
  CHANGES=$((CHANGES + 1))
  if dry; then
    printf '   WOULD  %s\n' "$what"
    return 0
  fi
  printf '   DO     %s\n' "$what"
  "$@"
}

# preview TEXT — show what a dry run would write, indented, so a reviewer reads the real bytes.
preview() {
  [ "$QUIET_PREVIEW" = 1 ] && return 0
  printf '%s' "$1" | sed 's/^/          | /'
  case "$1" in *$'\n') ;; *) printf '\n' ;; esac
}

need_cmd() {
  local c
  for c in "$@"; do
    command -v "$c" >/dev/null 2>&1 || fail "missing command: $c"
  done
}

# root_tmp_init — a private scratch directory for this run (700 root), removed on exit. Called
# once from main, in the main shell (a trap set in a $(…) subshell would fire at once).
root_tmp_init() {
  ROOT_TMP="$(mktemp -d /tmp/indies-provision.XXXXXX)"
  trap 'rm -rf "$ROOT_TMP"' EXIT
}

# root_dir_ok DIR — root-owned and writable by nobody else, so a temp file in it is root's alone.
root_dir_ok() {
  [ -d "$1" ] && [ ! -L "$1" ] && [ "$(stat -c %U "$1")" = root ] &&
    [ $((8#$(stat -c %a "$1") & 8#022)) = 0 ]
}

# keep_copy PATH — the file's current bytes into BACKUP_ROOT/config/PATH.STAMP (600 root).
keep_copy() {
  local dest="$BACKUP_ROOT/config$1.$STAMP"
  install -d -m 700 -o root -g root "$BACKUP_ROOT" "$BACKUP_ROOT/config" "$(dirname "$dest")"
  install -m 600 -o root -g root /dev/null "$dest"
  cat -- "$1" >"$dest"
}

# write_file PATH MODE OWNER:GROUP CONTENT — atomic, for a root-owned directory only.
write_file() {
  local path="$1" mode="$2" owner="$3" content="$4" dir tmp
  dir="$(dirname "$path")"
  root_dir_ok "$dir" || {
    echo "refused: $dir is not a root-owned directory only root can write" >&2
    return 1
  }
  [ ! -L "$path" ] || {
    echo "refused: $path is a symlink" >&2
    return 1
  }
  if [ -e "$path" ]; then keep_copy "$path"; fi
  tmp="$(mktemp "$dir/.provision.XXXXXX")"
  printf '%s' "$content" >"$tmp"
  chmod "$mode" "$tmp"
  chown "$owner" "$tmp"
  mv -f "$tmp" "$path"
}

set_mode() {
  chmod "$2" "$1"
  chown -h "$3" "$1"
}

# ensure_mode PATH MODE OWNER:GROUP — a root-side path; mode as stat prints it (600, 750).
ensure_mode() {
  local path="$1" mode="$2" owner="$3" have
  if [ -L "$path" ]; then
    fail "refused: $path is a symlink"
    return 0
  fi
  have="$(stat -c '%a %U:%G' "$path")"
  if [ "$have" != "$mode $owner" ]; then
    act "set $path to $mode $owner (was $have)" set_mode "$path" "$mode" "$owner"
  fi
}

# put_file PATH MODE OWNER:GROUP — root-side file; the wanted content on stdin. Writes only when
# the content differs. Sets PUT_CHANGED=1 when it (would) write; returns 0 (safe under set -e).
PUT_CHANGED=0
put_file() {
  local path="$1" mode="$2" owner="$3" content current
  content="$(
    cat
    printf x
  )"
  content="${content%x}"
  if [ -L "$path" ]; then
    fail "refused: $path is a symlink"
    return 0
  fi
  if [ -f "$path" ]; then
    current="$(
      cat -- "$path"
      printf x
    )"
    current="${current%x}"
    if [ "$current" = "$content" ]; then
      ensure_mode "$path" "$mode" "$owner"
      return 0
    fi
    if dry && [ "$QUIET_PREVIEW" != 1 ]; then
      diff -u --label "$path (now)" --label "$path (wanted)" <(printf '%s' "$current") \
        <(printf '%s' "$content") | sed 's/^/          | /' || true
    fi
    act "rewrite $path (the old one kept under $BACKUP_ROOT/config)" \
      write_file "$path" "$mode" "$owner" "$content"
  else
    act "create $path ($mode $owner)" write_file "$path" "$mode" "$owner" "$content"
    if dry; then preview "$content"; fi
  fi
  PUT_CHANGED=1
}

# ensure_dir PATH MODE OWNER:GROUP — a root-side directory.
ensure_dir() {
  local path="$1" mode="$2" owner="$3"
  if [ -L "$path" ]; then
    fail "refused: $path is a symlink"
  elif [ -d "$path" ]; then
    ensure_mode "$path" "$mode" "$owner"
  else
    act "create directory $path ($mode $owner)" install -d -m "$mode" -o "${owner%%:*}" -g "${owner##*:}" "$path"
  fi
}

# ensure_system_user NAME HOME — a nologin system account that owns one service's data.
ensure_system_user() {
  local name="$1" home="$2"
  if id -u "$name" >/dev/null 2>&1; then
    ok "system user $name exists"
  else
    act "create system user $name (no login, home $home)" \
      useradd --system --home-dir "$home" --no-create-home --shell /usr/sbin/nologin --user-group "$name"
  fi
}

# random_hex BYTES — from the kernel's CSPRNG; never printed by any caller.
random_hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

# version_ge A B — true when dotted version A >= B.
version_ge() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | head -n 1)" = "$2" ]
}

# systemd bookkeeping: a module that wrote a unit sets UNITS_CHANGED; one daemon-reload follows.
UNITS_CHANGED=0
daemon_reload_if_needed() {
  if [ "$UNITS_CHANGED" = 1 ]; then
    act "systemctl daemon-reload (unit files changed)" systemctl daemon-reload
    UNITS_CHANGED=0
  fi
}

# ensure_enabled_active UNIT [restart-if-changed 0|1]
ensure_enabled_active() {
  local unit="$1" changed="${2:-0}"
  if ! systemctl is-enabled --quiet "$unit" 2>/dev/null; then
    act "enable $unit" systemctl enable --quiet "$unit"
  fi
  if ! systemctl is-active --quiet "$unit" 2>/dev/null; then
    act "start $unit" systemctl start "$unit"
  elif [ "$changed" = 1 ]; then
    act "restart $unit (its unit or configuration changed)" systemctl restart "$unit"
  fi
}

# unit_state UNIT — "enabled / active", "missing" when systemd has no such unit.
unit_state() {
  local enabled active
  enabled="$(systemctl is-enabled "$1" 2>/dev/null || true)"
  active="$(systemctl is-active "$1" 2>/dev/null || true)"
  printf '%s / %s' "${enabled:-missing}" "${active:-inactive}"
}

# tcp_listeners_of USER — "a.b.c.d:port" (or "[v6]:port") of every socket USER listens on,
# from /proc/net/tcp{,6}: exact even where ss cannot name a process.
tcp_listeners_of() {
  local uid addr hex port
  uid="$(id -u "$1" 2>/dev/null)" || return 0
  awk -v u="$uid" '$4 == "0A" && $8 == u { print $2 }' /proc/net/tcp /proc/net/tcp6 2>/dev/null |
    while read -r addr; do
      hex="${addr%%:*}" port=$((16#${addr##*:}))
      if [ "${#hex}" = 8 ]; then
        printf '%d.%d.%d.%d:%d\n' "0x${hex:6:2}" "0x${hex:4:2}" "0x${hex:2:2}" "0x${hex:0:2}" "$port"
      else
        printf '[%s]:%d\n' "$hex" "$port"
      fi
    done | sort -u
}
