# shellcheck shell=bash
# The site user's crontab (DEPLOYMENT.md §5) and the two helpers it and 5.1.c use, installed
# into ~/bin. Both helpers are written from the functions below with `declare -f`, so the code
# on the host is the code shellcheck saw here, with only its settings prepended.
#
# Every call goes to the app on loopback, http://127.0.0.1:<port>, never through Cloudflare: no
# 100 s cut-off, no DNS, and the route is still behind CRON_SECRET.

# route | schedule | answers that count as success | curl's max seconds | on/off | lands in
# A route stays off until its handler lands: its placeholder answers 404 every tick, and cron
# would mail the site user 1,440 times a day. Turn one on here once its task is merged, and
# re-run the script. jobs is on: 4.6 landed it (/api/x/cron/jobs), and it answers 409 `busy`
# while a run is in flight — success here, never a failure (4.6 review #3), so never `curl -f`.
CRON_ROUTES=(
  'jobs|* * * * *|200,409|900|on|4.6'
  'sweeps|* * * * *|200,204|120|off|18.1.d'
  'outbox|* * * * *|200,204|120|off|18.2'
  'reconcile|*/10 * * * *|200,204|300|off|19.2.d'
)

# indies-cron ROUTE ACCEPTED MAX_SECONDS — POST /api/x/cron/ROUTE with the bearer from shared/.env.
# shellcheck disable=SC2153,SC2154 # PORT, ENV_FILE, STATE_DIR, USER_NAME: the installed script sets them
indies_cron_main() {
  local route="$1" accept="$2" max="$3" secret code msg
  [[ "$route" =~ ^[a-z]+$ ]] || {
    echo "indies-cron: bad route '$route'" >&2
    return 2
  }
  secret="$(grep -E '^CRON_SECRET=' "$ENV_FILE" | tail -n 1 | cut -d= -f2-)"
  secret="${secret%\"}" secret="${secret#\"}"
  # No secret yet: the app answers 503 anyway and its boot check already refuses it; stay quiet.
  [ -n "$secret" ] || return 0
  mkdir -p "$STATE_DIR"
  # One call per route in flight: a hung app must not stack a curl per minute.
  exec 9>"$STATE_DIR/cron-$route.lock"
  flock -n 9 || return 0
  # The header comes from stdin (-H @-), so the secret is never in the process list.
  code="$(printf 'Authorization: Bearer %s\n' "$secret" |
    curl -sS -o /dev/null -w '%{http_code}' -m "$max" -X POST -H @- \
      "http://127.0.0.1:$PORT/api/x/cron/$route" 2>/dev/null)" || true
  case ",$accept," in *",$code,"*) return 0 ;; esac
  msg="POST /api/x/cron/$route on 127.0.0.1:$PORT answered ${code:-nothing} (wanted $accept)"
  logger -t "indies-cron-$USER_NAME" -- "$msg" 2>/dev/null || true
  echo "indies-cron: $msg" >&2
  return 1
}

# indies-health [SECONDS_PER_TRY [TRIES]] — wait until /api/health answers 200 on loopback.
# The first check after a deploy runs the pending migrations and is untimed by design (4.6
# review #2), so one try may take as long as the longest migration: the default allows 600 s.
# shellcheck disable=SC2153,SC2154 # PORT, STATE_DIR: the installed script sets them
indies_health_main() {
  local per="${1:-600}" tries="${2:-3}" i code start
  for ((i = 1; i <= tries; i++)); do
    start="$(date +%s)"
    code="$(curl -sS -o "$STATE_DIR/health.json" -w '%{http_code}' -m "$per" \
      "http://127.0.0.1:$PORT/api/health" 2>/dev/null)" || true
    echo "indies-health: try $i/$tries: ${code:-no answer} after $(($(date +%s) - start)) s"
    if [ "$code" = 200 ]; then
      head -c 600 "$STATE_DIR/health.json"
      echo
      return 0
    fi
    [ "$i" -lt "$tries" ] && sleep 5
  done
  [ -s "$STATE_DIR/health.json" ] && head -c 600 "$STATE_DIR/health.json" && echo
  return 1
}

# helper_script NAME FUNCTION — the installed file: settings, the function, the call.
helper_script() {
  printf '#!/usr/bin/env bash\n'
  printf '# %s for %s — written by scripts/ops/helios-provision.sh; edit that, not this.\n' "$1" "$S_USER"
  printf 'set -uo pipefail\n'
  printf 'PORT=%s\nENV_FILE=%s\nSTATE_DIR=%s\nUSER_NAME=%s\n' "$S_PORT" "$S_ENV" "$S_HOME/.indies" "$S_USER"
  declare -f "$2"
  printf '%s "$@"\n' "$2"
}

crontab_block() {
  local entry route when accept max state task
  printf '%s\n' "# >>> indies-provision (managed by scripts/ops/helios-provision.sh: edits here are replaced)"
  for entry in "${CRON_ROUTES[@]}"; do
    IFS='|' read -r route when accept max state task <<<"$entry"
    if [ "$state" = on ]; then
      printf '%s %s/bin/indies-cron %s %s %s\n' "$when" "$S_HOME" "$route" "$accept" "$max"
    else
      printf '# off until %s lands /api/x/cron/%s: %s %s/bin/indies-cron %s %s %s\n' \
        "$task" "$route" "$when" "$S_HOME" "$route" "$accept" "$max"
    fi
  done
  if [ -x "$S_HOME/prune-releases.sh" ]; then
    printf '*/10 * * * * %s/prune-releases.sh >/dev/null 2>&1\n' "$S_HOME"
  fi
  printf '%s\n' '# <<< indies-provision'
}

ensure_cron() {
  say "$S_APP: ~/bin helpers and $S_USER's crontab"
  ensure_dir "$S_HOME/bin" 750 "$S_USER:$S_USER"
  ensure_dir "$S_HOME/.indies" 750 "$S_USER:$S_USER"
  helper_script indies-cron indies_cron_main | put_file "$S_HOME/bin/indies-cron" 750 "$S_USER:$S_USER"
  helper_script indies-health indies_health_main | put_file "$S_HOME/bin/indies-health" 750 "$S_USER:$S_USER"
  [ -x "$S_HOME/prune-releases.sh" ] ||
    warn "no $S_HOME/prune-releases.sh (the GDA pipeline's): releases are not pruned until it exists; re-run then"

  local current wanted
  current="$(crontab -u "$S_USER" -l 2>/dev/null || true)"
  wanted="$(
    sed '/^# >>> indies-provision/,/^# <<< indies-provision/d' <<<"$current" | sed '/^$/N;/^\n$/D'
    crontab_block
  )"
  wanted="$(sed '/./,$!d' <<<"$wanted")"
  if [ "$current" = "$wanted" ]; then
    ok "crontab for $S_USER is current"
    return 0
  fi
  if dry; then
    diff -u --label "crontab $S_USER (now)" --label "crontab $S_USER (wanted)" \
      <(printf '%s\n' "$current") <(printf '%s\n' "$wanted") | sed 's/^/          | /' || true
  fi
  act "install $S_USER's crontab (lines outside the managed block kept; the old one saved as ~/.crontab.bak-$STAMP)" \
    install_crontab "$current" "$wanted"
}

install_crontab() {
  if [ -n "$1" ]; then
    printf '%s\n' "$1" >"$S_HOME/.crontab.bak-$STAMP"
    chown "$S_USER:$S_USER" "$S_HOME/.crontab.bak-$STAMP"
    chmod 600 "$S_HOME/.crontab.bak-$STAMP"
  fi
  printf '%s\n' "$2" | crontab -u "$S_USER" -
}
