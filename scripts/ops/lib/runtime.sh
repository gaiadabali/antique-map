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
      // A restart threshold, not a limit: two apps, RustFS (MemoryMax 2G) and Mailpit share
      // this host with other live sites, so a leak restarts the app well before it hurts them.
      max_memory_restart: '1536M',
      kill_timeout: 10000,
      time: true,
    },
  ],
}
JS
}

# pm2-<user>.service, written here rather than by `pm2 startup` (should-fix 1): that runs, as
# root, whatever pm2 and node the user's PATH names, and can leave a root pm2 daemon behind. The
# unit runs pm2 as the user alone, from a path checked in resolve_site_path.
pm2_unit() {
  cat <<INI
# pm2 for $S_USER ($S_LABEL, $ENVIRONMENT) — scripts/ops/helios-provision.sh. At boot it
# resurrects the processes \`pm2 save\` recorded in ~/.pm2/dump.pm2, as $S_USER, never root.
[Unit]
Description=pm2 process manager for $S_USER
After=network-online.target postgresql.service postgresql@$PG_MAJOR-main.service indies-rustfs.service
Wants=network-online.target

[Service]
Type=forking
User=$S_USER
Group=$S_USER
LimitNOFILE=65536
Environment=PATH=$SITE_PATH
Environment=PM2_HOME=$S_HOME/.pm2
WorkingDirectory=$S_HOME
PIDFile=$S_HOME/.pm2/pm2.pid
Restart=on-failure
ExecStart=$SITE_NODE_BIN/pm2 resurrect
ExecReload=$SITE_NODE_BIN/pm2 reload all
ExecStop=$SITE_NODE_BIN/pm2 kill

[Install]
WantedBy=multi-user.target
INI
}

runtime_preflight() {
  id -u "$S_USER" >/dev/null 2>&1 || return 0
  resolve_site_path
  if [ -z "$SITE_NODE_BIN" ]; then
    fail "no trusted node + pm2 for $S_USER: neither $S_HOME/.nvm/versions/node/*/bin nor a root-owned /usr/local/bin or /usr/bin holds both (install pm2 for the site user, e.g. runuser -l $S_USER -c 'npm install -g pm2')"
    return 0
  fi
  local node
  node="$(site_run node -p process.versions.node 2>/dev/null || true)"
  if [ -z "$node" ]; then
    fail "$SITE_NODE_BIN/node does not run as $S_USER"
  elif version_ge "$node" "$MIN_NODE"; then
    ok "node $node and pm2 from $SITE_NODE_BIN, run as $S_USER only"
  else
    fail "node $node for $S_USER: the engine needs $MIN_NODE or later (package.json engines)"
  fi
}

# pm2_has_process — only asks pm2 when its daemon already runs: any pm2 command starts one.
pm2_has_process() {
  pm2_daemon_live && site_run pm2 describe "$S_USER" >/dev/null 2>&1
}

# shellcheck disable=SC2016 # $1 is expanded by the user's sh
pm2_start_and_save() { site_run sh -c 'pm2 start "$1" >/dev/null && pm2 save >/dev/null' sh "$S_HOME/ecosystem.config.cjs"; }
pm2_save() { site_run pm2 save >/dev/null; }

ensure_runtime() {
  say "$S_APP: holding release, pm2 $S_USER"
  local holding="$S_HOME/releases/bootstrap-holding"
  if [ -e "$S_CURRENT" ] || [ -L "$S_CURRENT" ]; then
    ok "$S_CURRENT -> $(readlink "$S_CURRENT" 2>/dev/null || printf 'not a link') (left as it is)"
  else
    user_dir "$S_HOME/releases" 755
    user_dir "$holding" 755
    user_dir "$holding/brand" 755
    user_dir "$holding/engine" 755
    user_dir "$holding/engine/apps" 755
    user_dir "$holding/engine/apps/$S_APP" 755
    holding_server_js | user_put "$holding/engine/apps/$S_APP/server.js" 644
    act "link $S_CURRENT -> $holding, as $S_USER (the first deploy moves it)" \
      site_run ln -sfn "$holding" "$S_CURRENT"
  fi

  PUT_CHANGED=0
  ecosystem_cjs | user_put "$S_HOME/ecosystem.config.cjs" 644
  local eco_changed="$PUT_CHANGED"
  if [ -z "$SITE_NODE_BIN" ]; then
    fail "no trusted pm2 for $S_USER: the pm2 steps are skipped"
    return 0
  fi
  if pm2_has_process; then
    ok "pm2 process $S_USER exists (left running)"
    if [ "$eco_changed" = 1 ]; then
      warn "ecosystem.config.cjs changed and pm2 keeps the old settings until: runuser -l $S_USER -c 'pm2 delete $S_USER && pm2 start ~/ecosystem.config.cjs && pm2 save' (a restart: run it when a restart is fine)"
    fi
    # The boot unit resurrects what dump.pm2 lists, so the process must be in it (should-fix 11).
    if user_read "$S_HOME/.pm2/dump.pm2" | grep -Eq "\"name\": ?\"$S_USER\""; then
      ok "$S_HOME/.pm2/dump.pm2 names $S_USER (resurrected at boot)"
    else
      act "pm2 save, as $S_USER (dump.pm2 does not name $S_USER, so a reboot would not bring it back)" pm2_save
    fi
  else
    act "start pm2 process $S_USER from ~/ecosystem.config.cjs, then pm2 save (as $S_USER)" pm2_start_and_save
  fi

  local unit="pm2-$S_USER.service"
  PUT_CHANGED=0
  pm2_unit | put_file "/etc/systemd/system/$unit" 644 root:root
  [ "$PUT_CHANGED" = 0 ] || UNITS_CHANGED=1
  daemon_reload_if_needed
  if dry && [ "$PUT_CHANGED" = 1 ]; then
    act "enable $unit (not started now: the daemon already runs; it resurrects at boot)" true
  elif ! systemctl is-enabled --quiet "$unit" 2>/dev/null; then
    act "enable $unit (it resurrects $S_USER's processes at boot)" systemctl enable --quiet "$unit"
  fi

  cat <<ROT | put_file "/etc/logrotate.d/pm2-$S_USER" 644 root:root
# pm2 appends to these forever otherwise; copytruncate, because pm2 keeps them open. The su
# line makes logrotate open them as $S_USER, never as root.
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
