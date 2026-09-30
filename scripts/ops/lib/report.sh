# shellcheck shell=bash
# What is true now, read-only: printed at the end of every run, and alone with --report. It is
# the evidence 5.1.b–d record: the bind (5.1.d's `ss -ltnp`), pm2's mode, health on loopback.

PROBE_PUBLIC=0

media_location_block() {
  cat <<NGINX
          | # CloudPanel → $S_DOMAIN → Vhost, inside the server { } that proxies to 127.0.0.1:$S_PORT:
          | location ^~ /_media/ {
          |   limit_except GET HEAD { deny all; }
          |   proxy_pass http://127.0.0.1:$RUSTFS_PORT/$S_MEDIA_BUCKET/;
          |   proxy_set_header Host 127.0.0.1:$RUSTFS_PORT;
          |   proxy_set_header Authorization "";
          |   proxy_hide_header Set-Cookie;
          | }
          | # then, in $S_ENV: MEDIA_PUBLIC_URL=$S_SITE_URL/_media — and reload the app
NGINX
}

# pm2_summary — "name mode instances status restarts" from pm2 jlist, via the user's own node.
pm2_summary() {
  # shellcheck disable=SC2016 # the $-free JavaScript is single-quoted on purpose
  as_user "$S_USER" 'pm2 jlist 2>/dev/null | tail -n 1 | node -e '\''
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  let list = []; try { list = JSON.parse(s) } catch {}
  for (const p of list) { const e = p.pm2_env || {}
    console.log([p.name, e.exec_mode, "instances=" + e.instances, e.status, "restarts=" + e.restart_time,
      "script=" + e.pm_exec_path].join(" ")) }
  if (!list.length) console.log("none") })'\''' 2>/dev/null || printf 'unavailable'
}

site_report() {
  say "report: $S_APP ($S_USER, $S_DOMAIN)"
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
  note "pm2-$S_USER.service: $(unit_state "pm2-$S_USER.service")"
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 10 "http://127.0.0.1:$S_PORT/api/health" || true)"
  note "http://127.0.0.1:$S_PORT/api/health: ${code:-no answer} (503 is the holding release, or a boot check refusing: pm2 logs $S_USER)"
  if [ "$PROBE_PUBLIC" = 1 ]; then
    code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 "$S_SITE_URL/api/health" || true)"
    note "$S_SITE_URL/api/health: ${code:-no answer}"
  fi
  note "crontab: $(crontab -u "$S_USER" -l 2>/dev/null | grep -cE '^[^#].*indies-cron') active indies-cron line(s)"
  report_blank_secrets
  if [ -f "$conf" ] && grep -q 'location \^~ /_media/' "$conf"; then
    ok "vhost serves /_media/ (MEDIA_PUBLIC_URL=$S_SITE_URL/_media)"
  else
    note "MEDIA_PUBLIC_URL needs /_media/ in the vhost first (CloudPanel regenerates nginx, so it goes in through CloudPanel's vhost editor, never a file edit):"
    media_location_block
  fi
}

host_report() {
  say "report: shared services"
  local unit
  for unit in "$RUSTFS_UNIT" "$MAILPIT_UNIT" indies-db-backup.timer; do
    [ "$unit" = "$MAILPIT_UNIT" ] && ! mailpit_wanted && continue
    note "$unit: $(unit_state "$unit")"
  done
  local port probe
  for port in "$RUSTFS_PORT" "$MAILPIT_SMTP_PORT" "$MAILPIT_UI_PORT"; do
    [ "$port" != "$RUSTFS_PORT" ] && ! mailpit_wanted && continue
    probe="$(port_probe "$port")"
    if [ "$probe" = free ]; then
      note "port $port: nothing listening"
    elif loopback_only "${probe#*|}"; then
      ok "port $port: ${probe#*|} as ${probe%%|*} — loopback only"
    else
      fail "port $port: ${probe#*|} as ${probe%%|*} — reachable beyond loopback"
    fi
  done
  note "last dump: $(find "$BACKUP_DIR" -name '*.dump' -printf '%TY-%Tm-%Td %TH:%TM %p\n' 2>/dev/null | sort | tail -n 1 || true)"
  disk_check
  note "5.1.d from OUTSIDE this host: curl -m 5 http://<public-ip>:<port> must be refused for every port above"
}
