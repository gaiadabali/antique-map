# shellcheck shell=bash
# What is true now, read-only: printed at the end of every run, and alone with --report. It is
# the evidence 5.1.b–d record: the bind (5.1.d's `ss -ltnp`), pm2's mode, health on loopback.
# It runs no pm2 command unless pm2's daemon already runs (any pm2 command would start one).

PROBE_PUBLIC=0

# The vhost edits CloudPanel's editor makes (it regenerates nginx from its stored template, so
# never a file edit): every host in server_name, and the media location. Whatever sits in front
# fetches anonymously and holds no key, so the bucket policy is the only gate (DEPLOYMENT.md §6).
server_name_line() { printf '          |   server_name %s;\n' "$(all_hosts | paste -sd' ' -)"; }
media_location_block() {
  cat <<NGINX
          | # CloudPanel → $S_DOMAIN → Vhost, inside the server { } that proxies to 127.0.0.1:$S_PORT:
          | location ^~ /_media/ {
          |   limit_except GET HEAD { deny all; }
          |   proxy_pass http://127.0.0.1:$RUSTFS_PORT/$S_MEDIA_BUCKET/;
          |   proxy_set_header Host 127.0.0.1:$RUSTFS_PORT;
          |   proxy_set_header Authorization "";
          |   proxy_set_header Cookie "";
          |   proxy_hide_header Set-Cookie;
          | }
          | # MEDIA_PUBLIC_URL=$S_MEDIA_PUBLIC_URL is already in $S_ENV
NGINX
}

# pm2_summary — "name mode instances status restarts script" per process, from pm2 jlist.
pm2_summary() {
  pm2_daemon_live || {
    printf 'no pm2 daemon for %s (so no process)' "$S_USER"
    return 0
  }
  site_run pm2 jlist 2>/dev/null | tail -n 1 | site_run node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let list = []; try { list = JSON.parse(s) } catch {}
  for (const p of list) { const e = p.pm2_env || {}
    console.log([p.name, e.exec_mode, "instances=" + e.instances, e.status, "restarts=" + e.restart_time,
      "script=" + e.pm_exec_path].join(" ")) }
  if (!list.length) console.log("none") })' 2>/dev/null || printf 'unavailable'
}

site_report() {
  say "report: the site ($S_USER; shop $SHOP_HOSTS, gallery $GALLERY_HOSTS)"
  if ! id -u "$S_USER" >/dev/null 2>&1; then
    note "no site user $S_USER"
    return 0
  fi
  local probe addrs code conf="$VHOST_DIR/$S_DOMAIN.conf"
  probe="$(port_probe "$S_PORT")"
  if [ "$probe" = free ]; then
    note "listening: nothing on port $S_PORT"
  else
    addrs="${probe#*|}"
    if loopback_only "$addrs"; then
      ok "listening: $addrs as ${probe%%|*} — loopback only"
    else
      fail "listening: $addrs as ${probe%%|*} — reachable beyond loopback (DEPLOYMENT.md §3)"
    fi
  fi
  note "current -> $(readlink "$S_CURRENT" 2>/dev/null || printf 'MISSING')"
  note "pm2: $(pm2_summary | paste -sd';' -)"
  note "pm2-$S_USER.service: $(unit_state "pm2-$S_USER.service") (inactive while the daemon runs outside it; it resurrects at boot)"
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://127.0.0.1:$S_PORT/api/health" || true)"
  note "http://127.0.0.1:$S_PORT/api/health: ${code:-no answer} (503 is the holding release, or a boot check refusing: pm2 logs $S_USER)"
  if [ "$PROBE_PUBLIC" = 1 ]; then
    local h
    while read -r h; do
      code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://$h/api/health" || true)"
      note "https://$h/api/health: ${code:-no answer}"
    done < <(all_hosts)
  fi
  if cron_block_present; then
    ok "crontab: the managed block is there ($(crontab -u "$S_USER" -l 2>/dev/null | grep -cE '^[^#].*indies-cron') active indies-cron line(s))"
  elif site_run test -e "$S_HOME/bin/indies-cron" 2>/dev/null; then
    fail "crontab: $S_USER's managed block is gone (CloudPanel's cron UI rewrites a site's crontab): re-run the script"
  else
    note "crontab: not provisioned yet"
  fi
  report_blank_secrets
  if [ -f "$conf" ] && [ -z "$(all_hosts | grep -vxF -f <(vhost_server_names "$conf"))" ]; then
    ok "vhost server_name names every host"
  else
    note "the vhost must name every host, so one site answers both (CloudPanel's vhost editor, never a file edit):"
    server_name_line
  fi
  if [ -f "$conf" ] && grep -q 'location \^~ /_media/' "$conf"; then
    ok "vhost serves /_media/ (MEDIA_PUBLIC_URL=$S_MEDIA_PUBLIC_URL)"
  else
    note "MEDIA_PUBLIC_URL needs /_media/ in the vhost (CloudPanel regenerates nginx, so it goes in through CloudPanel's vhost editor, never a file edit):"
    media_location_block
  fi
}

# service_listeners USER ALLOWED… — every socket USER listens on must be 127.0.0.1 on one of
# the allowed ports (should-fix 9); anything else fails, a console on [::]:9001 included.
service_listeners() {
  local user="$1" l port ok_port any=0
  shift
  while read -r l; do
    [ -n "$l" ] || continue
    any=1
    port="${l##*:}" ok_port=0
    for p in "$@"; do [ "$port" = "$p" ] && ok_port=1; done
    if [ "$ok_port" = 1 ] && [ "${l%:*}" = 127.0.0.1 ]; then
      ok "$user listens on $l"
    else
      fail "$user listens on $l: only 127.0.0.1 on $* is expected"
    fi
  done < <(tcp_listeners_of "$user")
  [ "$any" = 1 ] || note "$user listens on nothing"
}

host_report() {
  say "report: shared services"
  local unit
  for unit in "$(rustfs_mount_unit)" "$RUSTFS_UNIT" "$MAILPIT_UNIT" indies-db-backup.timer; do
    [ "$unit" = "$MAILPIT_UNIT" ] && ! mailpit_wanted && continue
    note "$unit: $(unit_state "$unit")"
  done
  if mountpoint -q "$RUSTFS_DATA"; then
    note "RustFS data: $(df -h --output=used,size,pcent "$RUSTFS_DATA" | tail -n 1 | awk '{ print $1 " of " $2 " (" $3 ")" }') of its own image"
  fi
  service_listeners "$RUSTFS_USER" "$RUSTFS_PORT" "$RUSTFS_CONSOLE_PORT"
  mailpit_wanted && service_listeners "$MAILPIT_USER" "$MAILPIT_SMTP_PORT" "$MAILPIT_UI_PORT"
  note "last dump: $(find "$BACKUP_DIR" -name '*.dump' -printf '%TY-%Tm-%Td %TH:%TM %p\n' 2>/dev/null | sort | tail -n 1 || true)"
  disk_check
  note "5.1.d from OUTSIDE this host: curl -m 5 http://<public-ip>:<port> must be refused for 4030-4035"
}
