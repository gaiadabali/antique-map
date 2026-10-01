# shellcheck shell=bash
# --verify-restart: shows that what this script runs comes back after a restart, one service at
# a time, without rebooting the shared host. It restarts only this script's own units — each
# unit file must carry this script's name before it is touched — never anything else, and never
# in a dry run or a --report. Each check prints PASS or FAIL; a FAIL fails the run.
#
#   RustFS   stop the service, restart its data mount, start the service: the image is mounted
#            and /health answers 200 again
#   pm2      stop pm2-<user>.service and any pm2 daemon of the user's running outside it, then
#            restart the unit: its `pm2 resurrect` must bring back the process dump.pm2 lists,
#            online under a new daemon and answering on 127.0.0.1:<port>. The site is down for
#            those seconds (staging), and afterwards its pm2 runs inside the unit.
#   Mailpit  restart it (staging): SMTP greets 220 and the UI answers again
#   cron     each site user's crontab still holds the managed block
#   boot     every indies unit is enabled; the data mount is WantedBy=multi-user.target and the
#            RustFS unit has RequiresMountsFor= its data dir, so the image is mounted before it

VERIFY_RESTART=0
VERIFY_PASS=0
VERIFY_FAIL=0

vpass() {
  VERIFY_PASS=$((VERIFY_PASS + 1))
  printf '   PASS   %s\n' "$*"
}
vfail() {
  VERIFY_FAIL=$((VERIFY_FAIL + 1))
  ERRORS=$((ERRORS + 1))
  printf '   FAIL   %s\n' "$*"
}

ours_unit() { grep -qF 'scripts/ops/helios-provision.sh' "/etc/systemd/system/$1" 2>/dev/null; }

# wait_for SECONDS CMD [ARG…] — true as soon as CMD succeeds, polled once a second.
wait_for() {
  local n="$1" i
  shift
  for ((i = 0; i < n; i++)); do
    "$@" && return 0
    sleep 1
  done
  "$@"
}

http_code() { curl -s -o /dev/null -w '%{http_code}' -m 3 "$1" 2>/dev/null || true; }
answers() { case "$(http_code "$1")" in 000 | '') return 1 ;; esac }
rustfs_healthy() { [ "$(http_code "http://127.0.0.1:$RUSTFS_PORT/health")" = 200 ]; }
# shellcheck disable=SC2016 # $1 is the inner bash's
smtp_greets() {
  timeout 5 bash -c 'exec 3<>"/dev/tcp/127.0.0.1/$1" && head -c 3 <&3' _ "$MAILPIT_SMTP_PORT" 2>/dev/null |
    grep -qx 220
}
pm2_online() { pm2_daemon_live && pm2_summary | grep -q "^$S_USER [a-z_]* instances=[^ ]* online "; }
pm2_daemon_gone() { ! pm2_daemon_live; }
pm2_pid() { user_read "$S_HOME/.pm2/pm2.pid" | tr -dc 0-9; }

verify_rustfs() {
  local mount
  mount="$(rustfs_mount_unit)"
  if ! ours_unit "$mount" || ! ours_unit "$RUSTFS_UNIT"; then
    vfail "RustFS: $mount or $RUSTFS_UNIT is not this script's unit: not restarted"
    return 0
  fi
  systemctl stop "$RUSTFS_UNIT" || true
  systemctl restart "$mount" || true
  systemctl start "$RUSTFS_UNIT" || true
  if mountpoint -q "$RUSTFS_DATA" && wait_for 30 rustfs_healthy; then
    vpass "RustFS: $RUSTFS_UNIT stopped, $mount restarted, $RUSTFS_UNIT started: $RUSTFS_DATA mounted, /health 200"
  else
    vfail "RustFS: after restarting $mount and $RUSTFS_UNIT: mounted=$(mountpoint -q "$RUSTFS_DATA" && echo yes || echo no), /health $(http_code "http://127.0.0.1:$RUSTFS_PORT/health") (journalctl -u $RUSTFS_UNIT)"
  fi
}

verify_pm2() {
  local unit="pm2-$S_USER.service" before after
  if ! ours_unit "$unit"; then
    vfail "pm2 $S_USER: $unit is not this script's unit (or is missing): not restarted"
    return 0
  fi
  resolve_site_path
  if [ -z "$SITE_NODE_BIN" ]; then
    vfail "pm2 $S_USER: no trusted pm2 to resurrect with"
    return 0
  fi
  if ! user_read "$S_HOME/.pm2/dump.pm2" | grep -Eq "\"name\": ?\"$S_USER\""; then
    vfail "pm2 $S_USER: $S_HOME/.pm2/dump.pm2 does not name $S_USER, so nothing would come back"
    return 0
  fi
  before="$(pm2_pid)"
  systemctl stop "$unit" || true
  if pm2_daemon_live; then site_run pm2 kill >/dev/null 2>&1 || true; fi
  wait_for 10 pm2_daemon_gone || true
  systemctl restart "$unit" || true
  # A cold Next start plus the boot check's database probe can pass 30 s (measured on Helios).
  if wait_for 90 pm2_online && wait_for 90 answers "http://127.0.0.1:$S_PORT/api/health" &&
    systemctl is-active --quiet "$unit"; then
    after="$(pm2_pid)"
    if [ "$after" != "$before" ]; then
      vpass "pm2 $S_USER: $unit restarted; its pm2 resurrect brought $S_USER back from dump.pm2 (daemon ${before:-none} -> $after), 127.0.0.1:$S_PORT answers $(http_code "http://127.0.0.1:$S_PORT/api/health")"
    else
      vfail "pm2 $S_USER: the daemon is the same process ($after) after restarting $unit"
    fi
  else
    vfail "pm2 $S_USER: after restarting $unit: $(unit_state "$unit"), pm2: $(pm2_summary | paste -sd';' -), 127.0.0.1:$S_PORT: $(http_code "http://127.0.0.1:$S_PORT/api/health") (journalctl -u $unit)"
  fi
}

verify_mailpit() {
  mailpit_wanted || return 0
  if ! ours_unit "$MAILPIT_UNIT"; then
    vfail "Mailpit: $MAILPIT_UNIT is not this script's unit: not restarted"
    return 0
  fi
  systemctl restart "$MAILPIT_UNIT" || true
  if wait_for 15 smtp_greets && wait_for 15 answers "http://127.0.0.1:$MAILPIT_UI_PORT/"; then
    vpass "Mailpit: $MAILPIT_UNIT restarted; SMTP 127.0.0.1:$MAILPIT_SMTP_PORT greets 220, the UI on 127.0.0.1:$MAILPIT_UI_PORT answers $(http_code "http://127.0.0.1:$MAILPIT_UI_PORT/")"
  else
    vfail "Mailpit: after restarting $MAILPIT_UNIT it does not answer (journalctl -u $MAILPIT_UNIT)"
  fi
}

verify_boot() {
  local u app units=("$(rustfs_mount_unit)" "$RUSTFS_UNIT" indies-db-backup.timer)
  mailpit_wanted && units+=("$MAILPIT_UNIT")
  for app in $(selected_apps); do
    load_site "$app"
    units+=("pm2-$S_USER.service")
  done
  for u in "${units[@]}"; do
    if systemctl is-enabled --quiet "$u" 2>/dev/null; then
      vpass "boot: $u is enabled"
    else
      vfail "boot: $u is not enabled ($(systemctl is-enabled "$u" 2>/dev/null || echo missing)): it would not start at boot"
    fi
  done
  if grep -qx 'WantedBy=multi-user.target' "/etc/systemd/system/${units[0]}" 2>/dev/null; then
    vpass "boot: ${units[0]} is WantedBy=multi-user.target"
  else
    vfail "boot: ${units[0]} is not WantedBy=multi-user.target"
  fi
  if grep -qx "RequiresMountsFor=$RUSTFS_DATA" "/etc/systemd/system/$RUSTFS_UNIT" 2>/dev/null; then
    vpass "boot: $RUSTFS_UNIT has RequiresMountsFor=$RUSTFS_DATA (the image is mounted first)"
  else
    vfail "boot: $RUSTFS_UNIT lacks RequiresMountsFor=$RUSTFS_DATA"
  fi
}

verify_restart() {
  say "verify restart: RustFS"
  verify_rustfs
  local app
  for app in $(selected_apps); do
    load_site "$app"
    say "verify restart: pm2 $S_USER, crontab"
    verify_pm2
    if cron_block_present; then
      vpass "cron: $S_USER's crontab holds the managed block"
    else
      vfail "cron: $S_USER's crontab lacks the managed block (re-run the script)"
    fi
  done
  if mailpit_wanted; then
    say "verify restart: Mailpit"
    verify_mailpit
  fi
  say "verify restart: boot-time enablement"
  verify_boot
  say "verify restart: $VERIFY_PASS passed, $VERIFY_FAIL failed"
}
