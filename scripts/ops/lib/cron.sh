# shellcheck shell=bash
# The site user's crontab (DEPLOYMENT.md §5) and the two helpers it and 5.1.c use, installed
# into ~/bin. Both helpers are written from the functions below with `declare -f`, so the code
# on the host is the code shellcheck saw here, with only its settings prepended.
#
# Every call goes to the app on loopback, http://127.0.0.1:<port>, never through Cloudflare: no
# 100 s cut-off, no DNS, and the route is still behind CRON_SECRET.
#
# The managed block sits at the end of the crontab, between two marker lines, and starts with
# MAILTO="" (this host has a sendmail: without it every failing tick would mail the site user).
# Lines outside it are kept byte for byte. CloudPanel's cron UI rewrites a site's crontab, so a
# block that disappears is an ERROR in the report: re-run the script to put it back.

# route | schedule | answers that count as success | curl's max seconds | on/off | lands in
# DEPLOYMENT.md §5's table. A route stays off until its handler lands: its placeholder answers
# 404 every tick. Turn one on here once its task is merged, and re-run the script. jobs answers
# 409 `busy` while a run is in flight — success here, never a failure (4.6 review #3), so never
# `curl -f`. jobs, sweeps, reconcile and retention (daily 03:15 WITA) have handlers under engine/apps/web/src/app/api/x/cron/.
CRON_ROUTES=(
  'jobs|* * * * *|200,409|900|on|4.6'
  'sweeps|* * * * *|200,204|120|on|phase 6'
  'reconcile|*/10 * * * *|200,204|300|on|phase 6'
  'retention|15 19 * * *|200,204|900|on|9.1'
  'nightly|0 18 * * *|200,204|900|off|its-handler'
)
CRON_BEGIN='# >>> indies-provision (managed by scripts/ops/helios-provision.sh: edits here are replaced)'
CRON_END='# <<< indies-provision'

# indies-cron ROUTE ACCEPTED MAX_SECONDS — POST /api/x/cron/ROUTE with the bearer from shared/.env.
# It logs (syslog and stderr) only when the outcome changes — a failure, a different failure, or
# the recovery — never once a minute for the same state (should-fix 7).
# shellcheck disable=SC2153,SC2154 # PORT, ENV_FILE, STATE_DIR, USER_NAME: the installed script sets them
indies_cron_main() {
  local route="$1" accept="$2" max="$3" secret code state last msg
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
  case ",$accept," in *",$code,"*) state=ok ;; *) state="${code:-none}" ;; esac
  last="$(cat "$STATE_DIR/cron-$route.state" 2>/dev/null || printf 'ok')"
  printf '%s\n' "$state" >"$STATE_DIR/cron-$route.state"
  [ "$state" != "$last" ] || { [ "$state" = ok ] && return 0 || return 1; }
  if [ "$state" = ok ]; then
    msg="POST /api/x/cron/$route on 127.0.0.1:$PORT answers $code again (was $last)"
  else
    msg="POST /api/x/cron/$route on 127.0.0.1:$PORT answered ${code:-nothing} (wanted $accept); logged once until it changes"
  fi
  logger -t "indies-cron-$USER_NAME" -- "$msg" 2>/dev/null || true
  echo "indies-cron: $msg" >&2
  [ "$state" = ok ]
}

# indies-health [SECONDS_PER_TRY [TRIES]] — wait until /api/health answers 200 on loopback.
# The first check after a deploy runs the pending migrations and is untimed by design (4.6
# review #2), so one try may take as long as the longest migration: the default allows 600 s.
# shellcheck disable=SC2153,SC2154 # PORT, STATE_DIR: the installed script sets them
indies_health_main() {
  local per="${1:-600}" tries="${2:-3}" i code start
  mkdir -p "$STATE_DIR"
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
  printf '%s\nMAILTO=""\n' "$CRON_BEGIN"
  for entry in "${CRON_ROUTES[@]}"; do
    IFS='|' read -r route when accept max state task <<<"$entry"
    if [ "$state" = on ]; then
      printf '%s %s/bin/indies-cron %s %s %s\n' "$when" "$S_HOME" "$route" "$accept" "$max"
    else
      printf '# off until %s lands /api/x/cron/%s: %s %s/bin/indies-cron %s %s %s\n' \
        "$task" "$route" "$when" "$S_HOME" "$route" "$accept" "$max"
    fi
  done
  if site_run test -x "$S_HOME/prune-releases.sh" 2>/dev/null; then
    printf '*/10 * * * * %s/prune-releases.sh >/dev/null 2>&1\n' "$S_HOME"
  fi
  printf '%s\n' "$CRON_END"
}

# cron_unmanaged CRONTAB — the lines outside the managed block, unchanged. Fails when the
# markers are broken (one without the other, repeated, or out of order) rather than guess.
cron_unmanaged() {
  local begins ends
  begins="$(grep -cxF "$CRON_BEGIN" <<<"$1" || true)"
  ends="$(grep -cxF "$CRON_END" <<<"$1" || true)"
  if [ "$begins" = 0 ] && [ "$ends" = 0 ]; then
    printf '%s' "$1"
  elif [ "$begins" = 1 ] && [ "$ends" = 1 ] &&
    [ "$(grep -nxF "$CRON_BEGIN" <<<"$1" | cut -d: -f1)" -lt "$(grep -nxF "$CRON_END" <<<"$1" | cut -d: -f1)" ]; then
    awk -v b="$CRON_BEGIN" -v e="$CRON_END" '$0 == b { skip = 1 } !skip { print } $0 == e { skip = 0 }' <<<"$1"
  else
    return 1
  fi
}

ensure_cron() {
  say "~/bin helpers and $S_USER's crontab"
  user_dir "$S_HOME/bin" 750
  user_dir "$S_HOME/.indies" 750
  helper_script indies-cron indies_cron_main | user_put "$S_HOME/bin/indies-cron" 750
  helper_script indies-health indies_health_main | user_put "$S_HOME/bin/indies-health" 750
  site_run test -x "$S_HOME/prune-releases.sh" 2>/dev/null ||
    warn "no $S_HOME/prune-releases.sh (the GDA pipeline's): releases are not pruned until it exists; re-run then"

  local current kept wanted
  current="$(crontab -u "$S_USER" -l 2>/dev/null || true)"
  if ! kept="$(cron_unmanaged "$current")"; then
    fail "$S_USER's crontab has broken indies-provision markers: fix them by hand (nothing changed)"
    return 0
  fi
  wanted="$(
    [ -z "$kept" ] || printf '%s\n' "$kept"
    crontab_block
  )"
  if [ "$current" = "$wanted" ]; then
    ok "crontab for $S_USER is current"
    return 0
  fi
  if dry; then
    diff -u --label "crontab $S_USER (now)" --label "crontab $S_USER (wanted)" \
      <(printf '%s\n' "$current") <(printf '%s\n' "$wanted") | sed 's/^/          | /' || true
  fi
  act "install $S_USER's crontab from a root-owned file (lines outside the block kept; the old one under $BACKUP_ROOT/config/crontab)" \
    install_crontab "$current" "$wanted"
}

install_crontab() {
  local file="$ROOT_TMP/crontab-$S_USER"
  if [ -n "$1" ]; then
    install -d -m 700 -o root -g root "$BACKUP_ROOT" "$BACKUP_ROOT/config" "$BACKUP_ROOT/config/crontab"
    (
      umask 077
      printf '%s\n' "$1" >"$BACKUP_ROOT/config/crontab/$S_USER.$STAMP"
    )
  fi
  (
    umask 077
    printf '%s\n' "$2" >"$file"
  )
  crontab -u "$S_USER" "$file"
}

# cron_block_present — the report's check (should-fix 10).
cron_block_present() { crontab -u "$S_USER" -l 2>/dev/null | grep -qxF "$CRON_BEGIN"; }
