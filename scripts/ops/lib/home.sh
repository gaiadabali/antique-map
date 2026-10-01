# shellcheck shell=bash
# Everything inside a site user's home is read and written AS that user (review B1). Root never
# follows a path the site user controls: a symlink planted at ~/shared/.env could otherwise make
# root chmod /etc/shadow, write through to /etc/cron.d, or print a root-only file in a dry run's
# diff. So every managed path is refused if it, or any parent below the home, is a symlink; and
# the write itself runs as the user, so even a link swapped in after the check buys the user
# nothing it could not already do.
#
# site_run runs a command as the user with no login shell or PAM session (runuser -u, not -l),
# a clean environment and an explicit PATH — so no profile, nvm hook or .bashrc executes, and
# probes change nothing (review should-fix 2). Root never executes a site user's binaries.

SITE_PATH=/usr/local/bin:/usr/bin:/bin
SITE_NODE_BIN=''

site_run() {
  runuser -u "$S_USER" -- env -i -C "$S_HOME" HOME="$S_HOME" USER="$S_USER" LOGNAME="$S_USER" \
    PATH="$SITE_PATH" PM2_HOME="$S_HOME/.pm2" LANG=C.UTF-8 "$@"
}

# The paths this script manages inside the home. `current` is deliberately absent: it is a
# symlink by design (the deploy agent's), and the script only reads it or creates it once.
managed_home_paths() {
  printf '%s\n' "$S_HOME/shared" "$S_ENV" "$S_HOME/bin" "$S_HOME/bin/indies-cron" \
    "$S_HOME/bin/indies-health" "$S_HOME/.indies" "$S_HOME/ecosystem.config.cjs" "$S_HOME/.pm2" \
    "$S_HOME/.pm2/pm2.pid" "$S_HOME/.pm2/rpc.sock" "$S_HOME/.pm2/dump.pm2" "$S_HOME/prune-releases.sh"
  if [ ! -e "$S_CURRENT" ] && [ ! -L "$S_CURRENT" ]; then
    printf '%s\n' "$S_HOME/releases" "$S_HOME/releases/bootstrap-holding" \
      "$S_HOME/releases/bootstrap-holding/brand" \
      "$S_HOME/releases/bootstrap-holding/engine/apps/$S_APP/server.js"
  fi
}

# home_link_check — refuse a symlinked home or any symlink on a managed path (parents included).
home_link_check() {
  id -u "$S_USER" >/dev/null 2>&1 || return 0
  if [ -L "$S_HOME" ] || [ ! -d "$S_HOME" ]; then
    fail "refused: $S_HOME is not a real directory"
    return 0
  fi
  [ "$(stat -c %U "$S_HOME")" = "$S_USER" ] || fail "refused: $S_HOME is not owned by $S_USER"
  local p seen=''
  while read -r p; do
    while [ "$p" != "$S_HOME" ] && [ "$p" != / ]; do
      if [ -L "$p" ]; then
        case " $seen " in *" $p "*) ;; *)
          fail "refused: $p is a symlink (-> $(readlink "$p")); remove it — nothing under $S_HOME may be a link the script follows"
          seen="$seen $p"
          ;;
        esac
      fi
      p="$(dirname "$p")"
    done
  done < <(managed_home_paths)
}

user_exists_path() { site_run test -e "$1" 2>/dev/null; }
user_read() { site_run cat -- "$1" 2>/dev/null; }

# env_get FILE KEY — the last KEY=value line's value, one level of surrounding quotes removed,
# read as the site user. Never `source`d: a value with a space (SMTP_FROM_NAME) would run.
env_get() {
  local line value
  line="$(user_read "$1" | grep -E "^$2=" | tail -n 1)" || true
  value="${line#*=}"
  case "$value" in
    \"*\") value="${value#\"}" value="${value%\"}" ;;
    \'*\') value="${value#\'}" value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}
env_has() { user_read "$1" | grep -qE "^$2="; }

# user_dir PATH MODE — a directory in the home, made and chmod'ed by the user.
user_dir() {
  local path="$1" mode="$2" have
  if site_run test -d "$path" 2>/dev/null; then
    have="$(site_run stat -c '%a %U' -- "$path")"
    if [ "${have#* }" != "$S_USER" ]; then
      fail "refused: $path is owned by ${have#* }, not $S_USER (not changed)"
    elif [ "${have%% *}" != "$mode" ]; then
      act "set $path to $mode (was ${have%% *}), as $S_USER" site_run chmod "$mode" -- "$path"
    fi
  else
    act "create directory $path ($mode), as $S_USER" site_run install -d -m "$mode" -- "$path"
  fi
}

# user_mode PATH MODE — a file in the home, chmod'ed by the user; never chowned by root.
user_mode() {
  local path="$1" mode="$2" have
  have="$(site_run stat -c '%a %U' -- "$path")"
  if [ "${have#* }" != "$S_USER" ]; then
    fail "refused: $path is owned by ${have#* }, not $S_USER (not changed)"
  elif [ "${have%% *}" != "$mode" ]; then
    act "set $path to $mode (was ${have%% *}), as $S_USER" site_run chmod "$mode" -- "$path"
  fi
}

# user_write PATH MODE CONTENT — atomic, as the user; the old bytes kept root-side first.
user_write() {
  local path="$1" mode="$2" content="$3" dest
  if user_exists_path "$path"; then
    dest="$BACKUP_ROOT/config$path.$STAMP"
    install -d -m 700 -o root -g root "$BACKUP_ROOT" "$BACKUP_ROOT/config" "$(dirname "$dest")"
    install -m 600 -o root -g root /dev/null "$dest"
    user_read "$path" >"$dest"
  fi
  # shellcheck disable=SC2016 # expanded by the user's sh, not here
  printf '%s' "$content" | site_run sh -c 'umask 077; t="$(mktemp "$(dirname "$1")/.provision.XXXXXX")" &&
    cat >"$t" && chmod "$2" "$t" && mv -f "$t" "$1"' sh "$path" "$mode"
}

# user_put PATH MODE — put_file for the home: content on stdin, compared as the user.
user_put() {
  local path="$1" mode="$2" content current
  content="$(
    cat
    printf x
  )"
  content="${content%x}"
  if site_run test -f "$path" 2>/dev/null; then
    current="$(
      user_read "$path"
      printf x
    )"
    current="${current%x}"
    if [ "$current" = "$content" ]; then
      user_mode "$path" "$mode"
      return 0
    fi
    if dry && [ "$QUIET_PREVIEW" != 1 ]; then
      diff -u --label "$path (now)" --label "$path (wanted)" <(printf '%s' "$current") \
        <(printf '%s' "$content") | sed 's/^/          | /' || true
    fi
    act "rewrite $path as $S_USER (the old one kept under $BACKUP_ROOT/config)" \
      user_write "$path" "$mode" "$content"
  else
    act "create $path ($mode), as $S_USER" user_write "$path" "$mode" "$content"
    if dry; then preview "$content"; fi
  fi
  PUT_CHANGED=1
}

# pm2_daemon_live — pm2's daemon runs for this user: its socket exists and pm2.pid names a live
# process of the user's. Without one, no pm2 command is run at all in a probe — any pm2 command
# would spawn a daemon, which is a change (review should-fix 2).
pm2_daemon_live() {
  local pid
  site_run test -S "$S_HOME/.pm2/rpc.sock" 2>/dev/null || return 1
  pid="$(user_read "$S_HOME/.pm2/pm2.pid" | tr -dc 0-9)"
  [ -n "$pid" ] && [ -d "/proc/$pid" ] && [ "$(stat -c %U "/proc/$pid")" = "$S_USER" ]
}
