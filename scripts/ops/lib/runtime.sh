# shellcheck shell=bash
# The site's one pm2 process (DEPLOYMENT.md §3): a holding release so the deploy agent has a
# process to reload before the first real release, the ecosystem file, the pm2 systemd unit
# ordered after Postgres and RustFS, and daily log rotation. It never restarts a running app.

# The holding server: answers 503 to everything until the first release replaces `current`.
# It sits where a release's server.js sits, so the ecosystem file never changes at first deploy.
holding_server_js() {
  cat <<'JS'
// Holding server until the first release lands (scripts/ops/helios-provision.sh). The deploy
// agent reloads a pm2 process named after the site user and fails the deploy if there is none,
// so one exists before the first release does. 503 + Retry-After, noindex: nothing indexes it.
const http = require('node:http')
const port = Number(process.env.PORT)
const host = process.env.HOSTNAME || 'localhost'
const page =
  '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening soon</title>' +
  '<p style="font:16px/1.5 system-ui,sans-serif;margin:4rem auto;max-width:32rem;padding:0 1rem">' +
  'Opening soon &middot; Segera hadir</p>'
http
  .createServer((req, res) => {
    res.writeHead(503, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '3600',
    })
    res.end(page)
  })
  .listen(port, host)
JS
}

ecosystem_cjs() {
  cat <<JS
// $S_USER: $S_LABEL, $ENVIRONMENT — one pm2 process and nothing else (DEPLOYMENT.md §3).
// Written by scripts/ops/helios-provision.sh; edit that, not this file.
//
// name = the site user: the deploy agent reloads the process by that name and skips the reload
// silently on a mismatch. Fork mode, one instance: the jobs route's single flight, the rate
// limits and the health memo are exact only with one process per brand. script and cwd go
// through \`current\`, so \`pm2 reload $S_USER\` starts whichever release the agent just linked.
// --dns-result-order=ipv4first makes HOSTNAME=localhost bind 127.0.0.1 alone, which nginx's
// upstream http://127.0.0.1:$S_PORT reaches; a loopback IP literal would hang every page.
// --env-file reads shared/.env on every start; the env below wins over it (Node's rule).
module.exports = {
  apps: [
    {
      name: '$S_USER',
      cwd: '$S_CURRENT',
      script: '$S_SERVER_JS',
      exec_mode: 'fork',
      instances: 1,
      node_args: '--dns-result-order=ipv4first --env-file=$S_ENV',
      env: {
        HOSTNAME: 'localhost',
        PORT: '$S_PORT',
        BRAND_ROOT: '$S_BRAND_ROOT',
      },
      max_memory_restart: '2G',
      kill_timeout: 10000,
      time: true,
    },
  ],
}
JS
}

runtime_preflight() {
  id -u "$S_USER" >/dev/null 2>&1 || return 0
  local node pm2
  node="$(as_user "$S_USER" 'node -p process.versions.node' 2>/dev/null || true)"
  if [ -z "$node" ]; then
    fail "node is not on $S_USER's login PATH (CloudPanel's Node.js site installs it)"
  elif version_ge "$node" "$MIN_NODE"; then
    ok "node $node for $S_USER"
  else
    fail "node $node for $S_USER: the engine needs $MIN_NODE or later (package.json engines)"
  fi
  pm2="$(as_user "$S_USER" 'command -v pm2' 2>/dev/null || true)"
  [ -n "$pm2" ] || fail "pm2 is not on $S_USER's login PATH"
}

ensure_runtime() {
  say "$S_APP: holding release, pm2 $S_USER"
  local holding="$S_HOME/releases/bootstrap-holding"
  if [ -e "$S_CURRENT" ] || [ -L "$S_CURRENT" ]; then
    ok "$S_CURRENT -> $(readlink "$S_CURRENT" 2>/dev/null || printf 'not a link') (left as it is)"
  else
    ensure_dir "$S_HOME/releases" 755 "$S_USER:$S_USER"
    ensure_dir "$holding" 755 "$S_USER:$S_USER"
    ensure_dir "$holding/brand" 755 "$S_USER:$S_USER"
    ensure_dir "$holding/engine" 755 "$S_USER:$S_USER"
    ensure_dir "$holding/engine/apps" 755 "$S_USER:$S_USER"
    ensure_dir "$holding/engine/apps/$S_APP" 755 "$S_USER:$S_USER"
    holding_server_js | put_file "$holding/engine/apps/$S_APP/server.js" 644 "$S_USER:$S_USER"
    act "link $S_CURRENT -> $holding (the first deploy moves it)" \
      runuser -u "$S_USER" -- ln -sfn "$holding" "$S_CURRENT"
  fi

  PUT_CHANGED=0
  ecosystem_cjs | put_file "$S_HOME/ecosystem.config.cjs" 644 "$S_USER:$S_USER"
  local eco_changed="$PUT_CHANGED"
  if as_user "$S_USER" "pm2 describe $S_USER" >/dev/null 2>&1; then
    ok "pm2 process $S_USER exists (left running)"
    if [ "$eco_changed" = 1 ]; then
      warn "ecosystem.config.cjs changed and pm2 keeps the old settings until: runuser -l $S_USER -c 'pm2 delete $S_USER && pm2 start ~/ecosystem.config.cjs && pm2 save' (a restart: run it when a restart is fine)"
    fi
  else
    act "start pm2 process $S_USER from ~/ecosystem.config.cjs, then pm2 save" \
      as_user "$S_USER" "pm2 start ~/ecosystem.config.cjs >/dev/null && pm2 save >/dev/null"
  fi

  local unit="pm2-$S_USER.service"
  if [ -f "/etc/systemd/system/$unit" ]; then
    ok "$unit exists"
  else
    act "create $unit (pm2 startup systemd) so pm2 resurrects $S_USER at boot" pm2_startup
    UNITS_CHANGED=1
  fi
  ensure_dir "/etc/systemd/system/$unit.d" 755 root:root
  PUT_CHANGED=0
  cat <<'INI' | put_file "/etc/systemd/system/$unit.d/10-after-services.conf" 644 root:root
# pm2's saved list waits for nothing: without this a reboot can start the app before Postgres
# accepts connections or RustFS answers (scripts/ops/helios-provision.sh).
[Unit]
After=network-online.target postgresql.service indies-rustfs.service
Wants=network-online.target
INI
  [ "$PUT_CHANGED" = 0 ] || UNITS_CHANGED=1
  daemon_reload_if_needed
  if dry && [ ! -f "/etc/systemd/system/$unit" ]; then
    act "enable $unit" true
  elif ! systemctl is-enabled --quiet "$unit" 2>/dev/null; then
    act "enable $unit" systemctl enable --quiet "$unit"
  fi

  cat <<ROT | put_file "/etc/logrotate.d/pm2-$S_USER" 644 root:root
# pm2 appends to these forever otherwise; copytruncate, because pm2 keeps them open.
$S_HOME/.pm2/logs/*.log {
    su $S_USER $S_USER
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
ROT
}

# pm2 startup must run as root with the site user's node on PATH, so the unit it writes can
# find pm2 at boot.
pm2_startup() {
  local pm2 bin
  pm2="$(as_user "$S_USER" 'command -v pm2')"
  bin="$(dirname "$(as_user "$S_USER" 'command -v node')")"
  env PATH="$bin:$PATH" "$pm2" startup systemd -u "$S_USER" --hp "$S_HOME" >/dev/null
}
