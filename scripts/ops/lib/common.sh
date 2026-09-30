# shellcheck shell=bash
# Shared helpers for helios-provision.sh: output, the one door every change goes through
# (`act`), dry-run, and file writes that change nothing when nothing differs.
#
# The contract every module keeps: a read-only probe runs in every mode; anything that changes
# the host is `act "what" cmd args…`, which prints "WOULD …" under --dry-run and runs nothing.
# CHANGES counts them, so a second run that prints "changes: 0" is the idempotency proof.

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CHANGES=0
ERRORS=0
WARNINGS=0
DRY_RUN=0
QUIET_PREVIEW=0

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

# write_file PATH MODE OWNER:GROUP CONTENT [backup] — atomic: a temp file beside it, then mv.
write_file() {
  local path="$1" mode="$2" owner="$3" content="$4" backup="${5:-}" tmp
  if [ -n "$backup" ] && [ -e "$path" ]; then cp -p "$path" "$path.bak-$STAMP"; fi
  tmp="$(mktemp "$(dirname "$path")/.provision.XXXXXX")"
  printf '%s' "$content" >"$tmp"
  chmod "$mode" "$tmp"
  chown "$owner" "$tmp"
  mv -f "$tmp" "$path"
}

set_mode() {
  chmod "$2" "$1"
  chown "$3" "$1"
}

# ensure_mode PATH MODE OWNER:GROUP — mode as stat prints it (600, 750), owner as user:group.
ensure_mode() {
  local path="$1" mode="$2" owner="$3" have
  have="$(stat -c '%a %U:%G' "$path")"
  if [ "$have" != "$mode $owner" ]; then
    act "set $path to $mode $owner (was $have)" set_mode "$path" "$mode" "$owner"
  fi
}

# put_file PATH MODE OWNER:GROUP — the wanted content on stdin. Writes only when the content
# differs; the old file is kept beside it as PATH.bak-STAMP. Sets PUT_CHANGED=1 when it (would)
# write, so a caller can reload whatever reads the file; always returns 0 (safe under set -e).
PUT_CHANGED=0
put_file() {
  local path="$1" mode="$2" owner="$3" content current
  content="$(
    cat
    printf x
  )"
  content="${content%x}"
  if [ -f "$path" ]; then
    current="$(
      cat "$path"
      printf x
    )"
    current="${current%x}"
    if [ "$current" = "$content" ]; then
      ensure_mode "$path" "$mode" "$owner"
      return 0
    fi
    if dry && [ "$QUIET_PREVIEW" != 1 ]; then
      diff -u --label "$path (now)" --label "$path (wanted)" "$path" <(printf '%s' "$content") |
        sed 's/^/          | /' || true
    fi
    act "rewrite $path (the old one kept as $path.bak-$STAMP)" \
      write_file "$path" "$mode" "$owner" "$content" backup
  else
    act "create $path ($mode $owner)" write_file "$path" "$mode" "$owner" "$content"
    if dry; then preview "$content"; fi
  fi
  PUT_CHANGED=1
}

# ensure_dir PATH MODE OWNER:GROUP
ensure_dir() {
  local path="$1" mode="$2" owner="$3"
  if [ -d "$path" ]; then
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

# as_user USER COMMAND — the site user's login shell, from its own home: CloudPanel puts node
# and pm2 on that PATH (nvm), and pm2 run from root's /root cannot read its cwd (KOI's EACCES).
as_user() {
  runuser -l "$1" -c "cd ~ && $2"
}

# env_get FILE KEY — the last KEY=value line's value, one level of surrounding quotes removed.
# Never `source`s the file: a value with a space (SMTP_FROM_NAME) would run as a command.
env_get() {
  local line value
  line="$(grep -E "^$2=" "$1" 2>/dev/null | tail -n 1)" || true
  value="${line#*=}"
  case "$value" in
    \"*\") value="${value#\"}" value="${value%\"}" ;;
    \'*\') value="${value#\'}" value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}
env_has() { grep -qE "^$2=" "$1" 2>/dev/null; }

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
