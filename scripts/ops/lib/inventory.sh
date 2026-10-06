# shellcheck shell=bash
# --report's inventory: everything this script owns on the host, each marked present or absent,
# so an operator can see (or later remove) all of it. Read-only, like the rest of the report:
# home paths are read as their user, RustFS is asked with its root key, pm2 is never run.

inv() { printf '   %-7s %-8s %s\n' "$1" "$2" "$3"; }

# inv_path KIND PATH [WHAT] — a root-side path: its mode, owner and size when present.
inv_path() {
  if [ -e "$2" ] || [ -L "$2" ]; then
    inv "$1" present "$2 ($(stat -c '%a %U:%G' -- "$2")$([ -f "$2" ] && stat -c ', %s bytes' -- "$2"))${3:+ — $3}"
  else
    inv "$1" absent "$2${3:+ — $3}"
  fi
}

# inv_home PATH [WHAT] — a path in the current site's home, looked at as the site user.
inv_home() {
  if user_exists_path "$1" || site_run test -L "$1" 2>/dev/null; then
    inv home present "$1${2:+ — $2}"
  else
    inv home absent "$1${2:+ — $2}"
  fi
}

inv_unit() {
  inv_path unit "/etc/systemd/system/$1" "$(unit_state "$1")"
}

inv_port() {
  local probe
  probe="$(port_probe "$1")"
  if [ "$probe" = free ]; then inv port free "$1 — $2"; else inv port held "$1 — $2: ${probe#*|} as ${probe%%|*}"; fi
}

inv_user() {
  if id -u "$1" >/dev/null 2>&1; then
    inv user present "$1 (uid $(id -u "$1"), home $(getent passwd "$1" | cut -d: -f6)) — $2"
  else
    inv user absent "$1 — $2"
  fi
}

# inv_s3 KIND PATH WHAT — a bucket or key, when RustFS answers.
inv_s3() {
  if [ "$S3_LIVE" != 1 ]; then
    inv "$1" unknown "$3 (RustFS is not answering)"
  elif [ "$(s3 GET "$2")" = 200 ]; then
    inv "$1" present "$3"
  else
    inv "$1" absent "$3"
  fi
}

inventory_report() {
  say "inventory: what this script owns on $(hostname)"
  local app u f
  inv_user "$RUSTFS_USER" "RustFS's system user"
  mailpit_wanted && inv_user "$MAILPIT_USER" "Mailpit's system user"
  for app in $(selected_apps); do
    load_site "$app"
    inv_user "$S_USER" "$S_APP's site user (CloudPanel's site $S_DOMAIN; made by --create-sites)"
  done
  for u in "$RUSTFS_UNIT" indies-db-backup.service indies-db-backup.timer; do inv_unit "$u"; done
  mailpit_wanted && inv_unit "$MAILPIT_UNIT"
  for app in $(selected_apps); do
    load_site "$app"
    inv_unit "pm2-$S_USER.service"
  done
  for app in $(selected_apps); do
    load_site "$app"
    inv_port "$S_PORT" "$S_APP (pm2 $S_USER)"
  done
  inv_port "$RUSTFS_PORT" "RustFS S3, admin, /health"
  inv_port "$RUSTFS_CONSOLE_PORT" "RustFS console (kept off)"
  if mailpit_wanted; then
    inv_port "$MAILPIT_SMTP_PORT" "Mailpit SMTP"
    inv_port "$MAILPIT_UI_PORT" "Mailpit UI"
  fi
  for f in /etc/indies /etc/indies/rustfs /opt/indies /var/cache/indies "$RUSTFS_HOME" "$RUSTFS_DATA" \
    "$BACKUP_ROOT" "$BACKUP_ROOT/config"; do inv_path dir "$f"; done
  mailpit_wanted && inv_path dir "$MAILPIT_HOME" && inv_path dir "$MAILPIT_CONF"
  for f in "$RUSTFS_CONF/access-key" "$RUSTFS_CONF/secret-key" "$RUSTFS_BIN_DIR/rustfs" \
    "$RUSTFS_BIN_DIR/rustfs.sha256" "/var/cache/indies/$RUSTFS_ZIP" \
    "$BACKUP_LIST" /usr/local/sbin/indies-db-backup; do inv_path file "$f"; done
  if mailpit_wanted; then
    for f in ui-password ui-auth smtp-password smtp-auth; do inv_path file "$MAILPIT_CONF/$f"; done
    inv_path file "$MAILPIT_BIN_DIR/mailpit"
    inv_path file "/var/cache/indies/mailpit-$MAILPIT_VERSION-linux-amd64.tar.gz"
  fi
  for app in $(selected_apps); do
    load_site "$app"
    inv_path file "/etc/logrotate.d/pm2-$S_USER"
    id -u "$S_USER" >/dev/null 2>&1 || continue
    for f in "$S_ENV" "$S_HOME/ecosystem.config.cjs" "$S_HOME/bin/indies-cron" "$S_HOME/bin/indies-health" \
      "$S_HOME/.indies" "$S_HOME/releases/bootstrap-holding" "$S_CURRENT"; do inv_home "$f"; done
    resolve_site_path
    if [ -n "$SITE_NODE_BIN" ]; then
      inv pm2 host "$SITE_NODE_BIN/pm2 — pm2 $(pm2_version_at "$SITE_NODE_BIN"), the host's (not this script's), run as $S_USER"
    else
      inv pm2 absent "no trusted system pm2 for $S_USER"
    fi
    if cron_block_present; then inv cron present "$S_USER's crontab: the indies-provision block"; else inv cron absent "$S_USER's crontab: the indies-provision block"; fi
  done
  for app in $(selected_apps); do
    load_site "$app"
    if [ "$PG_OK" != 1 ]; then
      inv db unknown "$S_DB / role $S_ROLE (Postgres not reached)"
    elif [ -n "$(db_owner "$S_DB")" ]; then
      inv db present "$S_DB (owner $(db_owner "$S_DB"), role $S_ROLE marked '$(role_mark "$S_ROLE")') on port $PG_PORT"
    else
      inv db absent "$S_DB / role $S_ROLE"
    fi
  done
  s3_start
  inv_s3 bucket "/$(masters_bucket)?location" "$(masters_bucket) (private)"
  for app in $(selected_apps); do
    load_site "$app"
    inv_s3 bucket "/$S_MEDIA_BUCKET?location" "$S_MEDIA_BUCKET (public read of objects)"
    inv_s3 key "/rustfs/admin/v3/user-info?accessKey=$S_MEDIA_KEY" "RustFS key $S_MEDIA_KEY (policy indies-$S_MEDIA_KEY)"
    inv_s3 key "/rustfs/admin/v3/user-info?accessKey=$S_MASTERS_KEY" "RustFS key $S_MASTERS_KEY (policy indies-$S_MASTERS_KEY)"
  done
}
