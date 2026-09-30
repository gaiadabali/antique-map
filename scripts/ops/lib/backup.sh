# shellcheck shell=bash
# Nightly dumps of every brand database this script provisioned (DEPLOYMENT.md §6), by a systemd
# timer. Local disk only for now: an off-box copy needs a target this host does not have yet
# (§6 wants 30 days off-box). An executable /etc/indies/backup-offbox, when the owner adds one,
# is handed each finished dump and fails the run if it fails, so the timer shows the failure.

BACKUP_DIR=$BACKUP_ROOT
BACKUP_LIST=/etc/indies/backup-databases
BACKUP_RETAIN_DAYS=7
BACKUP_MIN_FREE_PCT=10
BACKUP_AT='19:40:00 UTC' # 03:40 in Bali, after the other sites' dumps on this host

# shellcheck disable=SC2153,SC2154 # LIST, DIR, RETAIN, MIN_FREE, PGPORT: the installed script sets them
indies_db_backup_main() {
  local db out avail total failed=0
  umask 077
  read -r total avail <<<"$(df -Pk "$DIR" | awk 'NR == 2 { print $2, $4 }')"
  # A dump that fills the disk takes every site on the box down with it.
  if [ $((avail * 100 / total)) -lt "$MIN_FREE" ]; then
    echo "indies-db-backup: under ${MIN_FREE}% free on $DIR's filesystem; no dump taken" >&2
    return 1
  fi
  while read -r db; do
    [[ "$db" =~ ^[a-z_][a-z0-9_]{1,62}$ ]] || continue
    mkdir -p "$DIR/$db"
    out="$DIR/$db/$db-$(date -u +%Y%m%dT%H%M%SZ).dump"
    # A dump holds customers' addresses and every draft: root-only, and never half-written.
    if runuser -u postgres -- pg_dump --port="$PGPORT" --format=custom "$db" >"$out.partial" &&
      [ -s "$out.partial" ] && pg_restore --list "$out.partial" >/dev/null; then
      mv "$out.partial" "$out"
      if [ -x /etc/indies/backup-offbox ] && ! /etc/indies/backup-offbox "$out"; then
        echo "indies-db-backup: the off-box copy of $out failed" >&2
        failed=1
      fi
      find "$DIR/$db" -name "$db-*.dump" -mtime +"$RETAIN" -delete
    else
      rm -f "$out.partial"
      echo "indies-db-backup: dumping $db failed or produced an unreadable archive" >&2
      failed=1
    fi
  done <"$LIST"
  return "$failed"
}

ensure_backups() {
  say "backups: nightly pg_dump of each brand database (local, $BACKUP_RETAIN_DAYS days)"
  ensure_dir /etc/indies 755 root:root
  ensure_dir "$BACKUP_DIR" 700 root:root
  local have='' dbs app
  [ -f "$BACKUP_LIST" ] && have="$(grep -E '^[a-z_][a-z0-9_]*$' "$BACKUP_LIST" || true)"
  dbs="$(
    printf '%s\n' "$have"
    for app in $(selected_apps); do
      load_site "$app"
      printf '%s\n' "$S_DB"
    done
  )"
  printf '%s\n' "$(sed '/^$/d' <<<"$dbs" | sort -u)" | put_file "$BACKUP_LIST" 644 root:root

  {
    printf '#!/usr/bin/env bash\n'
    printf '# Written by scripts/ops/helios-provision.sh: edit that, not this.\n'
    printf 'set -uo pipefail\n'
    printf 'LIST=%s\nDIR=%s\nRETAIN=%s\nMIN_FREE=%s\nPGPORT=%s\n' "$BACKUP_LIST" "$BACKUP_DIR" "$BACKUP_RETAIN_DAYS" "$BACKUP_MIN_FREE_PCT" "$PG_PORT"
    declare -f indies_db_backup_main
    printf 'indies_db_backup_main\n'
  } | put_file /usr/local/sbin/indies-db-backup 750 root:root

  PUT_CHANGED=0
  cat <<INI | put_file /etc/systemd/system/indies-db-backup.service 644 root:root
[Unit]
Description=Nightly dump of the Indies brand databases (local; scripts/ops/helios-provision.sh)
After=postgresql.service postgresql@$PG_MAJOR-main.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/indies-db-backup
Nice=10
IOSchedulingClass=idle
INI
  cat <<INI | put_file /etc/systemd/system/indies-db-backup.timer 644 root:root
[Unit]
Description=Nightly dump of the Indies brand databases

[Timer]
OnCalendar=*-*-* $BACKUP_AT
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
INI
  [ "$PUT_CHANGED" = 0 ] || UNITS_CHANGED=1
  daemon_reload_if_needed
  if dry && [ "$PUT_CHANGED" = 1 ]; then
    act "enable and start indies-db-backup.timer" true
  else
    ensure_enabled_active indies-db-backup.timer
  fi
  [ -x /etc/indies/backup-offbox ] ||
    note "no /etc/indies/backup-offbox: dumps stay on this disk until an off-box target exists (DEPLOYMENT.md §6)"
}
